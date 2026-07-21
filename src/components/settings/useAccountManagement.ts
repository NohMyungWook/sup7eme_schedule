import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  AccountPermissionAction,
  AccountPermissionMenu,
  AppAccount,
  Employee,
  Store,
} from '../../domain/types';
import { deleteAccount as deleteAccountFromApi, fetchAccounts, resetAccountPassword, saveAccount } from '../../services/accountApi';
import {
  createAccountDraft,
  getStoreSummary,
  roleLabels,
} from './accountSettingsModel';

type UseAccountManagementOptions = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  stores: Store[];
  employees: Employee[];
};

export function useAccountManagement({ canCreate, canUpdate, canDelete, stores, employees }: UseAccountManagementOptions) {
  const [accounts, setAccounts] = useState<AppAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [draft, setDraft] = useState(() => createAccountDraft());
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'managers' | 'employees' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const filteredAccounts = accounts.filter((account) => {
    if (activeTab === 'managers' && account.role === 'employee') return false;
    if (activeTab === 'employees' && account.role !== 'employee') return false;
    if (activeTab === 'active' && account.status !== 'active') return false;
    if (activeTab === 'inactive' && account.status !== 'inactive') return false;
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return true;
    return [
      account.displayName,
      account.username,
      roleLabels[account.role],
      getStoreSummary(account.storeIds, stores),
    ].some((value) => value.toLowerCase().includes(keyword));
  });
  const stats = useMemo(() => ({
    active: accounts.filter((account) => account.status === 'active').length,
    managers: accounts.filter((account) => account.role === 'manager').length,
    employees: accounts.filter((account) => account.role === 'employee').length,
  }), [accounts]);
  const allStoresSelected =
    stores.length > 0 && stores.every((store) => draft.storeIds.includes(store.id));

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    fetchAccounts()
      .then((nextAccounts) => {
        if (!mounted) return;
        setAccounts(nextAccounts);
        const firstAccount = nextAccounts[0];
        if (firstAccount) {
          setSelectedAccountId(firstAccount.id);
          setDraft(createAccountDraft(firstAccount));
        }
      })
      .catch((error: Error) => {
        if (mounted) setMessage(error.message);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    setDraft(createAccountDraft(selectedAccount));
  }, [selectedAccount]);

  function selectAccount(account: AppAccount) {
    setSelectedAccountId(account.id);
    setDraft(createAccountDraft(account));
    setMessage('');
    setInitialPassword('');
  }

  function openNewAccount() {
    if (!canCreate) return;
    setSelectedAccountId('');
    setDraft(createAccountDraft(undefined, stores));
    setMessage('');
    setInitialPassword('');
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (draft.id ? !canUpdate : !canCreate) return;
    if (draft.role === 'employee' && !draft.employeeId) {
      setMessage('연결할 직원을 선택해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      const { accounts: nextAccounts, initialPassword: password } = await saveAccount(draft);
      setAccounts(nextAccounts);
      const nextSelected = nextAccounts.find((account) =>
        draft.id ? account.id === draft.id : account.username === draft.username,
      );
      if (nextSelected) {
        setSelectedAccountId(nextSelected.id);
        setDraft(createAccountDraft(nextSelected));
      }
      setMessage('변경 내용을 저장했습니다.');
      setInitialPassword(password ?? '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  async function resetPassword() {
    if (!canUpdate || !draft.id || !window.confirm('비밀번호를 초기화할까요? 새 임시 비밀번호는 한 번만 표시됩니다.')) return;
    setMessage('');
    setInitialPassword('');
    setIsSaving(true);
    try {
      const result = await resetAccountPassword(draft.id);
      setAccounts(result.accounts);
      setInitialPassword(result.initialPassword ?? '');
      setMessage('비밀번호를 초기화했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '비밀번호를 초기화하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteAccount() {
    if (!canDelete || !draft.id || isSaving) return;
    const detail = draft.employeeId
      ? '계정과 연결된 직원이 함께 삭제됩니다. 과거 스케줄 기록은 유지됩니다.'
      : '계정을 삭제하면 더 이상 로그인할 수 없습니다.';
    if (!window.confirm(`${detail}\n계속하시겠습니까?`)) return;

    setMessage('');
    setInitialPassword('');
    setIsSaving(true);
    try {
      const result = await deleteAccountFromApi(draft.id);
      setAccounts(result.accounts);
      const firstAccount = result.accounts[0];
      setSelectedAccountId(firstAccount?.id ?? '');
      setDraft(createAccountDraft(firstAccount, stores));
      setMessage(result.employeeId ? '계정과 연결된 직원을 삭제했습니다.' : '계정을 삭제했습니다.');
      window.dispatchEvent(new CustomEvent('sup7eme:data-changed', { detail: { resources: ['accounts', 'employees', 'schedule'] } }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '계정을 삭제하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  function updatePermission(
    menu: AccountPermissionMenu,
    action: AccountPermissionAction,
  ) {
    if (!canUpdate && draft.id) return;
    if (!canCreate && !draft.id) return;
    setDraft((current) => ({
      ...current,
      permissions: {
        ...current.permissions,
        [menu]: {
          ...current.permissions[menu],
          [action]: !current.permissions[menu][action],
        },
      },
    }));
  }

  function toggleStore(storeId: string) {
    if (draft.id ? !canUpdate : !canCreate) return;
    setDraft((current) => ({
      ...current,
      storeIds: current.storeIds.includes(storeId)
        ? current.storeIds.filter((id) => id !== storeId)
        : [...current.storeIds, storeId],
    }));
  }

  function toggleAllStores() {
    if (draft.id ? !canUpdate : !canCreate) return;
    setDraft((current) => ({
      ...current,
      storeIds: stores.length && !stores.every((store) => current.storeIds.includes(store.id))
        ? stores.map((store) => store.id)
        : [],
    }));
  }

  function resetDraft() {
    setDraft(createAccountDraft(selectedAccount));
  }

  return {
    accounts,
    activeTab,
    allStoresSelected,
    draft,
    filteredAccounts,
    isLoading,
    isSaving,
    initialPassword,
    message,
    searchKeyword,
    selectedAccountId,
    setActiveTab,
    setDraft,
    setSearchKeyword,
    stats,
    openNewAccount,
    resetDraft,
    resetPassword,
    deleteAccount,
    selectAccount,
    submitAccount,
    toggleAllStores,
    toggleStore,
    updatePermission,
    employees,
  };
}

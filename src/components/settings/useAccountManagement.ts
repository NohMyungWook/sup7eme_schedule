import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  AccountPermissionAction,
  AccountPermissionMenu,
  AppAccount,
  Store,
} from '../../domain/types';
import { fetchAccounts, saveAccount } from '../../services/accountApi';
import {
  createAccountDraft,
  getStoreSummary,
  roleLabels,
} from './accountSettingsModel';

type UseAccountManagementOptions = {
  canCreate: boolean;
  canUpdate: boolean;
  stores: Store[];
};

export function useAccountManagement({ canCreate, canUpdate, stores }: UseAccountManagementOptions) {
  const [accounts, setAccounts] = useState<AppAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [draft, setDraft] = useState(() => createAccountDraft());
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'accounts' | 'groups'>('accounts');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const filteredAccounts = accounts.filter((account) => {
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
  }

  function openNewAccount() {
    if (!canCreate) return;
    setSelectedAccountId('');
    setDraft(createAccountDraft(undefined, stores));
    setMessage('');
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (draft.id ? !canUpdate : !canCreate) return;

    try {
      const nextAccounts = await saveAccount(draft);
      setAccounts(nextAccounts);
      const nextSelected = nextAccounts.find((account) =>
        draft.id ? account.id === draft.id : account.username === draft.username,
      );
      if (nextSelected) {
        setSelectedAccountId(nextSelected.id);
        setDraft(createAccountDraft(nextSelected));
      }
      setMessage('변경 내용을 저장했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
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
    message,
    searchKeyword,
    selectedAccountId,
    setActiveTab,
    setDraft,
    setSearchKeyword,
    stats,
    openNewAccount,
    resetDraft,
    selectAccount,
    submitAccount,
    toggleAllStores,
    toggleStore,
    updatePermission,
  };
}

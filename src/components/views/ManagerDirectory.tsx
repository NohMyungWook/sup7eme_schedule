import { useEffect, useMemo, useState } from 'react';
import type { AppAccount, Store } from '../../domain/types';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { fetchAccounts } from '../../services/accountApi';
import { getStoreName } from '../../domain/selectors';
import { ListSkeleton } from '../common/Skeleton';

type Props = {
  stores: Store[];
};

export function ManagerDirectory({ stores }: Props) {
  const [accounts, setAccounts] = useState<AppAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const refreshRevision = useFocusRefresh();
  const filteredAccounts = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return accounts.filter((account) => {
      return account.role === 'manager'
        && (!keyword || [account.displayName, account.username].some((value) => value.toLowerCase().includes(keyword)));
    });
  }, [accounts, searchKeyword]);
  const selectedAccount = filteredAccounts.find((account) => account.id === selectedAccountId) ?? filteredAccounts[0];

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError('');
    fetchAccounts()
      .then((nextAccounts) => {
        if (!mounted) return;
        setAccounts(nextAccounts);
        setSelectedAccountId((current) => nextAccounts.some((account) => account.id === current) ? current : nextAccounts[0]?.id ?? '');
      })
      .catch((requestError: Error) => { if (mounted) setError(requestError.message); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [refreshRevision]);

  return <>
    <div className="manager-directory-toolbar">
      <label><span>계정 검색</span><input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="이름 또는 아이디 검색" /></label>
    </div>
    {error ? <p className="employee-order-error">{error}</p> : null}
    <div className="employee-management-layout manager-directory-layout">
      <section className="employee-card-grid" aria-label="매니저 및 직원 계정 목록">
        {isLoading ? <ListSkeleton rows={6} /> : null}
        {!isLoading && filteredAccounts.map((account) => <article className={`management-employee-card manager-directory-card ${selectedAccount?.id === account.id ? 'is-selected' : ''}`} key={account.id} onClick={() => setSelectedAccountId(account.id)}>
          <div className="management-card-heading"><span className={account.role === 'manager' ? 'is-manager' : 'is-employee'}>{account.displayName.slice(0, 1)}</span><div><strong>{account.displayName}</strong><em>{account.role === 'manager' ? '매니저' : '일반 직원'}</em><small>{account.username}</small></div></div>
          <div className="store-badges">{account.storeIds.length ? account.storeIds.map((storeId) => <span key={storeId}>{getStoreName(storeId, stores)}</span>) : <span>전체 매장</span>}</div>
          <div className="management-card-summary"><span>계정 상태</span><strong>{account.status === 'active' ? '활성' : '비활성'}</strong></div>
        </article>)}
        {!isLoading && !filteredAccounts.length ? <p className="employee-page-empty">등록된 매니저 계정이 없습니다.</p> : null}
      </section>
      {selectedAccount ? <aside className="employee-profile-panel manager-directory-detail">
        <div className="profile-heading"><span className={selectedAccount.role === 'manager' ? 'is-manager' : 'is-employee'}>{selectedAccount.displayName.slice(0, 1)}</span><div><div className="profile-name-row"><h2>{selectedAccount.displayName}</h2><em>{selectedAccount.role === 'manager' ? '매니저' : '일반 직원'}</em></div><p><b>{selectedAccount.status === 'active' ? '활성 계정' : '비활성 계정'}</b></p></div></div>
        <section className="manager-directory-info"><strong>기본 정보</strong><dl><div><dt>로그인 아이디</dt><dd>{selectedAccount.username}</dd></div><div><dt>담당 매장</dt><dd>{selectedAccount.storeIds.length ? selectedAccount.storeIds.map((storeId) => getStoreName(storeId, stores)).join(', ') : '전체 매장'}</dd></div><div><dt>연결 직원</dt><dd>{selectedAccount.employeeName || '연결된 직원 없음'}</dd></div><div><dt>최근 접속</dt><dd>{selectedAccount.lastSignedInAt ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selectedAccount.lastSignedInAt)) : '접속 기록 없음'}</dd></div></dl></section>
        <p className="manager-directory-help">계정 생성·권한·비밀번호·담당 매장 변경은 설정의 권한 및 계정에서 관리합니다.</p>
      </aside> : null}
    </div>
  </>;
}

import type { AccountRole, Employee, Store } from '../../domain/types';
import {
  accountActions,
  accountMenus,
  formatRelative,
  getStoreSummary,
  roleLabels,
  statusLabels,
} from './accountSettingsModel';
import { ListSkeleton } from '../common/Skeleton';
import { SettingsIcon } from './SettingsIcon';
import { useAccountManagement } from './useAccountManagement';

type AccountManagementSettingsProps = {
  canCreate: boolean;
  canUpdate: boolean;
  stores: Store[];
  employees: Employee[];
  canManageManagers: boolean;
  onBack: () => void;
};

export function AccountManagementSettings({ canCreate, canUpdate, stores, employees, canManageManagers, onBack }: AccountManagementSettingsProps) {
  const {
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
    selectAccount,
    submitAccount,
    toggleAllStores,
    toggleStore,
    updatePermission,
  } = useAccountManagement({ canCreate, canUpdate, stores, employees });
  const canEditDraft = (draft.id ? canUpdate : canCreate) && (canManageManagers || draft.role === 'employee' || !draft.id);

  return (
    <>
      <header className="settings-detail-header">
        <button className="settings-back-button" type="button" onClick={onBack}>← 설정으로 돌아가기</button>
        <div><h1>권한 및 계정</h1><p>관리자 계정과 역할별 접근 권한을 관리합니다.</p></div>
      </header>
      <div className="account-settings-layout">
        <section className="account-settings-main">
          <div className="account-settings-toolbar">
            <label><SettingsIcon name="search" /><input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="이름, 아이디 검색" /></label>
            <div className="account-tabs" aria-label="계정 필터">
              {([['all', '전체 계정'], ['managers', '매니저'], ['employees', '일반 직원'], ['active', '활성'], ['inactive', '비활성']] as const).map(([id, label]) => <button type="button" className={activeTab === id ? 'is-active' : undefined} onClick={() => setActiveTab(id)} key={id}>{label}</button>)}
            </div>
            <button className="primary" type="button" onClick={openNewAccount} disabled={!canCreate}>+ 계정 추가</button>
          </div>
          <div className="account-summary-strip">
            <span>전체 {accounts.length}명</span>
            <span>활성 {stats.active}명</span>
            <span>관리자 {stats.managers}명</span>
            <span>직원 {stats.employees}명</span>
          </div>
          <div className="account-table" role="table" aria-label="계정 목록">
            <div className="account-table-head" role="row">
              <span>이름</span><span>아이디</span><span>역할</span><span>담당 매장</span><span>최근 접속</span><span>상태</span>
            </div>
            {isLoading ? <ListSkeleton rows={5} /> : null}
            {!isLoading && !filteredAccounts.length ? <p className="account-empty">검색 결과가 없습니다.</p> : null}
            {!isLoading && filteredAccounts.map((account) => (
              <button
                type="button"
                className={`account-row ${account.id === selectedAccountId ? 'is-selected' : ''}`}
                key={account.id}
                onClick={() => selectAccount(account)}
              >
                <span className="account-name"><strong>{account.displayName}</strong></span>
                <span>{account.username}</span>
                <span><em className={`account-role ${account.role}`}>{roleLabels[account.role]}</em></span>
                <span>{getStoreSummary(account.storeIds, stores)}</span>
                <span>{formatRelative(account.lastSignedInAt)}</span>
                <span><em className={`account-status ${account.status}`}>{statusLabels[account.status]}</em></span>
              </button>
            ))}
          </div>
          <div className="account-list-footer"><span>표시 {filteredAccounts.length}명 / 전체 {accounts.length}명</span></div>
        </section>
        <aside className="account-editor-panel">
          <form onSubmit={submitAccount}>
            <header><h2>{draft.id ? '계정 수정' : '계정 추가'}</h2><button type="button" onClick={onBack} aria-label="닫기">×</button></header>
            <div className="account-editor-grid">
              <label>이름<input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} disabled={!canEditDraft} required /></label>
              <label>아이디<input value={draft.username} onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))} disabled={!canEditDraft} required /></label>
              {!draft.id ? <label>초기 비밀번호<input type="password" autoComplete="new-password" value={draft.password ?? ''} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} disabled={!canEditDraft} placeholder="미입력 시 안전한 비밀번호 자동 생성" /></label> : null}
            </div>
            <label className="account-select-field">역할<select value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as AccountRole, employeeId: event.target.value === 'employee' ? current.employeeId : null }))} disabled={!canEditDraft || (!canManageManagers && Boolean(draft.id))}>{canManageManagers ? <option value="super_admin">최고 관리자</option> : null}{canManageManagers ? <option value="manager">관리자</option> : null}<option value="employee">일반 직원</option></select><small>{draft.role === 'employee' ? '본인 스케줄과 휴무 신청만 이용합니다.' : '지정된 매장의 관리 기능을 이용합니다.'}</small></label>
            {draft.role === 'employee' ? <label className="account-select-field">연결 직원<select value={draft.employeeId ?? ''} onChange={(event) => setDraft((current) => ({ ...current, employeeId: event.target.value || null, displayName: employees.find((employee) => employee.id === event.target.value)?.name ?? current.displayName, storeIds: employees.find((employee) => employee.id === event.target.value)?.storeIds ?? current.storeIds }))} disabled={!canEditDraft} required><option value="">직원을 선택하세요</option>{employees.filter((employee) => employee.isActive !== false && (!employee.accountId || employee.id === draft.employeeId)).map((employee) => <option value={employee.id} key={employee.id}>{employee.name}</option>)}</select></label> : null}
            <section className="account-store-field">
              <div><strong>담당 매장</strong><button type="button" className={allStoresSelected ? 'is-selected' : undefined} onClick={toggleAllStores} disabled={!canEditDraft}>전체 매장</button></div>
              <div>{stores.map((store) => <button type="button" className={draft.storeIds.includes(store.id) ? 'is-selected' : undefined} key={store.id} onClick={() => toggleStore(store.id)} disabled={!canEditDraft}>{store.name}</button>)}</div>
              <small>전체 매장을 누르면 모든 매장을 한 번에 선택하거나 해제합니다.</small>
            </section>
            <section className="permission-matrix">
              <h3>메뉴 접근 권한</h3>
              <div className="permission-head"><span>메뉴</span>{accountActions.map((action) => <span key={action.id}>{action.label}</span>)}</div>
              {accountMenus.map((menu) => (
                <div className="permission-row" key={menu.id}>
                  <span><SettingsIcon name={menu.icon} />{menu.label}</span>
                  {accountActions.map((action) => (
                    <button
                      type="button"
                      className={draft.permissions[menu.id][action.id] ? 'is-on' : undefined}
                      key={action.id}
                      onClick={() => updatePermission(menu.id, action.id)}
                      disabled={!canEditDraft || draft.role === 'employee' || draft.role === 'super_admin'}
                      aria-label={`${menu.label} ${action.label}`}
                    ><i /></button>
                  ))}
                </div>
              ))}
            </section>
            <div className="account-bottom-grid">
              <section className="account-active-field">
                <strong>계정 상태</strong>
                <button type="button" className={`account-status-toggle ${draft.status === 'active' ? 'is-on' : ''}`} onClick={() => setDraft((current) => ({ ...current, status: current.status === 'active' ? 'inactive' : 'active' }))} disabled={!canEditDraft}><i />{draft.status === 'active' ? '활성' : '비활성'}</button>
                <small>비활성화하면 로그인할 수 없습니다.</small>
              </section>
            </div>
            {initialPassword ? <div className="initial-password-notice" role="status"><strong>임시 비밀번호</strong><code>{initialPassword}</code><small>이 화면을 닫으면 다시 확인할 수 없습니다. 직원에게 안전하게 전달해주세요.</small></div> : null}
            {message ? <p className={message.includes('오류') || message.includes('못') || message.includes('권한') ? 'account-message is-error' : 'account-message'}>{message}</p> : null}
            <div className="account-editor-actions">{draft.id ? <button type="button" onClick={resetPassword} disabled={!canUpdate || isSaving}>비밀번호 초기화</button> : null}<button type="button" onClick={resetDraft} disabled={isSaving}>취소</button><button className="primary" type="submit" disabled={!canEditDraft || isSaving}>{isSaving ? '저장 중...' : '변경 저장'}</button></div>
          </form>
        </aside>
      </div>
    </>
  );
}

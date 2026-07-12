import type { AccountRole, Store } from '../../domain/types';
import {
  accountActions,
  accountMenus,
  formatRelative,
  getStoreSummary,
  roleLabels,
  statusLabels,
} from './accountSettingsModel';
import { SettingsIcon } from './SettingsIcon';
import { useAccountManagement } from './useAccountManagement';

type AccountManagementSettingsProps = {
  canCreate: boolean;
  canUpdate: boolean;
  stores: Store[];
  onBack: () => void;
};

export function AccountManagementSettings({ canCreate, canUpdate, stores, onBack }: AccountManagementSettingsProps) {
  const {
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
  } = useAccountManagement({ canCreate, canUpdate, stores });
  const canEditDraft = draft.id ? canUpdate : canCreate;

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
            <div className="account-tabs">
              <button type="button" className={activeTab === 'accounts' ? 'is-active' : undefined} onClick={() => setActiveTab('accounts')}>관리자 계정</button>
              <button type="button" className={activeTab === 'groups' ? 'is-active' : undefined} onClick={() => setActiveTab('groups')}>권한 그룹</button>
            </div>
            <button className="primary" type="button" onClick={openNewAccount} disabled={!canCreate}>+ 관리자 초대</button>
          </div>
          <div className="account-summary-strip">
            <span>전체 {accounts.length}명</span>
            <span>활성 {stats.active}명</span>
            <span>관리자 {stats.managers}명</span>
          </div>
          <div className="account-table" role="table" aria-label="계정 목록">
            <div className="account-table-head" role="row">
              <span>이름</span><span>이메일</span><span>역할</span><span>담당 매장</span><span>최근 접속</span><span>상태</span>
            </div>
            {isLoading ? <p className="account-empty">계정 정보를 불러오고 있습니다.</p> : null}
            {!isLoading && !filteredAccounts.length ? <p className="account-empty">검색 결과가 없습니다.</p> : null}
            {!isLoading && filteredAccounts.map((account) => (
              <button
                type="button"
                className={`account-row ${account.id === selectedAccountId ? 'is-selected' : ''}`}
                key={account.id}
                onClick={() => selectAccount(account)}
              >
                <span className="account-name"><strong>{account.displayName}</strong></span>
                <span>{account.email || '-'}</span>
                <span><em className={`account-role ${account.role}`}>{roleLabels[account.role]}</em></span>
                <span>{getStoreSummary(account.storeIds, stores)}</span>
                <span>{formatRelative(account.lastSignedInAt)}</span>
                <span><em className={`account-status ${account.status}`}>{statusLabels[account.status]}</em></span>
              </button>
            ))}
          </div>
          <div className="account-list-footer"><button type="button" disabled>‹</button><strong>1</strong><button type="button" disabled>›</button><span>1-{filteredAccounts.length} / {filteredAccounts.length}</span></div>
        </section>
        <aside className="account-editor-panel">
          <form onSubmit={submitAccount}>
            <header><h2>{draft.id ? '권한 수정' : '관리자 초대'}</h2><button type="button" onClick={onBack} aria-label="닫기">×</button></header>
            <div className="account-editor-grid">
              <label>이름<input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} disabled={!canEditDraft} required /></label>
              <label>아이디<input value={draft.username} onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))} disabled={!canEditDraft} required /></label>
              <label>이메일<input value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} disabled={!canEditDraft} placeholder="admin@kingmw.com" /></label>
              {!draft.id ? <label>초기 비밀번호<input value={draft.password ?? ''} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} disabled={!canEditDraft} placeholder="미입력 시 아이디와 동일" /></label> : null}
            </div>
            <label className="account-select-field">역할<select value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as AccountRole }))} disabled={!canEditDraft}><option value="manager">관리자</option><option value="viewer">조회 전용</option></select><small>{draft.role === 'manager' ? '스케줄과 설정을 수정할 수 있습니다.' : '스케줄 조회 중심 권한입니다.'}</small></label>
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
                      disabled={!canEditDraft}
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
              <section className="account-invite-field">
                <strong>초대 메일</strong>
                <button type="button" disabled>재전송</button>
                <small>메일 발송 기능은 추후 연동 예정입니다.</small>
              </section>
            </div>
            {message ? <p className={message.includes('저장') ? 'account-message' : 'account-message is-error'}>{message}</p> : null}
            <div className="account-editor-actions"><button type="button" onClick={resetDraft}>취소</button><button className="primary" type="submit" disabled={!canEditDraft}>변경 저장</button></div>
          </form>
        </aside>
      </div>
    </>
  );
}

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { BaseShiftRule, Employee, Store } from '../../domain/types';
import { SettingsIcon } from './SettingsIcon';

type StoreDraft = {
  name: string;
  address: string;
  phone: string;
  tagsText: string;
  memo: string;
  isActive: boolean;
  color: string;
};

type StoreManagementSettingsProps = {
  stores: Store[];
  employees: Employee[];
  baseShifts: BaseShiftRule[];
  onBack: () => void;
  onStoresChange: (stores: Store[]) => void;
};

const storeColors = ['purple', 'blue', 'green', 'orange', 'red'];

export function StoreManagementSettings({
  stores,
  employees,
  baseShifts,
  onBack,
  onStoresChange,
}: StoreManagementSettingsProps) {
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id ?? '');
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const selectedStore = stores.find((store) => store.id === selectedStoreId);
  const activeStore = isAddingStore ? null : selectedStore;
  const [draft, setDraft] = useState<StoreDraft>(() => createStoreDraft(stores[0]));
  const filteredStores = stores.filter((store) => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return true;

    return [
      store.name,
      store.address,
      store.phone,
      ...(store.tags ?? []),
    ].some((value) => value.toLowerCase().includes(keyword));
  });

  useEffect(() => {
    if (!stores.length) {
      setSelectedStoreId('');
      setIsAddingStore(true);
      setDraft(createStoreDraft());
      return;
    }

    if (!selectedStoreId || !stores.some((store) => store.id === selectedStoreId)) {
      setSelectedStoreId(stores[0].id);
    }
  }, [selectedStoreId, stores]);

  useEffect(() => {
    if (isAddingStore) return;
    setDraft(createStoreDraft(activeStore ?? undefined));
  }, [activeStore, isAddingStore]);

  const stats = useMemo(() => {
    const targetStoreId = activeStore?.id;

    return {
      employees: targetStoreId
        ? employees.filter((employee) => employee.storeIds.includes(targetStoreId)).length
        : 0,
      baseShifts: targetStoreId
        ? baseShifts.filter((rule) => rule.storeId === targetStoreId).length
        : 0,
    };
  }, [activeStore?.id, baseShifts, employees]);

  function openAddStore() {
    setIsAddingStore(true);
    setDraft(createStoreDraft());
  }

  function selectStore(storeId: string) {
    setSelectedStoreId(storeId);
    setIsAddingStore(false);
  }

  function resetDraft() {
    if (isAddingStore) {
      setDraft(createStoreDraft());
      return;
    }

    setDraft(createStoreDraft(activeStore ?? undefined));
  }

  function saveStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;

    const nextStore: Store = {
      id: activeStore?.id ?? crypto.randomUUID(),
      name,
      address: draft.address.trim(),
      phone: draft.phone.trim(),
      tags: draft.tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      memo: draft.memo.trim(),
      isActive: draft.isActive,
      color: draft.color,
    };

    const nextStores = activeStore
      ? stores.map((store) => store.id === activeStore.id ? nextStore : store)
      : [...stores, nextStore];

    onStoresChange(nextStores);
    setSelectedStoreId(nextStore.id);
    setIsAddingStore(false);
  }

  return (
    <>
      <header className="settings-detail-header">
        <button type="button" onClick={onBack}>‹ 설정</button>
        <div><h1>근무지 관리</h1><p>매장 정보와 운영 상태, 주소, 근무 가능 여부를 관리합니다.</p></div>
      </header>
      <div className="store-settings-layout">
        <section className="store-settings-main">
          <div className="store-settings-toolbar">
            <label><span><SettingsIcon name="search" /></span><input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="근무지 검색 (예: 사당점, 강남점)" /></label>
            <button className="primary" type="button" onClick={openAddStore}>+ 근무지 추가</button>
          </div>
          <div className="store-settings-list">
            {filteredStores.map((store) => {
              const employeeCount = employees.filter((employee) => employee.storeIds.includes(store.id)).length;

              return (
                <article
                  className={`store-settings-item ${store.id === activeStore?.id ? 'is-selected' : ''}`}
                  key={store.id}
                  onClick={() => selectStore(store.id)}
                >
                  <span className={`store-settings-icon ${store.color}`}><SettingsIcon name="building" /></span>
                  <div className="store-settings-info">
                    <div><strong>{store.name}</strong><em className={store.isActive ? 'is-active' : 'is-inactive'}>{store.isActive ? '운영중' : '비활성'}</em></div>
                    <p>{store.address || '주소 미입력'}</p>
                    <div>{(store.tags ?? []).map((tag) => <small key={tag}>{tag}</small>)}</div>
                  </div>
                  <div className="store-settings-meta"><span>직원 {employeeCount}명</span></div>
                </article>
              );
            })}
            {!filteredStores.length ? <p className="store-settings-empty">검색 결과가 없습니다.</p> : null}
          </div>
        </section>
        <aside className="store-editor-panel">
          <h2>{isAddingStore ? '근무지 추가' : '근무지 수정'}</h2>
          <form onSubmit={saveStore}>
            <label>근무지 이름<input value={draft.name} maxLength={20} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="사당점" required /><small>{draft.name.length} / 20</small></label>
            <label>주소<input value={draft.address} onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))} placeholder="서울 동작구 사당로 17, 2층" /></label>
            <label>연락처<input value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="02-522-1234" /></label>
            <div className="store-status-field"><span>운영 상태</span><button type="button" className={draft.isActive ? 'is-on' : ''} onClick={() => setDraft((current) => ({ ...current, isActive: !current.isActive }))}><i />{draft.isActive ? '운영중' : '비활성'}</button></div>
            <label>배지<input value={draft.tagsText} onChange={(event) => setDraft((current) => ({ ...current, tagsText: event.target.value }))} placeholder="카페, 음료, Wi-Fi" /><small>쉼표로 구분합니다.</small></label>
            <div className="store-color-field"><span>표시 색상</span><div>{storeColors.map((color) => <button type="button" className={`${color} ${draft.color === color ? 'is-selected' : ''}`} key={color} onClick={() => setDraft((current) => ({ ...current, color }))} aria-label={`${color} 색상`} />)}</div></div>
            <label>메모<textarea value={draft.memo} maxLength={200} onChange={(event) => setDraft((current) => ({ ...current, memo: event.target.value }))} placeholder="매장 관련 메모를 입력해주세요." rows={5} /><small>{draft.memo.length} / 200</small></label>
            <div className="store-editor-stats">
              <div><span><SettingsIcon name="users" /></span><strong>{stats.employees}명</strong><small>활성 직원 기준</small></div>
              <div><span><SettingsIcon name="calendar" /></span><strong>{stats.baseShifts}개</strong><small>등록된 기본 근무</small></div>
            </div>
            <div className="store-editor-actions"><button type="button" onClick={resetDraft}>취소</button><button className="primary" type="submit">변경 저장</button></div>
          </form>
        </aside>
      </div>
    </>
  );
}

function createStoreDraft(store?: Store): StoreDraft {
  return {
    name: store?.name ?? '',
    address: store?.address ?? '',
    phone: store?.phone ?? '',
    tagsText: store?.tags?.join(', ') ?? '',
    memo: store?.memo ?? '',
    isActive: store?.isActive ?? true,
    color: store?.color ?? 'purple',
  };
}

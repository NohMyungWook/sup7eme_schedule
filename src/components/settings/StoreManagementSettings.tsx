import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { BaseShiftRule, Employee, Store } from '../../domain/types';
import { colorClassName, colorInputValue, customColorStyle } from '../../utils/color';
import { SettingsIcon } from './SettingsIcon';

type StoreDraft = {
  name: string;
  address: string;
  phone: string;
  memo: string;
  isActive: boolean;
  color: string;
};

type StoreManagementSettingsProps = {
  stores: Store[];
  employees: Employee[];
  baseShifts: BaseShiftRule[];
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  onBack: () => void;
  onStoresChange: (stores: Store[]) => Promise<void> | void;
};

const storeColors = ['purple', 'blue', 'green', 'orange', 'red'];

export function StoreManagementSettings({
  stores,
  employees,
  baseShifts,
  canCreate,
  canDelete,
  canUpdate,
  onBack,
  onStoresChange,
}: StoreManagementSettingsProps) {
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id ?? '');
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggingStoreId, setDraggingStoreId] = useState<string | null>(null);
  const [orderedStores, setOrderedStores] = useState<Store[]>(stores);
  const [isSaving, setIsSaving] = useState(false);
  const selectedStore = stores.find((store) => store.id === selectedStoreId);
  const activeStore = isAddingStore ? null : selectedStore;
  const [draft, setDraft] = useState<StoreDraft>(() => createStoreDraft(stores[0]));
  const visibleStores = isReorderMode ? orderedStores : stores;
  const filteredStores = (isReorderMode ? visibleStores : visibleStores.filter((store) => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return true;

    return [
      store.name,
      store.address,
      store.phone,
    ].some((value) => value.toLowerCase().includes(keyword));
  }));

  useEffect(() => {
    if (!isReorderMode) setOrderedStores(stores);
  }, [isReorderMode, stores]);

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
    if (!canCreate) return;
    setIsReorderMode(false);
    setIsAddingStore(true);
    setDraft(createStoreDraft());
  }

  function selectStore(storeId: string) {
    if (isReorderMode) return;
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

  async function saveStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeStore ? !canUpdate : !canCreate) return;
    const name = draft.name.trim();
    if (!name) return;

    const nextStore: Store = {
      id: activeStore?.id ?? crypto.randomUUID(),
      name,
      address: draft.address.trim(),
      phone: draft.phone.trim(),
      memo: draft.memo.trim(),
      isActive: draft.isActive,
      color: draft.color,
    };

    const nextStores = activeStore
      ? stores.map((store) => store.id === activeStore.id ? nextStore : store)
      : [...stores, nextStore];

    setIsSaving(true);
    try {
      await onStoresChange(nextStores);
      setSelectedStoreId(nextStore.id);
      setIsAddingStore(false);
    } catch {
      // 공통 스케줄 상태에서 저장 오류를 표시하고 기존 DB 상태로 롤백합니다.
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteStore() {
    if (!activeStore || !canDelete) return;
    if (stores.length <= 1) {
      window.alert('최소 1개의 근무지는 필요합니다.');
      return;
    }
    const employeeCount = employees.filter((employee) => employee.storeIds.includes(activeStore.id)).length;
    const message = employeeCount
      ? `${activeStore.name} 근무지를 삭제할까요? 연결된 직원 ${employeeCount}명의 근무 가능 매장과 해당 근무지 스케줄도 함께 정리됩니다.`
      : `${activeStore.name} 근무지를 삭제할까요? 해당 근무지 스케줄도 함께 정리됩니다.`;
    if (!window.confirm(message)) return;

    const nextStores = stores.filter((store) => store.id !== activeStore.id);
    setIsSaving(true);
    try {
      await onStoresChange(nextStores);
      setSelectedStoreId(nextStores[0]?.id ?? '');
      setIsAddingStore(!nextStores.length);
      setDraft(createStoreDraft(nextStores[0]));
    } catch {
      // 공통 스케줄 상태에서 저장 오류를 표시하고 기존 DB 상태로 롤백합니다.
    } finally {
      setIsSaving(false);
    }
  }

  function toggleReorderMode() {
    if (isReorderMode) {
      onStoresChange(orderedStores);
    } else {
      setOrderedStores(stores);
    }
    setIsAddingStore(false);
    setSearchKeyword('');
    setDraggingStoreId(null);
    setIsReorderMode((current) => !current);
  }

  function moveStore(storeId: string, direction: -1 | 1) {
    const fromIndex = orderedStores.findIndex((store) => store.id === storeId);
    if (fromIndex < 0) return;
    const nextStores = reorderStores(orderedStores, fromIndex, fromIndex + direction);
    if (!nextStores) return;
    setOrderedStores(nextStores);
    onStoresChange(nextStores);
  }

  function reorderStores(storeList: Store[], fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= storeList.length || fromIndex === toIndex) return null;
    const nextStores = [...storeList];
    const [movedStore] = nextStores.splice(fromIndex, 1);
    nextStores.splice(toIndex, 0, movedStore);
    return nextStores;
  }

  function handleStoreDragOver(targetStoreId: string) {
    if (!draggingStoreId || draggingStoreId === targetStoreId) return;
    const fromIndex = orderedStores.findIndex((store) => store.id === draggingStoreId);
    const toIndex = orderedStores.findIndex((store) => store.id === targetStoreId);
    const nextStores = reorderStores(orderedStores, fromIndex, toIndex);
    if (nextStores) setOrderedStores(nextStores);
  }

  function finishStoreDrag() {
    if (draggingStoreId) onStoresChange(orderedStores);
    setDraggingStoreId(null);
  }

  return (
    <>
      <header className="settings-detail-header">
        <button className="settings-back-button" type="button" onClick={onBack}>← 설정으로 돌아가기</button>
        <div><h1>근무지 관리</h1><p>매장 정보와 운영 상태, 주소, 근무 가능 여부를 관리합니다.</p></div>
      </header>
      <div className="store-settings-layout">
        <section className="store-settings-main">
          <div className="store-settings-toolbar">
            <label><span><SettingsIcon name="search" /></span><input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} disabled={isReorderMode} placeholder={isReorderMode ? '위치 변경 중에는 검색을 사용할 수 없습니다.' : '근무지 검색 (예: 사당점, 강남점)'} /></label>
            <button className={`store-reorder-toggle ${isReorderMode ? 'is-active' : ''}`} type="button" onClick={toggleReorderMode} aria-pressed={isReorderMode}>
              <span aria-hidden="true">↕</span>{isReorderMode ? '완료' : '위치 변경'}
            </button>
            {canCreate ? <button className="primary" type="button" onClick={openAddStore}>+ 근무지 추가</button> : null}
          </div>
          {isReorderMode ? <p className="store-reorder-guide">근무지를 드래그하거나 화살표 버튼으로 순서를 변경하세요. 드래그가 끝나면 순서가 저장됩니다.</p> : null}
          <div className="store-settings-list">
            {filteredStores.map((store) => {
              const employeeCount = employees.filter((employee) => employee.storeIds.includes(store.id)).length;
              const storeIndex = orderedStores.findIndex((item) => item.id === store.id);

              return (
                <article
                  className={`store-settings-item ${store.id === activeStore?.id ? 'is-selected' : ''} ${isReorderMode ? 'is-reordering' : ''} ${draggingStoreId === store.id ? 'is-dragging' : ''}`}
                  draggable={isReorderMode}
                  key={store.id}
                  onDragEnd={finishStoreDrag}
                  onDragOver={(event) => {
                    if (!isReorderMode) return;
                    event.preventDefault();
                    handleStoreDragOver(store.id);
                  }}
                  onDragStart={(event) => {
                    if (!isReorderMode) return;
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('application/x-kingmw-store', store.id);
                    setDraggingStoreId(store.id);
                  }}
                  onClick={() => selectStore(store.id)}
                >
                  {isReorderMode ? (
                    <div className="store-order-controls" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => moveStore(store.id, -1)} disabled={storeIndex <= 0} aria-label={`${store.name} 위로 이동`}>↑</button>
                      <button type="button" onClick={() => moveStore(store.id, 1)} disabled={storeIndex >= orderedStores.length - 1} aria-label={`${store.name} 아래로 이동`}>↓</button>
                    </div>
                  ) : null}
                  <span className={`store-settings-icon ${colorClassName(store.color)}`} style={customColorStyle(store.color)}><SettingsIcon name="building" /></span>
                  <div className="store-settings-info">
                    <div><strong>{store.name}</strong><em className={store.isActive ? 'is-active' : 'is-inactive'}>{store.isActive ? '운영중' : '비활성'}</em></div>
                    <p>{store.address || '주소 미입력'}</p>
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
          <div className="store-editor-stats">
            <div><span>직원수</span><strong>{stats.employees}명</strong><small>활성 직원 기준</small></div>
            <div><span>기본 근무</span><strong>{stats.baseShifts}개</strong><small>등록된 기본 근무</small></div>
          </div>
          <form onSubmit={saveStore}>
            <label>근무지 이름<input value={draft.name} maxLength={20} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="사당점" required /><small>{draft.name.length} / 20</small></label>
            <label>주소<input value={draft.address} onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))} placeholder="서울 동작구 사당로 17, 2층" /></label>
            <label>연락처<input value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="02-522-1234" /></label>
            <div className="store-status-field"><span>운영 상태</span><button type="button" className={draft.isActive ? 'is-on' : ''} onClick={() => setDraft((current) => ({ ...current, isActive: !current.isActive }))}><i />{draft.isActive ? '운영중' : '비활성'}</button></div>
            <div className="store-color-field"><span>표시 색상</span><div>{storeColors.map((color) => <button type="button" className={`${color} ${draft.color === color ? 'is-selected' : ''}`} key={color} onClick={() => setDraft((current) => ({ ...current, color }))} aria-label={`${color} 색상`} />)}<label className={`color-rainbow-picker ${storeColors.includes(draft.color) ? '' : 'is-selected'}`} aria-label="직접 RGB 색상 선택"><input type="color" value={colorInputValue(draft.color)} onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))} /></label></div></div>
            <label>메모<textarea value={draft.memo} maxLength={200} onChange={(event) => setDraft((current) => ({ ...current, memo: event.target.value }))} placeholder="매장 관련 메모를 입력해주세요." rows={5} /><small>{draft.memo.length} / 200</small></label>
            <div className={`store-editor-actions ${!isAddingStore && activeStore ? 'has-danger' : ''}`}>
              {!isAddingStore && activeStore && canDelete ? <button className="danger" type="button" onClick={() => void deleteStore()} disabled={isSaving}>근무지 삭제</button> : null}
              <button type="button" onClick={resetDraft} disabled={isSaving}>취소</button>
              <button className="primary" type="submit" disabled={isSaving || (activeStore ? !canUpdate : !canCreate)}>{isSaving ? '저장 중...' : '변경 저장'}</button>
            </div>
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
    memo: store?.memo ?? '',
    isActive: store?.isActive ?? true,
    color: store?.color ?? 'purple',
  };
}

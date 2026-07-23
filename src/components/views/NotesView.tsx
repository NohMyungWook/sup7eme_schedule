import type { FormEvent } from 'react';
import { getStoreItemCount, getStoreName } from '../../domain/selectors';
import type { DayNote, Store } from '../../domain/types';
import { fullDateLabel } from '../../utils/schedule';
import { DatePicker } from '../common/DatePicker';
import { StoreFilter } from '../common/StoreFilter';
import { StoreSelect } from '../common/StoreSelect';

type NotesViewProps = {
  notes: DayNote[];
  stores: Store[];
  filteredNotes: DayNote[];
  storeFilter: string;
  memoStoreId: string;
  memoDate: string;
  memoText: string;
  editingMemoKey: string | null;
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  isSaving: boolean;
  onStoreFilterChange: (storeId: string) => void;
  onMemoStoreChange: (storeId: string) => void;
  onMemoDateChange: (date: string) => void;
  onMemoTextChange: (text: string) => void;
  onEdit: (note: DayNote) => void;
  onDelete: (note: DayNote) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function NotesView(props: NotesViewProps) {
  const { notes, stores, filteredNotes, storeFilter, memoStoreId, memoDate, memoText, editingMemoKey, canCreate, canDelete, canUpdate, isSaving } = props;
  const canEditForm = editingMemoKey ? canUpdate : canCreate;
  return (
    <>
      <header className="employee-page-header"><div><h1>메모 관리</h1><p>스케줄에 등록한 특이사항을 매장과 날짜별로 확인합니다.</p></div></header>
      <StoreFilter
        activeStoreId={storeFilter}
        stores={stores}
        totalCount={notes.length}
        ariaLabel="매장별 메모 필터"
        getCount={(storeId) =>
          getStoreItemCount(notes, storeId, (note, id) => note.storeId === id)
        }
        onChange={props.onStoreFilterChange}
      />
      <div className="memo-management-layout">
        <section className="memo-list" aria-label="특이사항 목록">
          {filteredNotes.map((note) => (
            <article className="memo-item" key={`${note.storeId}:${note.date}`}>
              <header><div><span>{getStoreName(note.storeId, stores)}</span><strong>{fullDateLabel(note.date)}</strong></div>
                {canUpdate || canDelete ? <div className="memo-item-actions">{canUpdate ? <button type="button" onClick={() => props.onEdit(note)} disabled={isSaving}>수정</button> : null}{canDelete ? <button className="danger" type="button" onClick={() => props.onDelete(note)} disabled={isSaving}>삭제</button> : null}</div> : null}
              </header>
              <p>{note.text}</p>
            </article>
          ))}
          {!filteredNotes.length ? <p className="employee-page-empty">해당 매장에 등록된 특이사항이 없습니다.</p> : null}
        </section>
        {canCreate || canUpdate ? (
          <form className="memo-editor-panel" onSubmit={props.onSubmit}>
            <div><h2>{editingMemoKey ? '특이사항 수정' : '특이사항 등록'}</h2><p>같은 매장과 날짜에 등록하면 기존 메모가 갱신됩니다.</p></div>
            <label>매장<StoreSelect stores={stores} value={memoStoreId} onChange={props.onMemoStoreChange} /></label>
            <label>날짜<DatePicker value={memoDate} onChange={props.onMemoDateChange} ariaLabel="특이사항 날짜 선택" /></label>
            <label>특이사항<textarea value={memoText} onChange={(event) => props.onMemoTextChange(event.target.value)} placeholder="교육, 대타, 청소, 연장 등 전달할 내용을 입력하세요." rows={7} required /></label>
            <div className="form-actions"><button type="button" onClick={props.onReset} disabled={isSaving}>초기화</button><button className="primary" type="submit" disabled={!canEditForm || isSaving}>{isSaving ? '저장 중...' : editingMemoKey ? '변경 저장' : '메모 등록'}</button></div>
          </form>
        ) : null}
      </div>
    </>
  );
}

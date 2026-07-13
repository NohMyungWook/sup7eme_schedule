import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { filterNotesByStore } from '../domain/selectors';
import type { DayNote, ScheduleState, Store } from '../domain/types';
import { formatDate } from '../utils/schedule';

type UseMemoManagementOptions = {
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  notes: DayNote[];
  stores: Store[];
  storeFilter: string;
  setSchedule: Dispatch<SetStateAction<ScheduleState>>;
};

export function useMemoManagement({ notes, stores, storeFilter, canCreate, canDelete, canUpdate, setSchedule }: UseMemoManagementOptions) {
  const filteredNotes = filterNotesByStore(notes, storeFilter);
  const [memoStoreId, setMemoStoreId] = useState(stores[0]?.id ?? '');
  const [memoDate, setMemoDate] = useState(formatDate(new Date()));
  const [memoText, setMemoText] = useState('');
  const [editingMemoKey, setEditingMemoKey] = useState<string | null>(null);

  function saveMemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((editingMemoKey ? !canUpdate : !canCreate) || !memoText.trim()) return;
    setSchedule((current) => ({
      ...current,
      notes: [
        ...current.notes.filter((note) => {
          const key = `${note.storeId}:${note.date}`;
          const isEditingTarget = editingMemoKey && key === editingMemoKey;
          const isNewTarget = note.storeId === memoStoreId && note.date === memoDate;
          return !isEditingTarget && !isNewTarget;
        }),
        { storeId: memoStoreId, date: memoDate, text: memoText.trim() },
      ],
    }));
    resetMemoForm();
  }

  function editMemo(note: DayNote) {
    if (!canUpdate) return;
    setMemoStoreId(note.storeId);
    setMemoDate(note.date);
    setMemoText(note.text);
    setEditingMemoKey(`${note.storeId}:${note.date}`);
  }

  function deleteMemo(note: DayNote) {
    if (!canDelete) return;
    setSchedule((current) => ({
      ...current,
      notes: current.notes.filter(
        (item) => !(item.storeId === note.storeId && item.date === note.date),
      ),
    }));
    if (editingMemoKey === `${note.storeId}:${note.date}`) resetMemoForm();
  }

  function resetMemoForm() {
    setMemoStoreId(storeFilter === 'all' ? stores[0]?.id ?? '' : storeFilter);
    setMemoDate(formatDate(new Date()));
    setMemoText('');
    setEditingMemoKey(null);
  }

  return {
    filteredNotes, memoStoreId, setMemoStoreId, memoDate, setMemoDate,
    memoText, setMemoText, editingMemoKey, saveMemo, editMemo, deleteMemo,
    resetMemoForm,
  };
}

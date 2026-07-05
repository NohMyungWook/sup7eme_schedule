import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { initialNotes, stores } from '../domain/data';
import { filterNotesByStore, findDayNote } from '../domain/selectors';
import type { DayNote, ScheduleState } from '../domain/types';
import { formatDate } from '../utils/schedule';

type UseMemoManagementOptions = {
  notes: DayNote[];
  storeId: string;
  selectedDate: string;
  storeFilter: string;
  isManager: boolean;
  setSchedule: Dispatch<SetStateAction<ScheduleState>>;
};

export function useMemoManagement({ notes, storeId, selectedDate, storeFilter, isManager, setSchedule }: UseMemoManagementOptions) {
  const selectedNote = findDayNote(notes, storeId, selectedDate);
  const filteredNotes = filterNotesByStore(notes, storeFilter);
  const [noteDraft, setNoteDraft] = useState(initialNotes[0].text);
  const [memoStoreId, setMemoStoreId] = useState(stores[0].id);
  const [memoDate, setMemoDate] = useState(formatDate(new Date()));
  const [memoText, setMemoText] = useState('');
  const [editingMemoKey, setEditingMemoKey] = useState<string | null>(null);

  useEffect(() => {
    setNoteDraft(selectedNote?.text ?? '');
  }, [selectedNote]);

  function saveNote() {
    if (!isManager) return;
    setSchedule((current) => {
      const otherNotes = current.notes.filter(
        (note) => !(note.storeId === storeId && note.date === selectedDate),
      );
      return {
        ...current,
        notes: noteDraft.trim()
          ? [...otherNotes, { storeId, date: selectedDate, text: noteDraft.trim() }]
          : otherNotes,
      };
    });
  }

  function saveMemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isManager || !memoText.trim()) return;
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
    setMemoStoreId(note.storeId);
    setMemoDate(note.date);
    setMemoText(note.text);
    setEditingMemoKey(`${note.storeId}:${note.date}`);
  }

  function deleteMemo(note: DayNote) {
    if (!isManager) return;
    setSchedule((current) => ({
      ...current,
      notes: current.notes.filter(
        (item) => !(item.storeId === note.storeId && item.date === note.date),
      ),
    }));
    if (editingMemoKey === `${note.storeId}:${note.date}`) resetMemoForm();
  }

  function resetMemoForm() {
    setMemoStoreId(storeFilter === 'all' ? stores[0].id : storeFilter);
    setMemoDate(formatDate(new Date()));
    setMemoText('');
    setEditingMemoKey(null);
  }

  return {
    selectedNote, filteredNotes, noteDraft, setNoteDraft, memoStoreId,
    setMemoStoreId, memoDate, setMemoDate, memoText, setMemoText,
    editingMemoKey, saveNote, saveMemo, editMemo, deleteMemo, resetMemoForm,
  };
}

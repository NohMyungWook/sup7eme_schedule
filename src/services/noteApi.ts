import type { DayNote } from '../domain/types';
import { apiRequest } from './apiClient';

export async function saveNoteToApi(note: DayNote) {
  const payload = await apiRequest<{ note: DayNote }>('/api/notes', {
    method: 'PUT', body: { note }, errorMessage: '메모를 저장하지 못했습니다.',
  });
  return payload.note;
}

export async function deleteNoteFromApi(storeId: string, date: string) {
  await apiRequest<{ storeId: string; date: string }>('/api/notes', {
    method: 'DELETE', body: { storeId, date }, errorMessage: '메모를 삭제하지 못했습니다.',
  });
}

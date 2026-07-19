import type { Store } from '../domain/types';
import { apiRequest } from './apiClient';

export async function saveStoresToApi(stores: Store[]) {
  await apiRequest<{ stores: Store[] }>('/api/stores', {
    method: 'PUT',
    body: { stores },
    errorMessage: '근무지 정보를 저장하지 못했습니다.',
  });
}

export async function deleteStoreFromApi(storeId: string) {
  await apiRequest<{ storeId: string }>('/api/stores', {
    method: 'DELETE',
    body: { storeId },
    errorMessage: '근무지를 삭제하지 못했습니다.',
  });
}

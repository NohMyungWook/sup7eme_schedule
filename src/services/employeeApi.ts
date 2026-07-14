import { apiRequest } from './apiClient';

export async function saveEmployeeOrder(employeeIds: string[]) {
  await apiRequest<{ employeeIds: string[] }>('/api/employee-order', {
    method: 'PUT',
    body: { employeeIds },
    errorMessage: '직원 순서를 저장하지 못했습니다.',
  });
}

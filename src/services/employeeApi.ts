import type { Employee } from '../domain/types';
import { apiRequest } from './apiClient';

type EmployeePayload = { employee: Employee; initialPassword?: string };

export async function createEmployee(employee: Employee, account?: { username: string; password?: string }) {
  return apiRequest<EmployeePayload>('/api/employees', {
    method: 'POST', body: { employee, account }, errorMessage: '직원을 추가하지 못했습니다.',
  });
}

export async function updateEmployee(employee: Employee) {
  return apiRequest<EmployeePayload>('/api/employees', {
    method: 'PUT', body: { employee }, errorMessage: '직원 정보를 수정하지 못했습니다.',
  });
}

export async function setEmployeeStatus(employeeId: string, status: 'active' | 'inactive' | 'terminated') {
  return apiRequest<{ employeeId: string; status: string; isActive: boolean }>('/api/employees', {
    method: 'PATCH', body: { action: 'set-status', employeeId, status }, errorMessage: '직원 상태를 변경하지 못했습니다.',
  });
}

export async function issueEmployeeAccount(employeeId: string, username: string, password?: string) {
  return apiRequest<{ accountId: string; username: string; initialPassword: string }>('/api/employees', {
    method: 'PATCH', body: { action: 'issue-account', employeeId, username, password }, errorMessage: '직원 계정을 발급하지 못했습니다.',
  });
}

export async function saveEmployeeOrder(employeeIds: string[]) {
  await apiRequest<{ employeeIds: string[] }>('/api/employee-order', {
    method: 'PUT',
    body: { employeeIds },
    errorMessage: '직원 순서를 저장하지 못했습니다.',
  });
}

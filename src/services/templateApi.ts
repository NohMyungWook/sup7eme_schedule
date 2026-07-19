import type { ShiftTemplate, TemplateDraft } from '../domain/types';
import { apiRequest } from './apiClient';

export async function saveTemplateToApi(id: string | null, draft: TemplateDraft) {
  const payload = await apiRequest<{ template: ShiftTemplate }>('/api/templates', {
    method: id ? 'PUT' : 'POST',
    body: { template: { id: id ?? undefined, ...draft } },
    errorMessage: '시간대를 저장하지 못했습니다.',
  });
  return payload.template;
}

export async function deactivateTemplate(templateId: string) {
  await apiRequest<{ templateId: string }>('/api/templates', {
    method: 'DELETE', body: { templateId }, errorMessage: '시간대를 비활성화하지 못했습니다.',
  });
}

export const profileColorOptions = ['#ddd6fe', '#f9a8d4', '#fdba74', '#fde68a', '#93c5fd'];

export const baseShiftTypes = [
  { value: 'open', label: '오전', startTime: '08:00', endTime: '15:00' },
  { value: 'middle', label: '오후', startTime: '15:00', endTime: '22:00' },
  { value: 'night', label: '야간', startTime: '22:00', endTime: '08:00' },
  { value: 'custom', label: '직접 입력', startTime: '00:00', endTime: '00:00' },
];

export function baseShiftTypeLabel(templateId: string) {
  if (templateId === 'open') return '오전';
  if (templateId === 'middle' || templateId === 'evening') return '오후';
  if (templateId === 'night' || templateId === 'sub') return '야간';
  if (templateId === 'custom') return '직접 입력';
  return '직접 입력';
}

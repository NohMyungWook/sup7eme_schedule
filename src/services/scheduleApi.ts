import type { ScheduleState } from '../domain/types';

export async function fetchScheduleState(): Promise<ScheduleState> {
  const response = await fetch('/api/schedule');
  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(payload.message ?? '스케줄 정보를 불러오지 못했습니다.');
  }

  return payload.state as ScheduleState;
}

export async function saveScheduleStateToApi(state: ScheduleState) {
  const response = await fetch('/api/schedule', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(payload.message ?? '스케줄 정보를 저장하지 못했습니다.');
  }

  return payload.state as ScheduleState;
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

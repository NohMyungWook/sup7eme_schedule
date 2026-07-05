import { useEffect, useState } from 'react';
import {
  loadScheduleState,
  saveScheduleState,
} from '../services/scheduleStorage';

export function usePersistentSchedule() {
  const [schedule, setSchedule] = useState(loadScheduleState);

  useEffect(() => {
    saveScheduleState(schedule);
  }, [schedule]);

  return [schedule, setSchedule] as const;
}

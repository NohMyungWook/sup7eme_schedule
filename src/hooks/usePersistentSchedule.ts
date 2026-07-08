import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Role, ScheduleState } from '../domain/types';
import {
  fetchScheduleState,
  saveScheduleStateToApi,
} from '../services/scheduleApi';

const emptySchedule: ScheduleState = {
  employees: [],
  shifts: [],
  notes: [],
  templates: [],
};

export function usePersistentSchedule(role: Role | null) {
  const [schedule, setScheduleState] = useState<ScheduleState>(emptySchedule);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hasLoadedRef = useRef(false);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    if (!role) {
      hasLoadedRef.current = false;
      skipNextSaveRef.current = true;
      setScheduleState(emptySchedule);
      setIsLoading(false);
      setErrorMessage('');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    fetchScheduleState()
      .then((nextSchedule) => {
        if (!isMounted) return;
        skipNextSaveRef.current = true;
        setScheduleState(nextSchedule);
        hasLoadedRef.current = true;
      })
      .catch((error: Error) => {
        if (!isMounted) return;
        setErrorMessage(error.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [role]);

  useEffect(() => {
    if (!role || !hasLoadedRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    saveScheduleStateToApi(schedule).catch((error: Error) => {
      setErrorMessage(error.message);
    });
  }, [role, schedule]);

  const setSchedule: Dispatch<SetStateAction<ScheduleState>> = (nextSchedule) => {
    setErrorMessage('');
    setScheduleState(nextSchedule);
  };

  return [schedule, setSchedule, { isLoading, errorMessage }] as const;
}

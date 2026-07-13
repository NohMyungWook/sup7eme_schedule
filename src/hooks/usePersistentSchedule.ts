import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Role, ScheduleState } from '../domain/types';
import {
  fetchScheduleState,
  saveScheduleStateToApi,
} from '../services/scheduleApi';

const emptySchedule: ScheduleState = {
  stores: [],
  employees: [],
  shifts: [],
  notes: [],
  templates: [],
};
const SAVE_DEBOUNCE_MS = 700;

export function usePersistentSchedule(role: Role | null) {
  const [schedule, setScheduleState] = useState<ScheduleState>(emptySchedule);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hasLoadedRef = useRef(false);
  const skipNextSaveRef = useRef(false);
  const latestScheduleRef = useRef(schedule);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const hasQueuedSaveRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    if (!role) {
      hasLoadedRef.current = false;
      setHasLoaded(false);
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
        setHasLoaded(true);
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

  const saveLatestSchedule = useCallback(async () => {
    if (!role || !hasLoadedRef.current) return;
    if (isSavingRef.current) {
      hasQueuedSaveRef.current = true;
      return;
    }

    isSavingRef.current = true;
    try {
      await saveScheduleStateToApi(latestScheduleRef.current);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '스케줄 정보를 저장하지 못했습니다.');
    } finally {
      isSavingRef.current = false;
      if (hasQueuedSaveRef.current) {
        hasQueuedSaveRef.current = false;
        void saveLatestSchedule();
      }
    }
  }, [role]);

  useEffect(() => {
    latestScheduleRef.current = schedule;
    if (!role || !hasLoadedRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveLatestSchedule();
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [role, saveLatestSchedule, schedule]);

  const setSchedule: Dispatch<SetStateAction<ScheduleState>> = (nextSchedule) => {
    setErrorMessage('');
    setScheduleState(nextSchedule);
  };

  return [schedule, setSchedule, { isLoading, hasLoaded, errorMessage }] as const;
}

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
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

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

  const persistSchedule = useCallback((nextSchedule: ScheduleState) => {
    if (!role || !hasLoadedRef.current) return;
    const queuedSave = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await saveScheduleStateToApi(nextSchedule);
      });
    saveQueueRef.current = queuedSave;
    return queuedSave;
  }, [role]);

  const saveLatestSchedule = useCallback(async () => {
    try {
      await persistSchedule(latestScheduleRef.current);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '스케줄 정보를 저장하지 못했습니다.');
    }
  }, [persistSchedule]);

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

  const setScheduleWithoutSave = useCallback((updater: SetStateAction<ScheduleState>) => {
    const nextSchedule = typeof updater === 'function'
      ? updater(latestScheduleRef.current)
      : updater;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    skipNextSaveRef.current = true;
    latestScheduleRef.current = nextSchedule;
    setErrorMessage('');
    setScheduleState(nextSchedule);
  }, []);

  const setScheduleAndSave = useCallback(async (updater: SetStateAction<ScheduleState>) => {
    const previousSchedule = latestScheduleRef.current;
    const nextSchedule = typeof updater === 'function'
      ? updater(previousSchedule)
      : updater;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    skipNextSaveRef.current = true;
    latestScheduleRef.current = nextSchedule;
    setErrorMessage('');
    setScheduleState(nextSchedule);

    try {
      await persistSchedule(nextSchedule);
    } catch (error) {
      if (latestScheduleRef.current === nextSchedule) {
        latestScheduleRef.current = previousSchedule;
        skipNextSaveRef.current = true;
        setScheduleState(previousSchedule);
      }
      const message = error instanceof Error ? error.message : '스케줄 정보를 저장하지 못했습니다.';
      setErrorMessage(message);
      throw error;
    }
  }, [persistSchedule]);

  return [schedule, setSchedule, { isLoading, hasLoaded, errorMessage }, setScheduleAndSave, setScheduleWithoutSave] as const;
}

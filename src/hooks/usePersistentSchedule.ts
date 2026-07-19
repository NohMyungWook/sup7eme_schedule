import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Role, ScheduleState } from '../domain/types';
import { fetchScheduleState } from '../services/scheduleApi';

const emptySchedule: ScheduleState = {
  stores: [], employees: [], shifts: [], notes: [], templates: [],
};

export function usePersistentSchedule(role: Role | null) {
  const [schedule, setScheduleState] = useState<ScheduleState>(emptySchedule);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const mountedRef = useRef(true);
  const isManager = role === 'manager' || role === 'super_admin';

  const reload = useCallback(async (showLoading = false) => {
    if (!isManager) return;
    if (showLoading) setIsLoading(true);
    setErrorMessage('');
    try {
      const nextSchedule = await fetchScheduleState();
      if (!mountedRef.current) return;
      setScheduleState((current) => ({ ...nextSchedule, shifts: current.shifts }));
      setHasLoaded(true);
    } catch (error) {
      if (mountedRef.current) setErrorMessage(error instanceof Error ? error.message : '스케줄 정보를 불러오지 못했습니다.');
    } finally {
      if (mountedRef.current && showLoading) setIsLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    mountedRef.current = true;
    if (!role) {
      setScheduleState(emptySchedule);
      setHasLoaded(false);
      setIsLoading(false);
      setErrorMessage('');
      return;
    }
    if (!isManager) {
      setScheduleState(emptySchedule);
      setHasLoaded(true);
      setIsLoading(false);
      return;
    }
    void reload(true);
    return () => { mountedRef.current = false; };
  }, [isManager, reload, role]);

  useEffect(() => {
    if (!isManager) return;
    const handleChanged = () => { void reload(false); };
    const handleFocus = () => { void reload(false); };
    window.addEventListener('sup7eme:data-changed', handleChanged);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('sup7eme:data-changed', handleChanged);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isManager, reload]);

  const setSchedule: Dispatch<SetStateAction<ScheduleState>> = (updater) => {
    setErrorMessage('');
    setScheduleState(updater);
  };
  const setScheduleWithoutSave = useCallback((updater: SetStateAction<ScheduleState>) => {
    setErrorMessage('');
    setScheduleState(updater);
  }, []);
  const waitForPendingSaves = useCallback(async () => undefined, []);

  return [schedule, setSchedule, { isLoading, hasLoaded, errorMessage, reload: () => reload(true) }, setScheduleWithoutSave, waitForPendingSaves] as const;
}

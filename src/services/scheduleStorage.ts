import {
  initialEmployees,
  initialNotes,
  initialShifts,
  initialTemplates,
  SESSION_KEY,
  STORAGE_KEY,
  stores,
} from '../domain/data';
import type {
  BaseShiftRule,
  Employee,
  Role,
  ScheduleState,
} from '../domain/types';
import { splitShiftTime, toDate } from '../utils/schedule';

function createInitialEmployees() {
  return initialEmployees.map((employee) => ({
    ...employee,
    baseShifts: initialShifts
      .filter((shift) => shift.employeeId === employee.id)
      .map((shift) => ({
        id: crypto.randomUUID(),
        storeId: shift.storeId,
        weekday: toDate(shift.date).getDay(),
        templateId: shift.templateId,
        ...splitShiftTime(shift.time),
      })),
  }));
}

function initialState(): ScheduleState {
  return {
    employees: createInitialEmployees(),
    shifts: initialShifts,
    notes: initialNotes,
    templates: initialTemplates,
  };
}

export function loadSessionRole(): Role | null {
  const savedRole = sessionStorage.getItem(SESSION_KEY);
  return savedRole === 'manager' || savedRole === 'viewer' ? savedRole : null;
}

export function saveSessionRole(role: Role) {
  sessionStorage.setItem(SESSION_KEY, role);
}

export function clearSessionRole() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function loadScheduleState(): ScheduleState {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initialState();

  try {
    const parsed = JSON.parse(saved) as {
      employees?: Array<
        Omit<Employee, 'storeIds' | 'baseShifts'> & {
          storeIds?: string[];
          baseShifts?: BaseShiftRule[];
        }
      >;
      shifts: ScheduleState['shifts'];
      notes: ScheduleState['notes'];
      templates?: ScheduleState['templates'];
    };
    const employees = parsed.employees?.length
      ? parsed.employees.map((employee) => {
          const validStoreIds =
            employee.storeIds?.filter((id) =>
              stores.some((store) => store.id === id),
            ) ?? [];
          const storesFromShifts = [
            ...new Set(
              parsed.shifts
                .filter((shift) => shift.employeeId === employee.id)
                .map((shift) => shift.storeId),
            ),
          ];
          return {
            ...employee,
            storeIds:
              validStoreIds.length > 0
                ? validStoreIds
                : storesFromShifts.length
                  ? storesFromShifts
                  : [stores[0].id],
            baseShifts: (employee.baseShifts ?? []).filter(
              (rule) =>
                stores.some((store) => store.id === rule.storeId) &&
                rule.weekday >= 0 &&
                rule.weekday <= 6,
            ),
          };
        })
      : createInitialEmployees();

    return {
      employees,
      shifts: parsed.shifts,
      notes: parsed.notes,
      templates: parsed.templates?.length ? parsed.templates : initialTemplates,
    };
  } catch {
    return initialState();
  }
}

export function saveScheduleState(state: ScheduleState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

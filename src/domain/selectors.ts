import { stores } from './data';
import type { DayNote, Employee, Shift } from './types';

export function getStoreName(storeId: string) {
  return stores.find((store) => store.id === storeId)?.name ?? storeId;
}

export function getStoreEmployees(employees: Employee[], storeId: string) {
  return employees.filter((employee) => employee.storeIds.includes(storeId));
}

export function filterEmployeesByStore(
  employees: Employee[],
  storeId: string,
) {
  return storeId === 'all'
    ? employees
    : getStoreEmployees(employees, storeId);
}

export function getStoreShifts(shifts: Shift[], storeId: string) {
  return shifts.filter((shift) => shift.storeId === storeId);
}

export function filterNotesByStore(notes: DayNote[], storeId: string) {
  return [...notes]
    .filter((note) => storeId === 'all' || note.storeId === storeId)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || a.storeId.localeCompare(b.storeId),
    );
}

export function getStoreItemCount<T>(
  items: T[],
  storeId: string,
  belongsToStore: (item: T, storeId: string) => boolean,
) {
  return items.filter((item) => belongsToStore(item, storeId)).length;
}

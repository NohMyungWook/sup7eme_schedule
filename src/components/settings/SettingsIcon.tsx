import type { ReactNode } from 'react';

export type SettingsIconName =
  | 'clock'
  | 'building'
  | 'users'
  | 'calendar'
  | 'bell'
  | 'shield'
  | 'holiday'
  | 'monitor'
  | 'search'
  | 'filter';

export function SettingsIcon({ name }: { name: SettingsIconName }) {
  const paths: Record<SettingsIconName, ReactNode> = {
    clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
    building: <><path d="M4 20h16" /><path d="M6 20V5a1 1 0 0 1 1-1h6v16" /><path d="M13 9h4a1 1 0 0 1 1 1v10" /><path d="M9 8h1M9 12h1M9 16h1M15 13h1M15 16h1" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 11a3 3 0 0 1 0 6" /><path d="M17 8a2.5 2.5 0 0 1 0 5" /></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /><path d="M8 14h3M13 14h3M8 17h3" /></>,
    bell: <><path d="M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M9.5 19a3 3 0 0 0 5 0" /></>,
    shield: <><path d="M12 3 19 6v6c0 4.5-2.8 7.3-7 9-4.2-1.7-7-4.5-7-9V6l7-3Z" /><path d="m9 12 2 2 4-5" /></>,
    holiday: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /><path d="m9 15 2 2 4-5" /></>,
    monitor: <><rect x="4" y="5" width="16" height="11" rx="2" /><path d="M8 20h8M12 16v4" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    filter: <><path d="M4 7h16M7 12h10M10 17h4" /></>,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

import { useEffect, useMemo, useState } from 'react';

type Role = 'viewer' | 'manager';
type ActiveView = 'dashboard' | 'schedule' | 'employees' | 'notes' | 'settings';

type Store = {
  id: string;
  name: string;
};

type BaseShiftRule = {
  id: string;
  storeId: string;
  weekday: number;
  templateId: string;
  startTime: string;
  endTime: string;
};

type Employee = {
  id: string;
  name: string;
  preference: string;
  color: string;
  storeIds: string[];
  baseShifts: BaseShiftRule[];
};

type EmployeeDraft = {
  name: string;
  preference: string;
  color: string;
  storeIds: string[];
};

type ShiftTemplate = {
  id: string;
  label: string;
  time: string;
  color: TemplateColor;
};

type TemplateColor = 'blue' | 'green' | 'orange' | 'purple' | 'navy' | 'red';

type TemplateDraft = {
  label: string;
  startTime: string;
  endTime: string;
  color: TemplateColor;
};

type Shift = {
  id: string;
  storeId: string;
  date: string;
  employeeId: string;
  templateId: string;
  time: string;
  note?: string;
};

type DayNote = {
  storeId: string;
  date: string;
  text: string;
};

type DraftShift = {
  date: string;
  employeeId: string;
  templateId: string;
  time: string;
  note: string;
};

type BaseShiftDraft = {
  weekday: number;
  templateId: string;
  startTime: string;
  endTime: string;
};

const STORAGE_KEY = 'sup7eme-schedule-v2';
const SESSION_KEY = 'kingmw-session-role';
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const templateColors: Array<{ value: TemplateColor; label: string }> = [
  { value: 'blue', label: '파랑' },
  { value: 'green', label: '초록' },
  { value: 'orange', label: '주황' },
  { value: 'purple', label: '보라' },
  { value: 'navy', label: '남색' },
  { value: 'red', label: '빨강' },
];

const stores: Store[] = [
  { id: 'sadang', name: '사당점' },
  { id: 'seokchon', name: '석촌점' },
  { id: 'gwacheon', name: '과천점' },
  { id: 'sinchon', name: '신촌점' },
];

const initialEmployees: Employee[] = [
  { id: 'myeongok', name: '명옥', preference: '오픈 선호', color: '#dceeff', storeIds: ['sadang', 'seokchon'] },
  { id: 'junwoo', name: '준우', preference: '미들 선호', color: '#dff5e7', storeIds: ['sadang'] },
  { id: 'seonwoo', name: '선우', preference: '미들/저녁 가능', color: '#fff1c7', storeIds: ['sadang', 'gwacheon'] },
  { id: 'jaesong', name: '재송', preference: '미들 선호', color: '#eadcff', storeIds: ['sadang'] },
  { id: 'eunji', name: '은지', preference: '저녁 선호', color: '#ffe0f0', storeIds: ['sadang', 'sinchon'] },
  { id: 'woojin', name: '우진', preference: '오픈 가능', color: '#dceeff', storeIds: ['sadang', 'gwacheon'] },
  { id: 'haneul', name: '하늘', preference: '미들/오픈 가능', color: '#dff5e7', storeIds: ['sadang', 'seokchon'] },
  { id: 'minhyeon', name: '민현', preference: '저녁 선호', color: '#e0ecff', storeIds: ['sadang'] },
  { id: 'sanghyeon', name: '상현', preference: '야간 고정', color: '#e2e5ea', storeIds: ['sadang'] },
  { id: 'suah', name: '수아', preference: '야간 보조', color: '#dbf7ff', storeIds: ['sadang', 'sinchon'] },
  { id: 'jinyoung', name: '진영', preference: '야간 보조', color: '#eadcff', storeIds: ['sadang', 'seokchon'] },
  { id: 'se-eun', name: '세은', preference: '대타 가능', color: '#ffe7e1', storeIds: ['sadang', 'gwacheon', 'sinchon'] },
  { id: 'hongju', name: '홍주', preference: '공휴일 보조', color: '#e7edff', storeIds: ['sadang'] },
  { id: 'sumin', name: '수민', preference: '주말 보조', color: '#eadcff', storeIds: ['sadang', 'seokchon'] },
].map((employee) => ({ ...employee, baseShifts: [] }));

const initialTemplates: ShiftTemplate[] = [
  { id: 'open', label: '오픈', time: '08:00-15:00', color: 'blue' },
  { id: 'middle', label: '오후 1', time: '15:00-22:00', color: 'green' },
  { id: 'evening', label: '오후 2', time: '17:00-23:00', color: 'orange' },
  { id: 'sub', label: '보조', time: '18:00-23:00', color: 'purple' },
  { id: 'night', label: '야간', time: '22:00-08:00', color: 'navy' },
  { id: 'custom', label: '?', time: '16:00-22:00', color: 'red' },
];

const initialWeekStart = '2025-06-15';

const initialShifts: Shift[] = [
  ['2025-06-15', 'myeongok', 'open', '08:00-15:00'],
  ['2025-06-15', 'junwoo', 'middle', '15:00-22:00'],
  ['2025-06-15', 'seonwoo', 'evening', '17:00-23:00'],
  ['2025-06-15', 'minhyeon', 'sub', '18:00-23:00'],
  ['2025-06-15', 'sanghyeon', 'night', '22:00-08:00'],
  ['2025-06-16', 'myeongok', 'open', '08:00-15:00'],
  ['2025-06-16', 'junwoo', 'middle', '15:00-22:00'],
  ['2025-06-16', 'seonwoo', 'evening', '17:00-23:00'],
  ['2025-06-16', 'minhyeon', 'sub', '18:00-23:00'],
  ['2025-06-16', 'sanghyeon', 'night', '22:00-08:00'],
  ['2025-06-17', 'woojin', 'open', '08:00-15:00'],
  ['2025-06-17', 'jaesong', 'middle', '14:00-22:00'],
  ['2025-06-17', 'eunji', 'evening', '17:00-23:00'],
  ['2025-06-17', 'jinyoung', 'sub', '18:00-22:00'],
  ['2025-06-17', 'jinyoung', 'night', '22:00-08:00'],
  ['2025-06-18', 'myeongok', 'open', '08:00-15:00'],
  ['2025-06-18', 'jaesong', 'middle', '15:00-22:00'],
  ['2025-06-18', 'eunji', 'evening', '17:00-23:00'],
  ['2025-06-18', 'suah', 'sub', '18:00-23:00'],
  ['2025-06-18', 'jinyoung', 'night', '22:00-08:00'],
  ['2025-06-19', 'myeongok', 'open', '08:00-15:00'],
  ['2025-06-19', 'haneul', 'middle', '15:00-22:00'],
  ['2025-06-19', 'myeongok', 'custom', '16:00-22:00', '명옥'],
  ['2025-06-19', 'jinyoung', 'custom', '16:30-23:00'],
  ['2025-06-19', 'se-eun', 'custom', '17:00-21:00'],
  ['2025-06-19', 'jinyoung', 'night', '22:00-08:00'],
  ['2025-06-19', 'hongju', 'night', '22:00-02:00'],
  ['2025-06-20', 'haneul', 'open', '08:00-15:00'],
  ['2025-06-20', 'myeongok', 'middle', '13:00-22:00'],
  ['2025-06-20', 'junwoo', 'middle', '15:00-21:00'],
  ['2025-06-20', 'jinyoung', 'evening', '16:00-22:00'],
  ['2025-06-20', 'suah', 'evening', '17:00-22:00'],
  ['2025-06-20', 'jinyoung', 'night', '22:00-08:00'],
  ['2025-06-20', 'hongju', 'night', '21:00-02:00'],
  ['2025-06-21', 'haneul', 'open', '08:00-15:00'],
  ['2025-06-21', 'se-eun', 'middle', '14:00-20:00'],
  ['2025-06-21', 'junwoo', 'middle', '15:00-22:00'],
  ['2025-06-21', 'seonwoo', 'evening', '16:00-22:00'],
  ['2025-06-21', 'sumin', 'sub', '19:00-24:00'],
  ['2025-06-21', 'jinyoung', 'night', '22:00-08:00'],
].map(([date, employeeId, templateId, time, note], index) => ({
  id: `seed-${index}`,
  storeId: 'sadang',
  date,
  employeeId,
  templateId,
  time,
  note,
}));

const initialNotes: DayNote[] = [
  {
    storeId: 'sadang',
    date: '2025-06-17',
    text: '한가하면 청소 + 퇴근 조율\n명옥 바쁘면 연장',
  },
];

function splitShiftTime(time: string) {
  const [rawStartTime, rawEndTime] = time.split('-');
  const startTime =
    parseTimeToMinutes(rawStartTime) === null ? '08:00' : rawStartTime;
  const validEndTime =
    parseTimeToMinutes(rawEndTime, true) === null ? '15:00' : rawEndTime;
  return {
    startTime,
    endTime: validEndTime === '24:00' ? '00:00' : validEndTime,
  };
}

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

function toDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: string, amount: number) {
  const date = toDate(value);
  date.setDate(date.getDate() + amount);
  return formatDate(date);
}

function getWeekDays(start: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getWeekStart(date: string) {
  return addDays(date, -toDate(date).getDay());
}

function getMonthDays(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return Array.from(
    { length: lastDay },
    (_, index) =>
      `${year}-${String(monthNumber).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
  );
}

function parseTimeToMinutes(value?: string, allow24 = false) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  if (
    minutes < 0 ||
    minutes > 59 ||
    hours < 0 ||
    hours > 24 ||
    (hours === 24 && (!allow24 || minutes !== 0))
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  if (value === 1440) {
    return '24:00';
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function shiftDuration(time: string) {
  const [startValue, endValue] = time.split('-');
  if (!startValue || !endValue) {
    return 0;
  }

  const start = parseTimeToMinutes(startValue);
  let end = parseTimeToMinutes(endValue, true);
  if (start === null || end === null || start === end) {
    return 0;
  }
  if (end <= start) {
    end += 1440;
  }
  return end - start;
}

function coverageGaps(date: string, storeShifts: Shift[]) {
  const intervals = storeShifts.flatMap((shift) => {
    const dayOffset =
      shift.date === date ? 0 : shift.date === addDays(date, -1) ? -1440 : null;
    if (dayOffset === null) {
      return [];
    }

    const [startValue, endValue] = shift.time.split('-');
    if (!startValue || !endValue) {
      return [];
    }

    const parsedStart = parseTimeToMinutes(startValue);
    const parsedEnd = parseTimeToMinutes(endValue, true);
    if (
      parsedStart === null ||
      parsedEnd === null ||
      parsedStart === parsedEnd
    ) {
      return [];
    }

    const start = parsedStart + dayOffset;
    let end = parsedEnd + dayOffset;
    if (end <= start) {
      end += 1440;
    }

    const clippedStart = Math.max(0, start);
    const clippedEnd = Math.min(1440, end);
    return clippedEnd > clippedStart ? [[clippedStart, clippedEnd]] : [];
  });

  const merged = intervals
    .sort((a, b) => a[0] - b[0])
    .reduce<number[][]>((result, interval) => {
      const last = result[result.length - 1];
      if (!last || interval[0] > last[1]) {
        result.push([...interval]);
      } else {
        last[1] = Math.max(last[1], interval[1]);
      }
      return result;
    }, []);

  const gaps: number[][] = [];
  let cursor = 0;
  merged.forEach(([start, end]) => {
    if (start > cursor) {
      gaps.push([cursor, start]);
    }
    cursor = Math.max(cursor, end);
  });
  if (cursor < 1440) {
    gaps.push([cursor, 1440]);
  }
  return gaps;
}

function formatKoreanRange(days: string[]) {
  const start = toDate(days[0]);
  const end = toDate(days[6]);
  return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 ~ ${end.getMonth() + 1}월 ${end.getDate()}일`;
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    day: 'numeric',
    weekday: 'short',
  }).format(toDate(date));
}

function fullDateLabel(date: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(toDate(date));
}

function employeeName(id: string, employees: Employee[]) {
  return employees.find((employee) => employee.id === id)?.name ?? id;
}

function templateById(id: string, templates: ShiftTemplate[]) {
  return templates.find((template) => template.id === id) ?? templates[0];
}

function sortByTime(shifts: Shift[]) {
  return [...shifts].sort((a, b) => a.time.localeCompare(b.time));
}

function createInitialDraft(date: string): DraftShift {
  return {
    date,
    employeeId: initialEmployees[0].id,
    templateId: initialTemplates[0].id,
    time: initialTemplates[0].time,
    note: '',
  };
}

function createInitialEmployeeDraft(storeId = stores[0].id): EmployeeDraft {
  return {
    name: '',
    preference: '',
    color: '#dceeff',
    storeIds: [storeId],
  };
}

function createInitialBaseShiftDraft(): BaseShiftDraft {
  return {
    weekday: 1,
    templateId: initialTemplates[0].id,
    startTime: '08:00',
    endTime: '15:00',
  };
}

function createInitialTemplateDraft(): TemplateDraft {
  return {
    label: '',
    startTime: '08:00',
    endTime: '15:00',
    color: 'blue',
  };
}

function loadSessionRole(): Role | null {
  const savedRole = sessionStorage.getItem(SESSION_KEY);
  return savedRole === 'manager' || savedRole === 'viewer' ? savedRole : null;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return {
      employees: createInitialEmployees(),
      shifts: initialShifts,
      notes: initialNotes,
      templates: initialTemplates,
    };
  }

  try {
    const parsed = JSON.parse(saved) as {
      employees?: Array<
        Omit<Employee, 'storeIds' | 'baseShifts'> & {
          storeIds?: string[];
          baseShifts?: BaseShiftRule[];
        }
      >;
      shifts: Shift[];
      notes: DayNote[];
      templates?: ShiftTemplate[];
    };
    const savedEmployees = parsed.employees?.length
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
      employees: savedEmployees,
      shifts: parsed.shifts,
      notes: parsed.notes,
      templates: parsed.templates?.length ? parsed.templates : initialTemplates,
    };
  } catch {
    return {
      employees: createInitialEmployees(),
      shifts: initialShifts,
      notes: initialNotes,
      templates: initialTemplates,
    };
  }
}

export default function App() {
  const [{ employees, shifts, notes, templates }, setSchedule] =
    useState(loadState);
  const [activeView, setActiveView] = useState<ActiveView>('schedule');
  const [storeId, setStoreId] = useState(stores[0].id);
  const [dashboardMonth, setDashboardMonth] = useState(initialWeekStart.slice(0, 7));
  const [employeeStoreFilter, setEmployeeStoreFilter] = useState('all');
  const [noteStoreFilter, setNoteStoreFilter] = useState('all');
  const [role, setRole] = useState<Role | null>(loadSessionRole);
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const [selectedDate, setSelectedDate] = useState(days[2]);
  const [draft, setDraft] = useState<DraftShift>(() => createInitialDraft(days[2]));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState(initialNotes[0].text);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployees[0].id);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeDraft, setEmployeeDraft] = useState<EmployeeDraft>(
    createInitialEmployeeDraft,
  );
  const [baseShiftDraft, setBaseShiftDraft] = useState<BaseShiftDraft>(
    createInitialBaseShiftDraft,
  );
  const [generationMessage, setGenerationMessage] = useState('');
  const [memoStoreId, setMemoStoreId] = useState(stores[0].id);
  const [memoDate, setMemoDate] = useState(formatDate(new Date()));
  const [memoText, setMemoText] = useState('');
  const [editingMemoKey, setEditingMemoKey] = useState<string | null>(null);
  const [draggingShiftId, setDraggingShiftId] = useState<string | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftTimeError, setShiftTimeError] = useState('');
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(
    createInitialTemplateDraft,
  );
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );

  const isManager = role === 'manager';
  const visibleShifts = shifts.filter((shift) => shift.storeId === storeId);
  const storeEmployees = employees.filter((employee) =>
    employee.storeIds.includes(storeId),
  );
  const filteredEmployees =
    employeeStoreFilter === 'all'
      ? employees
      : employees.filter((employee) =>
          employee.storeIds.includes(employeeStoreFilter),
        );
  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ??
    filteredEmployees[0];
  const scheduleSelectedEmployee =
    storeEmployees.find((employee) => employee.id === selectedEmployeeId) ??
    storeEmployees[0];
  const selectedEmployeeBaseShifts =
    selectedEmployee?.baseShifts
      .filter((rule) => rule.storeId === storeId)
      .sort(
        (a, b) =>
          a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
      ) ?? [];
  const selectedNote = notes.find(
    (note) => note.storeId === storeId && note.date === selectedDate,
  );
  const filteredNotes = [...notes]
    .filter(
      (note) => noteStoreFilter === 'all' || note.storeId === noteStoreFilter,
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || a.storeId.localeCompare(b.storeId),
    );
  const dashboardDays = useMemo(
    () => getMonthDays(dashboardMonth),
    [dashboardMonth],
  );
  const dashboardShifts = shifts.filter((shift) => shift.storeId === storeId);
  const dashboardEmployeeHours = storeEmployees
    .map((employee) => ({
      employee,
      minutes: dashboardShifts
        .filter(
          (shift) =>
            shift.employeeId === employee.id &&
            shift.date.startsWith(dashboardMonth),
        )
        .reduce((total, shift) => total + shiftDuration(shift.time), 0),
    }))
    .filter((item) => item.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
  const dashboardCoverage = dashboardDays.map((date) => {
    const dayShifts = dashboardShifts.filter((shift) => shift.date === date);
    const gaps = coverageGaps(date, dashboardShifts);
    return { date, shifts: dayShifts, gaps };
  });
  const dashboardGapDays = dashboardCoverage.filter(
    (day) => day.gaps.length > 0,
  );
  const dashboardTotalMinutes = dashboardEmployeeHours.reduce(
    (total, item) => total + item.minutes,
    0,
  );
  const draftShiftTime = splitShiftTime(draft.time);

  function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextRole =
      loginId === 'admin' && loginPassword === 'admin'
        ? 'manager'
        : loginId === 'redforce' && loginPassword === '1234'
          ? 'viewer'
          : null;

    if (!nextRole) {
      setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.');
      return;
    }

    sessionStorage.setItem(SESSION_KEY, nextRole);
    setRole(nextRole);
    setActiveView('schedule');
    setLoginPassword('');
    setLoginError('');
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setRole(null);
    setActiveView('schedule');
    setShowShiftModal(false);
    setLoginId('');
    setLoginPassword('');
    setLoginError('');
  }

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ employees, shifts, notes, templates }),
    );
  }, [employees, shifts, notes, templates]);

  useEffect(() => {
    if (!days.includes(selectedDate)) {
      setSelectedDate(days[0]);
      setDraft((current) => ({ ...current, date: days[0] }));
    }
  }, [days, selectedDate]);

  useEffect(() => {
    setNoteDraft(selectedNote?.text ?? '');
  }, [selectedNote]);

  useEffect(() => {
    if (activeView === 'schedule' && scheduleSelectedEmployee) {
      setSelectedEmployeeId(scheduleSelectedEmployee.id);
      setDraft((current) => ({
        ...current,
        employeeId: scheduleSelectedEmployee.id,
      }));
    }
  }, [activeView, scheduleSelectedEmployee, storeId]);

  useEffect(() => {
    if (
      activeView === 'employees' &&
      filteredEmployees.length &&
      !filteredEmployees.some((employee) => employee.id === selectedEmployeeId)
    ) {
      setSelectedEmployeeId(filteredEmployees[0].id);
    }
  }, [activeView, filteredEmployees, selectedEmployeeId]);

  useEffect(() => {
    if (role === 'viewer' && activeView !== 'schedule') {
      setActiveView('schedule');
    }
  }, [activeView, role]);

  useEffect(() => {
    const fallback = templates[0];
    if (!fallback) {
      return;
    }

    if (!templates.some((template) => template.id === draft.templateId)) {
      setDraft((current) => ({
        ...current,
        templateId: fallback.id,
        time: fallback.time,
      }));
    }

    if (
      !templates.some((template) => template.id === baseShiftDraft.templateId)
    ) {
      const { startTime, endTime } = splitShiftTime(fallback.time);
      setBaseShiftDraft((current) => ({
        ...current,
        templateId: fallback.id,
        startTime,
        endTime,
      }));
    }
  }, [baseShiftDraft.templateId, draft.templateId, templates]);

  function moveWeek(direction: -1 | 1) {
    setWeekStart((current) => addDays(current, direction * 7));
  }

  function openScheduleDate(date: string) {
    setSelectedDate(date);
    setWeekStart(getWeekStart(date));
    setDraft((current) => ({ ...current, date }));
    setActiveView('schedule');
  }

  function selectTemplate(templateId: string) {
    const template = templateById(templateId, templates);
    setDraft((current) => ({
      ...current,
      templateId,
      time: template.time,
    }));
    setShiftTimeError('');
  }

  function updateDraftTime(part: 'start' | 'end', value: string) {
    const current = splitShiftTime(draft.time);
    const startTime = part === 'start' ? value : current.startTime;
    const endTime = part === 'end' ? value : current.endTime;
    setDraft((draftValue) => ({
      ...draftValue,
      time: `${startTime}-${endTime}`,
    }));
    setShiftTimeError('');
  }

  function resetDraft(date = selectedDate) {
    setEditingId(null);
    setDraft((current) => ({
      ...createInitialDraft(date),
      employeeId: employees[0]?.id ?? initialEmployees[0].id,
      templateId: current.templateId,
      time: current.time,
    }));
  }

  function startAddShift(date: string) {
    if (!isManager) {
      return;
    }

    setSelectedDate(date);
    setEditingId(null);
    setDraft((current) => ({
      ...current,
      date,
      employeeId: scheduleSelectedEmployee?.id ?? current.employeeId,
    }));
    setShowShiftModal(true);
  }

  function submitShift(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isManager) {
      return;
    }

    const { startTime, endTime } = splitShiftTime(draft.time);
    if (startTime === endTime) {
      setShiftTimeError('시작 시간과 종료 시간은 다르게 입력해야 합니다.');
      return;
    }

    if (editingId) {
      setSchedule((current) => ({
        ...current,
        shifts: current.shifts.map((shift) =>
          shift.id === editingId ? { ...shift, ...draft, storeId } : shift,
        ),
      }));
    } else {
      setSchedule((current) => ({
        ...current,
        shifts: [
          ...current.shifts,
          {
            id: crypto.randomUUID(),
            storeId,
            ...draft,
          },
        ],
      }));
    }

    resetDraft(draft.date);
    setShowShiftModal(false);
  }

  function editShift(shift: Shift) {
    if (!isManager) {
      return;
    }

    setSelectedDate(shift.date);
    setEditingId(shift.id);
    setDraft({
      date: shift.date,
      employeeId: shift.employeeId,
      templateId: shift.templateId,
      time: shift.time,
      note: shift.note ?? '',
    });
    setShowShiftModal(true);
  }

  function deleteShift() {
    if (!editingId || !isManager) {
      return;
    }

    removeShift(editingId);
    setShowShiftModal(false);
  }

  function closeShiftModal() {
    setShowShiftModal(false);
    setShiftTimeError('');
    resetDraft();
  }

  function removeShift(shiftId: string) {
    if (!isManager) {
      return;
    }

    setSchedule((current) => ({
      ...current,
      shifts: current.shifts.filter((shift) => shift.id !== shiftId),
    }));
    if (editingId === shiftId) {
      resetDraft();
    }
    setDraggingShiftId(null);
  }

  function moveShiftToDate(shiftId: string, date: string) {
    if (!isManager) {
      return;
    }

    setSchedule((current) => ({
      ...current,
      shifts: current.shifts.map((shift) =>
        shift.id === shiftId ? { ...shift, date } : shift,
      ),
    }));
    if (editingId === shiftId) {
      setDraft((current) => ({ ...current, date }));
      setSelectedDate(date);
    }
    setDraggingShiftId(null);
  }

  function saveNote() {
    if (!isManager) {
      return;
    }

    setSchedule((current) => {
      const otherNotes = current.notes.filter(
        (note) => !(note.storeId === storeId && note.date === selectedDate),
      );

      return {
        ...current,
        notes: noteDraft.trim()
          ? [...otherNotes, { storeId, date: selectedDate, text: noteDraft.trim() }]
          : otherNotes,
      };
    });
  }

  function saveMemo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isManager || !memoText.trim()) {
      return;
    }

    setSchedule((current) => ({
      ...current,
      notes: [
        ...current.notes.filter((note) => {
          const key = `${note.storeId}:${note.date}`;
          const isEditingTarget = editingMemoKey && key === editingMemoKey;
          const isNewTarget =
            note.storeId === memoStoreId && note.date === memoDate;
          return !isEditingTarget && !isNewTarget;
        }),
        {
          storeId: memoStoreId,
          date: memoDate,
          text: memoText.trim(),
        },
      ],
    }));
    resetMemoForm();
  }

  function editMemo(note: DayNote) {
    setMemoStoreId(note.storeId);
    setMemoDate(note.date);
    setMemoText(note.text);
    setEditingMemoKey(`${note.storeId}:${note.date}`);
  }

  function deleteMemo(note: DayNote) {
    if (!isManager) {
      return;
    }

    setSchedule((current) => ({
      ...current,
      notes: current.notes.filter(
        (item) =>
          !(item.storeId === note.storeId && item.date === note.date),
      ),
    }));

    if (editingMemoKey === `${note.storeId}:${note.date}`) {
      resetMemoForm();
    }
  }

  function resetMemoForm() {
    setMemoStoreId(
      noteStoreFilter === 'all' ? stores[0].id : noteStoreFilter,
    );
    setMemoDate(formatDate(new Date()));
    setMemoText('');
    setEditingMemoKey(null);
  }

  function copyPreviousWeek() {
    if (!isManager) {
      return;
    }

    const copied = visibleShifts
      .filter((shift) => {
        const previousDate = addDays(shift.date, 7);
        return days.includes(previousDate);
      })
      .map((shift) => ({
        ...shift,
        id: crypto.randomUUID(),
        date: addDays(shift.date, 7),
      }));

    setSchedule((current) => ({
      ...current,
      shifts: [
        ...current.shifts.filter(
          (shift) => !(shift.storeId === storeId && days.includes(shift.date)),
        ),
        ...copied,
      ],
    }));
  }

  function generateBaseWeek() {
    if (!isManager) {
      return;
    }

    const generated = days.flatMap((date) => {
      const weekday = toDate(date).getDay();

      return storeEmployees.flatMap((employee) =>
        employee.baseShifts
          .filter(
            (rule) => rule.storeId === storeId && rule.weekday === weekday,
          )
          .map((rule) => ({
            id: crypto.randomUUID(),
            storeId,
            date,
            employeeId: employee.id,
            templateId: rule.templateId,
            time: `${rule.startTime}-${rule.endTime}`,
          })),
      );
    });

    if (!generated.length) {
      setGenerationMessage(
        '이 매장에 등록된 기본 근무 패턴이 없습니다. 직원 정보에서 먼저 등록하세요.',
      );
      return;
    }

    setSchedule((current) => ({
      ...current,
      shifts: [
        ...current.shifts.filter(
          (shift) => !(shift.storeId === storeId && days.includes(shift.date)),
        ),
        ...generated,
      ],
    }));
    setGenerationMessage(`${generated.length}건의 기본 근무를 생성했습니다.`);
  }

  function addDraggedEmployee(employeeId: string, date: string) {
    if (!isManager) {
      return;
    }

    setSchedule((current) => ({
      ...current,
      shifts: [
        ...current.shifts,
        {
          id: crypto.randomUUID(),
          storeId,
          date,
          employeeId,
          templateId: draft.templateId,
          time: draft.time,
        },
      ],
    }));
  }

  function saveEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isManager) {
      return;
    }

    const name = employeeDraft.name.trim();
    if (!name || !employeeDraft.storeIds.length) {
      return;
    }

    if (editingEmployeeId) {
      setSchedule((current) => ({
        ...current,
        employees: current.employees.map((employee) => {
          if (employee.id !== editingEmployeeId) {
            return employee;
          }

          return {
            ...employee,
            name,
            preference:
              employeeDraft.preference.trim() || '근무 조건 미입력',
            color: employeeDraft.color,
            storeIds: employeeDraft.storeIds,
            baseShifts: employee.baseShifts.filter((rule) =>
              employeeDraft.storeIds.includes(rule.storeId),
            ),
          };
        }),
      }));
    } else {
      const newEmployee: Employee = {
        id: crypto.randomUUID(),
        name,
        preference: employeeDraft.preference.trim() || '근무 조건 미입력',
        color: employeeDraft.color,
        storeIds: employeeDraft.storeIds,
        baseShifts: [],
      };

      setSchedule((current) => ({
        ...current,
        employees: [...current.employees, newEmployee],
      }));
      setSelectedEmployeeId(newEmployee.id);
      setDraft((current) => ({ ...current, employeeId: newEmployee.id }));
    }

    setEmployeeDraft(createInitialEmployeeDraft(storeId));
    setEditingEmployeeId(null);
    setShowEmployeeForm(false);
  }

  function openAddEmployee() {
    setEditingEmployeeId(null);
    setEmployeeDraft(
      createInitialEmployeeDraft(
        employeeStoreFilter === 'all' ? storeId : employeeStoreFilter,
      ),
    );
    setShowEmployeeForm(true);
  }

  function openEditEmployee(employee: Employee) {
    setSelectedEmployeeId(employee.id);
    setEditingEmployeeId(employee.id);
    setEmployeeDraft({
      name: employee.name,
      preference: employee.preference,
      color: employee.color,
      storeIds: [...employee.storeIds],
    });
    setShowEmployeeForm(true);
  }

  function closeEmployeeForm() {
    setShowEmployeeForm(false);
    setEditingEmployeeId(null);
    setEmployeeDraft(createInitialEmployeeDraft(storeId));
  }

  function deleteEmployee(employee: Employee) {
    if (
      !isManager ||
      !window.confirm(
        `${employee.name} 직원을 삭제할까요? 등록된 모든 근무 일정도 함께 삭제됩니다.`,
      )
    ) {
      return;
    }

    setSchedule((current) => ({
      ...current,
      employees: current.employees.filter((item) => item.id !== employee.id),
      shifts: current.shifts.filter((shift) => shift.employeeId !== employee.id),
    }));
    setSelectedEmployeeId(
      employees.find((item) => item.id !== employee.id)?.id ?? '',
    );
    closeEmployeeForm();
  }

  function selectManagedEmployee(employee: Employee) {
    setSelectedEmployeeId(employee.id);
    setBaseShiftDraft(createInitialBaseShiftDraft());
    if (!employee.storeIds.includes(storeId)) {
      setStoreId(employee.storeIds[0]);
    }
  }

  function toggleDraftStore(nextStoreId: string) {
    setEmployeeDraft((current) => ({
      ...current,
      storeIds: current.storeIds.includes(nextStoreId)
        ? current.storeIds.filter((id) => id !== nextStoreId)
        : [...current.storeIds, nextStoreId],
    }));
  }

  function selectBaseShiftTemplate(templateId: string) {
    const template = templateById(templateId, templates);
    const { startTime, endTime } = splitShiftTime(template.time);
    setBaseShiftDraft((current) => ({
      ...current,
      templateId,
      startTime,
      endTime,
    }));
  }

  function addBaseShift(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isManager || !selectedEmployee) {
      return;
    }

    const newRule: BaseShiftRule = {
      id: crypto.randomUUID(),
      storeId,
      ...baseShiftDraft,
    };

    setSchedule((current) => ({
      ...current,
      employees: current.employees.map((employee) =>
        employee.id === selectedEmployee.id
          ? {
              ...employee,
              baseShifts: [...employee.baseShifts, newRule],
            }
          : employee,
      ),
    }));
    setBaseShiftDraft(createInitialBaseShiftDraft());
    setGenerationMessage('');
  }

  function deleteBaseShift(ruleId: string) {
    if (!isManager || !selectedEmployee) {
      return;
    }

    setSchedule((current) => ({
      ...current,
      employees: current.employees.map((employee) =>
        employee.id === selectedEmployee.id
          ? {
              ...employee,
              baseShifts: employee.baseShifts.filter((rule) => rule.id !== ruleId),
            }
          : employee,
      ),
    }));
    setGenerationMessage('');
  }

  function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isManager || !templateDraft.label.trim()) {
      return;
    }

    const time = `${templateDraft.startTime}-${templateDraft.endTime}`;
    if (templateDraft.startTime === templateDraft.endTime) {
      return;
    }

    if (editingTemplateId) {
      setSchedule((current) => ({
        ...current,
        templates: current.templates.map((template) =>
          template.id === editingTemplateId
            ? {
                ...template,
                label: templateDraft.label.trim(),
                time,
                color: templateDraft.color,
              }
            : template,
        ),
      }));
      if (draft.templateId === editingTemplateId) {
        setDraft((current) => ({ ...current, time }));
      }
    } else {
      const newTemplate: ShiftTemplate = {
        id: crypto.randomUUID(),
        label: templateDraft.label.trim(),
        time,
        color: templateDraft.color,
      };
      setSchedule((current) => ({
        ...current,
        templates: [...current.templates, newTemplate],
      }));
    }

    closeTemplateForm();
  }

  function editTemplate(template: ShiftTemplate) {
    const { startTime, endTime } = splitShiftTime(template.time);
    setEditingTemplateId(template.id);
    setTemplateDraft({
      label: template.label,
      startTime,
      endTime,
      color: template.color,
    });
  }

  function closeTemplateForm() {
    setEditingTemplateId(null);
    setTemplateDraft(createInitialTemplateDraft());
  }

  function deleteTemplate(templateId: string) {
    if (
      !isManager ||
      templates.length <= 1 ||
      !window.confirm(
        '이 시간대를 삭제할까요? 사용 중인 근무는 다른 시간대로 자동 전환됩니다.',
      )
    ) {
      return;
    }

    const fallback = templates.find((template) => template.id !== templateId);
    if (!fallback) {
      return;
    }

    setSchedule((current) => ({
      ...current,
      templates: current.templates.filter(
        (template) => template.id !== templateId,
      ),
      shifts: current.shifts.map((shift) =>
        shift.templateId === templateId
          ? { ...shift, templateId: fallback.id }
          : shift,
      ),
      employees: current.employees.map((employee) => ({
        ...employee,
        baseShifts: employee.baseShifts.map((rule) =>
          rule.templateId === templateId
            ? { ...rule, templateId: fallback.id }
            : rule,
        ),
      })),
    }));

    if (draft.templateId === templateId) {
      setDraft((current) => ({
        ...current,
        templateId: fallback.id,
        time: fallback.time,
      }));
    }
    if (baseShiftDraft.templateId === templateId) {
      const { startTime, endTime } = splitShiftTime(fallback.time);
      setBaseShiftDraft((current) => ({
        ...current,
        templateId: fallback.id,
        startTime,
        endTime,
      }));
    }
    closeTemplateForm();
  }

  if (!role) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <div className="login-brand">
            <span className="brand-mark">S</span>
            <strong>KingMW</strong>
          </div>
          <div className="login-heading">
            <h1>로그인</h1>
            <p>계정 권한에 맞는 스케줄 화면으로 연결됩니다.</p>
          </div>
          <form className="login-form" onSubmit={login}>
            <label>
              아이디
              <input
                autoComplete="username"
                value={loginId}
                onChange={(event) => {
                  setLoginId(event.target.value);
                  setLoginError('');
                }}
                placeholder="아이디 입력"
                required
              />
            </label>
            <label>
              비밀번호
              <input
                autoComplete="current-password"
                type="password"
                value={loginPassword}
                onChange={(event) => {
                  setLoginPassword(event.target.value);
                  setLoginError('');
                }}
                placeholder="비밀번호 입력"
                required
              />
            </label>
            {loginError ? (
              <p className="login-error" role="alert">
                {loginError}
              </p>
            ) : null}
            <button className="primary" type="submit">
              로그인
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="workspace">
      <aside className="sidebar" aria-label="스케줄 관리 메뉴">
        <div className="brand">
          <span className="brand-mark">S</span>
          <strong>KingMW</strong>
        </div>

        <nav className="nav-list">
          {isManager ? (
            <button
              type="button"
              className={activeView === 'dashboard' ? 'is-active' : undefined}
              onClick={() => setActiveView('dashboard')}
            >
              대시보드
            </button>
          ) : null}
          <button
            type="button"
            className={activeView === 'schedule' ? 'is-active' : undefined}
            onClick={() => setActiveView('schedule')}
          >
            스케줄
          </button>
          {isManager ? (
            <>
              <button
                type="button"
                className={activeView === 'employees' ? 'is-active' : undefined}
                onClick={() => setActiveView('employees')}
              >
                직원
              </button>
              <button
                type="button"
                className={activeView === 'notes' ? 'is-active' : undefined}
                onClick={() => setActiveView('notes')}
              >
                메모
              </button>
              <button
                type="button"
                className={
                  activeView === 'settings' ? 'is-active' : undefined
                }
                onClick={() => setActiveView('settings')}
              >
                설정
              </button>
            </>
          ) : null}
        </nav>

        {activeView === 'schedule' && isManager ? (
          <section className="employee-panel" aria-labelledby="employee-title">
            <div className="panel-title">
              <h2 id="employee-title">현재 매장 직원</h2>
            </div>
            <div className="employee-list">
              {storeEmployees.map((employee) => (
                <article
                  className={`employee-card ${
                    scheduleSelectedEmployee?.id === employee.id
                      ? 'is-selected'
                      : ''
                  }`}
                  draggable={isManager}
                  key={employee.id}
                  onClick={() => {
                    setSelectedEmployeeId(employee.id);
                    setDraft((current) => ({
                      ...current,
                      employeeId: employee.id,
                    }));
                  }}
                  onDragStart={(event) =>
                    event.dataTransfer.setData(
                      'application/x-kingmw-employee',
                      employee.id,
                    )
                  }
                >
                  <span style={{ background: employee.color }}>
                    {employee.name.slice(0, 1)}
                  </span>
                  <div>
                    <strong>{employee.name}</strong>
                    <small>{employee.preference}</small>
                  </div>
                </article>
              ))}
              {!storeEmployees.length ? (
                <p className="empty-employees">
                  직원 탭에서 이 매장 직원을 등록하세요.
                </p>
              ) : null}
            </div>
            <p className="drop-hint">
              직원 카드를 날짜 칸으로 드래그해서 근무를 추가
            </p>
          </section>
        ) : null}
        <section className="session-panel">
          <div>
            <span>{isManager ? '매니저' : '직원'}</span>
            <strong>{isManager ? 'admin' : 'redforce'}</strong>
          </div>
          <button type="button" onClick={logout}>
            로그아웃
          </button>
        </section>
      </aside>

      <section
        className={`main-board ${
          activeView === 'dashboard'
            ? 'dashboard-board'
            : activeView === 'employees'
            ? 'employee-board'
            : activeView === 'notes'
              ? 'memo-board'
              : ''
        }`}
      >
        {activeView === 'dashboard' ? (
          <>
            <header className="dashboard-header">
              <div>
                <h1>월간 대시보드</h1>
                <p>근무시간과 비어 있는 운영 시간대를 월 단위로 확인합니다.</p>
              </div>
              <div className="dashboard-controls">
                <label>
                  매장
                  <select
                    value={storeId}
                    onChange={(event) => setStoreId(event.target.value)}
                  >
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  조회 월
                  <input
                    type="month"
                    value={dashboardMonth}
                    onChange={(event) => setDashboardMonth(event.target.value)}
                  />
                </label>
              </div>
            </header>

            <section className="dashboard-summary" aria-label="월간 운영 요약">
              <article>
                <span>등록 근무</span>
                <strong>
                  {
                    dashboardShifts.filter((shift) =>
                      shift.date.startsWith(dashboardMonth),
                    ).length
                  }
                  건
                </strong>
              </article>
              <article>
                <span>총 근무시간</span>
                <strong>{(dashboardTotalMinutes / 60).toFixed(1)}시간</strong>
              </article>
              <article className={dashboardGapDays.length ? 'has-warning' : ''}>
                <span>빈 시간 있는 날</span>
                <strong>{dashboardGapDays.length}일</strong>
              </article>
              <article>
                <span>근무 참여 직원</span>
                <strong>{dashboardEmployeeHours.length}명</strong>
              </article>
            </section>

            <div className="dashboard-main-grid">
              <section className="dashboard-panel employee-hours-panel">
                <div className="dashboard-panel-title">
                  <div>
                    <h2>직원별 이번 달 근무시간</h2>
                    <p>
                      {stores.find((store) => store.id === storeId)?.name} 배치
                      기준
                    </p>
                  </div>
                </div>
                <div className="employee-hours-list">
                  {dashboardEmployeeHours.map(({ employee, minutes }) => {
                    const maxMinutes = dashboardEmployeeHours[0]?.minutes || 1;
                    return (
                      <div className="employee-hours-item" key={employee.id}>
                        <span style={{ background: employee.color }}>
                          {employee.name.slice(0, 1)}
                        </span>
                        <div>
                          <strong>{employee.name}</strong>
                          <div>
                            <i
                              style={{
                                width: `${Math.max(4, (minutes / maxMinutes) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <b>{(minutes / 60).toFixed(1)}시간</b>
                      </div>
                    );
                  })}
                  {!dashboardEmployeeHours.length ? (
                    <p className="dashboard-empty">
                      이 달에 등록된 직원 근무가 없습니다.
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="dashboard-panel gap-alert-panel">
                <div className="dashboard-panel-title">
                  <div>
                    <h2>채워야 할 시간</h2>
                    <p>24시간 운영 기준 미배치 구간</p>
                  </div>
                </div>
                <div className="gap-alert-list">
                  {dashboardGapDays.map((day) => (
                    <button
                      type="button"
                      key={day.date}
                      onClick={() => openScheduleDate(day.date)}
                    >
                      <span>{fullDateLabel(day.date)}</span>
                      <strong>
                        {day.gaps
                          .map(
                            ([start, end]) =>
                              `${minutesToTime(start)}-${minutesToTime(end)}`,
                          )
                          .join(', ')}
                      </strong>
                    </button>
                  ))}
                  {!dashboardGapDays.length ? (
                    <p className="dashboard-empty">
                      모든 날짜의 운영 시간이 채워져 있습니다.
                    </p>
                  ) : null}
                </div>
              </section>
            </div>

            <section className="dashboard-panel calendar-panel">
              <div className="dashboard-panel-title">
                <div>
                  <h2>{dashboardMonth.replace('-', '년 ')}월 운영 현황</h2>
                  <p>날짜를 누르면 해당 주 스케줄로 이동합니다.</p>
                </div>
              </div>
              <div className="month-calendar">
                {weekdays.map((weekday) => (
                  <strong className="month-weekday" key={weekday}>
                    {weekday}
                  </strong>
                ))}
                {Array.from(
                  { length: toDate(dashboardDays[0]).getDay() },
                  (_, index) => (
                    <span className="calendar-blank" key={`blank-${index}`} />
                  ),
                )}
                {dashboardCoverage.map((day) => (
                  <button
                    className={`calendar-day ${
                      day.gaps.length ? 'has-gap' : 'is-covered'
                    }`}
                    type="button"
                    key={day.date}
                    onClick={() => openScheduleDate(day.date)}
                  >
                    <span>{toDate(day.date).getDate()}</span>
                    <small>{day.shifts.length}명 배치</small>
                    {day.gaps.length ? (
                      <em>
                        {day.gaps.length === 1
                          ? `${minutesToTime(day.gaps[0][0])}-${minutesToTime(
                              day.gaps[0][1],
                            )}`
                          : `빈 시간 ${day.gaps.length}구간`}
                      </em>
                    ) : (
                      <em>24시간 완료</em>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : activeView === 'settings' ? (
          <>
            <header className="employee-page-header">
              <div>
                <h1>시간대 설정</h1>
                <p>스케줄에서 사용하는 근무 이름, 기본 시간과 색상을 관리합니다.</p>
              </div>
            </header>

            <div className="template-settings-layout">
              <section className="template-settings-list">
                {templates.map((template) => (
                  <article
                    className={`template-settings-card ${template.color}`}
                    key={template.id}
                  >
                    <div>
                      <span>{template.label}</span>
                      <strong>{template.time}</strong>
                    </div>
                    <div className="template-settings-actions">
                      <button type="button" onClick={() => editTemplate(template)}>
                        수정
                      </button>
                      <button
                        className="danger"
                        type="button"
                        disabled={templates.length <= 1}
                        onClick={() => deleteTemplate(template.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </article>
                ))}
              </section>

              <form className="template-settings-form" onSubmit={saveTemplate}>
                <div>
                  <h2>
                    {editingTemplateId ? '시간대 수정' : '새 시간대 추가'}
                  </h2>
                  <p>시작과 종료 시간은 분 단위로 설정할 수 있습니다.</p>
                </div>
                <label>
                  시간대 이름
                  <input
                    value={templateDraft.label}
                    onChange={(event) =>
                      setTemplateDraft((current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                    placeholder="예: 오전 보조"
                    required
                  />
                </label>
                <div className="template-time-fields">
                  <label>
                    시작 시간
                    <input
                      type="time"
                      step="60"
                      value={templateDraft.startTime}
                      onChange={(event) =>
                        setTemplateDraft((current) => ({
                          ...current,
                          startTime: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <span>~</span>
                  <label>
                    종료 시간
                    <input
                      type="time"
                      step="60"
                      value={templateDraft.endTime}
                      onChange={(event) =>
                        setTemplateDraft((current) => ({
                          ...current,
                          endTime: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                </div>
                <fieldset className="template-color-field">
                  <legend>표시 색상</legend>
                  {templateColors.map((color) => (
                    <label className={color.value} key={color.value}>
                      <input
                        type="radio"
                        name="template-color"
                        value={color.value}
                        checked={templateDraft.color === color.value}
                        onChange={() =>
                          setTemplateDraft((current) => ({
                            ...current,
                            color: color.value,
                          }))
                        }
                      />
                      <span>{color.label}</span>
                    </label>
                  ))}
                </fieldset>
                <div className="template-preview">
                  <span>미리보기</span>
                  <div className={`template-chip ${templateDraft.color}`}>
                    <span>{templateDraft.label || '시간대 이름'}</span>
                    <strong>
                      {templateDraft.startTime}-{templateDraft.endTime}
                    </strong>
                  </div>
                </div>
                <div className="form-actions">
                  {editingTemplateId ? (
                    <button type="button" onClick={closeTemplateForm}>
                      취소
                    </button>
                  ) : (
                    <button type="button" onClick={closeTemplateForm}>
                      초기화
                    </button>
                  )}
                  <button
                    className="primary"
                    type="submit"
                    disabled={
                      !templateDraft.label.trim() ||
                      templateDraft.startTime === templateDraft.endTime
                    }
                  >
                    {editingTemplateId ? '변경 저장' : '시간대 추가'}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : activeView === 'employees' ? (
          <>
            <header className="employee-page-header">
              <div>
                <h1>직원 관리</h1>
                <p>직원 정보와 매장별 기본 근무 요일·시간을 관리합니다.</p>
              </div>
              <button
                className="primary employee-add-button"
                type="button"
                onClick={openAddEmployee}
              >
                + 직원 추가
              </button>
            </header>

            <div className="employee-filter" aria-label="매장별 직원 필터">
              <button
                type="button"
                className={employeeStoreFilter === 'all' ? 'is-selected' : undefined}
                onClick={() => setEmployeeStoreFilter('all')}
              >
                전체 {employees.length}
              </button>
              {stores.map((store) => {
                const count = employees.filter((employee) =>
                  employee.storeIds.includes(store.id),
                ).length;

                return (
                  <button
                    type="button"
                    className={
                      employeeStoreFilter === store.id ? 'is-selected' : undefined
                    }
                    key={store.id}
                    onClick={() => {
                      setEmployeeStoreFilter(store.id);
                      setStoreId(store.id);
                    }}
                  >
                    {store.name} {count}
                  </button>
                );
              })}
            </div>

            {showEmployeeForm && isManager ? (
              <form className="employee-management-form" onSubmit={saveEmployee}>
                <div className="employee-form-heading">
                  <div>
                    <h2>{editingEmployeeId ? '직원 정보 수정' : '새 직원 추가'}</h2>
                    <p>기본 인적 정보와 근무 가능한 매장을 설정합니다.</p>
                  </div>
                  <button type="button" onClick={closeEmployeeForm}>
                    닫기
                  </button>
                </div>
                <div className="employee-form-fields">
                  <label>
                    이름
                    <input
                      value={employeeDraft.name}
                      onChange={(event) =>
                        setEmployeeDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="직원 이름"
                      required
                    />
                  </label>
                  <label>
                    근무 메모
                    <input
                      value={employeeDraft.preference}
                      onChange={(event) =>
                        setEmployeeDraft((current) => ({
                          ...current,
                          preference: event.target.value,
                        }))
                      }
                      placeholder="오픈 선호, 야간 고정 등"
                    />
                  </label>
                  <label>
                    표시 색상
                    <input
                      type="color"
                      value={employeeDraft.color}
                      onChange={(event) =>
                        setEmployeeDraft((current) => ({
                          ...current,
                          color: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <fieldset className="store-checklist">
                    <legend>근무 매장 (다중 선택)</legend>
                    {stores.map((store) => (
                      <label key={store.id}>
                        <input
                          type="checkbox"
                          checked={employeeDraft.storeIds.includes(store.id)}
                          onChange={() => toggleDraftStore(store.id)}
                        />
                        <span>{store.name}</span>
                      </label>
                    ))}
                  </fieldset>
                </div>
                <div className="form-actions">
                  <button type="button" onClick={closeEmployeeForm}>
                    취소
                  </button>
                  <button
                    className="primary"
                    type="submit"
                    disabled={!employeeDraft.storeIds.length}
                  >
                    {editingEmployeeId ? '변경 저장' : '직원 추가'}
                  </button>
                </div>
              </form>
            ) : null}

            <div className="employee-management-layout">
              <section className="employee-card-grid" aria-label="직원 카드 목록">
                {filteredEmployees.map((employee) => (
                  <article
                    className={`management-employee-card ${
                      selectedEmployee?.id === employee.id ? 'is-selected' : ''
                    }`}
                    key={employee.id}
                    onClick={() => selectManagedEmployee(employee)}
                  >
                    <div className="management-card-heading">
                      <span style={{ background: employee.color }}>
                        {employee.name.slice(0, 1)}
                      </span>
                      <div>
                        <strong>{employee.name}</strong>
                        <small>{employee.preference}</small>
                      </div>
                    </div>
                    <div className="store-badges">
                      {employee.storeIds.map((employeeStoreId) => (
                        <span key={employeeStoreId}>
                          {stores.find((store) => store.id === employeeStoreId)?.name}
                        </span>
                      ))}
                    </div>
                    <div className="management-card-summary">
                      <span>기본 근무</span>
                      <strong>{employee.baseShifts.length}건</strong>
                    </div>
                    {isManager ? (
                      <div className="management-card-actions">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditEmployee(employee);
                          }}
                        >
                          정보 수정
                        </button>
                        <button
                          className="danger"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteEmployee(employee);
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
                {!filteredEmployees.length ? (
                  <p className="employee-page-empty">해당 매장에 등록된 직원이 없습니다.</p>
                ) : null}
              </section>

              {selectedEmployee ? (
                <aside className="employee-profile-panel">
                  <div className="profile-heading">
                    <span style={{ background: selectedEmployee.color }}>
                      {selectedEmployee.name.slice(0, 1)}
                    </span>
                    <div>
                      <h2>{selectedEmployee.name}</h2>
                      <p>{selectedEmployee.preference}</p>
                    </div>
                  </div>

                  <div className="profile-store-selector">
                    <strong>기본 근무정보 매장</strong>
                    <div>
                      {selectedEmployee.storeIds.map((employeeStoreId) => (
                        <button
                          type="button"
                          className={storeId === employeeStoreId ? 'is-selected' : undefined}
                          key={employeeStoreId}
                          onClick={() => setStoreId(employeeStoreId)}
                        >
                          {stores.find((store) => store.id === employeeStoreId)?.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="base-shift-section">
                    <div className="base-shift-title">
                      <strong>요일별 기본 근무</strong>
                      <small>
                        {stores.find((store) => store.id === storeId)?.name} 기준
                      </small>
                    </div>
                    <div className="base-shift-list">
                      {selectedEmployeeBaseShifts.map((rule) => (
                        <div className="base-shift-item" key={rule.id}>
                          <span>{weekdays[rule.weekday]}요일</span>
                          <strong>
                            {rule.startTime}-{rule.endTime}
                          </strong>
                          <small>
                            {templateById(rule.templateId, templates).label}
                          </small>
                          {isManager ? (
                            <button
                              type="button"
                              onClick={() => deleteBaseShift(rule.id)}
                            >
                              삭제
                            </button>
                          ) : null}
                        </div>
                      ))}
                      {!selectedEmployeeBaseShifts.length ? (
                        <p>이 매장의 기본 근무정보가 없습니다.</p>
                      ) : null}
                    </div>

                    {isManager ? (
                      <form className="base-shift-form profile-base-form" onSubmit={addBaseShift}>
                        <label>
                          요일
                          <select
                            value={baseShiftDraft.weekday}
                            onChange={(event) =>
                              setBaseShiftDraft((current) => ({
                                ...current,
                                weekday: Number(event.target.value),
                              }))
                            }
                          >
                            {weekdays.map((weekday, index) => (
                              <option key={weekday} value={index}>
                                {weekday}요일
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          근무 유형
                          <select
                            value={baseShiftDraft.templateId}
                            onChange={(event) =>
                              selectBaseShiftTemplate(event.target.value)
                            }
                          >
                            {templates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          시작 시간
                          <input
                            type="time"
                            value={baseShiftDraft.startTime}
                            onChange={(event) =>
                              setBaseShiftDraft((current) => ({
                                ...current,
                                startTime: event.target.value,
                              }))
                            }
                            required
                          />
                        </label>
                        <label>
                          종료 시간
                          <input
                            type="time"
                            value={baseShiftDraft.endTime}
                            onChange={(event) =>
                              setBaseShiftDraft((current) => ({
                                ...current,
                                endTime: event.target.value,
                              }))
                            }
                            required
                          />
                        </label>
                        <button className="primary" type="submit">
                          기본 근무 추가
                        </button>
                      </form>
                    ) : null}
                  </div>
                </aside>
              ) : null}
            </div>
          </>
        ) : activeView === 'notes' ? (
          <>
            <header className="employee-page-header">
              <div>
                <h1>메모 관리</h1>
                <p>스케줄에 등록한 특이사항을 매장과 날짜별로 확인합니다.</p>
              </div>
            </header>

            <div className="employee-filter" aria-label="매장별 메모 필터">
              <button
                type="button"
                className={noteStoreFilter === 'all' ? 'is-selected' : undefined}
                onClick={() => setNoteStoreFilter('all')}
              >
                전체 {notes.length}
              </button>
              {stores.map((store) => {
                const count = notes.filter(
                  (note) => note.storeId === store.id,
                ).length;

                return (
                  <button
                    type="button"
                    className={
                      noteStoreFilter === store.id ? 'is-selected' : undefined
                    }
                    key={store.id}
                    onClick={() => {
                      setNoteStoreFilter(store.id);
                      if (!editingMemoKey) {
                        setMemoStoreId(store.id);
                      }
                    }}
                  >
                    {store.name} {count}
                  </button>
                );
              })}
            </div>

            <div className="memo-management-layout">
              <section className="memo-list" aria-label="특이사항 목록">
                {filteredNotes.map((note) => (
                  <article
                    className="memo-item"
                    key={`${note.storeId}:${note.date}`}
                  >
                    <header>
                      <div>
                        <span>
                          {stores.find((store) => store.id === note.storeId)?.name}
                        </span>
                        <strong>{fullDateLabel(note.date)}</strong>
                      </div>
                      {isManager ? (
                        <div className="memo-item-actions">
                          <button type="button" onClick={() => editMemo(note)}>
                            수정
                          </button>
                          <button
                            className="danger"
                            type="button"
                            onClick={() => deleteMemo(note)}
                          >
                            삭제
                          </button>
                        </div>
                      ) : null}
                    </header>
                    <p>{note.text}</p>
                  </article>
                ))}
                {!filteredNotes.length ? (
                  <p className="employee-page-empty">
                    해당 매장에 등록된 특이사항이 없습니다.
                  </p>
                ) : null}
              </section>

              {isManager ? (
                <form className="memo-editor-panel" onSubmit={saveMemo}>
                  <div>
                    <h2>{editingMemoKey ? '특이사항 수정' : '특이사항 등록'}</h2>
                    <p>같은 매장과 날짜에 등록하면 기존 메모가 갱신됩니다.</p>
                  </div>
                  <label>
                    매장
                    <select
                      value={memoStoreId}
                      onChange={(event) => setMemoStoreId(event.target.value)}
                    >
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    날짜
                    <input
                      type="date"
                      value={memoDate}
                      onChange={(event) => setMemoDate(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    특이사항
                    <textarea
                      value={memoText}
                      onChange={(event) => setMemoText(event.target.value)}
                      placeholder="교육, 대타, 청소, 연장 등 전달할 내용을 입력하세요."
                      rows={7}
                      required
                    />
                  </label>
                  <div className="form-actions">
                    <button type="button" onClick={resetMemoForm}>
                      초기화
                    </button>
                    <button className="primary" type="submit">
                      {editingMemoKey ? '변경 저장' : '메모 등록'}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </>
        ) : (
          <>
        <header className="topbar">
          <select value={storeId} onChange={(event) => setStoreId(event.target.value)}>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </header>

        <div className="weekbar">
          <button type="button" onClick={() => moveWeek(-1)} aria-label="이전 주">
            ‹
          </button>
          <h1>{formatKoreanRange(days)}</h1>
          <button type="button" onClick={() => moveWeek(1)} aria-label="다음 주">
            ›
          </button>
          {isManager ? (
            <div className="week-actions">
              <button type="button" onClick={copyPreviousWeek}>
                지난주 복사
              </button>
              <button type="button" className="primary" onClick={generateBaseWeek}>
                기본 주 생성
              </button>
            </div>
          ) : null}
        </div>
        {generationMessage ? (
          <p className="generation-message" role="status">
            {generationMessage}
          </p>
        ) : null}

        {isManager ? (
          <div className="template-row">
            {templates.map((template) => (
              <button
                className={`template-chip ${template.color} ${
                  draft.templateId === template.id ? 'is-picked' : ''
                }`}
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template.id)}
              >
                <span>{template.label}</span>
                <strong>{template.time}</strong>
              </button>
            ))}
          </div>
        ) : null}

        <section className="schedule-grid" aria-label="주간 스케줄">
          {days.map((date) => {
            const dayShifts = sortByTime(
              visibleShifts.filter((shift) => shift.date === date),
            );

            return (
              <article
                className={`day-column ${selectedDate === date ? 'is-focused' : ''}`}
                key={date}
                onClick={() => {
                  setSelectedDate(date);
                  setDraft((current) => ({ ...current, date }));
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const shiftId = event.dataTransfer.getData(
                    'application/x-kingmw-shift',
                  );
                  if (shiftId) {
                    moveShiftToDate(shiftId, date);
                    return;
                  }

                  const employeeId = event.dataTransfer.getData(
                    'application/x-kingmw-employee',
                  );
                  if (employeeId) {
                    addDraggedEmployee(employeeId, date);
                  }
                }}
              >
                <header>
                  <strong>{dayLabel(date)}</strong>
                </header>

                <div className="shift-stack">
                  {dayShifts.map((shift) => {
                    const template = templateById(
                      shift.templateId,
                      templates,
                    );

                    return (
                      <article
                        className={`shift-card ${template.color} ${
                          draggingShiftId === shift.id ? 'is-dragging' : ''
                        }`}
                        draggable={isManager}
                        key={shift.id}
                        onDragEnd={() => setDraggingShiftId(null)}
                        onDragStart={(event) => {
                          event.stopPropagation();
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData(
                            'application/x-kingmw-shift',
                            shift.id,
                          );
                          setDraggingShiftId(shift.id);
                        }}
                      >
                        <button
                          className="shift-card-main"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            editShift(shift);
                          }}
                        >
                          <span>{shift.time}</span>
                          <strong>
                            {employeeName(shift.employeeId, employees)}
                          </strong>
                          {shift.note ? <small>{shift.note}</small> : null}
                        </button>
                      </article>
                    );
                  })}
                </div>

                {isManager ? (
                  <button
                    className="add-shift"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startAddShift(date);
                    }}
                  >
                    + 근무 추가
                  </button>
                ) : null}
              </article>
            );
          })}
        </section>
        {isManager ? (
          <div
            className={`shift-trash ${draggingShiftId ? 'is-active' : ''}`}
            onDragOver={(event) => {
              if (
                event.dataTransfer.types.includes(
                  'application/x-kingmw-shift',
                )
              ) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              const shiftId = event.dataTransfer.getData(
                'application/x-kingmw-shift',
              );
              if (shiftId) {
                removeShift(shiftId);
              }
            }}
          >
            <strong>근무 삭제</strong>
            <span>삭제할 근무 카드를 이곳으로 드래그하세요.</span>
          </div>
        ) : null}

        <section className="note-card">
          <div>
            <h2>{dayLabel(selectedDate)} 특이사항</h2>
            {selectedNote?.text ? (
              <ul>
                {selectedNote.text.split('\n').map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p>등록된 특이사항이 없습니다.</p>
            )}
          </div>
          {isManager ? (
            <div className="note-editor">
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                rows={3}
                placeholder="예: 한가하면 청소 + 퇴근 조율"
              />
              <button type="button" onClick={saveNote}>
                저장
              </button>
            </div>
          ) : null}
        </section>

        {isManager ? (
            <aside className="tips-card schedule-tips">
              <h2>편집 팁</h2>
              <ul>
                <li>직원 카드를 날짜 칸으로 드래그하면 선택된 시간대로 근무가 추가됩니다.</li>
                <li>근무 카드를 누르면 시간, 직원, 메모를 바로 수정할 수 있습니다.</li>
                <li>기본 주 생성은 직원 탭에서 등록한 요일별 기본 근무만 채웁니다.</li>
                <li>특이사항은 날짜별로 저장되어 모바일 보기에도 같이 표시됩니다.</li>
              </ul>
            </aside>
        ) : null}

        {showShiftModal && isManager ? (
          <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeShiftModal();
              }
            }}
          >
            <form
              className="shift-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shift-modal-title"
              onSubmit={submitShift}
            >
              <div className="shift-modal-heading">
                <div>
                  <h2 id="shift-modal-title">
                    {editingId ? '근무 수정' : '새 근무 추가'}
                  </h2>
                  <p>{dayLabel(draft.date)} 근무 정보를 입력하세요.</p>
                </div>
                <button type="button" onClick={closeShiftModal}>
                  닫기
                </button>
              </div>
              <div className="shift-modal-fields">
                <label>
                  날짜
                  <select
                    value={draft.date}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                  >
                    {days.map((date) => (
                      <option key={date} value={date}>
                        {dayLabel(date)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  직원
                  <select
                    value={draft.employeeId}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        employeeId: event.target.value,
                      }))
                    }
                  >
                    {storeEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  시간대
                  <select
                    value={draft.templateId}
                    onChange={(event) => selectTemplate(event.target.value)}
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="shift-time-range">
                  <label>
                    시작 시간
                    <input
                      type="time"
                      step="60"
                      value={draftShiftTime.startTime}
                      onChange={(event) =>
                        updateDraftTime('start', event.target.value)
                      }
                      required
                    />
                  </label>
                  <span aria-hidden="true">~</span>
                  <label>
                    종료 시간
                    <input
                      type="time"
                      step="60"
                      value={draftShiftTime.endTime}
                      onChange={(event) =>
                        updateDraftTime('end', event.target.value)
                      }
                      required
                    />
                  </label>
                </div>
                {shiftTimeError ? (
                  <p className="shift-time-error" role="alert">
                    {shiftTimeError}
                  </p>
                ) : null}
                <label className="shift-modal-note">
                  메모
                  <input
                    value={draft.note}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    placeholder="교육, 대타, 연장 등"
                  />
                </label>
              </div>
              <div className="form-actions">
                {editingId ? (
                  <button className="danger" type="button" onClick={deleteShift}>
                    근무 삭제
                  </button>
                ) : (
                  <button type="button" onClick={closeShiftModal}>
                    취소
                  </button>
                )}
                <button className="primary" type="submit">
                  {editingId ? '변경 저장' : '근무 추가'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
          </>
        )}
      </section>

    </main>
  );
}

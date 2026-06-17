import { useEffect, useMemo, useState } from 'react';

type Role = 'viewer' | 'manager';

type Store = {
  id: string;
  name: string;
};

type Employee = {
  id: string;
  name: string;
  preference: string;
  color: string;
};

type EmployeeDraft = {
  name: string;
  preference: string;
  color: string;
};

type ShiftTemplate = {
  id: string;
  label: string;
  time: string;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'navy' | 'red';
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

const STORAGE_KEY = 'sup7eme-schedule-v2';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const stores: Store[] = [
  { id: 'sadang', name: '사당점' },
  { id: 'seokchon', name: '석촌점' },
  { id: 'gwacheon', name: '과천점' },
  { id: 'sinchon', name: '신촌점' },
];

const initialEmployees: Employee[] = [
  { id: 'myeongok', name: '명옥', preference: '오픈 선호', color: '#dceeff' },
  { id: 'junwoo', name: '준우', preference: '미들 선호', color: '#dff5e7' },
  { id: 'seonwoo', name: '선우', preference: '미들/저녁 가능', color: '#fff1c7' },
  { id: 'jaesong', name: '재송', preference: '미들 선호', color: '#eadcff' },
  { id: 'eunji', name: '은지', preference: '저녁 선호', color: '#ffe0f0' },
  { id: 'woojin', name: '우진', preference: '오픈 가능', color: '#dceeff' },
  { id: 'haneul', name: '하늘', preference: '미들/오픈 가능', color: '#dff5e7' },
  { id: 'minhyeon', name: '민현', preference: '저녁 선호', color: '#e0ecff' },
  { id: 'sanghyeon', name: '상현', preference: '야간 고정', color: '#e2e5ea' },
  { id: 'suah', name: '수아', preference: '야간 보조', color: '#dbf7ff' },
  { id: 'jinyoung', name: '진영', preference: '야간 보조', color: '#eadcff' },
  { id: 'se-eun', name: '세은', preference: '대타 가능', color: '#ffe7e1' },
  { id: 'hongju', name: '홍주', preference: '공휴일 보조', color: '#e7edff' },
  { id: 'sumin', name: '수민', preference: '주말 보조', color: '#eadcff' },
];

const templates: ShiftTemplate[] = [
  { id: 'open', label: '오픈', time: '08:00-15:00', color: 'blue' },
  { id: 'middle', label: '미들', time: '15:00-22:00', color: 'green' },
  { id: 'evening', label: '저녁', time: '17:00-23:00', color: 'orange' },
  { id: 'sub', label: '보조', time: '18:00-23:00', color: 'purple' },
  { id: 'night', label: '야간', time: '22:00-08:00', color: 'navy' },
  { id: 'custom', label: '변경', time: '16:00-22:00', color: 'red' },
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

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getWeekDays(start: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(toDate(start).getTime() + index * MS_PER_DAY);
    return formatDate(date);
  });
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

function employeeName(id: string, employees: Employee[]) {
  return employees.find((employee) => employee.id === id)?.name ?? id;
}

function templateById(id: string) {
  return templates.find((template) => template.id === id) ?? templates[0];
}

function sortByTime(shifts: Shift[]) {
  return [...shifts].sort((a, b) => a.time.localeCompare(b.time));
}

function createInitialDraft(date: string): DraftShift {
  return {
    date,
    employeeId: initialEmployees[0].id,
    templateId: templates[0].id,
    time: templates[0].time,
    note: '',
  };
}

function createInitialEmployeeDraft(): EmployeeDraft {
  return {
    name: '',
    preference: '',
    color: '#dceeff',
  };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { employees: initialEmployees, shifts: initialShifts, notes: initialNotes };
  }

  try {
    const parsed = JSON.parse(saved) as {
      employees?: Employee[];
      shifts: Shift[];
      notes: DayNote[];
    };

    return {
      employees: parsed.employees?.length ? parsed.employees : initialEmployees,
      shifts: parsed.shifts,
      notes: parsed.notes,
    };
  } catch {
    return { employees: initialEmployees, shifts: initialShifts, notes: initialNotes };
  }
}

export default function App() {
  const [{ employees, shifts, notes }, setSchedule] = useState(loadState);
  const [storeId, setStoreId] = useState(stores[0].id);
  const [role, setRole] = useState<Role>('manager');
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const [selectedDate, setSelectedDate] = useState(days[2]);
  const [draft, setDraft] = useState<DraftShift>(() => createInitialDraft(days[2]));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState(initialNotes[0].text);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployees[0].id);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeDraft, setEmployeeDraft] = useState<EmployeeDraft>(
    createInitialEmployeeDraft,
  );

  const isManager = role === 'manager';
  const visibleShifts = shifts.filter((shift) => shift.storeId === storeId);
  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0];
  const selectedEmployeeShifts = sortByTime(
    visibleShifts.filter((shift) => shift.employeeId === selectedEmployee?.id),
  );
  const selectedNote = notes.find(
    (note) => note.storeId === storeId && note.date === selectedDate,
  );
  const selectedDayShifts = sortByTime(
    visibleShifts.filter((shift) => shift.date === selectedDate),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ employees, shifts, notes }));
  }, [employees, shifts, notes]);

  useEffect(() => {
    if (!days.includes(selectedDate)) {
      setSelectedDate(days[0]);
      setDraft((current) => ({ ...current, date: days[0] }));
    }
  }, [days, selectedDate]);

  useEffect(() => {
    setNoteDraft(selectedNote?.text ?? '');
  }, [selectedNote]);

  function moveWeek(direction: -1 | 1) {
    const next = new Date(toDate(weekStart).getTime() + direction * 7 * MS_PER_DAY);
    setWeekStart(formatDate(next));
  }

  function selectTemplate(templateId: string) {
    const template = templateById(templateId);
    setDraft((current) => ({
      ...current,
      templateId,
      time: template.time,
    }));
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
      employeeId: selectedEmployee?.id ?? current.employeeId,
    }));
  }

  function submitShift(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isManager) {
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
  }

  function deleteShift() {
    if (!editingId || !isManager) {
      return;
    }

    setSchedule((current) => ({
      ...current,
      shifts: current.shifts.filter((shift) => shift.id !== editingId),
    }));
    resetDraft();
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

  function copyPreviousWeek() {
    if (!isManager) {
      return;
    }

    const copied = visibleShifts
      .filter((shift) => {
        const previousDate = formatDate(
          new Date(toDate(shift.date).getTime() + 7 * MS_PER_DAY),
        );
        return days.includes(previousDate);
      })
      .map((shift) => ({
        ...shift,
        id: crypto.randomUUID(),
        date: formatDate(new Date(toDate(shift.date).getTime() + 7 * MS_PER_DAY)),
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

    const generated = days.flatMap((date) => [
      {
        id: crypto.randomUUID(),
        storeId,
        date,
        employeeId: employees[0]?.id ?? initialEmployees[0].id,
        templateId: 'open',
        time: '08:00-15:00',
      },
      {
        id: crypto.randomUUID(),
        storeId,
        date,
        employeeId: employees[1]?.id ?? initialEmployees[1].id,
        templateId: 'middle',
        time: '15:00-22:00',
      },
      {
        id: crypto.randomUUID(),
        storeId,
        date,
        employeeId: employees[8]?.id ?? initialEmployees[8].id,
        templateId: 'night',
        time: '22:00-08:00',
      },
    ]);

    setSchedule((current) => ({
      ...current,
      shifts: [
        ...current.shifts.filter(
          (shift) => !(shift.storeId === storeId && days.includes(shift.date)),
        ),
        ...generated,
      ],
    }));
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

  function addEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isManager) {
      return;
    }

    const name = employeeDraft.name.trim();
    if (!name) {
      return;
    }

    const newEmployee: Employee = {
      id: crypto.randomUUID(),
      name,
      preference: employeeDraft.preference.trim() || '근무 조건 미입력',
      color: employeeDraft.color,
    };

    setSchedule((current) => ({
      ...current,
      employees: [...current.employees, newEmployee],
    }));
    setSelectedEmployeeId(newEmployee.id);
    setDraft((current) => ({ ...current, employeeId: newEmployee.id }));
    setEmployeeDraft(createInitialEmployeeDraft());
    setShowEmployeeForm(false);
  }

  return (
    <main className="workspace">
      <aside className="sidebar" aria-label="스케줄 관리 메뉴">
        <div className="brand">
          <span className="brand-mark">S</span>
          <strong>KingMW</strong>
        </div>

        <nav className="nav-list">
          <button type="button">대시보드</button>
          <button type="button" className="is-active">
            스케줄
          </button>
          <button type="button">직원</button>
          <button type="button">패턴 관리</button>
          <button type="button">메모</button>
          <button type="button">설정</button>
        </nav>

        <section className="employee-panel" aria-labelledby="employee-title">
          <div className="panel-title">
            <h2 id="employee-title">직원 목록</h2>
            {isManager ? (
              <button
                type="button"
                onClick={() => setShowEmployeeForm((isOpen) => !isOpen)}
              >
                + 직원 추가
              </button>
            ) : null}
          </div>

          {showEmployeeForm && isManager ? (
            <form className="employee-form" onSubmit={addEmployee}>
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
              <div className="form-actions">
                <button type="button" onClick={() => setShowEmployeeForm(false)}>
                  취소
                </button>
                <button className="primary" type="submit">
                  추가
                </button>
              </div>
            </form>
          ) : null}

          <div className="employee-list">
            {employees.map((employee) => (
              <article
                className={`employee-card ${
                  selectedEmployee?.id === employee.id ? 'is-selected' : ''
                }`}
                draggable={isManager}
                key={employee.id}
                onClick={() => {
                  setSelectedEmployeeId(employee.id);
                  setDraft((current) => ({ ...current, employeeId: employee.id }));
                }}
                onDragStart={(event) =>
                  event.dataTransfer.setData('text/plain', employee.id)
                }
              >
                <span style={{ background: employee.color }}>
                  {employee.name.slice(0, 1)}
                </span>
                <div>
                  <strong>{employee.name}</strong>
                  <small>{employee.preference}</small>
                </div>
                <button
                  type="button"
                  aria-label={`${employee.name} 정보 보기`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedEmployeeId(employee.id);
                    setDraft((current) => ({ ...current, employeeId: employee.id }));
                  }}
                >
                  ...
                </button>
              </article>
            ))}
          </div>

          {selectedEmployee ? (
            <section className="employee-detail" aria-label="직원 정보">
              <div className="employee-detail-heading">
                <span style={{ background: selectedEmployee.color }}>
                  {selectedEmployee.name.slice(0, 1)}
                </span>
                <div>
                  <strong>{selectedEmployee.name}</strong>
                  <small>{selectedEmployee.preference}</small>
                </div>
              </div>
              <dl>
                <div>
                  <dt>이번 주 근무</dt>
                  <dd>
                    {
                      selectedEmployeeShifts.filter((shift) =>
                        days.includes(shift.date),
                      ).length
                    }
                    회
                  </dd>
                </div>
                <div>
                  <dt>선택 매장</dt>
                  <dd>{stores.find((store) => store.id === storeId)?.name}</dd>
                </div>
              </dl>
              <div className="mini-shift-list">
                {selectedEmployeeShifts
                  .filter((shift) => days.includes(shift.date))
                  .slice(0, 4)
                  .map((shift) => (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => editShift(shift)}
                    >
                      <span>{dayLabel(shift.date)}</span>
                      <strong>{shift.time}</strong>
                    </button>
                  ))}
              </div>
            </section>
          ) : null}
          <p className="drop-hint">직원 카드를 날짜 칸으로 드래그해서 근무를 추가</p>
        </section>
      </aside>

      <section className="main-board">
        <header className="topbar">
          <select value={storeId} onChange={(event) => setStoreId(event.target.value)}>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>

          <div className="role-toggle" aria-label="권한 선택">
            <button
              className={role === 'viewer' ? 'is-selected' : undefined}
              type="button"
              onClick={() => setRole('viewer')}
            >
              직원 보기
            </button>
            <button
              className={role === 'manager' ? 'is-selected' : undefined}
              type="button"
              onClick={() => setRole('manager')}
            >
              매니저 편집
            </button>
          </div>
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
                  const employeeId = event.dataTransfer.getData('text/plain');
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
                    const template = templateById(shift.templateId);

                    return (
                      <button
                        className={`shift-card ${template.color}`}
                        key={shift.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          editShift(shift);
                        }}
                      >
                        <span>{shift.time}</span>
                        <strong>{employeeName(shift.employeeId, employees)}</strong>
                        {shift.note ? <small>{shift.note}</small> : null}
                      </button>
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
          <section className="editor-row">
            <form className="editor-card" onSubmit={submitShift}>
              <h2>{editingId ? '근무 수정' : '근무 추가'}</h2>
              <label>
                날짜
                <select
                  value={draft.date}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, date: event.target.value }))
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
                  {employees.map((employee) => (
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
              <label>
                직접 시간
                <input
                  value={draft.time}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, time: event.target.value }))
                  }
                  placeholder="08:00-15:00"
                />
              </label>
              <label>
                메모
                <input
                  value={draft.note}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, note: event.target.value }))
                  }
                  placeholder="교육, 대타, 연장 등"
                />
              </label>
              <div className="form-actions">
                {editingId ? (
                  <button className="danger" type="button" onClick={deleteShift}>
                    삭제
                  </button>
                ) : (
                  <button type="button" onClick={() => resetDraft()}>
                    초기화
                  </button>
                )}
                <button className="primary" type="submit">
                  {editingId ? '저장' : '추가'}
                </button>
              </div>
            </form>

            <aside className="tips-card">
              <h2>편집 팁</h2>
              <ul>
                <li>직원 카드를 날짜 칸으로 드래그하면 선택된 시간대로 근무가 추가됩니다.</li>
                <li>근무 카드를 누르면 시간, 직원, 메모를 바로 수정할 수 있습니다.</li>
                <li>기본 주 생성은 오픈, 미들, 야간 고정 근무를 빠르게 채웁니다.</li>
                <li>특이사항은 날짜별로 저장되어 모바일 보기에도 같이 표시됩니다.</li>
              </ul>
            </aside>
          </section>
        ) : null}
      </section>

      <aside className="mobile-preview" aria-label="모바일 미리보기">
        <p>모바일 미리보기</p>
        <div className="phone">
          <header>
            <span>9:41</span>
            <strong>{stores.find((store) => store.id === storeId)?.name}</strong>
          </header>
          <div className="phone-week">
            <strong>{formatKoreanRange(days)}</strong>
          </div>
          <div className="phone-days">
            {days.map((date) => (
              <button
                className={selectedDate === date ? 'is-selected' : undefined}
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
              >
                {dayLabel(date)}
              </button>
            ))}
          </div>
          <h2>{dayLabel(selectedDate)}</h2>
          <div className="phone-list">
            {selectedDayShifts.map((shift) => {
              const template = templateById(shift.templateId);

              return (
                <article className={`phone-shift ${template.color}`} key={shift.id}>
                  <span>{shift.time}</span>
                      <strong>{employeeName(shift.employeeId, employees)}</strong>
                </article>
              );
            })}
          </div>
          <section className="phone-note">
            <strong>특이사항</strong>
            <p>{selectedNote?.text || '등록된 특이사항 없음'}</p>
          </section>
        </div>
      </aside>
    </main>
  );
}

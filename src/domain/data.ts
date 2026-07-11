import type {
  DayNote,
  Employee,
  Shift,
  ShiftTemplate,
  Store,
  TemplateColor,
} from './types';

export const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
export const templateColors: Array<{ value: TemplateColor; label: string }> = [
  { value: 'blue', label: '파랑' },
  { value: 'green', label: '초록' },
  { value: 'orange', label: '주황' },
  { value: 'purple', label: '보라' },
  { value: 'navy', label: '남색' },
  { value: 'red', label: '빨강' },
];

export const employeeDropTemplateIds = [
  'open',
  'middle',
  'evening',
  'night',
  'sub',
];

export const stores: Store[] = [
  { id: 'sadang', name: '사당점', address: '서울 동작구 사당로 17, 2층', phone: '02-522-1234', memo: '', isActive: true, color: 'purple' },
  { id: 'seokchon', name: '석촌점', address: '서울 송파구 백제고분로 241, 1층', phone: '', memo: '', isActive: true, color: 'blue' },
  { id: 'gwacheon', name: '과천점', address: '경기 과천시 별양로 142, 1층', phone: '', memo: '', isActive: true, color: 'orange' },
  { id: 'sinchon', name: '신촌점', address: '서울 서대문구 연세로 10, 3층', phone: '', memo: '', isActive: true, color: 'green' },
];

export const initialEmployees: Employee[] = [
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

export const initialTemplates: ShiftTemplate[] = [
  { id: 'open', label: '오전 고정', time: '08:00-15:00', color: 'blue' },
  { id: 'middle', label: '오후 기본', time: '15:00-22:00', color: 'green' },
  {
    id: 'evening',
    label: '오후 변동',
    time: '15:00-22:00',
    color: 'orange',
    requiresTimeInput: true,
  },
  { id: 'night', label: '야간 고정', time: '22:00-08:00', color: 'navy' },
  { id: 'sub', label: '야간 보조', time: '22:00-02:00', color: 'purple' },
  {
    id: 'custom',
    label: '교육',
    time: '08:00-15:00',
    color: 'red',
    requiresTimeInput: true,
  },
];

export const initialShifts: Shift[] = [
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

export const initialNotes: DayNote[] = [
  {
    storeId: 'sadang',
    date: '2025-06-17',
    text: '한가하면 청소 + 퇴근 조율\n명옥 바쁘면 연장',
  },
];

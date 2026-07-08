insert into public.stores (id, name, sort_order)
values
  ('sadang', '사당점', 1),
  ('seokchon', '석촌점', 2),
  ('gwacheon', '과천점', 3),
  ('sinchon', '신촌점', 4)
on conflict (id) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.shift_templates (
  id,
  label,
  default_start_time,
  default_end_time,
  color,
  requires_time_input,
  sort_order
)
values
  ('open', '오전 고정', '08:00', '15:00', 'blue', false, 1),
  ('middle', '오후 기본', '15:00', '22:00', 'green', false, 2),
  ('evening', '오후 변동', null, null, 'orange', true, 3),
  ('night', '야간 고정', '22:00', '08:00', 'navy', false, 4),
  ('sub', '야간 보조', '22:00', '02:00', 'purple', false, 5),
  ('custom', '교육', null, null, 'red', true, 6)
on conflict (id) do update
set
  label = excluded.label,
  default_start_time = excluded.default_start_time,
  default_end_time = excluded.default_end_time,
  color = excluded.color,
  requires_time_input = excluded.requires_time_input,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.employees (id, name, memo, color)
values
  ('myeongok', '명옥', '오픈 선호', '#dceeff'),
  ('junwoo', '준우', '미들 선호', '#dff5e7'),
  ('seonwoo', '선우', '미들/저녁 가능', '#fff1c7'),
  ('jaesong', '재송', '미들 선호', '#eadcff'),
  ('eunji', '은지', '저녁 선호', '#ffe0f0'),
  ('woojin', '우진', '오픈 가능', '#dceeff'),
  ('haneul', '하늘', '미들/오픈 가능', '#dff5e7'),
  ('minhyeon', '민현', '저녁 선호', '#e0ecff'),
  ('sanghyeon', '상현', '야간 고정', '#e2e5ea'),
  ('suah', '수아', '야간 보조', '#dbf7ff'),
  ('jinyoung', '진영', '야간 보조', '#eadcff'),
  ('se-eun', '세은', '대타 가능', '#ffe7e1'),
  ('hongju', '홍주', '공휴일 보조', '#e7edff'),
  ('sumin', '수민', '주말 보조', '#eadcff')
on conflict (id) do update
set
  name = excluded.name,
  memo = excluded.memo,
  color = excluded.color,
  is_active = true;

insert into public.employee_stores (employee_id, store_id)
values
  ('myeongok', 'sadang'),
  ('myeongok', 'seokchon'),
  ('junwoo', 'sadang'),
  ('seonwoo', 'sadang'),
  ('seonwoo', 'gwacheon'),
  ('jaesong', 'sadang'),
  ('eunji', 'sadang'),
  ('eunji', 'sinchon'),
  ('woojin', 'sadang'),
  ('woojin', 'gwacheon'),
  ('haneul', 'sadang'),
  ('haneul', 'seokchon'),
  ('minhyeon', 'sadang'),
  ('sanghyeon', 'sadang'),
  ('suah', 'sadang'),
  ('suah', 'sinchon'),
  ('jinyoung', 'sadang'),
  ('jinyoung', 'seokchon'),
  ('se-eun', 'sadang'),
  ('se-eun', 'gwacheon'),
  ('se-eun', 'sinchon'),
  ('hongju', 'sadang'),
  ('sumin', 'sadang'),
  ('sumin', 'seokchon')
on conflict (employee_id, store_id) do nothing;

insert into public.shifts (
  id,
  store_id,
  work_date,
  employee_id,
  template_id,
  start_time,
  end_time,
  note
)
values
  ('seed-0', 'sadang', '2025-06-15', 'myeongok', 'open', '08:00', '15:00', ''),
  ('seed-1', 'sadang', '2025-06-15', 'junwoo', 'middle', '15:00', '22:00', ''),
  ('seed-2', 'sadang', '2025-06-15', 'seonwoo', 'evening', '17:00', '23:00', ''),
  ('seed-3', 'sadang', '2025-06-15', 'minhyeon', 'sub', '18:00', '23:00', ''),
  ('seed-4', 'sadang', '2025-06-15', 'sanghyeon', 'night', '22:00', '08:00', ''),
  ('seed-5', 'sadang', '2025-06-16', 'myeongok', 'open', '08:00', '15:00', ''),
  ('seed-6', 'sadang', '2025-06-16', 'junwoo', 'middle', '15:00', '22:00', ''),
  ('seed-7', 'sadang', '2025-06-16', 'seonwoo', 'evening', '17:00', '23:00', ''),
  ('seed-8', 'sadang', '2025-06-16', 'minhyeon', 'sub', '18:00', '23:00', ''),
  ('seed-9', 'sadang', '2025-06-16', 'sanghyeon', 'night', '22:00', '08:00', ''),
  ('seed-10', 'sadang', '2025-06-17', 'woojin', 'open', '08:00', '15:00', ''),
  ('seed-11', 'sadang', '2025-06-17', 'jaesong', 'middle', '14:00', '22:00', ''),
  ('seed-12', 'sadang', '2025-06-17', 'eunji', 'evening', '17:00', '23:00', ''),
  ('seed-13', 'sadang', '2025-06-17', 'jinyoung', 'sub', '18:00', '22:00', ''),
  ('seed-14', 'sadang', '2025-06-17', 'jinyoung', 'night', '22:00', '08:00', ''),
  ('seed-15', 'sadang', '2025-06-18', 'myeongok', 'open', '08:00', '15:00', ''),
  ('seed-16', 'sadang', '2025-06-18', 'jaesong', 'middle', '15:00', '22:00', ''),
  ('seed-17', 'sadang', '2025-06-18', 'eunji', 'evening', '17:00', '23:00', ''),
  ('seed-18', 'sadang', '2025-06-18', 'suah', 'sub', '18:00', '23:00', ''),
  ('seed-19', 'sadang', '2025-06-18', 'jinyoung', 'night', '22:00', '08:00', ''),
  ('seed-20', 'sadang', '2025-06-19', 'myeongok', 'open', '08:00', '15:00', ''),
  ('seed-21', 'sadang', '2025-06-19', 'haneul', 'middle', '15:00', '22:00', ''),
  ('seed-22', 'sadang', '2025-06-19', 'myeongok', 'custom', '16:00', '22:00', '명옥'),
  ('seed-23', 'sadang', '2025-06-19', 'jinyoung', 'custom', '16:30', '23:00', ''),
  ('seed-24', 'sadang', '2025-06-19', 'se-eun', 'custom', '17:00', '21:00', ''),
  ('seed-25', 'sadang', '2025-06-19', 'jinyoung', 'night', '22:00', '08:00', ''),
  ('seed-26', 'sadang', '2025-06-19', 'hongju', 'night', '22:00', '02:00', ''),
  ('seed-27', 'sadang', '2025-06-20', 'haneul', 'open', '08:00', '15:00', ''),
  ('seed-28', 'sadang', '2025-06-20', 'myeongok', 'middle', '13:00', '22:00', ''),
  ('seed-29', 'sadang', '2025-06-20', 'junwoo', 'middle', '15:00', '21:00', ''),
  ('seed-30', 'sadang', '2025-06-20', 'jinyoung', 'evening', '16:00', '22:00', ''),
  ('seed-31', 'sadang', '2025-06-20', 'suah', 'evening', '17:00', '22:00', ''),
  ('seed-32', 'sadang', '2025-06-20', 'jinyoung', 'night', '22:00', '08:00', ''),
  ('seed-33', 'sadang', '2025-06-20', 'hongju', 'night', '21:00', '02:00', ''),
  ('seed-34', 'sadang', '2025-06-21', 'haneul', 'open', '08:00', '15:00', ''),
  ('seed-35', 'sadang', '2025-06-21', 'se-eun', 'middle', '14:00', '20:00', ''),
  ('seed-36', 'sadang', '2025-06-21', 'junwoo', 'middle', '15:00', '22:00', ''),
  ('seed-37', 'sadang', '2025-06-21', 'seonwoo', 'evening', '16:00', '22:00', ''),
  ('seed-38', 'sadang', '2025-06-21', 'sumin', 'sub', '19:00', '24:00', ''),
  ('seed-39', 'sadang', '2025-06-21', 'jinyoung', 'night', '22:00', '08:00', '')
on conflict (id) do update
set
  store_id = excluded.store_id,
  work_date = excluded.work_date,
  employee_id = excluded.employee_id,
  template_id = excluded.template_id,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  note = excluded.note;

insert into public.employee_base_shifts (
  id,
  employee_id,
  store_id,
  weekday,
  template_id,
  start_time,
  end_time
)
select
  'base-' || id,
  employee_id,
  store_id,
  extract(dow from work_date)::smallint,
  template_id,
  start_time,
  end_time
from public.shifts
where id like 'seed-%'
on conflict (id) do update
set
  employee_id = excluded.employee_id,
  store_id = excluded.store_id,
  weekday = excluded.weekday,
  template_id = excluded.template_id,
  start_time = excluded.start_time,
  end_time = excluded.end_time;

insert into public.day_notes (id, store_id, note_date, text)
values
  ('seed-note-0', 'sadang', '2025-06-17', '한가하면 청소 + 퇴근 조율
명옥 바쁘면 연장')
on conflict (store_id, note_date) do update
set text = excluded.text;

insert into public.app_settings (key, value)
values
  (
    'schedule',
    '{"timezone":"Asia/Seoul","defaultDayStartTime":"08:00","sortStartTime":"08:00"}'::jsonb
  )
on conflict (key) do update
set value = excluded.value;

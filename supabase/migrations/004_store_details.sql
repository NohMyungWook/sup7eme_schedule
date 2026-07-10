alter table public.stores
  add column if not exists address text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists memo text not null default '',
  add column if not exists color text not null default 'purple';

update public.stores
set
  address = case id
    when 'sadang' then '서울 동작구 사당로 17, 2층'
    when 'seokchon' then '서울 송파구 백제고분로 241, 1층'
    when 'gwacheon' then '경기 과천시 별양로 142, 1층'
    when 'sinchon' then '서울 서대문구 연세로 10, 3층'
    else address
  end,
  phone = case id
    when 'sadang' then '02-522-1234'
    else phone
  end,
  color = case id
    when 'sadang' then 'purple'
    when 'seokchon' then 'blue'
    when 'gwacheon' then 'orange'
    when 'sinchon' then 'green'
    else color
  end;

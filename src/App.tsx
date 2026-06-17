import { useEffect, useMemo, useState } from 'react';

type ScheduleItem = {
  id: string;
  title: string;
  date: string;
  memo: string;
  done: boolean;
};

const STORAGE_KEY = 'sup7eme-schedule-items';

const initialItems: ScheduleItem[] = [
  {
    id: 'sample-1',
    title: '프로젝트 초기 화면 구성',
    date: new Date().toISOString().slice(0, 10),
    memo: '서버 연결 전까지 로컬스토리지에 저장합니다.',
    done: false,
  },
];

function loadItems() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return initialItems;
  }

  try {
    return JSON.parse(saved) as ScheduleItem[];
  } catch {
    return initialItems;
  }
}

export default function App() {
  const [items, setItems] = useState<ScheduleItem[]>(loadItems);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState('');

  const remainingCount = useMemo(
    () => items.filter((item) => !item.done).length,
    [items],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    setItems((currentItems) => [
      {
        id: crypto.randomUUID(),
        title: trimmedTitle,
        date,
        memo: memo.trim(),
        done: false,
      },
      ...currentItems,
    ]);
    setTitle('');
    setMemo('');
  }

  function toggleItem(id: string) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  }

  function removeItem(id: string) {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  }

  return (
    <main className="app-shell">
      <section className="schedule-panel" aria-labelledby="app-title">
        <header className="app-header">
          <div>
            <p className="eyebrow">Local prototype</p>
            <h1 id="app-title">Sup7eme Schedule</h1>
          </div>
          <div className="status-pill" aria-label={`남은 일정 ${remainingCount}개`}>
            {remainingCount} left
          </div>
        </header>

        <form className="schedule-form" onSubmit={addItem}>
          <label>
            일정
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="새 일정을 입력하세요"
            />
          </label>
          <label>
            날짜
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label className="memo-field">
            메모
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="간단한 메모"
              rows={3}
            />
          </label>
          <button type="submit">추가</button>
        </form>

        <ul className="schedule-list">
          {items.map((item) => (
            <li key={item.id} className={item.done ? 'is-done' : undefined}>
              <button
                className="check-button"
                type="button"
                onClick={() => toggleItem(item.id)}
                aria-label={`${item.title} 완료 상태 변경`}
              >
                {item.done ? '✓' : ''}
              </button>
              <div className="item-content">
                <strong>{item.title}</strong>
                <span>{item.date}</span>
                {item.memo ? <p>{item.memo}</p> : null}
              </div>
              <button
                className="text-button"
                type="button"
                onClick={() => removeItem(item.id)}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

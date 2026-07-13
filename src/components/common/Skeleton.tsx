import type { ActiveView } from '../../domain/types';

type SkeletonBlockProps = {
  className?: string;
};

function SkeletonBlock({ className = '' }: SkeletonBlockProps) {
  return <span className={`skeleton-block ${className}`} aria-hidden="true" />;
}

export function AppViewSkeleton({ view }: { view: ActiveView }) {
  if (view === 'schedule') return <ScheduleSkeleton />;
  if (view === 'employees') return <EmployeesSkeleton />;
  if (view === 'settings') return <SettingsSkeleton />;

  return <DefaultPageSkeleton />;
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="list-skeleton" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="list-skeleton-row" key={index}>
          <SkeletonBlock className="circle" />
          <div>
            <SkeletonBlock className="line medium" />
            <SkeletonBlock className="line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="view-skeleton schedule-skeleton" role="status" aria-label="스케줄을 불러오는 중">
      <div className="skeleton-topline">
        <SkeletonBlock className="pill wide" />
        <SkeletonBlock className="pill" />
      </div>
      <div className="skeleton-weekbar">
        <SkeletonBlock className="circle" />
        <SkeletonBlock className="line title" />
        <SkeletonBlock className="circle" />
      </div>
      <div className="skeleton-schedule-grid">
        {Array.from({ length: 7 }).map((_, index) => (
          <div className="skeleton-day" key={index}>
            <SkeletonBlock className="line medium" />
            <SkeletonBlock className="pill wide" />
            <SkeletonBlock className="pill" />
            <SkeletonBlock className="pill wide" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployeesSkeleton() {
  return (
    <div className="view-skeleton employees-skeleton" role="status" aria-label="직원 정보를 불러오는 중">
      <div className="skeleton-topline">
        <div>
          <SkeletonBlock className="line title" />
          <SkeletonBlock className="line medium" />
        </div>
        <SkeletonBlock className="pill" />
      </div>
      <div className="skeleton-two-column">
        <ListSkeleton rows={6} />
        <div className="skeleton-panel">
          <SkeletonBlock className="circle large" />
          <SkeletonBlock className="line title" />
          <SkeletonBlock className="line wide" />
          <SkeletonBlock className="line wide" />
          <SkeletonBlock className="pill wide" />
        </div>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="view-skeleton settings-skeleton" role="status" aria-label="설정을 불러오는 중">
      <SkeletonBlock className="line title" />
      <SkeletonBlock className="line medium" />
      <div className="skeleton-card-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="skeleton-card" key={index}>
            <SkeletonBlock className="circle" />
            <SkeletonBlock className="line medium" />
            <SkeletonBlock className="line wide" />
            <SkeletonBlock className="pill" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DefaultPageSkeleton() {
  return (
    <div className="view-skeleton default-skeleton" role="status" aria-label="데이터를 불러오는 중">
      <SkeletonBlock className="line title" />
      <SkeletonBlock className="line medium" />
      <div className="skeleton-card-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="skeleton-card" key={index}>
            <SkeletonBlock className="line wide" />
            <SkeletonBlock className="line medium" />
            <SkeletonBlock className="line short" />
          </div>
        ))}
      </div>
    </div>
  );
}

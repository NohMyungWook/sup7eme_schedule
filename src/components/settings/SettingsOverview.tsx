import type { ShiftTemplate, Store } from '../../domain/types';
import { SettingsCategoryCard } from './SettingsCategoryCard';
import { SettingsIcon } from './SettingsIcon';

type SettingsOverviewProps = {
  templates: ShiftTemplate[];
  stores: Store[];
  onTemplateSettingsOpen: () => void;
  onStoreSettingsOpen: () => void;
  onAccountSettingsOpen: () => void;
};

export function SettingsOverview({ templates, stores, onTemplateSettingsOpen, onStoreSettingsOpen, onAccountSettingsOpen }: SettingsOverviewProps) {
  const templatePreviewLabels = templates.slice(0, 3).map((template) => template.label.replace(' 고정', '').replace(' 기본', ''));
  const templateExtraCount = Math.max(0, templates.length - templatePreviewLabels.length);
  const storePreviewLabels = stores.slice(0, 3).map((store) => store.name);
  const storeExtraCount = Math.max(0, stores.length - storePreviewLabels.length);

  return (
    <>
      <header className="settings-overview-header"><div><h1>설정</h1><p>운영에 필요한 기본 항목과 규칙을 관리합니다.</p></div></header>
      <div className="settings-overview-layout">
        <section className="settings-overview-main">
          <div className="settings-toolbar">
            <label className="settings-search"><span aria-hidden="true"><SettingsIcon name="search" /></span><input placeholder="설정 항목 검색 (예: 시간대, 근무지, 알림)" /></label>
            <button type="button">전체⌄</button>
            <button type="button" aria-label="필터"><SettingsIcon name="filter" /></button>
          </div>
          <div className="settings-card-grid">
            <article className="settings-category-card is-featured">
              <header><span className="settings-card-icon purple"><SettingsIcon name="clock" /></span><div><h2>시간대 설정</h2><p>근무 이름, 기본 시간, 색상을 관리합니다.</p></div><b>★ 자주 사용</b></header>
              <div className="settings-card-tags purple">{templatePreviewLabels.map((label) => <span key={label}>{label}</span>)}{templateExtraCount ? <span>+{templateExtraCount}</span> : null}</div>
              <button type="button" onClick={onTemplateSettingsOpen}>관리하기 <span>›</span></button>
            </article>
            <SettingsCategoryCard icon="building" title="근무지 관리" description="매장 추가, 주소, 운영 여부를 관리합니다." tags={[...storePreviewLabels, ...(storeExtraCount ? [`+${storeExtraCount}`] : [])]} onOpen={onStoreSettingsOpen} />
            <SettingsCategoryCard icon="users" title="근무 유형 설정" description="오픈, 미들, 마감 등 기본 유형을 정의합니다." tags={['오픈', '미들', '마감', '+2']} tone="green" />
            <SettingsCategoryCard icon="calendar" title="스케줄 규칙" description="주간 생성 규칙, 중복 근무 제한 등을 설정합니다." tags={['주간 자동 생성', '중복 근무 제한', '연속 근무 제한']} />
            <SettingsCategoryCard icon="bell" title="알림 설정" description="스케줄 변경 및 공지 알림을 관리합니다." tags={['변경 알림', '공지 알림', '근무 확정 알림']} tone="orange" />
            <SettingsCategoryCard icon="shield" title="권한 및 계정" description="관리자 권한과 접근 범위를 설정합니다." tags={['역할 관리', '권한 그룹', '접근 범위']} tone="green" onOpen={onAccountSettingsOpen} />
            <SettingsCategoryCard icon="holiday" title="휴무/공휴일" description="정기 휴무와 공휴일 기준을 설정합니다." tags={['정기 휴무', '공휴일', '대체 휴일']} tone="red" />
            <SettingsCategoryCard icon="monitor" title="표시 옵션" description="캘린더, 색상, 카드 표시 방식을 관리합니다." tags={['캘린더 보기', '색상 테마', '카드 표시']} tone="blue" />
          </div>
        </section>
        <aside className="settings-side-panel">
          <section><h2>빠른 작업</h2><button type="button" onClick={onTemplateSettingsOpen}><span className="purple"><SettingsIcon name="clock" /></span>시간대 설정<i>›</i></button><button type="button" onClick={onStoreSettingsOpen}><span className="blue"><SettingsIcon name="building" /></span>근무지 추가<i>›</i></button><button type="button" onClick={onAccountSettingsOpen}><span className="green"><SettingsIcon name="users" /></span>직원 초대<i>›</i></button><button type="button"><span className="orange"><SettingsIcon name="bell" /></span>알림 설정<i>›</i></button></section>
          <section><div><h2>최근 설정</h2><a>전체 보기</a></div><p><span><SettingsIcon name="clock" /></span>야간 고정 시간대 수정 <small>2시간 전</small></p><p><span><SettingsIcon name="building" /></span>석촌점 운영 여부 변경 <small>어제</small></p><p><span><SettingsIcon name="calendar" /></span>스케줄 규칙 업데이트 <small>2일 전</small></p><p><span><SettingsIcon name="bell" /></span>변경 알림 설정 수정 <small>3일 전</small></p></section>
          <div className="settings-coming-soon"><strong>곧 더 많은 설정이 추가됩니다</strong><p>인사 정책, 급여 연동 등 다양한 설정을 향후 업데이트에서 제공할 예정입니다.</p></div>
        </aside>
      </div>
    </>
  );
}

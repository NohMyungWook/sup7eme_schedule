import type { ShiftTemplate, Store } from '../../domain/types';
import { SettingsCategoryCard } from './SettingsCategoryCard';
import { SettingsIcon } from './SettingsIcon';

type SettingsOverviewProps = {
  templates: ShiftTemplate[];
  stores: Store[];
  onTemplateSettingsOpen: () => void;
  onStoreSettingsOpen: () => void;
  onAccountSettingsOpen: () => void;
  onLeaveRequestSettingsOpen: () => void;
  onScheduleRuleSettingsOpen: () => void;
  canViewAccounts: boolean;
  canViewLeaveRequests: boolean;
};

export function SettingsOverview({ templates, stores, onTemplateSettingsOpen, onStoreSettingsOpen, onAccountSettingsOpen, onLeaveRequestSettingsOpen, onScheduleRuleSettingsOpen, canViewAccounts, canViewLeaveRequests }: SettingsOverviewProps) {
  const templatePreviewLabels = templates.slice(0, 3).map((template) => template.label.replace(' 고정', '').replace(' 기본', ''));
  const templateExtraCount = Math.max(0, templates.length - templatePreviewLabels.length);
  const storePreviewLabels = stores.slice(0, 3).map((store) => store.name);
  const storeExtraCount = Math.max(0, stores.length - storePreviewLabels.length);

  return (
    <>
      <header className="settings-overview-header"><div><h1>설정</h1><p>운영에 필요한 기본 항목과 규칙을 관리합니다.</p></div></header>
      <div className="settings-overview-layout">
        <section className="settings-overview-main">
          <div className="settings-card-grid">
            <article className="settings-category-card is-featured">
              <header><span className="settings-card-icon purple"><SettingsIcon name="clock" /></span><div><h2>시간대 설정</h2><p>근무 이름, 기본 시간, 색상을 관리합니다.</p></div><b>★ 자주 사용</b></header>
              <div className="settings-card-tags purple">{templatePreviewLabels.map((label) => <span key={label}>{label}</span>)}{templateExtraCount ? <span>+{templateExtraCount}</span> : null}</div>
              <button type="button" onClick={onTemplateSettingsOpen}>관리하기 <span>›</span></button>
            </article>
            <SettingsCategoryCard icon="building" title="근무지 관리" description="매장 추가, 주소, 운영 여부를 관리합니다." tags={[...storePreviewLabels, ...(storeExtraCount ? [`+${storeExtraCount}`] : [])]} onOpen={onStoreSettingsOpen} />
            <SettingsCategoryCard icon="calendar" title="스케줄 규칙" description="요일과 시간대별 최소 필요 인원을 설정합니다." tags={['요일별 규칙', '최소 필요 인원', '대시보드 연동']} onOpen={onScheduleRuleSettingsOpen} />
            {canViewAccounts ? <SettingsCategoryCard icon="shield" title="권한 및 계정" description="관리자 권한과 접근 범위를 설정합니다." tags={['역할 관리', '권한 그룹', '접근 범위']} tone="green" onOpen={onAccountSettingsOpen} /> : null}
            {canViewLeaveRequests ? <SettingsCategoryCard icon="holiday" title="휴무 신청 내역 관리" description="직원 휴무 신청과 처리 상태를 확인합니다." tags={['신청 내역', '승인 대기', '처리 완료']} tone="red" onOpen={onLeaveRequestSettingsOpen} /> : null}
          </div>
        </section>
        <aside className="settings-side-panel">
          <section><h2>빠른 작업</h2><button type="button" onClick={onTemplateSettingsOpen}><span className="purple"><SettingsIcon name="clock" /></span>시간대 설정<i>›</i></button><button type="button" onClick={onStoreSettingsOpen}><span className="blue"><SettingsIcon name="building" /></span>근무지 추가<i>›</i></button><button type="button" onClick={onScheduleRuleSettingsOpen}><span className="orange"><SettingsIcon name="calendar" /></span>스케줄 규칙<i>›</i></button>{canViewAccounts ? <button type="button" onClick={onAccountSettingsOpen}><span className="green"><SettingsIcon name="users" /></span>계정 추가<i>›</i></button> : null}</section>
        </aside>
      </div>
    </>
  );
}

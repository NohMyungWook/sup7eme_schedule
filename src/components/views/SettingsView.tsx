import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { BaseShiftRule, Employee, SettingsPanel, ShiftTemplate, Store, TemplateDraft } from '../../domain/types';
import { AccountManagementSettings } from '../settings/AccountManagementSettings';
import { SettingsOverview } from '../settings/SettingsOverview';
import { StoreManagementSettings } from '../settings/StoreManagementSettings';
import { TimeTemplateSettings } from '../settings/TimeTemplateSettings';
import { LeaveRequestSettings } from '../settings/LeaveRequestSettings';
import { ScheduleRuleSettings } from '../settings/ScheduleRuleSettings';

type SettingsViewProps = {
  stores: Store[];
  employees: Employee[];
  baseShifts: BaseShiftRule[];
  templates: ShiftTemplate[];
  draft: TemplateDraft;
  editingTemplateId: string | null;
  isTemplateSaving: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  canViewAccounts: boolean;
  canCreateAccounts: boolean;
  canUpdateAccounts: boolean;
  canDeleteAccounts: boolean;
  canViewLeaveRequests: boolean;
  canUpdateLeaveRequests: boolean;
  activeSettingsPanel: SettingsPanel;
  setDraft: Dispatch<SetStateAction<TemplateDraft>>;
  setActiveSettingsPanel: (panel: SettingsPanel) => void;
  onEdit: (template: ShiftTemplate) => void;
  onDelete: (templateId: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStoresChange: (stores: Store[]) => Promise<void> | void;
  onOpenSchedule: (date: string, storeId: string) => void;
};

export function SettingsView({
  stores,
  employees,
  baseShifts,
  templates,
  draft,
  editingTemplateId,
  isTemplateSaving,
  canCreate,
  canDelete,
  canUpdate,
  canViewAccounts,
  canCreateAccounts,
  canUpdateAccounts,
  canDeleteAccounts,
  canViewLeaveRequests,
  canUpdateLeaveRequests,
  activeSettingsPanel,
  setDraft,
  setActiveSettingsPanel,
  onEdit,
  onDelete,
  onReset,
  onSubmit,
  onStoresChange,
  onOpenSchedule,
}: SettingsViewProps) {
  const activeStores = stores.filter((store) => store.isActive);
  if (activeSettingsPanel === 'overview') {
    return (
      <SettingsOverview
        stores={activeStores}
        templates={templates}
        onTemplateSettingsOpen={() => setActiveSettingsPanel('templates')}
        onStoreSettingsOpen={() => setActiveSettingsPanel('stores')}
        onAccountSettingsOpen={() => setActiveSettingsPanel('accounts')}
        onLeaveRequestSettingsOpen={() => setActiveSettingsPanel('leave-requests')}
        onScheduleRuleSettingsOpen={() => setActiveSettingsPanel('rules')}
        canViewAccounts={canViewAccounts}
        canViewLeaveRequests={canViewLeaveRequests}
      />
    );
  }

  if (activeSettingsPanel === 'stores') {
    return (
      <StoreManagementSettings
        stores={stores}
        employees={employees}
        baseShifts={baseShifts}
        canCreate={canCreate}
        canDelete={canDelete}
        canUpdate={canUpdate}
        onBack={() => setActiveSettingsPanel('overview')}
        onStoresChange={onStoresChange}
      />
    );
  }

  if (activeSettingsPanel === 'accounts') {
    if (!canViewAccounts) return <SettingsAccessDenied onBack={() => setActiveSettingsPanel('overview')} />;
    return (
      <AccountManagementSettings
        canCreate={canCreateAccounts}
        canUpdate={canUpdateAccounts}
        canDelete={canDeleteAccounts}
        stores={activeStores}
        employees={employees}
        onBack={() => setActiveSettingsPanel('overview')}
      />
    );
  }

  if (activeSettingsPanel === 'leave-requests') {
    if (!canViewLeaveRequests) return <SettingsAccessDenied onBack={() => setActiveSettingsPanel('overview')} />;
    return <LeaveRequestSettings stores={activeStores} employees={employees} canUpdate={canUpdateLeaveRequests} onBack={() => setActiveSettingsPanel('overview')} onOpenSchedule={onOpenSchedule} />;
  }

  if (activeSettingsPanel === 'rules') {
    return <ScheduleRuleSettings stores={activeStores} templates={templates} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} onBack={() => setActiveSettingsPanel('overview')} />;
  }

  return (
    <TimeTemplateSettings
      templates={templates}
      draft={draft}
      editingTemplateId={editingTemplateId}
      isSaving={isTemplateSaving}
      canCreate={canCreate}
      canDelete={canDelete}
      canUpdate={canUpdate}
      setDraft={setDraft}
      onBack={() => setActiveSettingsPanel('overview')}
      onEdit={onEdit}
      onDelete={onDelete}
      onReset={onReset}
      onSubmit={onSubmit}
    />
  );
}

function SettingsAccessDenied({ onBack }: { onBack: () => void }) {
  return <><header className="settings-detail-header"><button className="settings-back-button" type="button" onClick={onBack}>← 설정으로 돌아가기</button><div><h1>접근 권한이 없습니다.</h1><p>현재 계정에는 이 설정을 조회할 권한이 없습니다.</p></div></header></>;
}

import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { BaseShiftRule, Employee, SettingsPanel, ShiftTemplate, Store, TemplateDraft } from '../../domain/types';
import { AccountManagementSettings } from '../settings/AccountManagementSettings';
import { SettingsOverview } from '../settings/SettingsOverview';
import { StoreManagementSettings } from '../settings/StoreManagementSettings';
import { TimeTemplateSettings } from '../settings/TimeTemplateSettings';

type SettingsViewProps = {
  stores: Store[];
  employees: Employee[];
  baseShifts: BaseShiftRule[];
  templates: ShiftTemplate[];
  draft: TemplateDraft;
  editingTemplateId: string | null;
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  activeSettingsPanel: SettingsPanel;
  setDraft: Dispatch<SetStateAction<TemplateDraft>>;
  setActiveSettingsPanel: (panel: SettingsPanel) => void;
  onEdit: (template: ShiftTemplate) => void;
  onDelete: (templateId: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStoresChange: (stores: Store[]) => Promise<void> | void;
};

export function SettingsView({
  stores,
  employees,
  baseShifts,
  templates,
  draft,
  editingTemplateId,
  canCreate,
  canDelete,
  canUpdate,
  activeSettingsPanel,
  setDraft,
  setActiveSettingsPanel,
  onEdit,
  onReset,
  onSubmit,
  onStoresChange,
}: SettingsViewProps) {
  if (activeSettingsPanel === 'overview') {
    return (
      <SettingsOverview
        stores={stores}
        templates={templates}
        onTemplateSettingsOpen={() => setActiveSettingsPanel('templates')}
        onStoreSettingsOpen={() => setActiveSettingsPanel('stores')}
        onAccountSettingsOpen={() => setActiveSettingsPanel('accounts')}
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
    return (
      <AccountManagementSettings
        canCreate={canCreate}
        canUpdate={canUpdate}
        stores={stores}
        onBack={() => setActiveSettingsPanel('overview')}
      />
    );
  }

  return (
    <TimeTemplateSettings
      templates={templates}
      draft={draft}
      editingTemplateId={editingTemplateId}
      canCreate={canCreate}
      canDelete={canDelete}
      canUpdate={canUpdate}
      setDraft={setDraft}
      onBack={() => setActiveSettingsPanel('overview')}
      onEdit={onEdit}
      onReset={onReset}
      onSubmit={onSubmit}
    />
  );
}

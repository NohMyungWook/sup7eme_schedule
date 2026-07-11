import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import type { BaseShiftRule, Employee, ShiftTemplate, Store, TemplateDraft } from '../../domain/types';
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
  setDraft: Dispatch<SetStateAction<TemplateDraft>>;
  onEdit: (template: ShiftTemplate) => void;
  onDelete: (templateId: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStoresChange: (stores: Store[]) => void;
};

export function SettingsView({
  stores,
  employees,
  baseShifts,
  templates,
  draft,
  editingTemplateId,
  setDraft,
  onEdit,
  onReset,
  onSubmit,
  onStoresChange,
}: SettingsViewProps) {
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<'overview' | 'templates' | 'stores' | 'accounts'>('overview');

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
        onBack={() => setActiveSettingsPanel('overview')}
        onStoresChange={onStoresChange}
      />
    );
  }

  if (activeSettingsPanel === 'accounts') {
    return (
      <AccountManagementSettings
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
      setDraft={setDraft}
      onBack={() => setActiveSettingsPanel('overview')}
      onEdit={onEdit}
      onReset={onReset}
      onSubmit={onSubmit}
    />
  );
}

import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import type { ShiftTemplate, TemplateDraft } from '../../domain/types';
import { SettingsOverview } from '../settings/SettingsOverview';
import { TimeTemplateSettings } from '../settings/TimeTemplateSettings';

type SettingsViewProps = {
  templates: ShiftTemplate[];
  draft: TemplateDraft;
  editingTemplateId: string | null;
  setDraft: Dispatch<SetStateAction<TemplateDraft>>;
  onEdit: (template: ShiftTemplate) => void;
  onDelete: (templateId: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function SettingsView({
  templates,
  draft,
  editingTemplateId,
  setDraft,
  onEdit,
  onReset,
  onSubmit,
}: SettingsViewProps) {
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<'overview' | 'templates'>('overview');

  if (activeSettingsPanel === 'overview') {
    return (
      <SettingsOverview
        templates={templates}
        onTemplateSettingsOpen={() => setActiveSettingsPanel('templates')}
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

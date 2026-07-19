import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { createInitialTemplateDraft } from '../domain/drafts';
import type {
  BaseShiftDraft,
  DraftShift,
  ScheduleState,
  ShiftTemplate,
  TemplateDraft,
} from '../domain/types';
import { deactivateTemplate, saveTemplateToApi } from '../services/templateApi';
import { splitShiftTime } from '../utils/schedule';

type UseTemplateManagementOptions = {
  templates: ShiftTemplate[];
  draft: DraftShift;
  baseShiftDraft: BaseShiftDraft;
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  setDraft: Dispatch<SetStateAction<DraftShift>>;
  setBaseShiftDraft: Dispatch<SetStateAction<BaseShiftDraft>>;
  setSchedule: Dispatch<SetStateAction<ScheduleState>>;
};

export function useTemplateManagement(options: UseTemplateManagementOptions) {
  const { templates, draft, baseShiftDraft, canCreate, canDelete, canUpdate, setDraft, setBaseShiftDraft, setSchedule } = options;
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(createInitialTemplateDraft);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isTemplateSaving, setIsTemplateSaving] = useState(false);

  useEffect(() => {
    const fallback = templates[0];
    if (!fallback) return;
    if (!templates.some((template) => template.id === draft.templateId)) {
      setDraft((current) => ({ ...current, templateId: fallback.id, time: fallback.time }));
    }
    if (!templates.some((template) => template.id === baseShiftDraft.templateId)) {
      const { startTime, endTime } = splitShiftTime(fallback.time);
      setBaseShiftDraft((current) => ({ ...current, templateId: fallback.id, startTime, endTime }));
    }
  }, [baseShiftDraft.templateId, draft.templateId, setBaseShiftDraft, setDraft, templates]);

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isTemplateSaving || (editingTemplateId ? !canUpdate : !canCreate) || !templateDraft.label.trim()) return;
    const time = `${templateDraft.startTime}-${templateDraft.endTime}`;
    if (!templateDraft.requiresTimeInput && templateDraft.startTime === templateDraft.endTime) return;

    let savedTemplate;
    setIsTemplateSaving(true);
    try {
      savedTemplate = await saveTemplateToApi(editingTemplateId, { ...templateDraft, label: templateDraft.label.trim() });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '시간대를 저장하지 못했습니다.');
      return;
    } finally {
      setIsTemplateSaving(false);
    }
    if (editingTemplateId) {
      setSchedule((current) => ({ ...current, templates: current.templates.map((template) => template.id === editingTemplateId ? { ...template, ...savedTemplate } : template) }));
      if (draft.templateId === editingTemplateId) {
        setDraft((current) => ({ ...current, time }));
      }
    } else {
      setSchedule((current) => ({ ...current, templates: [...current.templates, savedTemplate] }));
    }
    closeTemplateForm();
  }

  function editTemplate(template: ShiftTemplate) {
    if (!canUpdate && !canDelete) return;
    const { startTime, endTime } = splitShiftTime(template.time);
    setEditingTemplateId(template.id);
    setTemplateDraft({ label: template.label, startTime, endTime, color: template.color, requiresTimeInput: Boolean(template.requiresTimeInput) });
  }

  function closeTemplateForm() {
    setEditingTemplateId(null);
    setTemplateDraft(createInitialTemplateDraft());
  }

  async function deleteTemplate(templateId: string) {
    if (isTemplateSaving || !canDelete || templates.length <= 1 || !window.confirm('이 시간대를 비활성화할까요? 과거 근무의 시간과 이름은 유지됩니다.')) return;
    const fallback = templates.find((template) => template.id !== templateId);
    if (!fallback) return;
    setIsTemplateSaving(true);
    try {
      await deactivateTemplate(templateId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '시간대를 비활성화하지 못했습니다.');
      return;
    } finally {
      setIsTemplateSaving(false);
    }
    setSchedule((current) => ({ ...current, templates: current.templates.filter((template) => template.id !== templateId) }));
    if (draft.templateId === templateId) setDraft((current) => ({ ...current, templateId: fallback.id, time: fallback.time }));
    if (baseShiftDraft.templateId === templateId) {
      const { startTime, endTime } = splitShiftTime(fallback.time);
      setBaseShiftDraft((current) => ({ ...current, templateId: fallback.id, startTime, endTime }));
    }
    closeTemplateForm();
  }

  return {
    templateDraft, setTemplateDraft, editingTemplateId, saveTemplate,
    editTemplate, closeTemplateForm, deleteTemplate, isTemplateSaving,
  };
}

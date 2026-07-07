import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { createInitialTemplateDraft } from '../domain/drafts';
import type {
  BaseShiftDraft,
  DraftShift,
  ScheduleState,
  ShiftTemplate,
  TemplateDraft,
} from '../domain/types';
import { splitShiftTime } from '../utils/schedule';

type UseTemplateManagementOptions = {
  templates: ShiftTemplate[];
  draft: DraftShift;
  baseShiftDraft: BaseShiftDraft;
  isManager: boolean;
  setDraft: Dispatch<SetStateAction<DraftShift>>;
  setBaseShiftDraft: Dispatch<SetStateAction<BaseShiftDraft>>;
  setSchedule: Dispatch<SetStateAction<ScheduleState>>;
};

export function useTemplateManagement(options: UseTemplateManagementOptions) {
  const { templates, draft, baseShiftDraft, isManager, setDraft, setBaseShiftDraft, setSchedule } = options;
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(createInitialTemplateDraft);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

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

  function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isManager || !templateDraft.label.trim()) return;
    const time = `${templateDraft.startTime}-${templateDraft.endTime}`;
    if (!templateDraft.requiresTimeInput && templateDraft.startTime === templateDraft.endTime) return;

    if (editingTemplateId) {
      setSchedule((current) => ({
        ...current,
        templates: current.templates.map((template) => template.id === editingTemplateId ? { ...template, label: templateDraft.label.trim(), time, color: templateDraft.color, requiresTimeInput: templateDraft.requiresTimeInput } : template),
      }));
      if (draft.templateId === editingTemplateId) {
        setDraft((current) => ({ ...current, time }));
      }
    } else {
      setSchedule((current) => ({
        ...current,
        templates: [...current.templates, { id: crypto.randomUUID(), label: templateDraft.label.trim(), time, color: templateDraft.color, requiresTimeInput: templateDraft.requiresTimeInput }],
      }));
    }
    closeTemplateForm();
  }

  function editTemplate(template: ShiftTemplate) {
    const { startTime, endTime } = splitShiftTime(template.time);
    setEditingTemplateId(template.id);
    setTemplateDraft({ label: template.label, startTime, endTime, color: template.color, requiresTimeInput: Boolean(template.requiresTimeInput) });
  }

  function closeTemplateForm() {
    setEditingTemplateId(null);
    setTemplateDraft(createInitialTemplateDraft());
  }

  function deleteTemplate(templateId: string) {
    if (!isManager || templates.length <= 1 || !window.confirm('이 시간대를 삭제할까요? 사용 중인 근무는 다른 시간대로 자동 전환됩니다.')) return;
    const fallback = templates.find((template) => template.id !== templateId);
    if (!fallback) return;

    setSchedule((current) => ({
      ...current,
      templates: current.templates.filter((template) => template.id !== templateId),
      shifts: current.shifts.map((shift) => shift.templateId === templateId ? { ...shift, templateId: fallback.id } : shift),
      employees: current.employees.map((employee) => ({ ...employee, baseShifts: employee.baseShifts.map((rule) => rule.templateId === templateId ? { ...rule, templateId: fallback.id } : rule) })),
    }));
    if (draft.templateId === templateId) setDraft((current) => ({ ...current, templateId: fallback.id, time: fallback.time }));
    if (baseShiftDraft.templateId === templateId) {
      const { startTime, endTime } = splitShiftTime(fallback.time);
      setBaseShiftDraft((current) => ({ ...current, templateId: fallback.id, startTime, endTime }));
    }
    closeTemplateForm();
  }

  return {
    templateDraft, setTemplateDraft, editingTemplateId, saveTemplate,
    editTemplate, closeTemplateForm, deleteTemplate,
  };
}

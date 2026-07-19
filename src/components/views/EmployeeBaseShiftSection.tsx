import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { weekdays } from '../../domain/data';
import { getStoreName } from '../../domain/selectors';
import type { BaseShiftDraft, BaseShiftRule, Store } from '../../domain/types';
import { Dropdown } from '../common/Dropdown';
import { TimePicker } from '../common/TimePicker';
import { baseShiftTypeLabel, baseShiftTypes } from './employeeViewModel';

type EmployeeBaseShiftSectionProps = {
  baseShiftDraft: BaseShiftDraft;
  editingBaseShiftIds: string[];
  isAddingEmployee: boolean;
  isManager: boolean;
  selectedBaseShifts: BaseShiftRule[];
  selectedEmployeeId?: string;
  selectedStoreIds: string[];
  storeId: string;
  stores: Store[];
  setBaseShiftDraft: Dispatch<SetStateAction<BaseShiftDraft>>;
  onBaseShiftAdd: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onBaseShiftDelete: (ruleIds: string | string[]) => void;
  onBaseShiftEdit: (ruleIds: string[]) => void;
  onBaseShiftEditCancel: () => void;
  onBaseShiftWeekdayToggle: (weekday: number) => void;
  onStoreChange: (storeId: string) => void;
  onTemplateSelect: (templateId: string) => void;
};

export function EmployeeBaseShiftSection({
  baseShiftDraft,
  editingBaseShiftIds,
  isAddingEmployee,
  isManager,
  selectedBaseShifts,
  selectedEmployeeId,
  selectedStoreIds,
  storeId,
  stores,
  setBaseShiftDraft,
  onBaseShiftAdd,
  onBaseShiftDelete,
  onBaseShiftEdit,
  onBaseShiftEditCancel,
  onBaseShiftWeekdayToggle,
  onStoreChange,
  onTemplateSelect,
}: EmployeeBaseShiftSectionProps) {
  const [isBaseShiftFormOpen, setIsBaseShiftFormOpen] = useState(false);
  const baseStoreOptions = selectedStoreIds.map((employeeStoreId) => ({
    value: employeeStoreId,
    label: getStoreName(employeeStoreId, stores),
  }));
  const activeBaseStoreId = selectedStoreIds.includes(storeId)
    ? storeId
    : selectedStoreIds[0] ?? storeId;
  const groupedBaseShifts = selectedBaseShifts
    .reduce<Array<{
      key: string;
      ruleIds: string[];
      weekdays: number[];
      templateId: string;
      startTime: string;
      endTime: string;
    }>>((groups, rule) => {
      const key = `${rule.templateId}-${rule.startTime}-${rule.endTime}`;
      const group = groups.find((item) => item.key === key);
      if (group) {
        group.ruleIds.push(rule.id);
        group.weekdays.push(rule.weekday);
      } else {
        groups.push({
          key,
          ruleIds: [rule.id],
          weekdays: [rule.weekday],
          templateId: rule.templateId,
          startTime: rule.startTime,
          endTime: rule.endTime,
        });
      }
      return groups;
    }, [])
    .map((group) => ({
      ...group,
      weekdays: [...new Set(group.weekdays)].sort((a, b) => a - b),
    }));
  const unavailableBaseWeekdays = new Set(
    selectedBaseShifts
      .filter((rule) =>
        rule.startTime === baseShiftDraft.startTime &&
        rule.endTime === baseShiftDraft.endTime &&
        !editingBaseShiftIds.includes(rule.id),
      )
      .map((rule) => rule.weekday),
  );
  const isBaseShiftEditing = editingBaseShiftIds.length > 0;

  useEffect(() => {
    if (editingBaseShiftIds.length) {
      setIsBaseShiftFormOpen(true);
    }
  }, [editingBaseShiftIds.length]);

  useEffect(() => {
    setIsBaseShiftFormOpen(false);
  }, [selectedEmployeeId, storeId]);

  function closeEditor() {
    onBaseShiftEditCancel();
    setIsBaseShiftFormOpen(false);
  }

  function selectBaseShift(ruleIds: string[], isEditingGroup: boolean) {
    if (!isManager) return;
    if (isEditingGroup) {
      closeEditor();
      return;
    }
    onBaseShiftEdit(ruleIds);
    setIsBaseShiftFormOpen(true);
  }

  return (
    <div className="base-shift-section">
      <div className="base-shift-title">
        <strong>요일별 기본 근무</strong>
        {isAddingEmployee ? (
          <div className="base-shift-title-spacer" aria-hidden="true" />
        ) : (
          <div>
            <Dropdown
              value={activeBaseStoreId}
              options={baseStoreOptions}
              onChange={onStoreChange}
              ariaLabel="기본 근무 매장 선택"
            />
            <small>기준</small>
          </div>
        )}
      </div>
      {isAddingEmployee ? (
        <div className="base-shift-placeholder">
          <p>직원 추가 후 기본 근무를 설정할 수 있습니다.</p>
        </div>
      ) : (
        <>
          <div className="base-shift-list">
            {groupedBaseShifts.map((group) => {
              const isEditingGroup = group.ruleIds.some((ruleId) =>
                editingBaseShiftIds.includes(ruleId),
              );
              const displayWeekdays = isEditingGroup ? baseShiftDraft.weekdays : group.weekdays;
              const displayTemplateId = isEditingGroup
                ? baseShiftDraft.templateId
                : group.templateId;
              const displayStartTime = isEditingGroup
                ? baseShiftDraft.startTime
                : group.startTime;
              const displayEndTime = isEditingGroup ? baseShiftDraft.endTime : group.endTime;

              return (
                <div
                  className={`base-shift-item ${isEditingGroup ? 'is-editing' : ''} ${
                    isManager ? 'is-editable' : ''
                  }`}
                  key={group.key}
                  onClick={() => selectBaseShift(group.ruleIds, isEditingGroup)}
                  role={isManager ? 'button' : undefined}
                  tabIndex={isManager ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (!isManager) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectBaseShift(group.ruleIds, isEditingGroup);
                    }
                  }}
                >
                  <span>{displayWeekdays.map((weekday) => weekdays[weekday]).join(', ')}</span>
                  <strong>{baseShiftTypeLabel(displayTemplateId)}</strong>
                  <small>{displayStartTime}-{displayEndTime}</small>
                  {isManager ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onBaseShiftDelete(group.ruleIds);
                      }}
                    >
                      삭제
                    </button>
                  ) : null}
                </div>
              );
            })}
            {!groupedBaseShifts.length ? <p>이 매장의 기본 근무정보가 없습니다.</p> : null}
          </div>
          {isManager && !isBaseShiftFormOpen ? (
            <button
              className="base-shift-add-open"
              type="button"
              onClick={() => {
                onBaseShiftEditCancel();
                setIsBaseShiftFormOpen(true);
              }}
            >
              + 기본근무 추가하기
            </button>
          ) : null}
          {isManager && isBaseShiftFormOpen ? (
            <form
              className="base-shift-form profile-base-form"
              onSubmit={async (event) => {
                if (await onBaseShiftAdd(event)) setIsBaseShiftFormOpen(false);
              }}
            >
              <div className="base-form-heading">
                <strong>{isBaseShiftEditing ? '기본 근무 수정' : '기본 근무 추가'}</strong>
              </div>
              <div className="base-weekday-selector">
                <span>요일 선택</span>
                <div>
                  {weekdays.map((weekday, index) => {
                    const isUnavailable = unavailableBaseWeekdays.has(index);

                    return (
                      <button
                        type="button"
                        key={weekday}
                        className={`${baseShiftDraft.weekdays.includes(index) ? 'is-selected' : ''} ${
                          isUnavailable ? 'is-disabled' : ''
                        }`}
                        onClick={() => onBaseShiftWeekdayToggle(index)}
                        disabled={isUnavailable}
                      >
                        {weekday}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="base-shift-type-selector">
                <span>근무 유형</span>
                <div>
                  {baseShiftTypes.map((type) => (
                    <button
                      type="button"
                      key={type.value}
                      className={baseShiftDraft.templateId === type.value ? 'is-selected' : undefined}
                      onClick={() => onTemplateSelect(type.value)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <label>
                시작 시간
                <TimePicker
                  value={baseShiftDraft.startTime}
                  onChange={(startTime) => setBaseShiftDraft((current) => ({ ...current, startTime }))}
                  ariaLabel="기본 근무 시작 시간"
                />
              </label>
              <label>
                종료 시간
                <TimePicker
                  value={baseShiftDraft.endTime}
                  onChange={(endTime) => setBaseShiftDraft((current) => ({ ...current, endTime }))}
                  ariaLabel="기본 근무 종료 시간"
                />
              </label>
              <div className="base-form-actions">
                <button type="button" onClick={closeEditor}>취소</button>
                <button className="primary" type="submit" disabled={!baseShiftDraft.weekdays.length}>
                  {isBaseShiftEditing ? '기본 근무 저장' : '기본 근무 추가'}
                </button>
              </div>
            </form>
          ) : null}
        </>
      )}
    </div>
  );
}

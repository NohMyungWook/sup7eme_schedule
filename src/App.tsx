import { useState } from 'react';
import { AppSidebar } from './components/layout/AppSidebar';
import { LoginPage } from './components/layout/LoginPage';
import { DashboardView } from './components/views/DashboardView';
import { EmployeesView } from './components/views/EmployeesView';
import { NotesView } from './components/views/NotesView';
import { ScheduleView } from './components/views/ScheduleView';
import { SettingsView } from './components/views/SettingsView';
import { useScheduleController } from './hooks/useScheduleController';

export default function App() {
  const app = useScheduleController();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    window.matchMedia('(min-width: 701px)').matches,
  );

  if (app.isAuthLoading) {
    return <AppStatus message="로그인 정보를 확인하고 있습니다." />;
  }

  if (!app.role) {
    return (
      <LoginPage
        loginId={app.loginId}
        loginPassword={app.loginPassword}
        loginError={app.loginError}
        onLoginIdChange={(value) => {
          app.setLoginId(value);
          app.setLoginError('');
        }}
        onLoginPasswordChange={(value) => {
          app.setLoginPassword(value);
          app.setLoginError('');
        }}
        onSubmit={app.login}
      />
    );
  }

  if (app.scheduleStatus.isLoading && !app.employees.length && !app.templates.length) {
    return <AppStatus message="스케줄 데이터를 불러오고 있습니다." />;
  }

  if (app.scheduleStatus.errorMessage && !app.employees.length && !app.templates.length) {
    return (
      <AppStatus
        message="스케줄 데이터를 불러오지 못했습니다."
        detail={app.scheduleStatus.errorMessage}
        actionLabel="로그아웃"
        onAction={app.logout}
      />
    );
  }

  return (
    <main
      className={`workspace ${isSidebarOpen ? '' : 'is-sidebar-collapsed'} ${app.draggingShiftId ? 'is-shift-dragging' : ''}`}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('application/x-kingmw-shift')) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }
      }}
      onDrop={(event) => {
        const shiftId = event.dataTransfer.getData('application/x-kingmw-shift');
        if (shiftId) {
          event.preventDefault();
          app.removeShift(shiftId);
        }
      }}
    >
      <AppSidebar
        activeView={app.activeView}
        role={app.role}
        displayName={app.displayName}
        onViewChange={(view) => {
          app.setActiveView(view);
          if (window.matchMedia('(max-width: 700px)').matches) {
            setIsSidebarOpen(false);
          }
        }}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={app.logout}
      />
      {isSidebarOpen ? <button className="sidebar-backdrop" type="button" aria-label="사이드바 닫기" onClick={() => setIsSidebarOpen(false)} /> : <button className="sidebar-open-button" type="button" aria-label="사이드바 열기" onClick={() => setIsSidebarOpen(true)}><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg></button>}
      <section
        className={`main-board ${
          app.activeView === 'dashboard'
            ? 'dashboard-board'
            : app.activeView === 'employees'
              ? 'employee-board'
              : app.activeView === 'notes'
                ? 'memo-board'
                : ''
        }`}
      >
        {app.activeView === 'dashboard' ? (
          <DashboardView
            storeId={app.storeId}
            stores={app.stores}
            month={app.dashboardMonth}
            employees={app.employees}
            shifts={app.shifts}
            onStoreChange={app.setStoreId}
            onMonthChange={app.setDashboardMonth}
            onDateSelect={app.openScheduleDate}
          />
        ) : app.activeView === 'settings' ? (
          <SettingsView
            stores={app.stores}
            employees={app.employees}
            baseShifts={app.employees.flatMap((employee) => employee.baseShifts)}
            templates={app.templates}
            draft={app.templateDraft}
            editingTemplateId={app.editingTemplateId}
            setDraft={app.setTemplateDraft}
            onEdit={app.editTemplate}
            onDelete={app.deleteTemplate}
            onReset={app.closeTemplateForm}
            onSubmit={app.saveTemplate}
            onStoresChange={app.saveStores}
          />
        ) : app.activeView === 'employees' ? (
          <EmployeesView
            employees={app.employees}
            stores={app.stores}
            filteredEmployees={app.filteredEmployees}
            selectedEmployee={app.selectedEmployee}
            selectedBaseShifts={app.selectedEmployeeBaseShifts}
            storeId={app.storeId}
            storeFilter={app.employeeStoreFilter}
            showForm={app.showEmployeeForm}
            employeeDraft={app.employeeDraft}
            selectedEmployeeDraft={app.selectedEmployeeDraft}
            baseShiftDraft={app.baseShiftDraft}
            isManager={app.isManager}
            setEmployeeDraft={app.setEmployeeDraft}
            setSelectedEmployeeDraft={app.setSelectedEmployeeDraft}
            setBaseShiftDraft={app.setBaseShiftDraft}
            onStoreFilterChange={(storeId) => {
              app.setEmployeeStoreFilter(storeId);
              if (storeId !== 'all') app.setStoreId(storeId);
            }}
            onStoreChange={app.setStoreId}
            onAddOpen={app.openAddEmployee}
            onFormClose={app.closeEmployeeForm}
            onEmployeeSave={app.saveEmployee}
            onSelectedEmployeeSave={app.saveSelectedEmployee}
            onEmployeeDelete={app.deleteEmployee}
            onEmployeeSelect={app.selectManagedEmployee}
            onStoreToggle={app.toggleDraftStore}
            onSelectedStoreToggle={app.toggleSelectedEmployeeStore}
            onBaseShiftWeekdayToggle={app.toggleBaseShiftWeekday}
            onTemplateSelect={app.selectBaseShiftTemplate}
            onBaseShiftAdd={app.addBaseShift}
            onBaseShiftDelete={app.deleteBaseShift}
            onBaseShiftEdit={app.editBaseShift}
            onBaseShiftEditCancel={app.cancelBaseShiftEdit}
            editingBaseShiftIds={app.editingBaseShiftIds}
          />
        ) : app.activeView === 'notes' ? (
          <NotesView
            notes={app.notes}
            stores={app.stores}
            filteredNotes={app.filteredNotes}
            storeFilter={app.noteStoreFilter}
            memoStoreId={app.memoStoreId}
            memoDate={app.memoDate}
            memoText={app.memoText}
            editingMemoKey={app.editingMemoKey}
            isManager={app.isManager}
            onStoreFilterChange={(storeId) => {
              app.setNoteStoreFilter(storeId);
              if (storeId !== 'all' && !app.editingMemoKey) {
                app.setMemoStoreId(storeId);
              }
            }}
            onMemoStoreChange={app.setMemoStoreId}
            onMemoDateChange={app.setMemoDate}
            onMemoTextChange={app.setMemoText}
            onEdit={app.editMemo}
            onDelete={app.deleteMemo}
            onReset={app.resetMemoForm}
            onSubmit={app.saveMemo}
          />
        ) : (
          <ScheduleView
            storeId={app.storeId}
            stores={app.stores}
            days={app.days}
            employees={app.employees}
            storeEmployees={app.storeEmployees}
            visibleShifts={app.visibleShifts}
            templates={app.templates}
            dragTemplates={app.dragTemplates}
            pendingEmployeeDrop={app.pendingEmployeeDrop}
            selectedDate={app.selectedDate}
            draft={app.draft}
            editingId={app.editingId}
            draggingShiftId={app.draggingShiftId}
            generationMessage={app.generationMessage}
            showModal={app.showShiftModal}
            isQuickShiftEntry={app.isQuickShiftEntry}
            timeError={app.shiftTimeError}
            isManager={app.isManager}
            selectedEmployeeId={app.scheduleSelectedEmployee?.id}
            setDraft={app.setDraft}
            setSelectedDate={app.setSelectedDate}
            setDraggingShiftId={app.setDraggingShiftId}
            onStoreChange={app.setStoreId}
            onMoveWeek={app.moveWeek}
            onCopyPreviousWeek={app.copyPreviousWeek}
            onGenerateBaseWeek={app.generateBaseWeek}
            onTemplateSelect={app.selectTemplate}
            onShiftMove={app.moveShiftToDate}
            onEmployeeDrop={app.addDraggedEmployee}
            onEmployeeSelect={(employeeId) => {
              app.setSelectedEmployeeId(employeeId);
              app.setDraft((current) => ({ ...current, employeeId }));
            }}
            onDropTemplateSelect={app.selectDroppedEmployeeTemplate}
            onDropPickerClose={() => app.setPendingEmployeeDrop(null)}
            onShiftEdit={app.editShift}
            onTimeChange={app.updateDraftTime}
            onShiftDelete={app.deleteShift}
            onModalClose={app.closeShiftModal}
            onShiftSubmit={app.submitShift}
          />
        )}
      </section>
    </main>
  );
}

type AppStatusProps = {
  message: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function AppStatus({ message, detail, actionLabel, onAction }: AppStatusProps) {
  return (
    <main className="login-page">
      <section className="login-panel app-status-panel">
        <div className="login-heading">
          <h1>{message}</h1>
          {detail ? <p>{detail}</p> : null}
        </div>
        {actionLabel && onAction ? <button type="button" onClick={onAction}>{actionLabel}</button> : null}
      </section>
    </main>
  );
}

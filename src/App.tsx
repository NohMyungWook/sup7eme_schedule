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

  return (
    <main className="workspace">
      <AppSidebar
        activeView={app.activeView}
        role={app.role}
        storeEmployees={app.storeEmployees}
        selectedEmployeeId={app.scheduleSelectedEmployee?.id}
        onViewChange={app.setActiveView}
        onEmployeeSelect={(employeeId) => {
          app.setSelectedEmployeeId(employeeId);
          app.setDraft((current) => ({ ...current, employeeId }));
        }}
        onLogout={app.logout}
      />
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
            month={app.dashboardMonth}
            employees={app.employees}
            shifts={app.shifts}
            onStoreChange={app.setStoreId}
            onMonthChange={app.setDashboardMonth}
            onDateSelect={app.openScheduleDate}
          />
        ) : app.activeView === 'settings' ? (
          <SettingsView
            templates={app.templates}
            draft={app.templateDraft}
            editingTemplateId={app.editingTemplateId}
            setDraft={app.setTemplateDraft}
            onEdit={app.editTemplate}
            onDelete={app.deleteTemplate}
            onReset={app.closeTemplateForm}
            onSubmit={app.saveTemplate}
          />
        ) : app.activeView === 'employees' ? (
          <EmployeesView
            employees={app.employees}
            filteredEmployees={app.filteredEmployees}
            selectedEmployee={app.selectedEmployee}
            selectedBaseShifts={app.selectedEmployeeBaseShifts}
            templates={app.templates}
            storeId={app.storeId}
            storeFilter={app.employeeStoreFilter}
            showForm={app.showEmployeeForm}
            editingEmployeeId={app.editingEmployeeId}
            employeeDraft={app.employeeDraft}
            baseShiftDraft={app.baseShiftDraft}
            isManager={app.isManager}
            setEmployeeDraft={app.setEmployeeDraft}
            setBaseShiftDraft={app.setBaseShiftDraft}
            onStoreFilterChange={(storeId) => {
              app.setEmployeeStoreFilter(storeId);
              if (storeId !== 'all') app.setStoreId(storeId);
            }}
            onStoreChange={app.setStoreId}
            onAddOpen={app.openAddEmployee}
            onEditOpen={app.openEditEmployee}
            onFormClose={app.closeEmployeeForm}
            onEmployeeSave={app.saveEmployee}
            onEmployeeDelete={app.deleteEmployee}
            onEmployeeSelect={app.selectManagedEmployee}
            onStoreToggle={app.toggleDraftStore}
            onTemplateSelect={app.selectBaseShiftTemplate}
            onBaseShiftAdd={app.addBaseShift}
            onBaseShiftDelete={app.deleteBaseShift}
          />
        ) : app.activeView === 'notes' ? (
          <NotesView
            notes={app.notes}
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
            days={app.days}
            employees={app.employees}
            storeEmployees={app.storeEmployees}
            visibleShifts={app.visibleShifts}
            templates={app.templates}
            selectedDate={app.selectedDate}
            selectedNote={app.selectedNote}
            noteDraft={app.noteDraft}
            draft={app.draft}
            editingId={app.editingId}
            draggingShiftId={app.draggingShiftId}
            generationMessage={app.generationMessage}
            showModal={app.showShiftModal}
            timeError={app.shiftTimeError}
            isManager={app.isManager}
            setDraft={app.setDraft}
            setSelectedDate={app.setSelectedDate}
            setNoteDraft={app.setNoteDraft}
            setDraggingShiftId={app.setDraggingShiftId}
            onStoreChange={app.setStoreId}
            onMoveWeek={app.moveWeek}
            onCopyPreviousWeek={app.copyPreviousWeek}
            onGenerateBaseWeek={app.generateBaseWeek}
            onTemplateSelect={app.selectTemplate}
            onShiftMove={app.moveShiftToDate}
            onEmployeeDrop={app.addDraggedEmployee}
            onShiftEdit={app.editShift}
            onShiftAdd={app.startAddShift}
            onShiftRemove={app.removeShift}
            onNoteSave={app.saveNote}
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

import { useEffect, useRef, useState } from 'react';
import type { AuthUser, LeaveRequest } from '../../domain/types';
import { fetchEmployeeProfile, type EmployeeProfile } from '../../services/meApi';
import { EmployeeHoursPage } from './EmployeeHoursPage';
import { EmployeeLeaveHistoryPage } from './EmployeeLeaveHistoryPage';
import { EmployeeLeavePage } from './EmployeeLeavePage';
import { EmployeeProfilePage } from './EmployeeProfilePage';
import { EmployeeSchedulePage } from './EmployeeSchedulePage';
import { EmployeeTeamSchedulePage } from './EmployeeTeamSchedulePage';

type EmployeeTab = 'schedule' | 'team' | 'leave' | 'history' | 'hours' | 'profile';
const employeeTabs: EmployeeTab[] = ['schedule', 'team', 'leave', 'history', 'hours', 'profile'];

export function EmployeePortal({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [activeTab, setActiveTab] = useState<EmployeeTab>(readEmployeeTab);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mustChangePassword, setMustChangePassword] = useState(user.mustChangePassword);
  const [error, setError] = useState('');
  const didSyncRoute = useRef(false);

  useEffect(() => {
    let mounted = true;
    fetchEmployeeProfile().then((next) => { if (mounted) setProfile(next); }).catch((requestError: Error) => { if (mounted) setError(requestError.message); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    function handlePopState() {
      setActiveTab(readEmployeeTab());
      setEditingRequest(null);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('employeeTab') === activeTab) {
      didSyncRoute.current = true;
      return;
    }
    url.searchParams.delete('view');
    url.searchParams.delete('panel');
    url.searchParams.set('employeeTab', activeTab);
    const method = didSyncRoute.current ? 'pushState' : 'replaceState';
    window.history[method](null, '', `${url.pathname}${url.search}${url.hash}`);
    didSyncRoute.current = true;
  }, [activeTab]);

  function logoutEmployee() {
    const url = new URL(window.location.href);
    url.searchParams.delete('employeeTab');
    url.searchParams.set('view', 'schedule');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    onLogout();
  }

  if (error) return <main className="employee-portal"><div className="employee-state is-error"><strong>직원 정보를 불러오지 못했습니다.</strong><p>{error}</p><button type="button" onClick={logoutEmployee}>로그아웃</button></div></main>;
  if (!profile) return <main className="employee-portal"><div className="employee-loading"><i /><span>내 정보를 불러오고 있습니다.</span></div></main>;
  if (mustChangePassword) return <main className="employee-portal employee-password-gate"><EmployeeProfilePage profile={profile} onLogout={logoutEmployee} passwordChangeRequired onPasswordChanged={() => setMustChangePassword(false)} /></main>;

  const tabs: Array<{ id: EmployeeTab; label: string; icon: string }> = [
    { id: 'schedule', label: '내 스케줄', icon: '▣' }, { id: 'team', label: '주간 근무표', icon: '▦' }, { id: 'leave', label: '휴무 신청', icon: '+' }, { id: 'history', label: '신청 내역', icon: '✓' }, { id: 'hours', label: '근무시간', icon: '◷' }, { id: 'profile', label: '내 정보', icon: '○' },
  ];
  return <main className="employee-portal"><header className="employee-topbar"><div><span className="brand-mark">S</span><strong>KingMW</strong></div><button type="button" onClick={() => setActiveTab('profile')}><span style={{ background: profile.color }}>{profile.name.slice(0, 1)}</span>{profile.name}</button></header><div className="employee-content">{activeTab === 'schedule' ? <EmployeeSchedulePage /> : activeTab === 'team' ? <EmployeeTeamSchedulePage employeeId={profile.id} /> : activeTab === 'leave' ? <EmployeeLeavePage stores={profile.stores} editingRequest={editingRequest} onCancelEdit={() => setEditingRequest(null)} onSaved={() => { setEditingRequest(null); setRefreshKey((value) => value + 1); }} /> : activeTab === 'history' ? <EmployeeLeaveHistoryPage refreshKey={refreshKey} onEdit={(request) => { setEditingRequest(request); setActiveTab('leave'); }} /> : activeTab === 'hours' ? <EmployeeHoursPage /> : <EmployeeProfilePage profile={profile} onLogout={logoutEmployee} />}</div><nav className="employee-bottom-nav" aria-label="직원 메뉴">{tabs.map((tab) => <button type="button" className={activeTab === tab.id ? 'is-active' : undefined} key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id !== 'leave') setEditingRequest(null); }}><i>{tab.icon}</i><span>{tab.label}</span></button>)}</nav></main>;
}

function readEmployeeTab(): EmployeeTab {
  const tab = new URLSearchParams(window.location.search).get('employeeTab');
  return employeeTabs.includes(tab as EmployeeTab) ? tab as EmployeeTab : 'schedule';
}

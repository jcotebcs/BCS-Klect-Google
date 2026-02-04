
import React, { useState, useEffect, useCallback } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Scanner from './components/Scanner';
import PersonScanner from './components/PersonScanner';
import VehicleDetails from './components/VehicleDetails';
import PersonDetails from './components/PersonDetails';
import SubjectList from './components/SubjectList';
import Auth from './components/Auth';
import Profile from './components/Profile';
import IntelHub from './components/IntelHub';
import BulkApproval from './components/BulkApproval';
import BulkUpload from './components/BulkUpload';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { AppView, VehicleRecord, PersonRecord, Interaction, InteractionType, User, ThemeMode } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [pendingRecords, setPendingRecords] = useState<VehicleRecord[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem('bc_ops_theme') as ThemeMode) || 'system');

  useEffect(() => {
    const savedUser = localStorage.getItem('bc_ops_session');
    const savedV = localStorage.getItem('bc_ops_vehicles');
    const savedP = localStorage.getItem('bc_ops_people');
    const savedI = localStorage.getItem('bc_ops_interactions');

    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    if (savedV) setVehicles(JSON.parse(savedV));
    if (savedP) setPeople(JSON.parse(savedP));
    if (savedI) setInteractions(JSON.parse(savedI));
    
    // Handle deep linking from PWA shortcuts
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam && ['dashboard', 'scanner', 'intel', 'history', 'people'].includes(viewParam)) {
      setActiveView(viewParam as AppView);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (mode: ThemeMode) => {
      const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', isDark);
    };

    applyTheme(theme);
    localStorage.setItem('bc_ops_theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('bc_ops_vehicles', JSON.stringify(vehicles));
    localStorage.setItem('bc_ops_people', JSON.stringify(people));
    localStorage.setItem('bc_ops_interactions', JSON.stringify(interactions));
  }, [vehicles, people, interactions]);

  const handleScanComplete = useCallback((record: VehicleRecord) => {
    setVehicles(prev => [record, ...prev]);
    setSelectedVehicle(record);
    setActiveView('details');
  }, []);

  const handleBulkIngest = useCallback((records: VehicleRecord[]) => {
    setPendingRecords(records);
    setActiveView('bulk-approval');
  }, []);

  const handleApproveBulk = useCallback((approved: VehicleRecord[]) => {
    setVehicles(prev => [...approved, ...prev]);
    setPendingRecords([]);
    setActiveView('history');
  }, []);

  const handlePersonScanComplete = useCallback((record: PersonRecord) => {
    let iType = InteractionType.SIGHTING;
    if (record.notes.toLowerCase().includes('trespass')) iType = InteractionType.TRESPASS;
    if (record.notes.toLowerCase().includes('notif')) iType = InteractionType.NOTIFICATION;

    setPeople(prev => [record, ...prev]);
    
    const interaction: Interaction = {
      id: crypto.randomUUID(),
      type: iType,
      subjectId: record.id,
      timestamp: record.timestamp,
      location: record.location,
      notes: record.notes
    };
    
    setInteractions(prev => [interaction, ...prev]);
    setSelectedPerson(record);
    setActiveView('person-details');
  }, []);

  const handlePersonUpdate = useCallback((updatedPerson: PersonRecord) => {
    setPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
    setSelectedPerson(updatedPerson);
  }, []);

  if (isLoading) return <div className="h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!currentUser) return <Auth onLogin={u => { setCurrentUser(u); localStorage.setItem('bc_ops_session', JSON.stringify(u)); }} />;

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': 
        return <Dashboard vehicles={vehicles} people={people} interactions={interactions} />;
      case 'scanner': 
        return <Scanner onScanComplete={handleScanComplete} onBulkComplete={handleBulkIngest} onCancel={() => setActiveView('dashboard')} onSwitchToPerson={() => setActiveView('person-scanner')} />;
      case 'person-scanner': 
        return <PersonScanner onScanComplete={handlePersonScanComplete} onCancel={() => setActiveView('dashboard')} />;
      case 'history': 
        return <History records={vehicles} onSelect={r => { setSelectedVehicle(r); setActiveView('details'); }} />;
      case 'people': 
        return <SubjectList people={people} interactions={interactions} onSelect={p => { setSelectedPerson(p); setActiveView('person-details'); }} />;
      case 'details': 
        return selectedVehicle && <VehicleDetails record={selectedVehicle} onBack={() => setActiveView('history')} onDelete={id => setVehicles(v => v.filter(x => x.id !== id))} />;
      case 'person-details': 
        return selectedPerson && <PersonDetails person={selectedPerson} vehicles={vehicles} interactions={interactions} onBack={() => setActiveView('people')} onDelete={id => setPeople(p => p.filter(x => x.id !== id))} onUpdate={handlePersonUpdate} />;
      case 'profile': 
        return <Profile user={currentUser} onLogout={() => { setCurrentUser(null); localStorage.removeItem('bc_ops_session'); }} theme={theme} setTheme={setTheme} />;
      case 'intel':
        return <IntelHub />;
      case 'bulk-upload':
        return <BulkUpload onComplete={handleBulkIngest} onCancel={() => setActiveView('dashboard')} />;
      case 'bulk-approval':
        return <BulkApproval pending={pendingRecords} onApprove={handleApproveBulk} onCancel={() => { setPendingRecords([]); setActiveView('dashboard'); }} />;
      default: 
        return <Dashboard vehicles={vehicles} people={people} interactions={interactions} />;
    }
  };

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden select-none transition-colors duration-300">
      <PWAInstallPrompt />
      <main className="flex-1 overflow-y-auto no-scrollbar relative">
        {renderView()}
      </main>
      {activeView !== 'scanner' && activeView !== 'person-scanner' && activeView !== 'bulk-approval' && activeView !== 'bulk-upload' && (
        <Navigation activeView={activeView} setActiveView={setActiveView} />
      )}
    </div>
  );
};

export default App;


import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import NewAssetEntry from './components/NewAssetEntry';
import LogoLab from './components/LogoLab';
import NeuralLab from './components/NeuralLab';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { 
  AppView, 
  VehicleRecord, 
  VehicleCategory,
  PersonRecord, 
  Interaction, 
  InteractionType, 
  User, 
  ThemeMode, 
  AssetPhoto, 
  TrespassWarningType,
  LogoReference
} from './types';
import { ShieldAlert, Info, Clock, CheckCircle2, Navigation2, X, AlertTriangle, UserCheck, Car, Calendar, MapPin, Tag, ChevronRight, MapPinned, ShieldCheck, Loader2 } from 'lucide-react';
import { analyzeVehicleImage } from './services/geminiService';
import { initGoogleApi } from './services/googleDriveService';

interface PendingAsset {
  scanData: any;
  photos: AssetPhoto[];
  location?: { lat: number; lng: number; address: string };
}

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [customLogos, setCustomLogos] = useState<LogoReference[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingShared, setIsProcessingShared] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem('bc_ops_theme') as ThemeMode) || 'system');
  
  const [autoOpenHistoryFilter, setAutoOpenHistoryFilter] = useState(false);
  const [assetQueue, setAssetQueue] = useState<PendingAsset[]>([]);
  const [workflow, setWorkflow] = useState<{
    type: 'DUPLICATE' | 'TRESPASS_PROMPT' | 'WARNING_METHOD';
    data: {
      scanData: any;
      photos: AssetPhoto[];
      existingRecord?: VehicleRecord;
      location?: { lat: number; lng: number; address: string };
    }
  } | null>(null);

  // Initialize Google API on mount
  useEffect(() => {
    initGoogleApi().catch(err => console.error("Google API Init Fault", err));
  }, []);

  // Check for shared assets on mount
  useEffect(() => {
    const checkSharedAssets = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('shared-assets-ready') === 'true') {
        setIsProcessingShared(true);
        try {
          const cache = await caches.open('klect-shared-assets');
          const keys = await cache.keys();
          const sharedPhotos: AssetPhoto[] = [];
          let primaryBase64 = '';

          for (let i = 0; i < keys.length; i++) {
            const response = await cache.match(keys[i]);
            if (response) {
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              sharedPhotos.push({
                url,
                label: i === 0 ? 'Shared Source' : `Attachment ${i}`,
                timestamp: new Date().toISOString()
              });

              if (i === 0) {
                primaryBase64 = await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                  reader.readAsDataURL(blob);
                });
              }
            }
          }

          if (primaryBase64) {
            const result = await analyzeVehicleImage(primaryBase64, 'plate');
            await Promise.all(keys.map(k => cache.delete(k)));
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            handleScanComplete(result, sharedPhotos);
          }
        } catch (err) {
          console.error("Shared asset processing fault:", err);
        } finally {
          setIsProcessingShared(false);
        }
      }
    };

    if (currentUser) checkSharedAssets();
  }, [currentUser]);

  useEffect(() => {
    const savedUser = localStorage.getItem('bc_ops_session');
    const savedV = localStorage.getItem('bc_ops_vehicles');
    const savedP = localStorage.getItem('bc_ops_people');
    const savedI = localStorage.getItem('bc_ops_interactions');
    const savedL = localStorage.getItem('klect_custom_logos');

    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    if (savedV) setVehicles(JSON.parse(savedV));
    if (savedP) setPeople(JSON.parse(savedP));
    if (savedI) setInteractions(JSON.parse(savedI));
    if (savedL) setCustomLogos(JSON.parse(savedL));
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    localStorage.setItem('bc_ops_vehicles', JSON.stringify(vehicles));
    localStorage.setItem('bc_ops_people', JSON.stringify(people));
    localStorage.setItem('bc_ops_interactions', JSON.stringify(interactions));
    localStorage.setItem('klect_custom_logos', JSON.stringify(customLogos));
    if (currentUser) localStorage.setItem('bc_ops_session', JSON.stringify(currentUser));
  }, [vehicles, people, interactions, customLogos, currentUser]);

  const recordInteraction = useCallback((
    type: InteractionType, 
    vehicleId: string, 
    notes: string, 
    warning: TrespassWarningType = TrespassWarningType.NONE,
    location?: { lat: number; lng: number; address: string }
  ) => {
    const interaction: Interaction = {
      id: crypto.randomUUID(),
      type,
      vehicleId,
      timestamp: new Date().toISOString(),
      notes,
      operatorName: currentUser?.name || 'Unknown Operator',
      warningType: warning,
      location
    };
    setInteractions(prev => [interaction, ...prev]);
    return interaction;
  }, [currentUser]);

  useEffect(() => {
    if (workflow === null && assetQueue.length > 0) {
      const next = assetQueue[0];
      setAssetQueue(prev => prev.slice(1));
      
      const existing = vehicles.find(v => 
        (next.scanData.plate && v.plate === next.scanData.plate && v.plate !== 'N/A' && v.plate !== 'Unknown') || 
        (next.scanData.vin && v.vin === next.scanData.vin && v.vin !== 'Not Scanned' && v.vin !== 'Unknown')
      );

      if (existing) {
        setWorkflow({ 
          type: 'DUPLICATE', 
          data: { 
            scanData: next.scanData, 
            photos: next.photos, 
            existingRecord: existing,
            location: next.location
          } 
        });
      } else {
        setWorkflow({ 
          type: 'TRESPASS_PROMPT', 
          data: { 
            scanData: next.scanData, 
            photos: next.photos,
            location: next.location
          } 
        });
      }
    }
  }, [assetQueue, workflow, vehicles]);

  const handleScanComplete = useCallback((scanData: any | any[], photos: AssetPhoto[] | AssetPhoto[][]) => {
    if (!Array.isArray(scanData)) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setAssetQueue(prev => [...prev, { 
            scanData, 
            photos: photos as AssetPhoto[],
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude, address: 'Sector Verified Coordinate' }
          }]);
        },
        () => {
          setAssetQueue(prev => [...prev, { scanData, photos: photos as AssetPhoto[] }]);
        },
        { timeout: 5000 }
      );
    } else {
      const pendingItems = (scanData as any[]).map((data, idx) => ({
        scanData: data,
        photos: (photos as AssetPhoto[][])[idx]
      }));
      setAssetQueue(prev => [...prev, ...pendingItems]);
    }
  }, []);

  const commitAssetRecord = (
    scanData: any, 
    photos: AssetPhoto[], 
    warning: TrespassWarningType, 
    existingId?: string,
    location?: { lat: number; lng: number; address: string }
  ) => {
    let targetId = existingId;
    if (!existingId) {
      const newRecord: VehicleRecord = {
        id: crypto.randomUUID(),
        plate: scanData.plate || 'Unknown',
        vin: scanData.vin || 'Unknown',
        year: scanData.year || 'Unknown',
        make: scanData.make || 'Unknown',
        model: scanData.model || 'Unknown',
        color: scanData.color || 'Unknown',
        category: scanData.category || VehicleCategory.NORMAL,
        timestamp: new Date().toISOString(),
        notes: scanData.notes,
        photos: photos,
        recordings: [],
        lastSighting: new Date().toISOString(),
        shape: scanData.shape,
        location: location,
        wheelSignature: scanData.wheelSignature,
        logoDetected: scanData.logoDetected,
        logoText: scanData.logoText,
        bodyModifications: scanData.bodyModifications,
        documents: scanData.documents || []
      };
      setVehicles(prev => [newRecord, ...prev]);
      targetId = newRecord.id;
    } else {
      setVehicles(prev => prev.map(v => v.id === existingId ? {
        ...v,
        photos: [...photos, ...v.photos].slice(0, 20),
        lastSighting: new Date().toISOString(),
        location: location || v.location,
        documents: [...(scanData.documents || []), ...(v.documents || [])].slice(0, 10)
      } : v));
    }

    if (warning !== TrespassWarningType.NONE) {
      recordInteraction(InteractionType.TRESPASS, targetId!, `Asset documentation completed. Trespass warning issued.`, warning, location);
    } else {
      recordInteraction(InteractionType.SIGHTING, targetId!, existingId ? `Verified duplicate sighting recorded.` : `Initial asset signature verified and documented.`, TrespassWarningType.NONE, location);
    }

    if (assetQueue.length === 0) {
      const finalRecord = vehicles.find(v => v.id === targetId) || (targetId === existingId ? vehicles.find(v => v.id === existingId) : null);
      if (finalRecord) {
        setSelectedVehicle(finalRecord);
        setActiveView('details');
      } else {
        setActiveView('history');
      }
    }
    setWorkflow(null);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard vehicles={vehicles} people={people} interactions={interactions} onQuickSearch={() => { setAutoOpenHistoryFilter(true); setActiveView('history'); }} onNavigate={setActiveView} />;
      case 'scanner': return <Scanner onScanComplete={handleScanComplete} onCancel={() => setActiveView('dashboard')} />;
      case 'history': return <History records={vehicles} interactions={interactions} onSelect={r => { setSelectedVehicle(r); setActiveView('details'); }} onAddAsset={() => setActiveView('new-asset')} initialFilterOpen={autoOpenHistoryFilter} />;
      case 'details': return selectedVehicle && <VehicleDetails record={selectedVehicle} interactions={interactions} onBack={() => setActiveView('history')} onDelete={id => setVehicles(v => v.filter(x => x.id !== id))} onUpdate={r => { setVehicles(prev => prev.map(v => v.id === r.id ? r : v)); setSelectedVehicle(r); }} />;
      case 'profile': return <Profile user={currentUser!} onLogout={() => { setCurrentUser(null); localStorage.removeItem('bc_ops_session'); }} theme={theme} setTheme={setTheme} onNavigate={setActiveView} />;
      case 'intel': return <IntelHub />;
      case 'person-scanner': return <PersonScanner onScanComplete={p => { setPeople(prev => [p, ...prev]); setActiveView('people'); }} onCancel={() => setActiveView('dashboard')} />;
      case 'people': return <SubjectList people={people} interactions={interactions} onSelect={p => { setSelectedPerson(p); setActiveView('person-details'); }} />;
      case 'person-details': return selectedPerson && <PersonDetails person={selectedPerson} vehicles={vehicles} interactions={interactions} onBack={() => setActiveView('people')} onDelete={id => setPeople(prev => prev.filter(p => p.id !== id))} onUpdate={p => setPeople(prev => prev.map(x => x.id === p.id ? p : x))} />;
      case 'bulk-upload': return <BulkUpload onComplete={v => { setVehicles(prev => [...v, ...prev]); setActiveView('history'); }} onCancel={() => setActiveView('dashboard')} />;
      case 'new-asset': return <NewAssetEntry onComplete={(v, ph) => { handleScanComplete(v, ph); }} onCancel={() => setActiveView('dashboard')} />;
      case 'logo-lab': return <LogoLab logos={customLogos} onAdd={l => setCustomLogos(prev => [...prev, l])} onRemove={id => setCustomLogos(prev => prev.filter(x => x.id !== id))} onBack={() => setActiveView('profile')} />;
      case 'neural-lab': return <NeuralLab onBack={() => setActiveView('profile')} />;
      default: return <Dashboard vehicles={vehicles} people={people} interactions={interactions} onQuickSearch={() => setActiveView('history')} onNavigate={setActiveView} />;
    }
  };

  const renderWorkflowModal = () => {
    if (!workflow) return null;
    const { type, data } = workflow;
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setWorkflow(null)} />
        <div className="relative w-full max-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
          {type === 'DUPLICATE' && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500">
                <AlertTriangle size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Duplicate Entry</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">Record for <span className="font-bold text-blue-500">{data.existingRecord?.plate}</span> verified in grid.</p>
              </div>
              <div className="space-y-3 pt-4">
                <button onClick={() => setWorkflow({ ...workflow, type: 'TRESPASS_PROMPT' })} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Update Asset</button>
                <button onClick={() => setWorkflow(null)} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95">Discard</button>
              </div>
            </div>
          )}
          {type === 'TRESPASS_PROMPT' && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                <ShieldAlert size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Ops Evaluation</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">Log as <span className="text-red-500 font-bold uppercase">Trespass Violation</span>?</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button onClick={() => setWorkflow({ ...workflow, type: 'WARNING_METHOD' })} className="py-4 bg-red-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all">Yes</button>
                <button onClick={() => commitAssetRecord(data.scanData, data.photos, TrespassWarningType.NONE, data.existingRecord?.id, data.location)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95">No</button>
              </div>
            </div>
          )}
          {type === 'WARNING_METHOD' && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                <ShieldCheck size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Notice Type</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">Select issued notification method.</p>
              </div>
              <div className="space-y-3 pt-4">
                <button onClick={() => commitAssetRecord(data.scanData, data.photos, TrespassWarningType.VERBAL, data.existingRecord?.id, data.location)} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95">Verbal</button>
                <button onClick={() => commitAssetRecord(data.scanData, data.photos, TrespassWarningType.WRITTEN, data.existingRecord?.id, data.location)} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95">Written</button>
                <button onClick={() => commitAssetRecord(data.scanData, data.photos, TrespassWarningType.NONE, data.existingRecord?.id, data.location)} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95">None</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!currentUser && !isLoading) {
    return <Auth onLogin={setCurrentUser} />;
  }

  const showNav = activeView !== 'scanner' && activeView !== 'person-scanner' && activeView !== 'logo-lab' && activeView !== 'neural-lab' && activeView !== 'bulk-upload' && activeView !== 'new-asset';

  return (
    <div className="h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden transition-colors duration-300">
      <PWAInstallPrompt />
      {renderWorkflowModal()}
      {isProcessingShared && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
           <Loader2 className="text-blue-500 animate-spin mb-6" size={48} />
           <h3 className="text-white font-black text-2xl uppercase tracking-tighter">Ingesting Share Stream</h3>
           <p className="text-blue-400 font-mono text-[9px] uppercase tracking-[0.3em] mt-3 animate-pulse">Mapping Multi-Domain Neural Grid...</p>
        </div>
      )}
      <main className={`flex-1 overflow-y-auto no-scrollbar relative w-full ${showNav ? 'pb-[var(--nav-height)]' : ''}`}>
        {renderView()}
      </main>
      {showNav && <Navigation activeView={activeView} setActiveView={setActiveView} />}
    </div>
  );
};

export default App;

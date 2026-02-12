
import React, { useState, useRef } from 'react';
// Added History icon and aliased it to HistoryIcon to avoid collision with global DOM History type
import { ArrowLeft, Trash2, Clock, ShieldAlert, Car, Truck, Zap, Disc, UserCheck, ShieldCheck, MapPin, Eye, History as HistoryIcon, Info, Fingerprint, CreditCard, Star, BrainCircuit, Activity, Settings, LayoutList, TrendingUp, AlertTriangle, ExternalLink, Siren, Calendar, MapPinned, FileText, Search, Globe, XCircle, Camera, Plus, Bell, Navigation2 } from 'lucide-react';
import { VehicleRecord, VehicleCategory, Interaction, InteractionType } from '../types';
import { saveNeuralSample, getNeuralSamples, removeNeuralSample } from '../services/trainingService';
import { searchIntelligence, IntelResult } from '../services/geminiService';

interface VehicleDetailsProps {
  record: VehicleRecord;
  interactions: Interaction[];
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdate: (record: VehicleRecord) => void;
}

const VehicleDetails: React.FC<VehicleDetailsProps> = ({ record, interactions, onBack, onDelete, onUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTraining, setIsTraining] = useState(() => {
    return getNeuralSamples().some(s => s.verifiedData.make === record.make && s.verifiedData.model === record.model && s.verifiedData.year === record.year);
  });
  const [intelResult, setIntelResult] = useState<IntelResult | null>(null);
  const [isSearchingIntel, setIsSearchingIntel] = useState(false);

  // Filter interactions for this specific vehicle
  const vehicleHistory = interactions
    .filter(i => i.vehicleId === record.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleToggleTraining = () => {
    if (isTraining) {
      const samples = getNeuralSamples();
      const match = samples.find(s => s.verifiedData.make === record.make && s.verifiedData.model === record.model && s.verifiedData.year === record.year);
      if (match) removeNeuralSample(match.id);
      setIsTraining(false);
    } else {
      saveNeuralSample({
        thumbnail: record.photos[0]?.url?.includes('data:') ? record.photos[0].url.split(',')[1] : '',
        verifiedData: { year: record.year, make: record.make, model: record.model, shape: record.shape || 'Unknown' },
        type: 'gold_standard'
      });
      setIsTraining(true);
    }
  };

  const handleRecallSearch = async () => {
    setIsSearchingIntel(true);
    try {
      const query = `Find active safety recalls, common mechanical failures, and technical service bulletins for a ${record.year} ${record.make} ${record.model}.`;
      const res = await searchIntelligence(query);
      setIntelResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingIntel(false);
    }
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    
    const newPhotos = [...record.photos];
    for (let i = 0; i < files.length; i++) {
      const photoUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(files[i]);
      });
      newPhotos.unshift({
        url: photoUrl,
        label: 'Field Update',
        timestamp: new Date().toISOString()
      });
    }
    
    onUpdate({
      ...record,
      photos: newPhotos.slice(0, 20) // Cap at 20 photos
    });
  };

  const isStolen = record.category === VehicleCategory.STOLEN || record.stolenCheckResult?.isStolen;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto no-scrollbar pb-24">
      <input 
        type="file" 
        multiple 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleAddPhotos} 
      />

      <header className="sticky top-0 bg-slate-950/80 backdrop-blur-lg border-b border-slate-900 p-4 flex items-center justify-between z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-300 font-bold uppercase text-[10px] tracking-widest active:scale-95 transition-all">
          <ArrowLeft size={16} /> Back to History
        </button>
        <div className="flex items-center gap-2">
           <button onClick={handleToggleTraining} className={`p-2.5 rounded-xl transition-all active:scale-90 ${isTraining ? 'bg-amber-500 text-white' : 'bg-slate-900 text-slate-600 border border-slate-800'}`}>
             <Star size={18} fill={isTraining ? 'currentColor' : 'none'} />
           </button>
           <button onClick={() => { if(confirm('Purge this asset from history?')) onDelete(record.id); }} className="p-2.5 text-red-500/50 hover:text-red-500 active:scale-90 transition-all">
             <Trash2 size={18} />
           </button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {isStolen && (
          <div className="bg-red-600 p-6 rounded-[2.5rem] shadow-2xl shadow-red-600/20 border border-red-500 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 text-white mb-2">
              <Siren size={24} className="animate-pulse" />
              <h2 className="text-xl font-black uppercase tracking-tighter leading-none">Security Flag: STOLEN</h2>
            </div>
            <p className="text-white/90 text-[11px] font-black uppercase leading-relaxed italic">
              {record.stolenCheckResult?.details || "Vehicle flagged in active criminal database indices."}
            </p>
          </div>
        )}

        <section>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 w-64 aspect-[3/4] rounded-[2.5rem] border-2 border-dashed border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center gap-4 text-slate-500 group active:scale-[0.98] transition-all snap-center shadow-xl"
            >
              <div className="p-5 bg-slate-800 rounded-full group-hover:scale-110 transition-transform shadow-inner">
                <Camera size={32} className="text-blue-500" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-black uppercase tracking-widest text-white">New Capture</span>
                <span className="block text-[8px] font-bold uppercase tracking-widest text-slate-600 mt-1">Append Intelligence</span>
              </div>
            </button>

            {record.photos.map((photo, i) => (
              <div key={i} className="flex-shrink-0 w-64 aspect-[3/4] rounded-[2.5rem] overflow-hidden border border-slate-800 bg-black relative snap-center shadow-2xl">
                <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
                <div className="absolute bottom-4 inset-x-4 p-3 bg-black/60 backdrop-blur-md rounded-2xl text-[9px] font-black text-white uppercase tracking-widest text-center border border-white/10 shadow-lg">
                  {photo.label} • {new Date(photo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl p-6 relative">
          <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
              isStolen ? 'bg-red-500/10 text-red-500 border-red-500/20' :
              record.category === VehicleCategory.NORMAL ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
              'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
              {record.category}
            </div>
            {record.color && (
              <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {record.color}
              </div>
            )}
          </div>

          <h1 className="text-4xl font-mono font-black text-white tracking-tighter mb-2 uppercase break-all pr-24">
            {record.plate}
          </h1>
          <p className="text-slate-500 font-black uppercase text-[11px] tracking-[0.2em]">{record.year} {record.make} {record.model}</p>
          
          <div className="mt-6 flex items-center gap-6 pt-6 border-t border-slate-800">
             <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Last Sighting</span>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300">
                  <Clock size={12} className="text-blue-500" />
                  {new Date(record.lastSighting || record.timestamp).toLocaleString()}
                </div>
             </div>
             {record.location && (
               <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Sighting Sector</span>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300">
                    <MapPin size={12} className="text-emerald-500" />
                    {record.location.lat.toFixed(4)}, {record.location.lng.toFixed(4)}
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* Tactical Intel History Timeline */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <HistoryIcon size={14} className="text-blue-500" /> Operational History Details
            </h3>
            <span className="text-[8px] font-mono text-slate-600">{vehicleHistory.length} Events</span>
          </div>
          
          <div className="space-y-3">
            {vehicleHistory.map((inter, idx) => (
              <div key={inter.id} className="relative pl-6 pb-4 last:pb-0">
                {/* Timeline Line */}
                <div className="absolute left-[7px] top-2 bottom-0 w-[2px] bg-slate-800 last:bg-transparent" />
                {/* Timeline Node */}
                <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-slate-950 z-10 ${
                  inter.type === InteractionType.TRESPASS ? 'bg-red-500' : 
                  inter.type === InteractionType.NOTIFICATION ? 'bg-emerald-500' : 'bg-blue-500'
                }`} />
                
                <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4 space-y-2">
                   <div className="flex justify-between items-start">
                     <p className={`text-[10px] font-black uppercase tracking-tighter ${
                       inter.type === InteractionType.TRESPASS ? 'text-red-500' : 
                       inter.type === InteractionType.NOTIFICATION ? 'text-emerald-500' : 'text-blue-500'
                     }`}>
                       {inter.type}
                     </p>
                     <span className="text-[9px] font-bold text-slate-600 tabular-nums">
                       {new Date(inter.timestamp).toLocaleString()}
                     </span>
                   </div>
                   
                   <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">
                     "{inter.notes}"
                   </p>
                   
                   <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800/30">
                      <div className="flex items-center gap-1.5">
                        <Activity size={10} className="text-slate-600" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{inter.operatorName}</span>
                      </div>
                      {inter.location && (
                        <div className="flex items-center gap-1.5">
                          <Navigation2 size={10} className="text-slate-600" />
                          <span className="text-[9px] font-mono text-slate-600 uppercase">Sector Locked</span>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            ))}
            
            {vehicleHistory.length === 0 && (
              <div className="p-8 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No archival interactions recorded.</p>
              </div>
            )}
          </div>
        </section>

        {record.notes && (
          <section className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-6 space-y-3 shadow-xl">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
               <FileText size={14} className="text-blue-500" /> Static Intelligence
             </h3>
             <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 italic text-[11px] text-slate-400 leading-relaxed font-medium">
               "{record.notes}"
             </div>
          </section>
        )}

        <section className="grid grid-cols-2 gap-4">
           <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] space-y-3">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" /> VIN Signature
              </h3>
              <p className="text-xs font-mono font-black text-white tracking-widest break-all bg-slate-950 p-2 rounded-lg border border-slate-800">
                {record.vin}
              </p>
           </div>
           
           <button 
             onClick={handleRecallSearch}
             disabled={isSearchingIntel}
             className="bg-blue-600/10 border border-blue-500/30 p-5 rounded-[2rem] flex flex-col justify-center gap-2 active:scale-95 transition-all text-left group"
           >
              <div className="flex items-center gap-2">
                {isSearchingIntel ? <Activity className="text-blue-500 animate-spin" size={16} /> : <Search className="text-blue-500 group-hover:scale-110 transition-transform" size={16} />}
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Intel Query</span>
              </div>
              <p className="text-[10px] font-bold text-white uppercase leading-tight">Check Recalls & Bulletins</p>
           </button>
        </section>

        {intelResult && (
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                 <Globe size={14} /> Tactical Briefing
               </h3>
               <button onClick={() => setIntelResult(null)} className="p-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-400"><XCircle size={14} /></button>
             </div>
             <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed prose dark:prose-invert">
                {intelResult.text.split('\n').map((l, i) => <p key={i}>{l}</p>)}
             </div>
          </div>
        )}

        <section className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-3 text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
            <Activity size={16} /> Physical Characteristics
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Body Style', value: record.shape || 'Unknown', icon: Truck },
              { label: 'Color', value: record.color || 'Unknown', icon: Eye },
              { label: 'Wheels', value: record.wheelSignature || 'Generic', icon: Disc },
              { label: 'Modifications', value: record.bodyModifications?.length || 0, icon: LayoutList }
            ].map((stat, i) => (
              <div key={i} className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                <stat.icon size={16} className="text-slate-600" />
                <div className="min-w-0">
                  <p className="text-[8px] font-black text-slate-600 uppercase mb-0.5">{stat.label}</p>
                  <p className="text-[10px] font-bold text-white uppercase truncate">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {record.marketValue && (
          <section className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
             <TrendingUp className="absolute -bottom-4 -right-4 text-emerald-500 opacity-5" size={120} />
             <div className="flex items-center justify-between gap-2 mb-4">
               <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">
                 <Activity size={14} /> Sector Appraisal
               </div>
               <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[8px] font-black text-blue-400 uppercase tracking-widest">
                 Accuracy: {(record.marketValueConfidence || 0) * 100}%
               </div>
             </div>
             <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-white tabular-nums">${record.marketValue.toLocaleString()}</span>
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Estimated Value</span>
             </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default VehicleDetails;

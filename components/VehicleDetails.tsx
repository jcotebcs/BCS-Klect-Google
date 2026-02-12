
import React, { useState } from 'react';
import { ArrowLeft, Trash2, Clock, ShieldAlert, Car, Truck, Zap, Disc, UserCheck, ShieldCheck, MapPin, Eye, Info, Fingerprint, CreditCard, Star, BrainCircuit, Activity, Settings, LayoutList, TrendingUp, AlertTriangle, ExternalLink, Siren } from 'lucide-react';
import { VehicleRecord, VehicleCategory, Interaction, InteractionType } from '../types';
import { saveNeuralSample, getNeuralSamples, removeNeuralSample } from '../services/trainingService';

interface VehicleDetailsProps {
  record: VehicleRecord;
  interactions: Interaction[];
  onBack: () => void;
  onDelete: (id: string) => void;
}

const VehicleDetails: React.FC<VehicleDetailsProps> = ({ record, interactions, onBack, onDelete }) => {
  const [isTraining, setIsTraining] = useState(() => {
    return getNeuralSamples().some(s => s.verifiedData.make === record.make && s.verifiedData.model === record.model && s.verifiedData.year === record.year);
  });

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

  const isStolen = record.category === VehicleCategory.STOLEN || record.stolenCheckResult?.isStolen;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto no-scrollbar">
      <header className="sticky top-0 bg-slate-950/80 backdrop-blur-lg border-b border-slate-900 p-4 flex items-center justify-between z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-300 font-bold uppercase text-[10px] tracking-widest"><ArrowLeft size={16} /> History</button>
        <div className="flex items-center gap-2">
           <button onClick={handleToggleTraining} className={`p-2.5 rounded-xl ${isTraining ? 'bg-amber-500 text-white' : 'bg-slate-900 text-slate-600 border border-slate-800'}`}>
             <Star size={18} fill={isTraining ? 'currentColor' : 'none'} />
           </button>
           <button onClick={() => onDelete(record.id)} className="p-2.5 text-red-500/50 hover:text-red-500"><Trash2 size={18} /></button>
        </div>
      </header>

      <main className="p-4 space-y-6 pb-24">
        {isStolen && (
          <div className="bg-red-600 p-6 rounded-[2.5rem] shadow-2xl shadow-red-600/20 border border-red-500 animate-pulse-slow">
            <div className="flex items-center gap-3 text-white mb-2">
              <Siren size={24} />
              <h2 className="text-xl font-black uppercase tracking-tighter leading-none">Theft Record Hit</h2>
            </div>
            <p className="text-white/90 text-xs font-bold leading-relaxed">
              {record.stolenCheckResult?.details || "This vehicle is flagged as stolen in verified security databases."}
            </p>
            {record.stolenCheckResult?.sources && record.stolenCheckResult.sources.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {record.stolenCheckResult.sources.map((s, i) => (
                  <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[9px] font-black text-white uppercase border border-white/20 flex items-center gap-1.5 transition-all">
                    {s.title} <ExternalLink size={10} />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <section>
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x">
            {record.photos.map((photo, i) => (
              <div key={i} className="flex-shrink-0 w-64 aspect-[3/4] rounded-[2.5rem] overflow-hidden border border-slate-800 bg-black relative snap-center">
                <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
                <div className="absolute bottom-4 inset-x-4 p-3 bg-black/60 backdrop-blur-md rounded-2xl text-[9px] font-black text-white uppercase tracking-widest text-center border border-white/10">{photo.label}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl p-6">
          <p className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest inline-block mb-3 border ${
            isStolen ? 'bg-red-500/10 text-red-500 border-red-500/20' :
            record.category === VehicleCategory.NORMAL ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
            'bg-amber-500/10 text-amber-500 border-amber-500/20'
          }`}>{isStolen ? 'STOLEN' : record.category}</p>
          <h1 className="text-4xl font-mono font-black text-white tracking-tighter mb-2 uppercase break-all">{record.plate}</h1>
          <p className="text-slate-500 font-black uppercase text-[11px] tracking-[0.2em]">{record.year} {record.make} {record.model}</p>
        </div>

        {record.marketValue && (
          <section className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[2.5rem] relative overflow-hidden">
             <TrendingUp className="absolute -bottom-4 -right-4 text-emerald-500 opacity-5" size={120} />
             <div className="flex items-center justify-between gap-2 mb-4">
               <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">
                 <Activity size={14} /> Tactical Appraisal
               </div>
               <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[8px] font-black text-blue-400 uppercase tracking-widest">
                 Sector Accuracy: {(record.marketValueConfidence || 0) * 100}%
               </div>
             </div>
             <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-white tabular-nums">${record.marketValue.toLocaleString()}</span>
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Est. Sector Value</span>
             </div>
             <p className="text-[9px] text-slate-500 font-bold uppercase mt-2 italic">Grounded via Multi-Domain Neural Search.</p>
          </section>
        )}

        {record.vinData && (
          <section className="bg-slate-900 rounded-[2.5rem] border border-emerald-500/20 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
              <ShieldCheck size={16} /> Manufacturer Signatures
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(record.vinData).filter(([k]) => ["PlantCountry", "VehicleType", "BodyClass", "DriveType", "OperationalStatus"].includes(k)).map(([k, v]) => (
                <div key={k} className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                  <p className="text-[8px] font-black text-slate-600 uppercase mb-1">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p className="text-[10px] font-bold text-white uppercase truncate">{v}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default VehicleDetails;

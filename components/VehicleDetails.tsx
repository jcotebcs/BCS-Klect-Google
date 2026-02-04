
import React from 'react';
import { ArrowLeft, Trash2, MapPin, Clock, Tag, Info, AlertCircle, FileText, ExternalLink, ShieldAlert, Car, Truck, Zap, Briefcase, Home, User, Package, Wrench, Globe, Target, Box, Quote, CreditCard, Disc } from 'lucide-react';
import { VehicleRecord, VehicleCategory } from '../types';

interface VehicleDetailsProps {
  record: VehicleRecord;
  onBack: () => void;
  onDelete: (id: string) => void;
}

const VehicleDetails: React.FC<VehicleDetailsProps> = ({ record, onBack, onDelete }) => {
  const getCategoryTheme = (category: VehicleCategory) => {
    switch (category) {
      case VehicleCategory.SUSPICIOUS: return { style: 'bg-amber-500/20 text-amber-500 border-amber-500/30', icon: AlertCircle };
      case VehicleCategory.WANTED: case VehicleCategory.STOLEN: return { style: 'bg-red-500/20 text-red-500 border-red-500/30', icon: ShieldAlert };
      case VehicleCategory.ABANDONED: return { style: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: Info };
      case VehicleCategory.EMERGENCY: return { style: 'bg-red-600/30 text-red-400 border-red-600/40', icon: Zap };
      case VehicleCategory.COMMERCIAL: return { style: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: Truck };
      case VehicleCategory.DELIVERY: return { style: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', icon: Package };
      case VehicleCategory.CONTRACTOR: return { style: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Wrench };
      case VehicleCategory.RESIDENT: return { style: 'bg-blue-600/20 text-blue-300 border-blue-600/30', icon: Home };
      default: return { style: 'bg-blue-500/20 text-blue-500 border-blue-500/30', icon: Car };
    }
  };

  const theme = getCategoryTheme(record.category);
  const CategoryIcon = theme.icon;

  const primaryId = record.plate && record.plate !== 'N/A' && record.plate !== 'Unknown' 
    ? record.plate : (record.vin && record.vin !== 'Not Scanned' ? record.vin : 'UNIDENTIFIED');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 overflow-y-auto no-scrollbar">
      <header className="sticky top-0 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 p-4 flex items-center justify-between z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-300 font-medium"><ArrowLeft size={20} /><span>Operational Log</span></button>
        <button onClick={() => onDelete(record.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"><Trash2 size={20} /></button>
      </header>

      <main className="p-4 space-y-6 pb-20">
        {record.photos?.[0] && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-inner">
            <img src={record.photos[0]} alt="Scan" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className={`px-4 py-2 border-b flex items-center justify-between text-[10px] font-bold uppercase tracking-widest ${theme.style}`}>
            <span className="flex items-center gap-2">{record.category} Classification {record.logoDetected && <Target size={10} className="text-white animate-pulse" />}</span>
            <CategoryIcon size={14} />
          </div>
          <div className="p-5">
            <h1 className="text-3xl font-mono font-bold text-white tracking-tighter mb-1 break-all uppercase">{primaryId}</h1>
            <p className="text-slate-400 font-medium uppercase text-xs tracking-wider">
              {record.year !== 'Unknown' && <span className="text-blue-400 font-bold">{record.year} </span>}
              {record.brand || record.make} {record.model} • {record.color}
            </p>
          </div>
        </div>

        <section className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase mb-1"><Box size={12} /> Body Style</div>
            <p className="text-sm font-bold text-white truncate">{record.shape || 'Standard'}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase mb-1"><Clock size={12} /> Uplink Time</div>
            <p className="text-sm text-white">{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </section>

        {/* Tactical Component Mesh */}
        <section className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Component Mesh signatures</h3>
          
          <div className="space-y-3">
             <div className="flex items-start gap-3">
               <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                 <Disc size={18} />
               </div>
               <div>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Wheel Pattern</p>
                 <p className="text-sm text-white font-mono leading-relaxed">{record.wheelSignature || 'Generic/Standard'}</p>
               </div>
             </div>

             {record.bodyModifications && record.bodyModifications.length > 0 && (
               <div className="flex items-start gap-3 pt-2 border-t border-slate-700/50">
                 <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                   <Box size={18} />
                 </div>
                 <div className="flex-1">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tactical Alterations</p>
                   <div className="flex flex-wrap gap-2">
                     {record.bodyModifications.map((mod, i) => (
                       <span key={i} className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded">
                         {mod}
                       </span>
                     ))}
                   </div>
                 </div>
               </div>
             )}
          </div>
        </section>

        {record.logoDetected && (
          <section className="bg-slate-800 p-4 rounded-xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase mb-2 tracking-widest">
              <Target size={12} /> Logo Signature OCR
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Car className="text-blue-500" size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-white uppercase tracking-tighter">
                  {record.logoText || record.brand || 'Visual Confirmation Locked'}
                </p>
                <p className="text-[9px] text-slate-500 font-bold uppercase">Emblem Verification: Passed</p>
              </div>
            </div>
          </section>
        )}

        {record.documents && record.documents.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase px-1 tracking-widest">
              <CreditCard size={12} /> Detected Credentials
            </div>
            {record.documents.map((doc, i) => (
              <div key={i} className="bg-slate-800 p-4 rounded-xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black text-white uppercase">{doc.type}</p>
                  <span className="text-[9px] font-mono text-emerald-500">Match: {(doc.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-slate-400 font-mono leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-700 italic">
                  "{doc.extractedText}"
                </p>
              </div>
            ))}
          </section>
        )}

        <section className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase mb-1"><Info size={12} /> Tech VIN</div>
          <p className="text-sm font-mono text-white truncate">{record.vin}</p>
        </section>

        {record.notes && (
          <section className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase mb-2"><FileText size={12} /> Operational Notes</div>
            <p className="text-sm text-slate-300 leading-relaxed italic">"{record.notes}"</p>
          </section>
        )}
      </main>
    </div>
  );
};

export default VehicleDetails;

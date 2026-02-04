
import React, { useRef } from 'react';
import { ArrowLeft, Trash2, MapPin, Clock, Fingerprint, ShieldAlert, Car, Bell, Eye, ExternalLink, Info, Activity, FileText, Camera, Plus, Cpu, CreditCard } from 'lucide-react';
import { PersonRecord, VehicleRecord, Interaction, InteractionType } from '../types';

interface PersonDetailsProps {
  person: PersonRecord;
  vehicles: VehicleRecord[];
  interactions: Interaction[];
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdate: (person: PersonRecord) => void;
}

const PersonDetails: React.FC<PersonDetailsProps> = ({ person, vehicles, interactions, onBack, onDelete, onUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const personInteractions = interactions.filter(i => i.subjectId === person.id);
  const linkedVehicles = vehicles.filter(v => person.associatedPlates.includes(v.plate) || v.associatedPersonId === person.id);

  const getIcon = (type: InteractionType) => {
    switch (type) {
      case InteractionType.TRESPASS: return <ShieldAlert size={16} className="text-red-500" />;
      case InteractionType.NOTIFICATION: return <Bell size={16} className="text-emerald-500" />;
      default: return <Eye size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 overflow-y-auto no-scrollbar">
      <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={async (e) => {
         const files = e.target.files; if (!files?.length) return;
         const newPhotos = [...person.photos];
         for (let i = 0; i < files.length; i++) {
           const b64 = await new Promise<string>(r => { const f = new FileReader(); f.onload = () => r(f.result as string); f.readAsDataURL(files[i]); });
           newPhotos.unshift(b64);
         }
         onUpdate({ ...person, photos: newPhotos });
      }} />

      <header className="sticky top-0 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 p-4 flex items-center justify-between z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-300 font-medium"><ArrowLeft size={20} /><span>Intel Subject</span></button>
        <button onClick={() => onDelete(person.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"><Trash2 size={20} /></button>
      </header>

      <main className="p-4 space-y-6 pb-20">
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 w-64 aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/50 flex flex-col items-center justify-center gap-3 text-slate-500 group">
            <div className="p-4 bg-slate-900 rounded-full group-hover:scale-110 transition-transform"><Plus size={32} /></div>
            <span className="text-xs font-black uppercase tracking-widest">New Capture</span>
          </button>
          {person.photos.map((photo, i) => (
            <div key={i} className="flex-shrink-0 w-64 aspect-[3/4] rounded-2xl overflow-hidden border border-slate-800 bg-black">
              <img src={photo} alt={`Subj ${i}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="px-5 py-6">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1">{person.name}</h1>
            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">SECURE ID: {person.id.slice(0, 12)}</p>
          </div>
          <div className="grid grid-cols-2 border-t border-slate-700">
            <div className="p-4 border-r border-slate-700 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Risk Status</p>
              <span className={`text-xs font-bold uppercase tracking-wider ${personInteractions.some(i => i.type === InteractionType.TRESPASS) ? 'text-red-500' : 'text-emerald-500'}`}>
                {personInteractions.some(i => i.type === InteractionType.TRESPASS) ? 'Elevated' : 'Verified'}
              </span>
            </div>
            <div className="p-4 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Matches</p>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Neural Match 98%</span>
            </div>
          </div>
        </div>

        {person.biometrics.facialSignature && (
          <section className="bg-slate-950 border border-blue-500/20 p-5 rounded-2xl shadow-lg relative overflow-hidden">
             <Cpu className="absolute -bottom-4 -right-4 text-blue-500 opacity-10" size={100} />
             <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
               <Fingerprint size={14} /> Neural Facial Signature
             </h3>
             <p className="text-[11px] text-blue-100/70 font-mono leading-relaxed italic">
               "{person.biometrics.facialSignature}"
             </p>
          </section>
        )}

        {person.documents && person.documents.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase px-1 tracking-widest">
              <CreditCard size={14} /> Subject Identification
            </div>
            {person.documents.map((doc, i) => (
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

        <section className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Biometric Breakdown</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Est. Height', value: person.biometrics.height },
              { label: 'Hair', value: person.biometrics.hair },
              { label: 'Eyes', value: person.biometrics.eyes },
              { label: 'Marks', value: person.biometrics.distinguishingMarks?.length ? 'Confirmed' : 'None' }
            ].map((stat, i) => (
              <div key={i} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">{stat.label}</p>
                <p className="text-sm font-semibold text-white">{stat.value || 'N/A'}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Tactical History</h3>
          <div className="space-y-3">
            {personInteractions.map((inter) => (
              <div key={inter.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">{getIcon(inter.type)}<span className="text-xs font-bold text-white uppercase">{inter.type}</span></div>
                  <span className="text-[10px] text-slate-500 font-mono">{new Date(inter.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-slate-700 pl-3">"{inter.notes || 'N/A'}"</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default PersonDetails;

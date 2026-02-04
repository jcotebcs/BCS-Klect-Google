
import React, { useState } from 'react';
import { CheckCircle2, XCircle, ShieldCheck, ChevronRight, Layers, Trash2, Camera, CarFront, Box, Target, FileText, Pencil } from 'lucide-react';
import { VehicleRecord } from '../types';
import HandwritingInput from './HandwritingInput';

interface BulkApprovalProps {
  pending: VehicleRecord[];
  onApprove: (approved: VehicleRecord[]) => void;
  onCancel: () => void;
}

const BulkApproval: React.FC<BulkApprovalProps> = ({ pending, onApprove, onCancel }) => {
  const [items, setItems] = useState<VehicleRecord[]>(pending);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const removeRecord = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateNote = (id: string, note: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, notes: note } : item));
  };

  const handleFinalize = () => {
    onApprove(items);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 pb-safe">
      <header className="p-6 pt-10 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
              <Layers className="text-blue-600" size={24} /> BATCH APPROVAL
            </h1>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-1">Pending Approval Queue</p>
          </div>
          <button onClick={onCancel} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
            <XCircle size={24} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        {items.length > 0 ? (
          items.map((record) => (
            <div key={record.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-2">
              <div className="flex p-4 gap-4">
                <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-900 overflow-hidden relative border border-slate-200 dark:border-slate-700 flex-shrink-0">
                  <img src={record.photos[0]} alt="Record" className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 right-1 bg-blue-600 px-1.5 py-0.5 rounded text-[8px] font-black text-white">
                    {record.photos.length} PH
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-mono font-black text-slate-900 dark:text-white truncate uppercase">
                      {record.plate || record.vin.slice(-8)}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase rounded border border-blue-100 dark:border-blue-500/20">
                      {record.category}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                    {record.make} {record.model} • {record.color}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-tighter flex items-center gap-1">
                      <Box size={10} /> {record.shape || 'Unknown Body'}
                    </p>
                  </div>

                  {editingNoteId === record.id ? (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-1">
                      <HandwritingInput
                        value={record.notes || ''}
                        onChange={(val) => updateNote(record.id, val)}
                        className="!rounded-2xl"
                      />
                      <button 
                        onClick={() => setEditingNoteId(null)}
                        className="mt-2 w-full py-2 bg-slate-900 text-slate-400 text-[10px] font-black uppercase rounded-xl border border-slate-800"
                      >
                        Finish Editing
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setEditingNoteId(record.id)}
                      className="mt-3 flex items-center gap-2 text-left group"
                    >
                      <div className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-400 group-hover:text-blue-500 transition-colors">
                        <Pencil size={12} />
                      </div>
                      <p className="text-[11px] text-slate-500 italic truncate max-w-[150px]">
                        {record.notes ? record.notes : 'Click to add field note...'}
                      </p>
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => removeRecord(record.id)}
                  className="p-2 self-start text-red-500/30 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
             <ShieldCheck size={64} className="opacity-10 mb-4" />
             <p className="text-sm font-black uppercase tracking-widest">Queue Clear</p>
             <button onClick={onCancel} className="mt-4 text-xs font-bold text-blue-600 uppercase">Return to Ops</button>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
           <button 
             onClick={handleFinalize}
             className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all"
           >
             Commit {items.length} Assets to History <ChevronRight size={18} />
           </button>
        </div>
      )}
    </div>
  );
};

export default BulkApproval;

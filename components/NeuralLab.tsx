
import React from 'react';
import { X, Brain, Trash2, ShieldAlert, History, Activity, AlertCircle, RefreshCw, Zap, Star, ShieldCheck, Database } from 'lucide-react';
import { NeuralSample } from '../types';
import { getNeuralSamples, removeNeuralSample, clearNeuralSamples, toggleGoldStandard, EnhancedNeuralSample } from '../services/trainingService';

interface NeuralLabProps {
  onBack: () => void;
}

const NeuralLab: React.FC<NeuralLabProps> = ({ onBack }) => {
  const [samples, setSamples] = React.useState<EnhancedNeuralSample[]>([]);

  React.useEffect(() => {
    setSamples(getNeuralSamples() as EnhancedNeuralSample[]);
  }, []);

  const handleRemove = (id: string) => {
    removeNeuralSample(id);
    setSamples(getNeuralSamples() as EnhancedNeuralSample[]);
  };

  const handleToggleGold = (id: string) => {
    toggleGoldStandard(id);
    setSamples(getNeuralSamples() as EnhancedNeuralSample[]);
  };

  const handleClear = () => {
    if (confirm("PURGE ALL NEURAL WEIGHTS? AI calibration will reset to factory defaults.")) {
      clearNeuralSamples();
      setSamples([]);
    }
  };

  const stats = {
    gold: samples.filter(s => s.type === 'gold_standard').length,
    corrections: samples.filter(s => s.type === 'correction').length,
    hits: samples.filter(s => s.type === 'verified_hit').length,
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden animate-in fade-in duration-300">
      <header className="p-6 pt-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Brain className="text-purple-500" size={24} /> NEURAL TRAINING CORE
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">MML Knowledge Bucket Management</p>
          </div>
          <button onClick={onBack} className="p-2 bg-slate-900 rounded-full text-slate-500 active:scale-95 transition-all">
            <X size={24} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 pb-32">
        <div className="bg-purple-500/5 border border-purple-500/10 p-6 rounded-[2rem] space-y-4">
           <div className="flex items-center gap-2 text-purple-400">
             <Zap size={16} fill="currentColor" />
             <span className="text-[10px] font-black uppercase tracking-widest">Reinforcement Loop Status: Active</span>
           </div>
           
           <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-800 text-center">
                 <p className="text-[8px] font-black text-amber-500 uppercase mb-1">Gold</p>
                 <p className="text-lg font-black text-white">{stats.gold}</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-800 text-center">
                 <p className="text-[8px] font-black text-blue-500 uppercase mb-1">Corrections</p>
                 <p className="text-lg font-black text-white">{stats.corrections}</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-800 text-center">
                 <p className="text-[8px] font-black text-emerald-500 uppercase mb-1">Hits</p>
                 <p className="text-lg font-black text-white">{stats.hits}</p>
              </div>
           </div>

           <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
             Verified metadata and approved records are collated into a <span className="text-white">Knowledge Bucket</span>. Gemini performs pattern matching against this dataset to calibrate its visual recognition engine for future captures.
           </p>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Database size={14} className="text-purple-500" /> Sector Training Sets
            </h3>
            {samples.length > 0 && (
              <button onClick={handleClear} className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5 hover:underline">
                <RefreshCw size={10} /> Purge weights
              </button>
            )}
          </div>

          <div className="space-y-3">
            {samples.length > 0 ? samples.map(sample => (
              <div key={sample.id} className="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-4 flex gap-4 items-center group relative overflow-hidden">
                {/* Background glow based on type */}
                <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 opacity-[0.03] rounded-full blur-2xl ${
                  sample.type === 'gold_standard' ? 'bg-amber-500' : 
                  sample.type === 'correction' ? 'bg-blue-500' : 'bg-emerald-500'
                }`} />

                <div className="w-16 h-16 rounded-xl bg-black overflow-hidden border border-slate-800 flex-shrink-0 relative">
                  {sample.thumbnail ? (
                    <img src={`data:image/jpeg;base64,${sample.thumbnail}`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-800"><Activity size={20} /></div>
                  )}
                  {sample.type === 'gold_standard' && (
                    <div className="absolute top-1 right-1 bg-amber-500 p-0.5 rounded-sm shadow-lg">
                       <Star size={8} fill="white" className="text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 z-10">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-black text-white uppercase truncate">
                      {sample.verifiedData.year} {sample.verifiedData.make} {sample.verifiedData.model}
                    </p>
                    <span className={`text-[7px] font-black px-1 py-0.5 rounded uppercase border ${
                      sample.type === 'gold_standard' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                      sample.type === 'correction' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                      'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                    }`}>
                      {sample.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {sample.verifiedData.shape} Signature
                  </p>
                  <p className="text-[8px] font-mono text-slate-700 uppercase mt-1">
                    Ingested {new Date(sample.timestamp).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => handleToggleGold(sample.id)}
                    className={`p-2 rounded-lg transition-colors ${sample.type === 'gold_standard' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-500'}`}
                  >
                    <Star size={14} fill={sample.type === 'gold_standard' ? 'currentColor' : 'none'} />
                  </button>
                  <button 
                    onClick={() => handleRemove(sample.id)}
                    className="p-2 bg-slate-800 text-slate-500 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center border border-dashed border-slate-800 rounded-[2.5rem] bg-slate-900/20">
                 <Brain size={48} className="mx-auto text-slate-800 mb-4 opacity-20" />
                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-12">
                   Knowledge Bucket Empty. Finalize bulk uploads or pin 'Gold Standards' to train the MML algorithm.
                 </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default NeuralLab;


import React, { useState, useRef } from 'react';
import { 
  Camera, X, Plus, Cloud, Image as ImageIcon, 
  Trash2, Loader2, Check, Zap, ArrowRight, ChevronRight, 
  Target, PlusCircle, Info, FileText, CheckCircle, Smartphone, AlertTriangle, Cpu, Siren, Tag
} from 'lucide-react';
import { analyzeVehicleImage, checkStolenStatus, ScanResult } from '../services/geminiService';
import { getVinReasoning, VinReasoning } from '../services/nhtsaService';
import { openDrivePicker, downloadDriveFileAsBase64, openPhotosPicker } from '../services/googleDriveService';
import { VehicleRecord, AssetPhoto, VehicleCategory } from '../types';

interface NewAssetEntryProps {
  onComplete: (data: Partial<VehicleRecord>, photos: AssetPhoto[]) => void;
  onCancel: () => void;
}

type IngestionStep = 'COLLECT' | 'IDENTIFY' | 'VERIFY';

// Internal type to handle the joined result for verification
type VerifiedScanResult = ScanResult & { 
  vinReasoning?: VinReasoning, 
  stolenCheckResult?: { 
    isStolen: boolean, 
    details: string, 
    timestamp: string, 
    sources: { title: string, uri: string }[] 
  } 
};

const PHOTO_LABELS = ['Front', 'Rear', 'Left', 'Right', 'VIN', 'Windshield', 'Trespass Sign', 'Context', 'General'];

const NewAssetEntry: React.FC<NewAssetEntryProps> = ({ onComplete, onCancel }) => {
  const [photos, setPhotos] = useState<AssetPhoto[]>([]);
  const [step, setStep] = useState<IngestionStep>('COLLECT');
  const [targetPhotoIdx, setTargetPhotoIdx] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [taggingIdx, setTaggingIdx] = useState<number | null>(null);
  
  const [mappingResult, setMappingResult] = useState<VerifiedScanResult | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setIsCapturing(true);
    } catch (err) { console.error("Camera fail", err); }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const url = canvas.toDataURL('image/jpeg', 0.8);
    
    setPhotos(prev => [...prev, {
      url,
      label: 'General',
      timestamp: new Date().toISOString()
    }]);
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(async (file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos(prev => [...prev, {
          url: reader.result as string,
          label: 'General',
          timestamp: new Date().toISOString()
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCloudImport = async (type: 'drive' | 'photos') => {
    try {
      const files = type === 'drive' ? await openDrivePicker() : await openPhotosPicker();
      if (files.length === 0) return;
      for (const file of files) {
        const base64 = await downloadDriveFileAsBase64(file);
        setPhotos(prev => [...prev, {
          url: `data:image/jpeg;base64,${base64}`,
          label: `Cloud Asset`,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (err) { console.error("Cloud fault", err); }
  };

  const runNeuralMapping = async () => {
    if (photos.length === 0) return;
    setIsAnalyzing(true);
    try {
      const target = photos[targetPhotoIdx];
      const base64 = target.url.split(',')[1];
      const result = await analyzeVehicleImage(base64, 'plate');
      
      let vinReasoning: VinReasoning | undefined = undefined;
      let stolenCheckResult: VerifiedScanResult['stolenCheckResult'] = undefined;

      if (result.vin && result.vin !== 'Unknown' && result.vin !== 'Not Scanned') {
        const [reasoning, stolen] = await Promise.all([
          getVinReasoning(result.vin),
          checkStolenStatus(result.vin)
        ]);
        vinReasoning = reasoning;
        stolenCheckResult = stolen;
        
        if (stolenCheckResult.isStolen) {
          result.category = VehicleCategory.STOLEN;
        }
      }
      
      setMappingResult({ ...result, vinReasoning, stolenCheckResult });
      setStep('VERIFY');
    } catch (err) { console.error("Neural mapping fault", err); }
    finally { setIsAnalyzing(false); }
  };

  const handleFinalize = () => {
    if (!mappingResult) return;
    const finalizedPhotos = photos.map((p, i) => ({
      ...p,
      label: i === targetPhotoIdx ? 'Identification Frame' : p.label
    }));
    
    // cast to ensure type safety with Partial<VehicleRecord>
    onComplete(mappingResult as Partial<VehicleRecord>, finalizedPhotos);
  };

  const applyVinCorrection = async (vin: string) => {
    if (!mappingResult) return;
    const [reasoning, stolen] = await Promise.all([
      getVinReasoning(vin),
      checkStolenStatus(vin)
    ]);
    
    setMappingResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        vin,
        vinReasoning: reasoning,
        stolenCheckResult: stolen,
        category: stolen.isStolen ? VehicleCategory.STOLEN : prev.category
      };
    });
  };

  const updatePhotoLabel = (idx: number, label: string) => {
    setPhotos(prev => prev.map((p, i) => i === idx ? { ...p, label } : p));
    setTaggingIdx(null);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden">
      <header className="p-6 pt-12 border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <PlusCircle className="text-blue-500" size={24} /> ASSET PACKAGE
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">
              {step === 'COLLECT' ? 'Phase 1: Captured Evidence' : step === 'IDENTIFY' ? 'Phase 2: Target Locking' : 'Phase 3: Grid Sync'}
            </p>
          </div>
          <button onClick={onCancel} className="p-2 bg-slate-900 rounded-full text-slate-500 active:scale-95 transition-all"><X size={24} /></button>
        </div>
      </header>

      {step === 'COLLECT' && (
        <main className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 pb-40">
          <div className="grid grid-cols-3 gap-3">
            <button onClick={startCamera} className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-900 rounded-[2rem] border border-slate-800 hover:border-blue-500 active:scale-95 group transition-all">
              <div className="p-4 bg-slate-800 rounded-2xl group-hover:bg-blue-600/20"><Camera size={20} className="text-slate-400 group-hover:text-blue-500" /></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Camera</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-900 rounded-[2rem] border border-slate-800 hover:border-emerald-500 active:scale-95 group transition-all">
              <div className="p-4 bg-slate-800 rounded-2xl group-hover:bg-emerald-600/20"><ImageIcon size={20} className="text-slate-400 group-hover:text-emerald-500" /></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Local</span>
            </button>
            <button onClick={() => handleCloudImport('drive')} className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-900 rounded-[2rem] border border-slate-800 hover:border-cyan-500 active:scale-95 group transition-all">
              <div className="p-4 bg-slate-800 rounded-2xl group-hover:bg-cyan-600/20"><Cloud size={20} className="text-slate-400 group-hover:text-cyan-500" /></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cloud</span>
            </button>
          </div>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Evidence Pool ({photos.length})</h3>
            <div className="grid grid-cols-2 gap-4">
              {photos.map((ph, idx) => (
                <div key={idx} className="aspect-square bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden relative group animate-in zoom-in-95 shadow-xl">
                  <img src={ph.url} className="w-full h-full object-cover" />
                  
                  {/* Tag Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1.5">
                    <button 
                      onClick={() => setTaggingIdx(idx)}
                      className="w-full py-2 bg-black/60 backdrop-blur-md rounded-xl text-[8px] font-black text-white uppercase border border-white/10 flex items-center justify-center gap-1.5 shadow-2xl active:scale-95 transition-all"
                    >
                      <Tag size={10} className="text-blue-500" /> {ph.label || 'Assign Tag'}
                    </button>
                  </div>

                  <button onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))} className="absolute top-3 right-3 p-2 bg-red-500/20 text-red-500 rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all active:scale-90"><Trash2 size={16} /></button>
                </div>
              ))}
              {photos.length === 0 && (
                <div className="col-span-2 py-24 text-center border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/10">
                  <FileText size={48} className="mx-auto text-slate-800 mb-4 opacity-40" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-14 leading-relaxed">No documentation captured. Captures can include trespass context or warning signage.</p>
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      {step === 'IDENTIFY' && (
        <main className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 pb-40">
          <div className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-3xl flex items-start gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg"><Target className="text-white" size={20} /></div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-tight">Designate Identification Master</p>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed uppercase font-black">Select the high-fidelity frame containing the primary plate or VIN signature.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {photos.map((ph, idx) => (
              <button 
                key={idx} 
                onClick={() => setTargetPhotoIdx(idx)}
                className={`aspect-square rounded-[2.5rem] border-2 overflow-hidden relative transition-all duration-300 ${targetPhotoIdx === idx ? 'border-blue-500 ring-4 ring-blue-500/20 scale-95 shadow-2xl' : 'border-slate-800'}`}
              >
                <img src={ph.url} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur rounded-lg text-[7px] font-black text-white uppercase tracking-widest border border-white/5">{ph.label}</div>
                {targetPhotoIdx === idx && (
                  <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
                    <div className="bg-blue-600 p-4 rounded-full shadow-2xl animate-in zoom-in duration-300"><Target size={28} className="text-white" /></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </main>
      )}

      {step === 'VERIFY' && mappingResult && (
        <main className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 pb-40">
          {mappingResult.stolenCheckResult?.isStolen && (
            <div className="bg-red-600 p-6 rounded-[2rem] border border-red-400 shadow-2xl shadow-red-600/20 animate-in slide-in-from-top-4 duration-500">
               <div className="flex items-center gap-3 text-white mb-2">
                 <Siren size={20} className="animate-pulse" />
                 <span className="text-xs font-black uppercase tracking-widest">Active Theft Hit</span>
               </div>
               <p className="text-[10px] font-bold text-white/90 leading-relaxed uppercase italic">
                 {mappingResult.stolenCheckResult.details}
               </p>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] space-y-6 relative overflow-hidden shadow-2xl">
             <div className="flex items-center gap-2 mb-2">
               <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-[8px] font-black text-blue-400 uppercase tracking-widest">Neural Mapping Verified</div>
               {mappingResult.confidence > 0.85 && <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[8px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1"><CheckCircle size={10} /> High Fidelity</div>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 uppercase px-1">Plate</label>
                <input type="text" value={mappingResult.plate} onChange={e => setMappingResult({...mappingResult, plate: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-black text-white outline-none focus:border-blue-500 transition-all font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 uppercase px-1">VIN Signature</label>
                <input type="text" value={mappingResult.vin} onChange={e => setMappingResult({...mappingResult, vin: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-black text-white outline-none focus:border-blue-500 transition-all font-mono" />
              </div>
            </div>

            {mappingResult.vinReasoning && (
              <div className={`p-4 rounded-2xl border ${mappingResult.vinReasoning.isValid ? 'bg-blue-600/5 border-blue-500/20' : 'bg-amber-600/5 border-amber-500/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-blue-500">
                    <Cpu size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">VIN Logic Check</span>
                  </div>
                  <span className={`text-[8px] font-black uppercase ${mappingResult.vinReasoning.isValid ? 'text-emerald-500' : 'text-amber-500'}`}>
                    Checksum: {mappingResult.vinReasoning.checksumStatus}
                  </span>
                </div>
                
                {mappingResult.vinReasoning.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] text-amber-500 font-bold italic">Potential OCR correction found:</p>
                    <button 
                      onClick={() => applyVinCorrection(mappingResult.vinReasoning!.suggestions[0])}
                      className="w-full py-2 bg-amber-600 text-white text-[9px] font-black uppercase rounded-lg active:scale-95 transition-all"
                    >
                      Apply: {mappingResult.vinReasoning.suggestions[0]}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 uppercase px-1">Year</label>
                <input type="text" value={mappingResult.year} onChange={e => setMappingResult({...mappingResult, year: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-[11px] font-bold text-white outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 uppercase px-1">Make</label>
                <input type="text" value={mappingResult.make} onChange={e => setMappingResult({...mappingResult, make: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-[11px] font-bold text-white outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 uppercase px-1">Model</label>
                <input type="text" value={mappingResult.model} onChange={e => setMappingResult({...mappingResult, model: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-[11px] font-bold text-white outline-none" />
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Tagging Modal Overlay */}
      {taggingIdx !== null && (
        <div className="fixed inset-0 z-[150] flex items-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setTaggingIdx(null)} />
          <div className="relative w-full bg-slate-900 rounded-t-[3rem] p-8 pb-12 space-y-6 shadow-2xl border-t border-slate-800 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-white font-black text-sm uppercase tracking-tighter">Classify Tactical Frame</h4>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Select signature context for evidence</p>
              </div>
              <button onClick={() => setTaggingIdx(null)} className="p-2 bg-slate-800 rounded-full text-slate-500 active:scale-95"><X size={20} /></button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {PHOTO_LABELS.map(label => (
                <button
                  key={label}
                  onClick={() => updatePhotoLabel(taggingIdx, label)}
                  className={`py-4 rounded-2xl text-[8px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                    photos[taggingIdx].label === label 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 p-6 border-t border-slate-900 bg-slate-950/95 backdrop-blur-xl z-30 space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex gap-3">
          {step === 'COLLECT' && (
            <button onClick={() => setStep('IDENTIFY')} disabled={photos.length === 0} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3">Next: Phase 2 <ArrowRight size={18} /></button>
          )}
          {step === 'IDENTIFY' && (
            <>
              <button onClick={() => setStep('COLLECT')} className="flex-1 bg-slate-900 text-slate-500 font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 transition-all">Back</button>
              <button onClick={runNeuralMapping} disabled={isAnalyzing} className="flex-[2] bg-blue-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3">{isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} fill="currentColor" />}{isAnalyzing ? 'Mapping...' : 'Run Neural Link'}</button>
            </>
          )}
          {step === 'VERIFY' && (
            <>
              <button onClick={() => setStep('IDENTIFY')} className="flex-1 bg-slate-900 text-slate-500 font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 transition-all">Retarget</button>
              <button onClick={handleFinalize} className={`flex-[2] text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${mappingResult?.stolenCheckResult?.isStolen ? 'bg-red-600 shadow-red-600/20' : 'bg-blue-600 shadow-blue-600/20'}`}>
                Finalize Operations <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
      </footer>

      {isCapturing && (
        <div className="fixed inset-0 z-[120] bg-black flex flex-col animate-in fade-in zoom-in-95">
          <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
          <div className="absolute top-10 left-6 right-6 flex items-center justify-between">
             <div className="flex flex-col">
               <h3 className="text-white font-black text-[11px] uppercase tracking-widest flex items-center gap-2"><Smartphone size={14} className="text-blue-500" /> Lens Interface Active</h3>
               <p className="text-blue-400/60 font-mono text-[8px] uppercase tracking-[0.2em] mt-1">Collecting Field Intel</p>
             </div>
             <button onClick={stopCamera} className="p-3 bg-slate-900/50 backdrop-blur rounded-full text-white"><X size={20} /></button>
          </div>
          <div className="p-8 bg-slate-950 flex flex-col gap-8 items-center px-12 pb-safe">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar w-full pb-2">
               {photos.slice(-5).map((p, i) => (
                 <div key={i} className="w-14 h-14 rounded-xl overflow-hidden border border-white/20 flex-shrink-0"><img src={p.url} className="w-full h-full object-cover" /></div>
               ))}
            </div>
            <div className="flex justify-between items-center w-full">
              <div className="w-14 h-14" />
              <button onClick={capturePhoto} className="w-24 h-24 rounded-full border-4 border-slate-800 p-1 bg-slate-900 active:scale-95"><div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-inner"><div className="w-12 h-12 rounded-full border-2 border-slate-200" /></div></button>
              <button onClick={stopCamera} className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90"><Check size={28} strokeWidth={3} /></button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleGalleryUpload} accept="image/*" />
    </div>
  );
};

export default NewAssetEntry;

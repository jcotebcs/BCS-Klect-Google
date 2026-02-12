
import React, { useState, useRef, useMemo } from 'react';
import { 
  UploadCloud, X, RefreshCw, CheckCircle2, Layers, Database, ShieldAlert, ChevronRight, Trash2, Loader2, AlertTriangle, Target, Zap, ShieldCheck, SearchX, Activity, Cloud, Image as ImageIcon, Plus, Images, Library, Pencil, ChevronDown, Calendar, Car, Box, Check, Fingerprint, Type
} from 'lucide-react';
import { analyzeVehicleImage } from '../services/geminiService';
import { openDrivePicker, downloadDriveFileAsBase64, openPhotosPicker, DriveFile } from '../services/googleDriveService';
import { saveNeuralSample } from '../services/trainingService';
import { validateVIN } from '../utils/vinValidator';
import { VehicleRecord, VehicleCategory, AssetPhoto } from '../types';

interface BulkUploadProps {
  onComplete: (records: VehicleRecord[]) => void;
  onCancel: () => void;
}

interface BatchItem {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  files: { url: string; label: string; file?: File; driveFile?: DriveFile }[];
  record?: VehicleRecord;
  error?: string;
  hasManualCorrection?: boolean;
  vinValid?: boolean;
  plateValid?: boolean;
}

const BODY_STYLES = ['Sedan', 'SUV', 'Pickup Truck', 'Coupe', 'Van', 'Hatchback', 'Convertible', 'Wagon', 'Box Truck', 'Semi-Truck', 'Motorcycle'];

const BulkUpload: React.FC<BulkUploadProps> = ({ onComplete, onCancel }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const total = items.length;
    const success = items.filter(i => i.status === 'success').length;
    const error = items.filter(i => i.status === 'error').length;
    const pending = items.filter(i => i.status === 'pending').length;
    const processed = total - pending;
    const progress = total > 0 ? (processed / total) * 100 : 0;
    return { total, success, error, pending, progress };
  }, [items]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    
    const files = Array.from(fileList) as File[];
    if (files.length === 0) return;

    // In Bulk mode, we usually want one Asset per file unless they are specifically grouped.
    // Defaulting to one asset per file for bulk efficiency.
    const newItems: BatchItem[] = files.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      status: 'pending',
      files: [{
        url: URL.createObjectURL(file),
        label: 'Identification Frame',
        file
      }]
    }));

    setItems(prev => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCloudImport = async (type: 'drive' | 'photos') => {
    try {
      const files = type === 'drive' ? await openDrivePicker() : await openPhotosPicker();
      if (files.length === 0) return;

      const newItems: BatchItem[] = files.map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        status: 'pending',
        files: [{
          url: file.thumbnailUrl || '', 
          label: 'Identification Frame',
          driveFile: file
        }]
      }));
      setItems(prev => [...prev, ...newItems]);
    } catch (err) { console.error(`${type} import failed`, err); }
  };

  const processBatchItem = async (item: BatchItem) => {
    if (item.status === 'success') return;

    try {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));

      const primary = item.files[0];
      let base64 = '';
      if (primary.file) {
        base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(primary.file!);
        });
      } else if (primary.driveFile) {
        base64 = await downloadDriveFileAsBase64(primary.driveFile);
      }

      const result = await analyzeVehicleImage(base64, 'plate');
      
      // VERIFICATION LOGIC
      const vinCheck = result.vin ? validateVIN(result.vin) : { isValid: false };
      const plateCheck = !!(result.plate && result.plate.length > 3 && result.plate !== 'Unknown');

      const record: VehicleRecord = {
        id: crypto.randomUUID(),
        plate: result.plate,
        vin: result.vin,
        year: result.year,
        make: result.make,
        model: result.model,
        color: result.color,
        category: result.category,
        timestamp: new Date().toISOString(),
        notes: "Batch tactical ingestion complete.",
        photos: item.files.map(f => ({ url: f.url, label: f.label, timestamp: new Date().toISOString() })),
        recordings: [],
        lastSighting: new Date().toISOString(),
        shape: result.shape
      };

      setItems(prev => prev.map(i => i.id === item.id ? { 
        ...i, 
        status: 'success', 
        record, 
        vinValid: vinCheck.isValid,
        plateValid: plateCheck 
      } : i));
    } catch (err) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: 'Neural mapping fault' } : i));
    }
  };

  const startAllMapping = async () => {
    setIsProcessing(true);
    const pendingItems = items.filter(i => i.status === 'pending');
    for (const item of pendingItems) {
      await processBatchItem(item);
    }
    setIsProcessing(false);
  };

  const updateItemRecord = (itemId: string, field: keyof VehicleRecord, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId && item.record) {
        const updatedRecord = { ...item.record, [field]: value };
        // Re-verify on manual update
        const vinCheck = updatedRecord.vin ? validateVIN(updatedRecord.vin) : { isValid: false };
        const plateCheck = !!(updatedRecord.plate && updatedRecord.plate.length > 3 && updatedRecord.plate !== 'Unknown');
        
        return {
          ...item,
          record: updatedRecord,
          hasManualCorrection: true,
          vinValid: vinCheck.isValid,
          plateValid: plateCheck
        };
      }
      return item;
    }));
  };

  const finalize = () => {
    const successfulItems = items.filter(i => i.status === 'success' && i.record);
    onComplete(successfulItems.map(i => i.record!));
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 pb-safe relative transition-colors duration-300">
      <header className="p-6 pt-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Layers className="text-blue-600" size={24} /> BATCH INGESTION
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Multi-Asset Pipeline</p>
          </div>
          <button onClick={onCancel} className="p-2 bg-slate-900 rounded-full text-slate-600 active:scale-95 transition-all"><X size={24} /></button>
        </div>

        {items.length > 0 && (
          <div className="mt-6 flex gap-2">
            <div className="flex-1 bg-slate-900/50 border border-slate-800 p-3 rounded-2xl">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Queue</p>
              <p className="text-sm font-black text-white">{stats.total}</p>
            </div>
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
              <p className="text-[8px] font-black text-emerald-500/60 uppercase mb-1">Mapped</p>
              <p className="text-sm font-black text-emerald-400">{stats.success}</p>
            </div>
            <div className="flex-1 bg-blue-500/10 border border-blue-500/20 p-3 rounded-2xl">
              <p className="text-[8px] font-black text-blue-500/60 uppercase mb-1">Wait</p>
              <p className="text-sm font-black text-blue-400">{stats.pending}</p>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        {items.length === 0 ? (
          <div className="space-y-6 pt-10">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="h-72 border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group active:scale-[0.98]"
            >
              <div className="p-6 bg-slate-900 rounded-[2.5rem] group-hover:scale-110 transition-transform shadow-xl">
                <UploadCloud className="text-slate-700 group-hover:text-blue-600" size={48} />
              </div>
              <div className="text-center">
                <p className="text-white font-black uppercase tracking-tighter">Select Local Gallery</p>
                <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest px-10">Bulk process multiple vehicle photos simultaneously</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <button onClick={() => handleCloudImport('drive')} className="flex flex-col items-center justify-center gap-3 p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 hover:border-blue-500 transition-all group shadow-lg active:scale-95">
                  <div className="p-4 bg-slate-800 rounded-2xl group-hover:bg-blue-600/20 transition-colors">
                    <Cloud size={24} className="text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Google Drive</span>
               </button>
               <button onClick={() => handleCloudImport('photos')} className="flex flex-col items-center justify-center gap-3 p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 hover:border-emerald-500 transition-all group shadow-lg active:scale-95">
                  <div className="p-4 bg-slate-800 rounded-2xl group-hover:bg-emerald-600/20 transition-colors">
                    <Images size={24} className="text-slate-400 group-hover:text-emerald-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Google Photos</span>
               </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-32">
            {items.map(item => (
              <div 
                key={item.id} 
                className={`bg-slate-900 border rounded-[2rem] flex flex-col transition-all duration-300 overflow-hidden ${
                  item.status === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' : 
                  item.status === 'error' ? 'border-red-500/30 bg-red-500/5' : 
                  item.status === 'processing' ? 'border-blue-500/30 ring-1 ring-blue-500/20' : 'border-slate-800'
                }`}
              >
                <div className="p-4 flex gap-4 items-center">
                  <div className="w-20 h-20 rounded-2xl bg-slate-800 overflow-hidden relative flex-shrink-0 border border-slate-800 shadow-lg">
                    <img src={item.files[0].url} className="w-full h-full object-cover" />
                    {item.status === 'processing' && (
                      <div className="absolute inset-0 bg-blue-600/40 backdrop-blur-[2px] flex items-center justify-center">
                        <Loader2 size={24} className="text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-black text-white uppercase truncate pr-2">
                        {item.status === 'success' ? item.record?.plate : item.name}
                      </p>
                      <div className="flex gap-1.5">
                        {item.status === 'success' && (
                          <button 
                            onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                            className={`p-1.5 rounded-lg transition-all ${editingId === item.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                          className="p-1.5 text-slate-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                       {item.status === 'success' ? (
                         <>
                           <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[7px] font-black uppercase tracking-tighter ${item.plateValid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                             <Type size={8} /> {item.plateValid ? 'PLATE PASS' : 'PLATE FAIL'}
                           </div>
                           <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[7px] font-black uppercase tracking-tighter ${item.vinValid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                             <Fingerprint size={8} /> {item.vinValid ? 'VIN PASS' : 'VIN CHECK'}
                           </div>
                         </>
                       ) : (
                         <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-[8px] font-black uppercase rounded tracking-widest">
                           {item.status.toUpperCase()}
                         </span>
                       )}
                    </div>
                    
                    {item.status === 'success' && (
                      <p className="text-[10px] font-bold text-slate-400 mt-1.5 truncate">
                        {item.record?.year} {item.record?.make} {item.record?.model}
                      </p>
                    )}
                  </div>
                </div>

                {editingId === item.id && item.record && (
                  <div className="bg-slate-950/80 border-t border-slate-800 p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Plate Identity</label>
                        <input 
                          type="text" 
                          value={item.record.plate}
                          onChange={(e) => updateItemRecord(item.id, 'plate', e.target.value.toUpperCase())}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all font-mono tracking-widest"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">VIN Signature</label>
                        <input 
                          type="text" 
                          value={item.record.vin}
                          onChange={(e) => updateItemRecord(item.id, 'vin', e.target.value.toUpperCase())}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-500 uppercase px-1">Year</label>
                        <input type="text" value={item.record.year} onChange={(e) => updateItemRecord(item.id, 'year', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-500 uppercase px-1">Make</label>
                        <input type="text" value={item.record.make} onChange={(e) => updateItemRecord(item.id, 'make', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-500 uppercase px-1">Model</label>
                        <input type="text" value={item.record.model} onChange={(e) => updateItemRecord(item.id, 'model', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none" />
                      </div>
                    </div>

                    <button onClick={() => setEditingId(null)} className="w-full py-2.5 bg-slate-800 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-slate-700 active:scale-95 transition-all">
                      Confirm Overrides
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            {!isProcessing && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 border-2 border-dashed border-slate-800 rounded-[2.5rem] flex items-center justify-center gap-3 text-slate-500 hover:text-blue-500 transition-all active:scale-[0.98] bg-slate-900/20"
              >
                <Plus size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest">Append More Assets</span>
              </button>
            )}
          </div>
        )}
      </main>

      {items.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 p-6 border-t border-slate-900 bg-slate-950/95 backdrop-blur-xl z-30 space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex gap-3">
             <button 
              onClick={startAllMapping} 
              disabled={isProcessing || stats.pending === 0}
              className="flex-1 bg-slate-800 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2 border border-slate-700 shadow-lg"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" className="text-blue-500" />}
              {isProcessing ? 'Mapping...' : 'Neural Link All'}
            </button>
            <button 
              onClick={finalize} 
              disabled={stats.success === 0 || isProcessing}
              className="flex-[1.5] bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              Commit {stats.success} Records <ChevronRight size={18} />
            </button>
          </div>
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] animate-pulse">
               <Activity size={12} /> Syncing Multi-Domain Intelligence
            </div>
          )}
        </footer>
      )}
      <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
    </div>
  );
};

export default BulkUpload;

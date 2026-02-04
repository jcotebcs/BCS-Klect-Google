
import React, { useState, useRef, useMemo } from 'react';
import { 
  UploadCloud, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Database, 
  ShieldAlert, 
  ChevronRight, 
  Trash2, 
  Loader2,
  AlertTriangle,
  BarChart3,
  Target,
  Zap,
  ShieldCheck,
  SearchX,
  // Added Activity icon to fix missing name error
  Activity
} from 'lucide-react';
import { analyzeVehicleImage } from '../services/geminiService';
import { VehicleRecord } from '../types';

interface BulkUploadProps {
  onComplete: (records: VehicleRecord[]) => void;
  onCancel: () => void;
}

type ErrorType = 'network' | 'vision' | 'confidence' | 'unknown';

interface BatchItem {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  errorType?: ErrorType;
  error?: string;
  record?: VehicleRecord;
  confidence?: number;
}

const BulkUpload: React.FC<BulkUploadProps> = ({ onComplete, onCancel }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const total = items.length;
    const successful = items.filter(i => i.status === 'success').length;
    const failed = items.filter(i => i.status === 'error').length;
    const pending = items.filter(i => i.status === 'pending').length;
    const processing = items.filter(i => i.status === 'processing').length;
    
    const successfulItems = items.filter(i => i.status === 'success' && i.confidence !== undefined);
    const avgConfidence = successfulItems.length > 0 
      ? successfulItems.reduce((acc, curr) => acc + (curr.confidence || 0), 0) / successfulItems.length 
      : 0;

    return { total, successful, failed, pending, processing, avgConfidence };
  }, [items]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems: BatchItem[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));

    setItems(prev => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSubmitedItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const processSingleItem = async (item: BatchItem): Promise<BatchItem> => {
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Local file read failed'));
        reader.readAsDataURL(item.file);
      });

      const result = await analyzeVehicleImage(base64.split(',')[1], 'plate');
      
      // Granular Error Categorization: Confidence check
      if (result.confidence < 0.4) {
        return {
          ...item,
          status: 'error',
          errorType: 'confidence',
          error: `Low signal-to-noise ratio (${(result.confidence * 100).toFixed(0)}%)`
        };
      }

      // Granular Error Categorization: Vision check
      const hasIdentity = (result.plate && result.plate !== 'Unknown') || (result.vin && result.vin !== 'Unknown');
      if (!hasIdentity) {
        return {
          ...item,
          status: 'error',
          errorType: 'vision',
          error: 'No valid LPR/VIN target detected'
        };
      }

      const record: VehicleRecord = {
        id: crypto.randomUUID(),
        plate: result.plate,
        vin: result.vin,
        year: result.year,
        make: result.make,
        model: result.model,
        brand: result.brand,
        shape: result.shape,
        wheelSignature: result.wheelSignature,
        bodyModifications: result.bodyModifications,
        logoDetected: result.logoDetected,
        logoText: result.logoText,
        color: result.color,
        category: result.category,
        timestamp: new Date().toISOString(),
        notes: result.notes,
        photos: [item.preview],
        recordings: [],
        documents: result.documents
      };

      return { 
        ...item, 
        status: 'success', 
        record, 
        confidence: result.confidence 
      };
    } catch (err: any) {
      const isNetwork = err.message?.toLowerCase().includes('fetch') || err.message?.toLowerCase().includes('network');
      return { 
        ...item, 
        status: 'error', 
        errorType: isNetwork ? 'network' : 'unknown',
        error: isNetwork ? 'Neural link interrupted (Network)' : (err.message || 'Engine core fault') 
      };
    }
  };

  const startProcessing = async (targetItems?: BatchItem[]) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const itemsToProcess = targetItems || items.filter(i => i.status === 'pending');
    
    // Concurrency limit of 3 for simultaneous processing
    const concurrencyLimit = 3;
    
    // Mark as processing in UI
    const processingIds = new Set(itemsToProcess.map(i => i.id));
    setItems(prev => prev.map(item => 
      processingIds.has(item.id) ? { ...item, status: 'processing' } : item
    ));

    for (let i = 0; i < itemsToProcess.length; i += concurrencyLimit) {
      const chunk = itemsToProcess.slice(i, i + concurrencyLimit);
      const chunkResults = await Promise.all(chunk.map(item => processSingleItem(item)));
      
      // Incremental state update for real-time UI feedback
      setItems(prev => prev.map(item => {
        const found = chunkResults.find(r => r.id === item.id);
        return found ? found : item;
      }));
    }

    setIsProcessing(false);
  };

  const retryFailed = async () => {
    const failedItems = items.filter(item => item.status === 'error');
    if (failedItems.length === 0) return;

    const failedIds = new Set(failedItems.map(i => i.id));
    setItems(prev => prev.map(item => 
      failedIds.has(item.id) ? { ...item, status: 'pending', error: undefined, errorType: undefined } : item
    ));

    // Small delay to let UI update
    setTimeout(() => startProcessing(), 50);
  };

  // Added finalize function to handle completion of batch processing
  const finalize = () => {
    const successfulRecords = items
      .filter(item => item.status === 'success' && item.record)
      .map(item => item.record as VehicleRecord);
    if (successfulRecords.length > 0) {
      onComplete(successfulRecords);
    }
  };

  const getErrorIcon = (type?: ErrorType) => {
    switch (type) {
      case 'network': return <Zap className="text-amber-500" size={14} />;
      case 'vision': return <SearchX className="text-red-400" size={14} />;
      case 'confidence': return <AlertTriangle className="text-orange-500" size={14} />;
      default: return <XCircle className="text-red-500" size={14} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 pb-safe transition-colors duration-500">
      <header className="p-6 pt-10 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
              <Layers className="text-blue-600 animate-pulse-slow" size={24} /> BATCH CORE
            </h1>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-1">Operational Asset Ingestion</p>
          </div>
          <button onClick={onCancel} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-transform">
            <X size={24} />
          </button>
        </div>

        {items.length > 0 && (
          <div className="mt-6 grid grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="bg-slate-100 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
              <p className="text-[8px] font-black text-emerald-500/60 uppercase mb-1">Passed</p>
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{stats.successful}</p>
            </div>
            <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
              <p className="text-[8px] font-black text-red-500/60 uppercase mb-1">Failed</p>
              <p className="text-sm font-black text-red-600 dark:text-red-400">{stats.failed}</p>
            </div>
            <div className="bg-blue-600/10 p-2.5 rounded-xl border border-blue-500/20">
              <p className="text-[8px] font-black text-blue-500/60 uppercase mb-1">Avg Conf</p>
              <p className="text-sm font-black text-blue-600 dark:text-blue-400">{(stats.avgConfidence * 100).toFixed(0)}%</p>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6">
        {items.length === 0 ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="h-80 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl dark:shadow-none group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700 relative z-10">
              <Database className="text-slate-300 dark:text-slate-600 group-hover:text-blue-600 transition-colors" size={56} />
            </div>
            <div className="text-center relative z-10">
              <p className="text-base font-black uppercase tracking-tighter text-slate-800 dark:text-slate-200">Initialize Data Stream</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-widest">Supports multiple high-res operational frames</p>
            </div>
            <div className="px-6 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white transition-all">
              Select Assets
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm active:scale-95 transition-all"
              >
                Add Assets
              </button>
              {stats.pending > 0 && (
                <button 
                  onClick={() => startProcessing()}
                  disabled={isProcessing}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50 overflow-hidden relative"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span>Syncing Grid...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Zap size={16} fill="currentColor" />
                      <span>Execute Batch ({stats.pending})</span>
                    </div>
                  )}
                </button>
              )}
            </div>

            <div className="grid gap-3">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className={`bg-white dark:bg-slate-900 border rounded-3xl overflow-hidden shadow-sm transition-all duration-300 ${
                    item.status === 'error' ? 'border-red-500/20 bg-red-50/10' : 
                    item.status === 'success' ? 'border-emerald-500/20 bg-emerald-50/10' : 
                    item.status === 'processing' ? 'border-blue-500/30' :
                    'border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <div className="flex p-4 gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden relative flex-shrink-0 border border-slate-100 dark:border-slate-700">
                      <img src={item.preview} className="w-full h-full object-cover" alt="Asset" />
                      {item.status === 'processing' && (
                        <div className="absolute inset-0 bg-blue-600/40 backdrop-blur-[2px] flex items-center justify-center">
                          <Loader2 size={24} className="text-white animate-spin" />
                        </div>
                      )}
                      {item.status === 'success' && (
                        <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-1 shadow-lg">
                          <CheckCircle2 size={10} className="text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{item.file.name}</span>
                        {item.status === 'success' && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                             <Target size={10} className="text-blue-500" />
                             <span className="text-[9px] font-mono font-black text-blue-600 dark:text-blue-400">{(item.confidence! * 100).toFixed(0)}% Match</span>
                          </div>
                        )}
                      </div>
                      
                      {item.status === 'success' && item.record ? (
                        <div className="space-y-1">
                          <p className="text-lg font-mono font-black text-slate-900 dark:text-white uppercase truncate tracking-tighter">
                            {item.record.plate || item.record.vin.slice(-8)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {item.record.make} {item.record.model} • {item.record.color}
                          </p>
                        </div>
                      ) : item.status === 'error' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {getErrorIcon(item.errorType)}
                            <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">{item.errorType || 'Fault'}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium italic truncate">{item.error}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                           <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4 animate-pulse" />
                           <div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded-full w-1/2 animate-pulse" />
                        </div>
                      )}
                    </div>

                    {!isProcessing && (
                      <button 
                        onClick={() => removeSubmitedItem(item.id)}
                        className="p-2 self-start text-slate-300 hover:text-red-500 active:scale-90 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {items.length > 0 && (
        <footer className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex gap-3">
            {stats.failed > 0 && !isProcessing && (
              <button 
                onClick={retryFailed}
                className="flex-1 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-500 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-amber-500/5"
              >
                <RefreshCw size={14} /> Retry Failed ({stats.failed})
              </button>
            )}
            
            <button 
              onClick={finalize}
              disabled={stats.successful === 0 || isProcessing}
              className={`flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-2xl shadow-blue-600/30 active:scale-95 transition-all ${stats.failed > 0 && 'flex-[1.5]'}`}
            >
              <span>Verify {stats.successful} Records</span>
              <ChevronRight size={18} />
            </button>
          </div>
          
          {isProcessing && (
            <div className="flex items-center justify-center gap-3 text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] animate-pulse">
              <Activity size={14} /> Neural Grid Sync in Progress
            </div>
          )}
        </footer>
      )}
      
      <input 
        type="file" 
        multiple 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
      />
    </div>
  );
};

export default BulkUpload;

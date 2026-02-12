
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { 
  Camera, X, Zap, CheckCircle2, ShieldAlert, ScanLine, Image as ImageIcon, 
  ShieldCheck, Focus, ArrowRight, Check, Loader2, Layers, Plus, 
  Upload, Cloud, AlertCircle, Info, CarFront, Box, MapPin, 
  Fingerprint, CreditCard, XCircle, Activity, Trash2, Copy, 
  ChevronDown, Library, Images, Terminal, Landmark, Database,
  UploadCloud, Play, CheckCircle, AlertTriangle, Search, Pencil, Type, RefreshCw,
  ChevronRight, ChevronUp, Cpu, Globe, Siren
} from 'lucide-react';
import { analyzeVehicleImage, getVehicleAppraisal, checkStolenStatus, ScanResult } from '../services/geminiService';
import { decodeVin, getVinReasoning, VinReasoning } from '../services/nhtsaService';
import { validateVIN } from '../utils/vinValidator';
import { openDrivePicker, downloadDriveFileAsBase64, openPhotosPicker, DriveFile } from '../services/googleDriveService';
import { VehicleRecord, AssetPhoto, VehicleCategory, LogoReference } from '../types';
import HandwritingInput from './HandwritingInput';

interface ScannerProps {
  onScanComplete: (record: Partial<VehicleRecord> | Partial<VehicleRecord>[], photos: AssetPhoto[] | AssetPhoto[][]) => void;
  onCancel: () => void;
}

interface BatchItem {
  id: string;
  name: string;
  url: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  result?: ScanResult & { marketValue?: number, marketValueConfidence?: number, vinReasoning?: VinReasoning };
  error?: {
    type: 'FILE_IO' | 'NEURAL_LINK' | 'INTEL_SYNC' | 'UNKNOWN';
    msg: string;
  };
  file?: File;
  driveFile?: DriveFile;
  plateValid?: boolean;
  vinValid?: boolean;
  correctedFields?: Set<string>;
}

const PHOTO_STEPS = [
  { id: 'Front', label: 'Front Angle' },
  { id: 'Back', label: 'Rear Angle' },
  { id: 'Left', label: 'Left Side' },
  { id: 'Right', label: 'Right Side' },
  { id: 'VIN', label: 'VIN Tag/Plate' },
  { id: 'Windshield', label: 'Windshield / Notification' }
];

interface LogEntry {
  time: string;
  msg: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'neural' | 'archive' | 'database' | 'security';
}

const Scanner: React.FC<ScannerProps> = ({ onScanComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [scannerMode, setScannerMode] = useState<'guided' | 'bulk'>('guided');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState<-1 | number>(-1); 
  const [capturedPhotos, setCapturedPhotos] = useState<AssetPhoto[]>([]);
  
  const [scanResult, setScanResult] = useState<(ScanResult & { 
    vinData?: Record<string, string>, 
    marketValue?: number, 
    marketValueConfidence?: number, 
    vinReasoning?: VinReasoning,
    plateValid?: boolean,
    stolenCheckResult?: { isStolen: boolean, details: string, timestamp: string, sources: { title: string, uri: string }[] }
  }) | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [customLogos, setCustomLogos] = useState<LogoReference[]>([]);

  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  useEffect(() => {
    if (scannerMode === 'guided') startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [scannerMode]);

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }].slice(-20));
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
      if (capabilities.torch) setHasTorch(true);
    } catch (err) { console.warn("Camera init failed:", err); }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch (e) { console.error("Torch failed", e); }
  };

  const capturePhoto = (label: string): AssetPhoto | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    return { url: canvas.toDataURL('image/jpeg', 0.8), label, timestamp: new Date().toISOString() };
  };

  const handleAssetIdentification = async () => {
    const photo = capturePhoto('Identification Frame');
    if (!photo) return;
    setIsAnalyzing(true);
    setLogs([]);
    addLog("Tactical Uplink Initialized.", "info");
    try {
      const base64 = photo.url.split(',')[1];
      const result = await analyzeVehicleImage(base64, 'plate', customLogos);
      addLog(`Visual Hit: ${result.make} ${result.model} detected.`, "success");

      const plateValid = !!(result.plate && result.plate.length > 3 && result.plate !== 'Unknown');

      addLog("Syncing Market Appraisal Data...", "neural");
      const appraisal = await getVehicleAppraisal(result.year, result.make, result.model);
      addLog(`Appraisal Locked: $${appraisal.value.toLocaleString()} (${(appraisal.confidence * 100).toFixed(0)}% accuracy)`, "success");

      let vinData = undefined;
      let vinReasoning = undefined;
      let stolenResult = undefined;

      if (result.vin && result.vin !== 'Unknown' && result.vin !== 'Not Scanned') {
        addLog("Initiating VIN Reasoner...", "database");
        vinReasoning = await getVinReasoning(result.vin);
        if (vinReasoning.isValid) {
          addLog("VIN Checksum Passed.", "success");
        } else {
          addLog("VIN Checksum Mismatch detected.", "warn");
        }
        
        addLog("Querying NICB/CPIC Global Indices...", "security");
        stolenResult = await checkStolenStatus(result.vin);
        if (stolenResult.isStolen) {
          addLog("CRITICAL: THEFT RECORD DETECTED.", "error");
          result.category = VehicleCategory.STOLEN;
        } else {
          addLog("No active theft record found.", "success");
        }

        const decoded = await decodeVin(result.vin);
        if (decoded) vinData = decoded;
      }

      setScanResult({ 
        ...result, 
        vinData, 
        vinReasoning,
        stolenCheckResult: stolenResult,
        marketValue: appraisal.value, 
        marketValueConfidence: appraisal.confidence,
        plateValid
      });
      setCapturedPhotos([photo]);
      setCurrentStep(0); 
    } catch (err) {
      addLog("Neural protocol failure.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStepCapture = () => {
    const step = PHOTO_STEPS[currentStep as number];
    const photo = capturePhoto(step.label);
    if (!photo) return;
    setCapturedPhotos(prev => [...prev, photo]);
    if (currentStep < PHOTO_STEPS.length - 1) setCurrentStep(prev => (prev as number) + 1);
    else setCurrentStep(PHOTO_STEPS.length); 
  };

  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newItems: BatchItem[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      url: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
      file,
      correctedFields: new Set()
    }));
    setBatchItems(prev => [...prev, ...newItems]);
  };

  const processBatchItem = async (itemId: string) => {
    const item = batchItems.find(i => i.id === itemId);
    if (!item || item.status === 'success') return;
    
    setBatchItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'processing', progress: 10 } : i));
    
    try {
      let base64 = '';
      try {
        if (item.file) {
          base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = () => reject(new Error('Buffer access failure'));
            reader.readAsDataURL(item.file!);
          });
        } else if (item.driveFile) {
          base64 = await downloadDriveFileAsBase64(item.driveFile);
        }
      } catch (ioErr) {
        throw { type: 'FILE_IO', msg: 'Local storage access fault' };
      }

      let result;
      try {
        result = await analyzeVehicleImage(base64, 'plate', customLogos);
      } catch (apiErr) {
        throw { type: 'NEURAL_LINK', msg: 'Pattern recognition timeout' };
      }

      let appraisal = undefined;
      let vinReasoning = undefined;
      
      try {
        const [appRes, vinRes] = await Promise.all([
          getVehicleAppraisal(result.year, result.make, result.model).catch(() => null),
          (result.vin && result.vin !== 'Unknown' && result.vin !== 'Not Scanned') 
            ? getVinReasoning(result.vin).catch(() => null)
            : Promise.resolve(undefined)
        ]);
        appraisal = appRes;
        vinReasoning = vinRes;
      } catch (intelErr) {
        // Non-critical failures
        console.warn("Intel stream sync failure for item", itemId);
      }

      const plateValid = !!(result.plate && result.plate.length > 3 && result.plate !== 'Unknown');
      const vinValid = vinReasoning?.isValid;

      setBatchItems(prev => prev.map(i => i.id === itemId ? { 
        ...i, 
        status: 'success', 
        progress: 100, 
        plateValid,
        vinValid,
        result: { ...result, marketValue: appraisal?.value, marketValueConfidence: appraisal?.confidence, vinReasoning }
      } : i));
    } catch (err: any) {
      setBatchItems(prev => prev.map(i => i.id === itemId ? { 
        ...i, 
        status: 'error', 
        error: { 
          type: err.type || 'UNKNOWN', 
          msg: err.msg || 'Operational fault' 
        } 
      } : i));
    }
  };

  const startBatchAnalysis = async () => {
    setIsBatchRunning(true);
    const pending = batchItems.filter(i => i.status === 'pending');
    
    // CONCURRENT PROCESSING BLOCK
    // Process all items in parallel to saturate the neural uplink
    await Promise.all(pending.map(item => processBatchItem(item.id)));
    
    setIsBatchRunning(false);
  };

  const handleFinalizeBatch = () => {
    const successful = batchItems.filter(i => i.status === 'success' && i.result);
    const records = successful.map(i => ({
      ...i.result,
      timestamp: new Date().toISOString(),
      photos: [{ url: i.url, label: 'Identification Frame', timestamp: new Date().toISOString() }]
    }));
    onScanComplete(records as any[], successful.map(() => []));
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-[70] flex flex-col bg-slate-950/80 backdrop-blur-xl border-b border-slate-900">
        <div className="flex items-center justify-between p-4 pt-8">
          <h2 className="text-white font-black flex items-center gap-2 uppercase tracking-widest text-[10px]">
            <ScanLine size={14} className="text-blue-500" /> Tactical Scan Hub
          </h2>
          <button onClick={onCancel} className="p-2 bg-slate-800/80 rounded-lg text-slate-300"><X size={18} /></button>
        </div>
        <div className="flex p-1 mx-4 mb-4 bg-slate-900 rounded-xl border border-slate-800">
          <button onClick={() => setScannerMode('guided')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${scannerMode === 'guided' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Guided</button>
          <button onClick={() => setScannerMode('bulk')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${scannerMode === 'bulk' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Batch</button>
        </div>
      </div>

      {scannerMode === 'guided' && (
        <div className="relative flex-1 bg-black overflow-hidden flex flex-col">
          {currentStep <= PHOTO_STEPS.length - 1 ? (
            <>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-36 left-4 right-4 h-24 bg-black/40 backdrop-blur-md rounded-2xl border border-slate-800/50 p-3 overflow-y-auto no-scrollbar font-mono">
                {logs.map((log, i) => (
                  <div key={i} className={`text-[8px] leading-tight mb-1 flex gap-2 ${
                    log.type === 'success' ? 'text-emerald-400' : 
                    log.type === 'warn' ? 'text-amber-400' : 
                    log.type === 'error' ? 'text-red-500' :
                    log.type === 'security' ? 'text-blue-400' : 'text-slate-400'
                  }`}>
                    <span>[{log.time}]</span> {log.msg}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 bg-slate-950 p-6 pt-32 overflow-y-auto no-scrollbar z-[70] space-y-6">
              <div className="text-center mb-8">
                {scanResult?.stolenCheckResult?.isStolen ? (
                  <Siren className="text-red-500 mx-auto mb-4 animate-pulse" size={48} />
                ) : (
                  <ShieldCheck className="text-blue-500 mx-auto mb-4" size={48} />
                )}
                <h3 className={`text-white font-black text-2xl uppercase tracking-tighter ${scanResult?.stolenCheckResult?.isStolen ? 'text-red-500' : ''}`}>
                  {scanResult?.stolenCheckResult?.isStolen ? 'Theft Hit Detected' : 'Signature Verified'}
                </h3>
              </div>

              {scanResult?.stolenCheckResult?.isStolen && (
                <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-3xl flex flex-col gap-2">
                   <div className="flex items-center gap-2 text-red-500">
                     <AlertTriangle size={16} />
                     <span className="text-[10px] font-black uppercase">Critical Security Alert</span>
                   </div>
                   <p className="text-[11px] text-white font-medium leading-relaxed italic">{scanResult.stolenCheckResult.details}</p>
                </div>
              )}

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Grid ID Signature</p>
                <div className="flex items-center justify-between">
                   <p className="text-white font-mono font-black text-2xl uppercase tracking-tight">{scanResult?.plate}</p>
                   {scanResult?.plateValid && <CheckCircle2 className="text-emerald-500" size={20} />}
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800">
                  <div>
                    <span className="text-[7px] font-black text-slate-500 uppercase">Appraisal</span>
                    <p className="text-[10px] font-black text-emerald-400">${scanResult?.marketValue?.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[7px] font-black text-slate-500 uppercase">Confidence</span>
                    <p className="text-[10px] font-black text-blue-400">{(scanResult?.marketValueConfidence! * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>

              {scanResult?.vinReasoning && (
                <div className={`p-5 rounded-3xl border ${scanResult.vinReasoning.isValid ? 'bg-blue-600/5 border-blue-500/20' : 'bg-amber-600/5 border-amber-500/20'}`}>
                   <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-blue-500">
                        <Cpu size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">VIN Intelligence</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${scanResult.vinReasoning.isValid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        Checksum: {scanResult.vinReasoning.checksumStatus}
                      </div>
                   </div>
                   
                   <p className="text-white font-mono text-xs mb-4 tracking-widest bg-slate-950 p-2 rounded-lg border border-slate-800">
                     {scanResult.vinReasoning.structure.wmi}
                     <span className="text-blue-500 opacity-50">{scanResult.vinReasoning.structure.vds}</span>
                     <span className="text-emerald-500">{scanResult.vinReasoning.structure.vis}</span>
                   </p>

                   {scanResult.vinReasoning.suggestions.length > 0 && (
                     <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <div className="flex items-center gap-2 text-amber-500 mb-1">
                          <AlertTriangle size={12} />
                          <span className="text-[8px] font-black uppercase">Suggested Correction</span>
                        </div>
                        <p className="text-[10px] font-mono font-bold text-white mb-2">{scanResult.vinReasoning.suggestions[0]}</p>
                        <button 
                          onClick={() => setScanResult(prev => prev ? { ...prev, vin: scanResult.vinReasoning!.suggestions[0] } : null)}
                          className="w-full py-1.5 bg-amber-600 text-white text-[8px] font-black uppercase rounded-lg active:scale-95"
                        >
                          Apply Correction
                        </button>
                     </div>
                   )}

                   <div className="grid grid-cols-2 gap-2">
                     <div className="space-y-1">
                        <span className="text-[7px] font-black text-slate-500 uppercase">WMI Origin</span>
                        <p className="text-[9px] font-bold text-slate-300 uppercase truncate">{scanResult.vinReasoning.manufacturingIntel.country || 'N/A'}</p>
                     </div>
                     <div className="space-y-1">
                        <span className="text-[7px] font-black text-slate-500 uppercase">Model Year</span>
                        <p className="text-[9px] font-bold text-slate-300 uppercase">{scanResult.vinReasoning.manufacturingIntel.modelYear || scanResult.year}</p>
                     </div>
                   </div>
                </div>
              )}

              <button onClick={() => onScanComplete(scanResult as any, capturedPhotos)} className={`w-full py-5 text-white font-black rounded-[2rem] uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all ${scanResult?.stolenCheckResult?.isStolen ? 'bg-red-600 shadow-red-600/20' : 'bg-blue-600 shadow-blue-600/20'}`}>
                Commit Asset
              </button>
            </div>
          )}
          {currentStep < PHOTO_STEPS.length && (
            <div className="bg-slate-900 pt-6 pb-safe px-6 flex justify-center items-center gap-10 border-t border-slate-800 z-50 mt-auto">
              <button onClick={onCancel} className="p-4 rounded-full bg-slate-800 text-slate-500"><X size={24} /></button>
              <button onClick={currentStep === -1 ? handleAssetIdentification : handleStepCapture} disabled={isAnalyzing} className="w-24 h-24 rounded-full border-4 border-slate-800 p-1 bg-slate-900">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  {isAnalyzing ? <Loader2 className="text-blue-600 animate-spin" size={32} /> : <Camera size={32} className="text-blue-600" />}
                </div>
              </button>
              <button onClick={toggleTorch} disabled={!hasTorch} className={`p-4 rounded-full ${torchOn ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-500'}`}><Zap size={24} /></button>
            </div>
          )}
        </div>
      )}

      {scannerMode === 'bulk' && (
        <div className="flex-1 bg-slate-950 flex flex-col pt-32 overflow-hidden">
          <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-40">
            {batchItems.length === 0 ? (
              <div onClick={() => fileInputRef.current?.click()} className="h-80 border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-blue-500">
                <UploadCloud className="text-slate-700" size={56} />
                <p className="text-white font-black uppercase tracking-tighter text-xl">Ingest Batch</p>
              </div>
            ) : (
              batchItems.map(item => (
                <div key={item.id} className={`bg-slate-900 border rounded-3xl p-4 flex gap-4 items-center transition-all ${
                  item.status === 'success' ? (item.result?.vinReasoning?.isValid ? 'border-slate-800' : 'border-amber-500/30 bg-amber-500/5') : 
                  item.status === 'error' ? 'border-red-500/50 bg-red-500/10' :
                  'border-slate-800'
                }`}>
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-800 flex-shrink-0">
                    <img src={item.url} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-black text-white uppercase truncate">{item.status === 'success' ? item.result?.plate : item.name}</p>
                      {item.status === 'success' && (
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-tighter ml-2">{item.result?.year} {item.result?.make} {item.result?.model}</p>
                      )}
                    </div>
                    
                    {item.status === 'success' && (
                      <div className="flex flex-col gap-1 mt-1">
                        <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Appraised: ${item.result?.marketValue?.toLocaleString()}</p>
                        {item.result?.vinReasoning && !item.result.vinReasoning.isValid && (
                          <div className="flex items-center gap-1 text-amber-500 text-[7px] font-black uppercase">
                            <AlertTriangle size={8} /> VIN Checksum Fail
                          </div>
                        )}
                      </div>
                    )}

                    {item.status === 'error' && (
                      <div className="flex items-start gap-1 text-red-400 text-[8px] font-black uppercase mt-1 leading-tight">
                        <AlertCircle size={10} className="shrink-0" /> 
                        <span>{item.error?.type}: {item.error?.msg}</span>
                      </div>
                    )}

                    {item.status === 'processing' && (
                      <div className="flex items-center gap-2 mt-2">
                        <Loader2 className="animate-spin text-blue-500" size={14} />
                        <span className="text-[7px] font-black text-blue-500 uppercase tracking-[0.2em]">Neural Uplink...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </main>
          {batchItems.length > 0 && (
            <footer className="fixed bottom-0 left-0 right-0 p-6 border-t border-slate-900 bg-slate-950/95 flex flex-col gap-4 z-50">
              <div className="flex gap-3">
                <button 
                  onClick={startBatchAnalysis} 
                  disabled={isBatchRunning || batchItems.every(i => i.status === 'success')} 
                  className="flex-1 bg-slate-800 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {isBatchRunning ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" className="text-blue-500" />}
                  {isBatchRunning ? 'Parallel Sync...' : 'Execute Parallel Map'}
                </button>
                <button 
                  onClick={handleFinalizeBatch} 
                  disabled={isBatchRunning || !batchItems.some(i => i.status === 'success')} 
                  className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50 transition-all"
                >
                  Commit Successes
                </button>
              </div>
              {isBatchRunning && (
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 animate-[progress_2s_ease-in-out_infinite]" style={{ width: '40%' }} />
                </div>
              )}
            </footer>
          )}
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleBulkFileSelect} accept="image/*" />
    </div>
  );
};

export default Scanner;

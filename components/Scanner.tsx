
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { 
  Camera, X, Zap, CheckCircle2, ShieldAlert, ScanLine, Image as ImageIcon, 
  ShieldCheck, Focus, ArrowRight, Check, Loader2, Layers, Plus, 
  Upload, Cloud, AlertCircle, Info, CarFront, Box, MapPin, 
  Fingerprint, CreditCard, XCircle, Activity, Trash2, Copy, 
  ChevronDown, Library, Images, Terminal, Landmark, Database,
  UploadCloud, Play, CheckCircle, AlertTriangle, Search, Pencil, Type, RefreshCw,
  ChevronRight, ChevronUp, Cpu, Globe, Siren, ExternalLink, ShieldX, Factory, MapPinned, Calendar,
  Edit2, AlertOctagon, BrainCircuit
} from 'lucide-react';
import { analyzeVehicleImage, getVehicleAppraisal, checkStolenStatus, ScanResult, StolenCheckResult } from '../services/geminiService';
import { decodeVin, getVinReasoning, VinReasoning } from '../services/nhtsaService';
import { validateVIN } from '../utils/vinValidator';
import { openDrivePicker, downloadDriveFileAsBase64, openPhotosPicker, DriveFile } from '../services/googleDriveService';
import { VehicleRecord, AssetPhoto, VehicleCategory, LogoReference } from '../types';
import HandwritingInput from './HandwritingInput';

// REPAIR: Updated ScannerProps to support batch completion with AssetPhoto[][]
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
  result?: ScanResult & { 
    marketValue?: number, 
    marketValueConfidence?: number, 
    vinReasoning?: VinReasoning,
    stolenCheckResult?: StolenCheckResult,
    vinData?: Record<string, string>
  };
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
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [currentStep, setCurrentStep] = useState<-1 | number>(-1); 
  const [capturedPhotos, setCapturedPhotos] = useState<AssetPhoto[]>([]);
  const [shutterFlash, setShutterFlash] = useState(false);
  
  const [scanResult, setScanResult] = useState<(ScanResult & { 
    vinData?: Record<string, string>, 
    marketValue?: number, 
    marketValueConfidence?: number, 
    vinReasoning?: VinReasoning,
    plateValid?: boolean,
    stolenCheckResult?: StolenCheckResult
  }) | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [customLogos, setCustomLogos] = useState<LogoReference[]>([]);

  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [isBulkCameraActive, setIsBulkCameraActive] = useState(false);

  const [isManualVinMode, setIsManualVinMode] = useState(false);
  const [manualVinValue, setManualVinValue] = useState('');
  const [isUpdatingManualVin, setIsUpdatingManualVin] = useState(false);

  useEffect(() => {
    if (scannerMode === 'guided' || isBulkCameraActive) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [scannerMode, isBulkCameraActive]);

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }].slice(-20));
  };

  const triggerShutter = () => {
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 150);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', 
          width: { ideal: 3840 }, 
          height: { ideal: 2160 },
          frameRate: { ideal: 30 }
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
      if (capabilities.torch) setHasTorch(true);
      
      const settings = track.getSettings();
      addLog(`Optics Online: ${settings.width}x${settings.height} sensor detected.`, "info");
    } catch (err) { 
      console.warn("Camera init failed:", err);
      addLog("Camera access denied or unavailable.", "error");
    }
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
    triggerShutter();
    return { url: canvas.toDataURL('image/jpeg', 0.95), label, timestamp: new Date().toISOString() };
  };

  const handleAssetIdentification = async () => {
    const photo = capturePhoto('Identification Frame');
    if (!photo) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress(5);
    setAnalysisStatus('Initializing Tactical Link...');
    setLogs([]);
    addLog("Tactical Uplink Initialized.", "info");
    
    try {
      const base64 = photo.url.split(',')[1];
      
      setAnalysisProgress(15);
      setAnalysisStatus('Executing Neural Vision...');
      const result = await analyzeVehicleImage(base64, 'plate', customLogos);
      
      setAnalysisProgress(40);
      setAnalysisStatus('Visual Match Verified...');
      addLog(`Visual Hit: ${result.make} ${result.model} detected.`, "success");

      const plateValid = !!(result.plate && result.plate.length > 3 && result.plate !== 'Unknown');

      setAnalysisProgress(50);
      setAnalysisStatus('Syncing Appraisal Data...');
      addLog("Syncing Market Appraisal Data...", "neural");
      const appraisal = await getVehicleAppraisal(result.year, result.make, result.model);
      addLog(`Appraisal Locked: $${appraisal.value.toLocaleString()} (${(appraisal.confidence * 100).toFixed(0)}% accuracy)`, "success");

      let vinData = undefined;
      let vinReasoning = undefined;
      let stolenResult = undefined;

      if (result.vin && result.vin !== 'Unknown' && result.vin !== 'Not Scanned') {
        setAnalysisProgress(65);
        setAnalysisStatus('Analyzing VIN Signature...');
        addLog("Initiating VIN Reasoner...", "database");
        vinReasoning = await getVinReasoning(result.vin);
        
        setAnalysisProgress(80);
        setAnalysisStatus('Querying Security Indices...');
        addLog("Querying Global Theft Indices...", "security");
        stolenResult = await checkStolenStatus(result.vin);
        
        if (stolenResult.isStolen) {
          addLog("CRITICAL: THEFT RECORD DETECTED.", "error");
          result.category = VehicleCategory.STOLEN;
        } else {
          addLog("No active theft record found.", "success");
        }

        setAnalysisProgress(95);
        setAnalysisStatus('Retrieving Build Manifest...');
        addLog("Retrieving Deep VIN Manifest...", "database");
        const decoded = await decodeVin(result.vin);
        if (decoded) {
            vinData = decoded;
            addLog(`Manufactured by ${decoded.Manufacturer || decoded.Make} in ${decoded.PlantCountry || 'Unknown Region'}.`, "success");
        }
      } else {
        setAnalysisProgress(85);
        setAnalysisStatus('Identification Fault: Manual Entry Required');
        addLog("VIN signature not detected. Manual entry required.", "warn");
      }

      setAnalysisProgress(100);
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
      setAnalysisProgress(0);
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

  const handleBulkCapture = () => {
    const photo = capturePhoto('Identification Frame');
    if (!photo) return;
    const newItem: BatchItem = {
      id: crypto.randomUUID(),
      name: `Asset_${new Date().toLocaleTimeString([], { hour12: false })}`,
      url: photo.url,
      status: 'pending',
      progress: 0,
      correctedFields: new Set()
    };
    setBatchItems(prev => [...prev, newItem]);
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
        } else if (item.url.startsWith('data:')) {
          base64 = item.url.split(',')[1];
        } else if (item.driveFile) {
          base64 = await downloadDriveFileAsBase64(item.driveFile);
        }
      } catch (ioErr) {
        throw { type: 'FILE_IO', msg: 'Local storage access fault' };
      }

      let result = await analyzeVehicleImage(base64, 'plate', customLogos);

      let appraisal = undefined;
      let vinReasoning = undefined;
      let stolenResult = undefined;
      let vinData = undefined;
      
      const hasVin = result.vin && result.vin !== 'Unknown' && result.vin !== 'Not Scanned';
      const [appRes, vinRes, stolenRes, decodeRes] = await Promise.all([
        getVehicleAppraisal(result.year, result.make, result.model).catch(() => null),
        hasVin ? getVinReasoning(result.vin).catch(() => null) : Promise.resolve(undefined),
        hasVin ? checkStolenStatus(result.vin).catch(() => null) : Promise.resolve(undefined),
        hasVin ? decodeVin(result.vin).catch(() => null) : Promise.resolve(undefined)
      ]);
      
      appraisal = appRes;
      vinReasoning = vinRes;
      stolenResult = stolenRes;
      vinData = decodeRes;

      if (stolenResult?.isStolen) {
        result.category = VehicleCategory.STOLEN;
      }

      const plateValid = !!(result.plate && result.plate.length > 3 && result.plate !== 'Unknown');
      const vinValid = vinReasoning?.isValid;

      setBatchItems(prev => prev.map(i => i.id === itemId ? { 
        ...i, 
        status: 'success', 
        progress: 100, 
        plateValid,
        vinValid,
        result: { 
          ...result, 
          marketValue: appraisal?.value, 
          marketValueConfidence: appraisal?.confidence, 
          vinReasoning,
          vinData,
          stolenCheckResult: stolenResult || undefined
        }
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
    await Promise.all(pending.map(item => processBatchItem(item.id)));
    setIsBatchRunning(false);
  };

  // REPAIR: Updated handleFinalizeBatch to correctly pass batch photos as AssetPhoto[][] for processing in App.tsx
  const handleFinalizeBatch = () => {
    const successful = batchItems.filter(i => i.status === 'success' && i.result);
    const records = successful.map(i => ({
      ...i.result,
      timestamp: new Date().toISOString(),
    }));
    
    const batchPhotos: AssetPhoto[][] = successful.map(i => [
      { url: i.url, label: 'Identification Frame', timestamp: new Date().toISOString() }
    ]);
    
    onScanComplete(records as any[], batchPhotos);
  };

  const handleManualVinUpdate = async () => {
    if (!manualVinValue || manualVinValue.length < 5 || !scanResult) return;
    setIsUpdatingManualVin(true);
    try {
      const vin = manualVinValue.toUpperCase();
      const [vinReasoning, stolenResult, vinData] = await Promise.all([
        getVinReasoning(vin).catch(() => undefined),
        checkStolenStatus(vin).catch(() => undefined),
        decodeVin(vin).catch(() => undefined)
      ]);

      const category = stolenResult?.isStolen ? VehicleCategory.STOLEN : scanResult.category;

      setScanResult({
        ...scanResult,
        vin,
        vinReasoning,
        stolenCheckResult: stolenResult,
        vinData,
        category
      });
      setIsManualVinMode(false);
      setManualVinValue('');
    } catch (e) {
      console.error("Manual VIN mapping fault", e);
    } finally {
      setIsUpdatingManualVin(false);
    }
  };

  const isStolen = scanResult?.stolenCheckResult?.isStolen;
  const isVinMissing = !scanResult?.vin || scanResult.vin === 'Unknown' || scanResult.vin === 'Not Scanned';

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col overflow-hidden transition-colors duration-500">
      {/* Shutter Flash Effect */}
      {shutterFlash && (
        <div className="fixed inset-0 z-[200] bg-white animate-out fade-out duration-150 pointer-events-none" />
      )}

      <div className="absolute top-0 left-0 right-0 z-[70] flex flex-col bg-slate-950/80 backdrop-blur-xl border-b border-slate-900">
        <div className="flex items-center justify-between p-4 pt-8">
          <h2 className="text-white font-black flex items-center gap-2 uppercase tracking-widest text-[10px]">
            <ScanLine size={14} className="text-blue-500" /> Tactical Scan Hub
          </h2>
          <button onClick={onCancel} className="p-2 bg-slate-800/80 rounded-lg text-slate-300"><X size={18} /></button>
        </div>
        <div className="flex p-1 mx-4 mb-4 bg-slate-900 rounded-xl border border-slate-800">
          <button onClick={() => { setScannerMode('guided'); setIsBulkCameraActive(false); }} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${scannerMode === 'guided' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Guided</button>
          <button onClick={() => setScannerMode('bulk')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${scannerMode === 'bulk' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Batch</button>
        </div>
      </div>

      {scannerMode === 'guided' && (
        <div className="relative flex-1 bg-black overflow-hidden flex flex-col">
          {currentStep <= PHOTO_STEPS.length - 1 ? (
            <>
              <div className="relative w-full h-full">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                {isAnalyzing && (
                  <div className="absolute inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                    <div className="w-full h-[2px] absolute top-0 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_linear_infinite]" />
                    
                    {/* Tactical Progress Ring */}
                    <div className="relative mb-8">
                      <svg className="w-32 h-32 rotate-[-90deg]">
                        <circle 
                          cx="64" cy="64" r="58" 
                          stroke="currentColor" strokeWidth="4" fill="transparent" 
                          className="text-slate-800"
                        />
                        <circle 
                          cx="64" cy="64" r="58" 
                          stroke="currentColor" strokeWidth="6" fill="transparent" 
                          strokeDasharray={364}
                          strokeDashoffset={364 - (364 * analysisProgress) / 100}
                          strokeLinecap="round"
                          className="text-blue-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <BrainCircuit className="text-blue-400 mb-1" size={24} />
                        <span className="text-white font-black text-lg tabular-nums">{analysisProgress}%</span>
                      </div>
                    </div>

                    <div className="space-y-4 max-w-xs">
                      <h3 className="text-white font-black text-xl uppercase tracking-tighter">{analysisStatus}</h3>
                      <p className="text-blue-400 font-mono text-[9px] uppercase tracking-[0.3em] animate-pulse">Running Neural Mapping Matrix...</p>
                      
                      {/* Detailed Progress Steps */}
                      <div className="flex justify-center gap-1.5 pt-2">
                        {[1, 2, 3, 4, 5].map((step) => (
                          <div 
                            key={step} 
                            className={`h-1 rounded-full transition-all duration-500 ${
                              analysisProgress >= step * 20 ? 'w-8 bg-blue-500' : 'w-4 bg-slate-800'
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {/* Viewfinder Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="w-64 h-32 border-2 border-white/20 rounded-2xl relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500 -translate-x-1 -translate-y-1" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500 translate-x-1 -translate-y-1" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500 -translate-x-1 translate-y-1" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500 translate-x-1 translate-y-1" />
                   </div>
                </div>
              </div>
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
            <div className={`absolute inset-0 p-6 pt-32 overflow-y-auto no-scrollbar z-[70] space-y-6 transition-all duration-700 ${isStolen ? 'bg-red-950/95 ring-inset ring-[12px] ring-red-600 animate-pulse-slow' : 'bg-slate-950'}`}>
              
              {isStolen && (
                <div className="bg-red-600 text-white p-4 rounded-2xl text-center shadow-2xl animate-bounce mb-2">
                   <p className="text-[14px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                     <Siren size={20} /> STOLEN ASSET FLAG <Siren size={20} />
                   </p>
                </div>
              )}

              <div className="text-center mb-8">
                {isStolen ? (
                  <ShieldX className="text-red-500 mx-auto mb-4 animate-pulse" size={64} />
                ) : (
                  <ShieldCheck className="text-blue-500 mx-auto mb-4" size={48} />
                )}
                <h3 className={`text-white font-black text-2xl uppercase tracking-tighter ${isStolen ? 'text-red-500' : ''}`}>
                  {isStolen ? 'Theft Index Hit' : 'Signature Verified'}
                </h3>
              </div>

              {isStolen && (
                <div className="bg-red-600 border border-red-400 p-5 rounded-3xl flex flex-col gap-4 shadow-2xl">
                   <div className="flex items-center gap-2 text-white">
                     <AlertTriangle size={18} />
                     <span className="text-[12px] font-black uppercase tracking-widest">CRITICAL INTELLIGENCE ALERT</span>
                   </div>
                   <p className="text-[12px] text-white font-black leading-relaxed italic uppercase">{scanResult?.stolenCheckResult?.details}</p>
                </div>
              )}

              {isVinMissing && !isManualVinMode && (
                <div className="bg-amber-600/10 border border-amber-600/30 p-5 rounded-3xl space-y-4 animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-3 text-amber-500">
                    <AlertOctagon size={24} />
                    <div className="flex-1">
                      <p className="text-xs font-black uppercase tracking-widest">VIN Signature Missing</p>
                      <p className="text-[10px] font-bold opacity-80 uppercase">Identification through optics failed. Manual input required for grid sync.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsManualVinMode(true)}
                    className="w-full py-3 bg-amber-600 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all"
                  >
                    Initiate Manual VIN Entry
                  </button>
                </div>
              )}

              {isManualVinMode && (
                <div className="bg-slate-900 border border-blue-500/50 p-6 rounded-[2.5rem] space-y-5 shadow-2xl animate-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                      <Edit2 size={16} /> Manual Protocol
                    </h4>
                    <button onClick={() => setIsManualVinMode(false)} className="text-slate-500"><X size={16} /></button>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-500 uppercase px-1">Physical VIN Tag Signature</label>
                    <input 
                      type="text" 
                      value={manualVinValue}
                      onChange={e => setManualVinValue(e.target.value.toUpperCase())}
                      placeholder="ENTER 17-CHAR VIN..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-sm font-black text-white outline-none focus:border-blue-500 transition-all font-mono tracking-widest"
                    />
                  </div>

                  <button 
                    onClick={handleManualVinUpdate}
                    disabled={isUpdatingManualVin || manualVinValue.length < 5}
                    className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl"
                  >
                    {isUpdatingManualVin ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} fill="currentColor" />}
                    {isUpdatingManualVin ? 'Syncing...' : 'Lock Signature'}
                  </button>
                </div>
              )}

              <div className={`bg-slate-900 border p-5 rounded-3xl transition-all shadow-2xl ${isStolen ? 'border-red-600' : 'border-slate-800'}`}>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Grid ID Signature</p>
                <div className="flex items-center justify-between">
                   <p className={`font-mono font-black text-2xl uppercase tracking-tight ${isStolen ? 'text-red-500' : 'text-white'}`}>{scanResult?.plate}</p>
                   {scanResult?.plateValid && !isStolen && <CheckCircle2 className="text-emerald-500" size={20} />}
                   {isStolen && <Siren className="text-red-500 animate-pulse" size={20} />}
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

              {/* Decoded VIN Intelligence Card */}
              {(scanResult?.vinData || scanResult?.vinReasoning?.manufacturingIntel) && (
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-2xl space-y-4">
                  <div className="flex items-center gap-2 text-blue-500">
                    <Database size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Manufacturing Intelligence</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { 
                        label: 'Manufacturer', 
                        value: scanResult?.vinData?.Manufacturer || scanResult?.vinReasoning?.manufacturingIntel.manufacturer, 
                        icon: Factory 
                      },
                      { 
                        label: 'Origin', 
                        value: scanResult?.vinData?.PlantCountry || scanResult?.vinReasoning?.manufacturingIntel.country, 
                        icon: Globe 
                      },
                      { 
                        label: 'Model Year', 
                        value: scanResult?.vinData?.ModelYear || scanResult?.vinReasoning?.manufacturingIntel.modelYear, 
                        icon: Calendar 
                      },
                      { 
                        label: 'Body Class', 
                        value: scanResult?.vinData?.BodyClass || scanResult?.shape, 
                        icon: Box 
                      },
                      { 
                        label: 'Production Plant', 
                        value: scanResult?.vinData?.PlantCity || scanResult?.vinReasoning?.manufacturingIntel.plant, 
                        icon: MapPinned 
                      },
                      { 
                        label: 'Drive Type', 
                        value: scanResult?.vinData?.DriveType, 
                        icon: Zap 
                      }
                    ].filter(item => item.value && item.value !== 'Unknown').map((item, idx) => (
                      <div key={idx} className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 flex items-start gap-2.5">
                        <item.icon size={14} className="text-slate-600 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[7px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">{item.label}</p>
                          <p className="text-[10px] font-bold text-slate-300 uppercase truncate">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {scanResult?.vinReasoning && (
                <div className={`p-5 rounded-3xl border ${scanResult.vinReasoning.isValid ? 'bg-blue-600/5 border-blue-500/20' : 'bg-amber-600/5 border-amber-500/20'}`}>
                   <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-blue-500">
                        <Cpu size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">VIN Logic</span>
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
                </div>
              )}

              <button onClick={() => onScanComplete(scanResult as any, capturedPhotos)} className={`w-full py-5 text-white font-black rounded-[2rem] uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all ${isStolen ? 'bg-red-600 shadow-red-600/40' : 'bg-blue-600 shadow-blue-600/20'}`}>
                {isStolen ? 'Escalate & Commit' : 'Commit Asset'}
              </button>
            </div>
          )}
          {currentStep < PHOTO_STEPS.length && (
            <div className="bg-slate-900 pt-6 pb-safe px-6 flex justify-center items-center gap-10 border-t border-slate-800 z-50 mt-auto">
              <button onClick={onCancel} className="p-4 rounded-full bg-slate-800 text-slate-500 active:scale-90"><X size={24} /></button>
              <button onClick={currentStep === -1 ? handleAssetIdentification : handleStepCapture} disabled={isAnalyzing} className="w-24 h-24 rounded-full border-4 border-slate-800 p-1 bg-slate-900">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center active:scale-90 transition-all">
                  {isAnalyzing ? <Loader2 className="text-blue-600 animate-spin" size={32} /> : <Camera size={32} className="text-blue-600" />}
                </div>
              </button>
              <button onClick={toggleTorch} disabled={!hasTorch} className={`p-4 rounded-full active:scale-90 ${torchOn ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-500'}`}><Zap size={24} /></button>
            </div>
          )}
        </div>
      )}

      {scannerMode === 'bulk' && (
        <div className="flex-1 bg-slate-950 flex flex-col pt-32 overflow-hidden">
          {isBulkCameraActive ? (
            <div className="relative flex-1 bg-black flex flex-col">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute top-4 left-6 px-4 py-2 bg-blue-600/80 backdrop-blur rounded-full text-white text-[10px] font-black uppercase tracking-widest shadow-xl">
                 Queue: {batchItems.length} Assets
              </div>
              <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8 px-6">
                <button onClick={() => setIsBulkCameraActive(false)} className="p-4 bg-slate-800 rounded-full text-white active:scale-90"><Check size={24} /></button>
                <button onClick={handleBulkCapture} className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-blue-600 border-4 border-blue-500/20 active:scale-90 shadow-2xl transition-all">
                  <Camera size={40} />
                </button>
                <button onClick={toggleTorch} disabled={!hasTorch} className={`p-4 rounded-full active:scale-90 ${torchOn ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300'}`}><Zap size={24} /></button>
              </div>
            </div>
          ) : (
            <>
              <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-40">
                {batchItems.length === 0 ? (
                  <div className="space-y-4">
                    <div onClick={() => setIsBulkCameraActive(true)} className="h-60 border-2 border-dashed border-blue-800 bg-blue-900/10 rounded-[3rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500 active:scale-[0.98] transition-all">
                      <Camera className="text-blue-500" size={48} />
                      <p className="text-white font-black uppercase tracking-tighter text-lg">Capture Assets</p>
                      <p className="text-[10px] text-blue-400/60 uppercase font-black tracking-widest">Continuous Documentation Lens</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {batchItems.map(item => (
                      <div key={item.id} className={`bg-slate-900 border rounded-3xl p-4 flex gap-4 items-center transition-all ${
                        item.status === 'success' ? (item.result?.stolenCheckResult?.isStolen ? 'border-red-600 bg-red-600/10' : item.result?.vinReasoning?.isValid ? 'border-slate-800' : 'border-amber-500/30 bg-amber-500/5') : 
                        item.status === 'error' ? 'border-red-500/50 bg-red-500/10' :
                        'border-slate-800'
                      }`}>
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-800 flex-shrink-0 relative">
                          <img src={item.url} className="w-full h-full object-cover" />
                          {item.result?.stolenCheckResult?.isStolen && (
                            <div className="absolute top-0 right-0 p-1 bg-red-600 text-white"><ShieldAlert size={10} /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <p className={`text-xs font-black uppercase truncate ${item.result?.stolenCheckResult?.isStolen ? 'text-red-500' : 'text-white'}`}>{item.status === 'success' ? item.result?.plate : item.name}</p>
                            {item.status === 'success' && (
                              <p className="text-[10px] font-black text-blue-500 uppercase tracking-tighter ml-2">{item.result?.year} {item.result?.make} {item.result?.model}</p>
                            )}
                          </div>
                          
                          {item.status === 'success' && (
                            <div className="flex flex-col gap-1 mt-1">
                              <div className="flex items-center gap-2">
                                 <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Appraised: ${item.result?.marketValue?.toLocaleString()}</p>
                                 {item.result?.stolenCheckResult?.isStolen && (
                                   <span className="px-1.5 py-0.5 bg-red-600 text-white text-[6px] font-black uppercase rounded animate-pulse">CRITICAL: STOLEN</span>
                                 )}
                              </div>
                              {item.result?.vinData?.Manufacturer && (
                                <p className="text-[7px] font-black text-slate-500 uppercase truncate">Build: {item.result.vinData.Manufacturer} ({item.result.vinData.PlantCountry})</p>
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
                        <button onClick={() => setBatchItems(prev => prev.filter(i => i.id !== item.id))} className="text-slate-700 hover:text-red-500 active:scale-90"><Trash2 size={16} /></button>
                      </div>
                    ))}
                    <button onClick={() => setIsBulkCameraActive(true)} className="w-full py-4 border-2 border-dashed border-slate-800 rounded-3xl flex items-center justify-center gap-2 text-slate-600 hover:text-blue-500 transition-colors active:scale-[0.98]">
                      <Plus size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Append Capture</span>
                    </button>
                  </div>
                )}
              </main>
              {batchItems.length > 0 && (
                <footer className="fixed bottom-0 left-0 right-0 p-6 border-t border-slate-900 bg-slate-950/95 flex flex-col gap-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
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
                      className="flex-[1.5] bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50 transition-all"
                    >
                      Commit Successes
                    </button>
                  </div>
                </footer>
              )}
            </>
          )}
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleBulkFileSelect} accept="image/*" />
    </div>
  );
};

export default Scanner;

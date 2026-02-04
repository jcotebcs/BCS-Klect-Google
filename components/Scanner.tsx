
import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, AlertCircle, X, Zap, ScanText, CarFront, UserPlus, Info, AlertTriangle, UploadCloud, FileType, CheckCircle2, XCircle, ChevronRight, FileText, Send, ShieldCheck, Hash, Layers, Target, Palette, Image as ImageIcon, Focus, Database, Wand2, TrendingUp, CreditCard, Disc, Box } from 'lucide-react';
import { analyzeVehicleImage, ScanResult, detectTargetType } from '../services/geminiService';
import { VehicleRecord, VehicleCategory } from '../types';
import HandwritingInput from './HandwritingInput';

interface ScannerProps {
  onScanComplete: (record: VehicleRecord) => void;
  onBulkComplete: (records: VehicleRecord[]) => void;
  onCancel: () => void;
  onSwitchToPerson: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScanComplete, onBulkComplete, onCancel, onSwitchToPerson }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<{result: ScanResult, photo: string} | null>(null);
  const [manualNote, setManualNote] = useState('');
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanMode, setScanMode] = useState<'plate' | 'vin'>('plate');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const [showSwitchPrompt, setShowSwitchPrompt] = useState(false);
  const [detectedMode, setDetectedMode] = useState<'plate' | 'vin' | 'none'>('none');
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const detectionLockedRef = useRef(false);

  useEffect(() => {
    const start = async () => {
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
      } catch (err) {
        console.warn("Camera init failed:", err);
      }
    };
    start();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => {
    let interval: any;
    if (!isAnalyzing && !pendingRecord && !showSwitchPrompt) {
      interval = setInterval(async () => {
        if (detectionLockedRef.current || !videoRef.current || !canvasRef.current) return;
        
        try {
          detectionLockedRef.current = true;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = 480;
          canvas.height = 270;
          canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const lowResData = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
          const result = await detectTargetType(lowResData);
          
          if (result.type !== 'none' && result.type !== scanMode && result.confidence > 0.6) {
            setDetectedMode(result.type);
            setDetectionConfidence(result.confidence);
            setShowSwitchPrompt(true);
          }
        } catch (e) {
          console.error("Detection loop error", e);
        } finally {
          detectionLockedRef.current = false;
        }
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, pendingRecord, showSwitchPrompt, scanMode]);

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch (e) {
      console.error("Torch toggle failed", e);
    }
  };

  const processImage = async (base64: string, sourceImage: string) => {
    try {
      const result = await analyzeVehicleImage(base64, scanMode);
      setPendingRecord({ result, photo: sourceImage });
      setManualNote(`Subject ${result.color} ${result.make} ${result.model} identified. `);
      return true;
    } catch (err) {
      console.error("Analysis failed:", err);
      return false;
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsAnalyzing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const fullData = canvas.toDataURL('image/jpeg', 0.8);
    await processImage(fullData.split(',')[1], fullData);
    setIsAnalyzing(false);
  };

  const finalizeSingle = () => {
    if (!pendingRecord) return;
    const { result, photo } = pendingRecord;
    onScanComplete({
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
      notes: manualNote ? manualNote + "\n---\n" + result.notes : result.notes,
      photos: [photo],
      recordings: [],
      documents: result.documents
    });
    setPendingRecord(null);
    setManualNote('');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-slate-900 to-transparent">
        <h2 className="text-white font-bold flex items-center gap-2 uppercase tracking-widest text-xs">
          <Layers className="text-blue-500" size={16} /> Neural Scan Node
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              (window as any).nextView = 'bulk-upload';
              onCancel();
            }} 
            className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400 text-[10px] font-bold uppercase flex items-center gap-2 active:scale-95 transition-all"
          >
            <Database size={14} /> Drive Import
          </button>
          <button onClick={onCancel} className="p-2 bg-slate-800/80 backdrop-blur rounded-lg text-slate-300 active:scale-95 transition-transform"><X size={18} /></button>
        </div>
      </div>

      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className={"relative transition-all duration-500 ease-in-out border border-white/20 rounded-lg overflow-hidden " + (scanMode === 'plate' ? 'w-72 h-44' : 'w-80 h-24')}>
            <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-[scan_3s_linear_infinite]" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-widest whitespace-nowrap">
              Target Lock: {scanMode === 'plate' ? 'LICENSE PLATE' : 'VIN'}
            </div>
          </div>
        </div>

        {showSwitchPrompt && (
          <div className="absolute bottom-40 left-6 right-6 z-[80] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900/90 backdrop-blur-xl border-2 border-blue-500 p-5 rounded-[2rem] shadow-2xl flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg">
                <Wand2 size={24} className="animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">AI Suggestion</p>
                  <span className="text-[9px] font-mono text-blue-500 font-bold">{(detectionConfidence * 100).toFixed(0)}% Match</span>
                </div>
                <p className="text-xs font-bold text-white uppercase leading-tight">
                  {detectedMode === 'vin' ? 'VIN Label detected. Switch to Deep VIN mode?' : 'License plate detected. Switch to Plate mode?'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => { setScanMode(detectedMode as any); setShowSwitchPrompt(false); }} className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl active:scale-95 shadow-lg">Switch</button>
                <button onClick={() => setShowSwitchPrompt(false)} className="px-4 py-2 bg-slate-800 text-slate-500 text-[10px] font-black uppercase rounded-xl active:scale-95">Ignore</button>
              </div>
            </div>
          </div>
        )}

        {pendingRecord && (
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-2xl z-[70] flex flex-col p-6 pt-20 overflow-y-auto no-scrollbar">
              <div className="text-center mb-6">
                <ShieldCheck className="text-blue-500 mx-auto mb-4" size={48} />
                <h3 className="text-white font-black text-2xl uppercase tracking-tighter">Signature Verified</h3>
                <p className="text-blue-400 font-mono text-[9px] uppercase tracking-[0.3em] mt-1">Component Mesh Locked</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Primary ID</span>
                  <p className="text-white font-mono font-bold text-lg uppercase truncate">{pendingRecord.result.plate || pendingRecord.result.vin.slice(-8)}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Body Class</span>
                  <p className="text-white font-bold text-sm truncate uppercase">{pendingRecord.result.shape}</p>
                </div>
                
                <div className="col-span-2 bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Disc className="text-blue-500" size={14} />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Wheel Signature</span>
                  </div>
                  <p className="text-xs text-blue-100/80 font-mono italic leading-relaxed">
                    "{pendingRecord.result.wheelSignature}"
                  </p>
                </div>

                {pendingRecord.result.bodyModifications.length > 0 && (
                  <div className="col-span-2 bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <Box className="text-emerald-500" size={14} />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">External Signatures</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {pendingRecord.result.bodyModifications.map((mod, i) => (
                        <span key={i} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase rounded">
                          {mod}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 px-1">
                  <FileText className="text-blue-500" size={14} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">OPERATIONAL FIELD REPORT</span>
                </div>
                <HandwritingInput 
                  value={manualNote}
                  onChange={setManualNote}
                  placeholder="Subject observations, location context, or tactical behavior..."
                />
              </div>

              <div className="mt-auto flex gap-3 pb-6">
                <button onClick={() => setPendingRecord(null)} className="flex-1 py-4 bg-slate-900 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all">Discard</button>
                <button onClick={finalizeSingle} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Submit to Ops Grid</button>
              </div>
          </div>
        )}

        {isAnalyzing && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-6">
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <Focus className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-white font-black text-2xl uppercase tracking-tighter">Signature Analysis</h3>
              <p className="text-blue-400 font-mono text-[10px] uppercase tracking-[0.3em] mt-2 animate-pulse">Running Structural Pattern Recognition...</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 pt-6 pb-safe px-6 flex flex-col gap-4 border-t border-slate-800">
        <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700">
          <button onClick={() => setScanMode('plate')} className={"flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest " + (scanMode === 'plate' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500')}>Plates</button>
          <button onClick={() => setScanMode('vin')} className={"flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest " + (scanMode === 'vin' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500')}>VINs</button>
        </div>
        <div className="flex justify-center items-center gap-10 pb-8 pt-2">
          <button onClick={() => {
            (window as any).nextView = 'bulk-upload';
            onCancel();
          }} className="p-4 rounded-full bg-slate-800 text-slate-400"><ImageIcon size={24} /></button>
          <button onClick={captureAndAnalyze} className="w-20 h-20 rounded-full border-4 border-slate-800 p-1 bg-slate-900 relative">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform"><div className="w-14 h-14 rounded-full border-2 border-slate-100" /></div>
          </button>
          <button onClick={toggleTorch} className={"p-4 rounded-full " + (torchOn ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400')}><Zap size={24} /></button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Scanner;

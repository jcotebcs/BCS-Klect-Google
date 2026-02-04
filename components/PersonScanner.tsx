
import React, { useRef, useState, useEffect } from 'react';
import { 
  Camera, 
  RefreshCw, 
  X, 
  Zap, 
  User, 
  Fingerprint, 
  ShieldAlert, 
  Mic, 
  Info, 
  Scan, 
  UploadCloud, 
  Image as ImageIcon, 
  Crosshair, 
  Cpu, 
  ShieldCheck, 
  CreditCard, 
  ChevronRight, 
  CheckCircle2, 
  Target 
} from 'lucide-react';
import { analyzePersonImage, PersonScanResult } from '../services/geminiService';
import { PersonRecord, InteractionType } from '../types';
import HandwritingInput from './HandwritingInput';

interface PersonScannerProps {
  onScanComplete: (record: PersonRecord) => void;
  onCancel: () => void;
}

const PersonScanner: React.FC<PersonScannerProps> = ({ onScanComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [pendingRecord, setPendingRecord] = useState<{
    result: PersonScanResult;
    photos: string[];
    location?: { lat: number, lng: number };
  } | null>(null);
  const [manualNote, setManualNote] = useState('');

  useEffect(() => {
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error("Camera access error:", err);
      }
    };
    start();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  const handleAnalysis = async (base64: string, photos: string[]) => {
    setIsAnalyzing(true);
    const loc = await new Promise<any>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }), 
        () => resolve(null), 
        { timeout: 5000 }
      );
    });

    try {
      const result = await analyzePersonImage(base64);
      setPendingRecord({ 
        result, 
        photos, 
        location: loc ? { lat: loc.latitude, lng: loc.longitude } : undefined 
      });
    } catch (error) {
      console.error("Neural analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const fullData = canvas.toDataURL('image/jpeg', 0.8);
    const base64 = fullData.split(',')[1];
    await handleAnalysis(base64, [fullData]);
  };

  const finalizeScan = () => {
    if (!pendingRecord) return;
    const { result, photos, location } = pendingRecord;
    
    onScanComplete({
      id: crypto.randomUUID(),
      name: result.name,
      biometrics: result.biometrics,
      photos: photos,
      recordings: [],
      notes: manualNote ? `${manualNote}\n---\n${result.notes}` : result.notes,
      associatedPlates: [],
      timestamp: new Date().toISOString(),
      location: location ? { ...location, address: 'Sector Verified' } : undefined,
      documents: result.documents
    });
    
    setPendingRecord(null);
    setManualNote('');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={async (e) => {
         const files = e.target.files;
         if (!files?.length) return;
         setIsAnalyzing(true);
         const photoArray: string[] = [];
         for (let i = 0; i < files.length; i++) {
           const b64 = await new Promise<string>((resolve) => {
             const reader = new FileReader();
             reader.onload = () => resolve(reader.result as string);
             reader.readAsDataURL(files[i]);
           });
           photoArray.push(b64);
         }
         if (photoArray.length) await handleAnalysis(photoArray[0].split(',')[1], photoArray);
         setIsAnalyzing(false);
      }} />

      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-slate-900 to-transparent">
        <div>
          <h2 className="text-white font-bold flex items-center gap-2 uppercase tracking-widest text-xs">
            <Fingerprint className="text-blue-500" size={16} /> Facial Recognition Intel
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="p-2 bg-slate-800/80 backdrop-blur rounded-lg text-slate-300 active:scale-95 transition-transform">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="relative flex-1 bg-black overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-80" />
        
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-72 h-72 border border-blue-500/20 rounded-full flex items-center justify-center">
            <div className="absolute inset-0 border-[2px] border-blue-500/10 rounded-full animate-pulse" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 bg-blue-600 px-3 py-1 rounded-full flex items-center gap-2">
              <Crosshair size={12} className="text-white" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">Target Acquisition</span>
            </div>
          </div>
        </div>
        
        {isAnalyzing && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center space-y-6 z-50">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={32} />
            </div>
            <div className="text-center">
              <p className="text-white font-black text-xl uppercase tracking-tighter">Neural ID Matching</p>
              <p className="text-blue-400 font-mono text-[10px] uppercase tracking-[0.3em] mt-2 animate-pulse">Extracting Facial Signatures...</p>
            </div>
          </div>
        )}

        {pendingRecord && (
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-2xl z-[110] flex flex-col p-6 pt-20 overflow-y-auto no-scrollbar">
            <div className="text-center mb-8">
              <ShieldCheck className="text-blue-500 mx-auto mb-4" size={48} />
              <h3 className="text-white font-black text-2xl uppercase tracking-tighter">Subject Intel Verified</h3>
              <p className="text-blue-400 font-mono text-[9px] uppercase tracking-[0.3em] mt-1">Biometric Signature Locked</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Subject Identity</span>
                <p className="text-white font-bold text-xl uppercase tracking-tight">{pendingRecord.result.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Height Est.</span>
                  <p className="text-white font-bold text-sm uppercase">{pendingRecord.result.biometrics.height}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Risk Factor</span>
                  <p className={`text-sm font-black uppercase ${pendingRecord.result.suggestedInteraction === InteractionType.TRESPASS ? 'text-red-500' : 'text-blue-500'}`}>
                    {pendingRecord.result.suggestedInteraction}
                  </p>
                </div>
              </div>

              {pendingRecord.result.documents && pendingRecord.result.documents.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="text-emerald-500" size={16} />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Credentials Detected</span>
                  </div>
                  {pendingRecord.result.documents.map((doc, idx) => (
                    <div key={idx} className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center mb-1.5">
                        <p className="text-[9px] font-black text-white uppercase">{doc.type}</p>
                        <span className="text-[8px] font-mono text-emerald-500">{(doc.confidence * 100).toFixed(0)}% OCR</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono leading-relaxed italic line-clamp-3">"{doc.extractedText}"</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block px-1">Field Notes</span>
                <HandwritingInput 
                  value={manualNote}
                  onChange={setManualNote}
                  placeholder="Operational observations..."
                />
              </div>
            </div>

            <div className="mt-auto flex gap-3 pb-8">
              <button onClick={() => setPendingRecord(null)} className="flex-1 py-4 bg-slate-900 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all">
                Discard
              </button>
              <button onClick={finalizeScan} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                Commit to Grid
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 pt-6 pb-safe px-6 flex flex-col gap-4 border-t border-slate-800">
        <div className="flex justify-center items-center gap-10 pb-8 pt-2">
          <button onClick={() => fileInputRef.current?.click()} className="p-4 rounded-full bg-slate-800 border border-slate-700 text-slate-400 active:scale-90 transition-all">
            <ImageIcon size={24} />
          </button>
          <button onClick={capture} disabled={isAnalyzing || !!pendingRecord} className="w-24 h-24 rounded-full border-4 border-slate-800 p-1 bg-slate-900 relative group overflow-hidden">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center active:scale-90 transition-all">
               <div className="w-16 h-16 rounded-full border-2 border-slate-200" />
            </div>
            {isAnalyzing && <div className="absolute inset-0 bg-blue-500/20 animate-pulse" />}
          </button>
          <button className="p-4 rounded-full bg-slate-800 border border-slate-700 text-slate-400 active:scale-90 transition-all">
            <Zap size={24} />
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default PersonScanner;

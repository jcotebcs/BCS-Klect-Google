
import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, Trash2, ShieldAlert, Cpu, Upload, Library, Plus, ChevronLeft, Target, ScanEye, Zap, AlertCircle } from 'lucide-react';
import { LogoReference } from '../types';

interface LogoLabProps {
  logos: LogoReference[];
  onAdd: (logo: LogoReference) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
}

const LogoLab: React.FC<LogoLabProps> = ({ logos, onAdd, onRemove, onBack }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1024 }, height: { ideal: 1024 } }
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setIsCapturing(true);
    } catch (err) {
      console.error("Camera access failed:", err);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setIsCapturing(false);
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    // We want a square crop for logos
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        video,
        (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size,
        0, 0, size, size
      );
      setCapturedBase64(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
      stopCamera();
    }
  };

  const handleSave = () => {
    if (!capturedBase64 || !label.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      label: label.trim(),
      base64: capturedBase64,
      timestamp: new Date().toISOString()
    });
    setCapturedBase64(null);
    setLabel('');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden">
      <header className="p-6 pt-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Cpu className="text-cyan-500" size={24} /> NEURAL LOGO LAB
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Pattern Recognition Training</p>
          </div>
          <button onClick={onBack} className="p-2 bg-slate-900 rounded-full text-slate-500 active:scale-95 transition-all">
            <X size={24} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 pb-32">
        {/* Active Knowledge Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Target size={14} className="text-cyan-500" /> Learned Signatures
            </h3>
            <span className="text-[9px] font-mono text-cyan-500/60 uppercase">{logos.length} Active Weights</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={startCamera}
              className="aspect-square bg-slate-900 border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-3 group hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all active:scale-95"
            >
              <div className="p-4 bg-slate-800 rounded-2xl text-slate-500 group-hover:text-cyan-500 transition-colors">
                <Plus size={24} />
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Capture Emblem</span>
            </button>

            {logos.map(logo => (
              <div key={logo.id} className="aspect-square bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden relative group animate-in zoom-in-95">
                <img src={`data:image/jpeg;base64,${logo.base64}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute bottom-3 inset-x-3">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">{logo.label}</p>
                </div>
                <button 
                  onClick={() => onRemove(logo.id)}
                  className="absolute top-2 right-2 p-2 bg-red-500/20 text-red-500 rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {logos.length === 0 && (
            <div className="py-12 text-center border border-dashed border-slate-800 rounded-[2.5rem] bg-slate-900/20">
               <ScanEye size={40} className="mx-auto text-slate-800 mb-4" />
               <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-relaxed px-12">
                 Zero custom signatures detected. Capture specialized brand logos to enhance neural vision accuracy.
               </p>
            </div>
          )}
        </section>

        {/* Visual Reference System Info */}
        <div className="bg-cyan-500/5 border border-cyan-500/10 p-6 rounded-[2rem] space-y-3">
           <div className="flex items-center gap-2 text-cyan-400">
             <Zap size={16} fill="currentColor" />
             <span className="text-[10px] font-black uppercase tracking-widest">Knowledge Injection Protocol</span>
           </div>
           <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
             The Gemini neural engine uses these images as <span className="text-white">visual anchors</span>. For best results, capture high-contrast close-ups of the emblem centered in the frame.
           </p>
        </div>
      </div>

      {/* Capture Overlay */}
      {isCapturing && (
        <div className="fixed inset-0 z-[110] bg-black flex flex-col">
          <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-cyan-500/30 rounded-3xl relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 bg-cyan-600 px-3 py-1 rounded-full text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-2 shadow-lg">
                <Target size={12} /> Align Logo Center
              </div>
              <div className="absolute inset-0 border border-cyan-400/10 rounded-3xl animate-pulse" />
            </div>
          </div>
          <div className="p-8 bg-slate-950 flex justify-between items-center px-12 pb-safe">
            <button onClick={stopCamera} className="p-4 rounded-full bg-slate-900 text-slate-400 active:scale-90 transition-all"><X size={24} /></button>
            <button onClick={capture} className="w-20 h-20 rounded-full border-4 border-slate-800 p-1 bg-slate-900">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center active:scale-95 transition-all">
                <div className="w-12 h-12 rounded-full border-2 border-slate-200" />
              </div>
            </button>
            <div className="w-12" /> {/* Spacer */}
          </div>
        </div>
      )}

      {/* Label Overlay */}
      {capturedBase64 && (
        <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in">
           <div className="w-48 h-48 rounded-[2rem] overflow-hidden border-2 border-cyan-500 shadow-2xl shadow-cyan-500/20 mb-8">
             <img src={`data:image/jpeg;base64,${capturedBase64}`} className="w-full h-full object-cover" />
           </div>
           
           <div className="w-full max-w-sm space-y-6">
             <div className="text-center">
               <h3 className="text-white font-black text-xl uppercase tracking-tighter">Assign Signature Identity</h3>
               <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-widest">Assign brand name to visual pattern</p>
             </div>
             
             <input 
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Brand or Logo Name..."
              autoFocus
              className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-cyan-500 transition-all text-center uppercase tracking-widest placeholder:text-slate-700"
             />
             
             <div className="flex gap-3">
               <button onClick={() => setCapturedBase64(null)} className="flex-1 py-4 bg-slate-800 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all">Discard</button>
               <button 
                onClick={handleSave}
                disabled={!label.trim()}
                className="flex-[2] py-4 bg-cyan-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-cyan-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
               >
                 Apply Neural Weight <Check size={16} />
               </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default LogoLab;

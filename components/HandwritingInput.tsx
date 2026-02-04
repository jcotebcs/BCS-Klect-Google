
import React, { useState, useRef, useEffect } from 'react';
import { PenTool, Keyboard, Trash2, Check, Loader2, X } from 'lucide-react';
import { recognizeHandwriting } from '../services/geminiService';

interface HandwritingInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const HandwritingInput: React.FC<HandwritingInputProps> = ({ value, onChange, placeholder = "Enter operational notes...", className = "" }) => {
  const [mode, setMode] = useState<'text' | 'scribble'>('text');
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Setup canvas for Scribble Mode
  useEffect(() => {
    if (mode === 'scribble' && canvasRef.current) {
      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2.5;
        contextRef.current = ctx;
      }
    }
  }, [mode]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: (e as MouseEvent).offsetX,
        y: (e as MouseEvent).offsetY
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!contextRef.current) return;
    const { x, y } = getCoordinates(e.nativeEvent);
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !contextRef.current) return;
    const { x, y } = getCoordinates(e.nativeEvent);
    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current || !contextRef.current) return;
    contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const convertScribble = async () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);
    
    try {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
      const base64 = dataUrl.split(',')[1];
      const resultText = await recognizeHandwriting(base64);
      
      if (resultText) {
        const newValue = value ? `${value}\n${resultText}` : resultText;
        onChange(newValue);
        setMode('text');
      }
    } catch (err) {
      console.error("Conversion error", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`flex flex-col border border-slate-800 rounded-3xl overflow-hidden bg-slate-900/50 backdrop-blur-xl ${className}`}>
      {/* Mode Switcher */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-800">
        <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <button 
            onClick={() => setMode('text')}
            className={`p-2 rounded-md transition-all ${mode === 'text' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            title="Text Mode (Supports OS Handwriting)"
          >
            <Keyboard size={14} />
          </button>
          <button 
            onClick={() => setMode('scribble')}
            className={`p-2 rounded-md transition-all ${mode === 'scribble' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            title="Scribble Mode (AI Assisted)"
          >
            <PenTool size={14} />
          </button>
        </div>
        
        {mode === 'scribble' && (
          <div className="flex gap-2">
            <button 
              onClick={clearCanvas}
              className="p-2 text-slate-500 hover:text-red-400 transition-colors"
              title="Clear Pad"
            >
              <Trash2 size={14} />
            </button>
            <button 
              onClick={convertScribble}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Convert
            </button>
          </div>
        )}
        
        {mode === 'text' && (
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            Uplink Terminal
          </span>
        )}
      </div>

      <div className="relative min-h-[160px]">
        {mode === 'text' ? (
          <textarea
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full min-h-[160px] bg-transparent p-6 text-sm text-white placeholder:text-slate-700 outline-none resize-none"
            inputMode="text"
            spellCheck="true"
          />
        ) : (
          <div className="relative w-full h-full min-h-[200px] cursor-crosshair touch-none bg-slate-950/50">
            <canvas
              ref={canvasRef}
              className="w-full h-full min-h-[200px]"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!isDrawing && !isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="text-center">
                  <PenTool size={32} className="mx-auto mb-2 text-blue-500" />
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">Digital Ink Area</p>
                </div>
              </div>
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-10">
                <Loader2 className="animate-spin text-blue-500" size={24} />
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse">Running Neural OCR...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HandwritingInput;

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, Blob as GenAIBlob } from '@google/genai';
import { Mic, MicOff, Radio, Volume2, Activity, ShieldCheck, Loader2 } from 'lucide-react';

const LiveChat: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<string>('Standby');
  const [audioLevel, setAudioLevel] = useState(0);
  const sessionRef = useRef<any>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  function createGenAIBlob(data: Float32Array): GenAIBlob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  const startSession = async () => {
    if (isActive) return;
    setIsConnecting(true);
    setStatus('Initializing Link...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            setStatus('Uplink Active');
            
            const source = inputAudioCtxRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioCtxRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              setAudioLevel(Math.min(1, Math.sqrt(sum / inputData.length) * 5));

              const pcmBlob = createGenAIBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioCtxRef.current!.destination);
            (window as any).scriptProcessor = scriptProcessor;
          },
          onmessage: async (message) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioCtxRef.current) {
              const ctx = outputAudioCtxRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current.values()) {
                try { source.stop(); } catch(e) {}
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Live error:', e);
            stopSession();
          },
          onclose: () => {
            setIsActive(false);
            setStatus('Offline');
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are KLECT-OPS AI, a tactical advisor. Provide concise, operational info.',
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
      setStatus('Link Failed');
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    if (inputAudioCtxRef.current) inputAudioCtxRef.current.close();
    if (outputAudioCtxRef.current) outputAudioCtxRef.current.close();
    if ((window as any).scriptProcessor) {
      (window as any).scriptProcessor.disconnect();
      (window as any).scriptProcessor = null;
    }
    
    setIsActive(false);
    setIsConnecting(false);
    setStatus('Standby');
    setAudioLevel(0);
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-950 dark:bg-black rounded-[3rem] p-10 border-4 border-slate-900 shadow-2xl relative overflow-hidden flex flex-col items-center">
        <div className="relative z-10 text-center space-y-3 mb-12">
          <div className="flex items-center justify-center gap-2 text-blue-500 mb-1">
            <Radio size={18} className={isActive ? 'animate-pulse' : ''} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Tactical Comms</span>
          </div>
          <h2 className={`text-3xl font-black uppercase tracking-tighter transition-colors duration-500 ${isActive ? 'text-white' : 'text-slate-600'}`}>
            {status}
          </h2>
        </div>

        <div className="w-full h-32 flex items-center justify-center gap-1.5 mb-12 px-6">
          {[...Array(30)].map((_, i) => (
            <div 
              key={i}
              className={`w-1.5 rounded-full transition-all duration-75 ${isActive ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-800'}`}
              style={{ 
                height: isActive ? `${Math.max(8, audioLevel * 100 * (1.2 - Math.abs(i - 15) / 15))}%` : '6px',
                opacity: isActive ? 0.3 + (audioLevel * 1.5) : 0.1
              }}
            />
          ))}
        </div>

        <button 
          onClick={isActive ? stopSession : startSession}
          disabled={isConnecting}
          className={`relative group p-10 rounded-full transition-all duration-500 active:scale-90 ${
            isActive 
              ? 'bg-red-600 shadow-2xl' 
              : 'bg-blue-600 shadow-2xl hover:scale-105'
          }`}
        >
          {isConnecting ? (
            <Loader2 className="animate-spin text-white" size={40} />
          ) : isActive ? (
            <MicOff className="text-white relative z-10" size={40} />
          ) : (
            <Mic className="text-white relative z-10" size={40} />
          )}
        </button>
      </div>
    </div>
  );
};

export default LiveChat;

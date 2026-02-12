
import React, { useState, useMemo, useRef } from 'react';
// REPAIR: Added missing ShieldCheck icon to lucide-react imports
import { Search, MapPin, Radio, Globe, History, Send, Loader2, ExternalLink, Activity, ShieldAlert, ArrowRight, Database, Library, Landmark, BookOpen, Info, CheckCircle2, ChevronRight, Zap, Target, Cpu, Landmark as HistoryIcon, X, MapPinned, Navigation, MessageSquare, ImageIcon, Brain, User, Bot, Paperclip, ShieldCheck } from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { searchIntelligence, mapIntelligence, generalVisualAnalysis, IntelResult } from '../services/geminiService';
import { NORTH_AMERICAN_ARCHIVES, queryArchives, HistoricalSignatures } from '../services/manufacturerData';
import LiveChat from './LiveChat';

const OPERATIONAL_RESOURCES = [
  { region: 'United States', agency: 'NHTSA vPIC', scope: 'Specifications, Decodes & Recalls', status: 'Public API', link: 'https://vpic.nhtsa.dot.gov/' },
  { region: 'United States', agency: 'NICB VINCheck', scope: 'Stolen Vehicle Verification', status: 'Consortium Web', link: 'https://www.nicb.org/vincheck' },
  { region: 'Canada', agency: 'CPIC', scope: 'National Stolen Vehicle Index', status: 'Public Web', link: 'https://www.cpic-cipc.ca/' },
  { region: 'Arizona', agency: 'TheftAZ', scope: 'Participating Agency Stolen Data', status: 'Official Portal', link: 'https://theftaz.azag.gov/' },
  { region: 'Connecticut', agency: 'DMV Registration Verify', scope: 'Registration & Insurance Status', status: 'Direct Portal', link: 'https://dmvcivls-wselfservice.ct.gov/' },
  { region: 'Saskatchewan', agency: 'SGI VIN Search', scope: 'Damage Claims & Registration', status: 'Free Lookup', link: 'https://sgi.sk.ca/vin' },
  { region: 'Ontario', agency: 'MTO UVIP', scope: 'Used Vehicle History & Liens', status: 'Mandatory Disclosure', link: 'https://www.ontario.ca/page/used-vehicle-information-package' },
  { region: 'Florida', agency: 'MV Check', scope: 'Ownership History & Lien Status', status: 'State Portal', link: 'https://services.flhsmv.gov/mvcheckweb/' }
];

interface Message {
  role: 'user' | 'model';
  text: string;
}

const IntelHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'maps' | 'live' | 'archives' | 'manual' | 'chat' | 'vision'>('live');
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<IntelResult | null>(null);
  const [archiveResult, setArchiveResult] = useState<HistoricalSignatures | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Vision State
  const [visionImage, setVisionImage] = useState<string | null>(null);
  const [visionResult, setVisionResult] = useState<IntelResult | null>(null);
  const visionFileRef = useRef<HTMLInputElement>(null);

  const filteredArchives = useMemo(() => {
    if (activeTab !== 'archives' || !query.trim()) return NORTH_AMERICAN_ARCHIVES;
    const q = query.toLowerCase();
    return NORTH_AMERICAN_ARCHIVES.filter(a => 
      a.make.toLowerCase().includes(q) || 
      a.country.toLowerCase() === q ||
      a.description.toLowerCase().includes(q)
    );
  }, [activeTab, query]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    if (activeTab === 'archives') {
      const match = queryArchives(query);
      if (match) setArchiveResult(match);
      return;
    }

    setIsSearching(true);
    setResults(null);

    try {
      let res;
      if (activeTab === 'search') {
        res = await searchIntelligence(query);
      } else if (activeTab === 'maps') {
        const pos = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 5000 });
        });
        if (pos) {
          setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
        res = await mapIntelligence(query, pos?.coords.latitude, pos?.coords.longitude);
      }
      
      if (res) {
        setResults(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || chatLoading) return;

    const userMsg = query;
    setQuery('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: 'You are KLECT-OPS Tactical Analyst. Provide concise, accurate intelligence for field workers. Use professional industrial terminology.',
          thinkingConfig: { thinkingBudget: 32768 }
        }
      });
      
      // Re-constructing context briefly for simplicity
      // In a real app we would maintain the chat object
      const response: GenerateContentResponse = await chat.sendMessage({ message: userMsg });
      setChatMessages(prev => [...prev, { role: 'model', text: response.text || 'No response signal.' }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'model', text: 'SIGNAL LOST. System fault during processing.' }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatScrollRef.current?.scrollTo(0, chatScrollRef.current.scrollHeight), 100);
    }
  };

  const handleVisionAnalysis = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setVisionImage(reader.result as string);
      setIsSearching(true);
      setVisionResult(null);
      try {
        const res = await generalVisualAnalysis(base64);
        setVisionResult(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full pb-20 bg-slate-50 dark:bg-slate-900 transition-colors">
      <header className="p-6 pt-10 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
              <ShieldAlert className="text-blue-600" size={24} /> BRIEFING CENTER
            </h1>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-1">Tactical Assets & Knowledge</p>
          </div>
          <div className="flex gap-1">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse delay-75" />
          </div>
        </div>
      </header>

      <div className="flex p-1.5 gap-1 bg-white dark:bg-slate-800 shadow-sm mx-4 mt-6 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
        {[
          { id: 'live', icon: Radio, label: 'Audio' },
          { id: 'chat', icon: MessageSquare, label: 'Chat' },
          { id: 'vision', icon: ImageIcon, label: 'Vision' },
          { id: 'search', icon: Globe, label: 'Search' },
          { id: 'maps', icon: MapPin, label: 'Map' },
          { id: 'archives', icon: Library, label: 'Archive' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setResults(null);
                setArchiveResult(null);
                setQuery('');
                setCurrentCoords(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[1.25rem] text-[10px] font-black uppercase transition-all tracking-widest whitespace-nowrap ${
                isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col">
        {activeTab === 'live' ? (
          <LiveChat />
        ) : activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col space-y-4 max-h-full">
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-4">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <Bot size={48} className="opacity-10 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center px-10">Uplink established. Gemini-3-Pro tactical analyst standing by for queries.</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] p-4 rounded-[2rem] text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'}`}>
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                      {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                      <span className="text-[8px] font-black uppercase tracking-widest">{msg.role}</span>
                    </div>
                    <p className="font-medium leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-3xl flex items-center gap-3">
                    <Loader2 className="animate-spin text-blue-500" size={16} />
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest animate-pulse">Analyzing...</span>
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={handleChat} className="relative mt-auto">
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Message Tactical Analyst..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl py-4 pl-6 pr-14 text-sm font-bold shadow-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button type="submit" disabled={chatLoading} className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 text-white rounded-2xl active:scale-95 transition-all">
                <Send size={18} />
              </button>
            </form>
          </div>
        ) : activeTab === 'vision' ? (
          <div className="space-y-6 flex-1 flex flex-col">
            {!visionImage ? (
              <div 
                onClick={() => visionFileRef.current?.click()}
                className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-[3rem] flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all"
              >
                <div className="p-8 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem]">
                  <ImageIcon size={48} className="text-slate-400" />
                </div>
                <div className="text-center px-10">
                  <h3 className="text-white font-black text-xl uppercase tracking-tighter">Visual Intelligence</h3>
                  <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest leading-relaxed">Upload a photo for multi-domain analysis. Gemini-3-Pro will identify objects, threats, and verify signatures.</p>
                </div>
                <input type="file" ref={visionFileRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleVisionAnalysis(e.target.files[0])} />
              </div>
            ) : (
              <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar pb-10">
                <div className="relative rounded-[2.5rem] overflow-hidden aspect-video border border-slate-200 dark:border-slate-800 shadow-2xl">
                  <img src={visionImage} className="w-full h-full object-cover" />
                  <button onClick={() => {setVisionImage(null); setVisionResult(null);}} className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur rounded-full text-white"><X size={18} /></button>
                </div>

                {isSearching && (
                  <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4">
                    <Brain className="text-blue-500 animate-pulse" size={40} />
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] animate-pulse">Executing Deep Neural Inference...</p>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 animate-[progress_2s_linear_infinite]" style={{width: '60%'}} />
                    </div>
                  </div>
                )}

                {visionResult && (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-3 text-emerald-500">
                      <ShieldCheck size={20} />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em]">Analysis Verified</span>
                    </div>
                    <div className="prose dark:prose-invert text-sm font-medium leading-relaxed">
                      {visionResult.text.split('\n').map((l, i) => <p key={i}>{l}</p>)}
                    </div>
                    {visionResult.sources.length > 0 && (
                      <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Globe size={12} /> Grounding Evidence</p>
                        {visionResult.sources.map((s, i) => (
                          <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 transition-all">
                             <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase truncate">{s.title}</span>
                             <ExternalLink size={14} className="text-blue-500" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'manual' ? (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-8 shadow-2xl">
                <div className="flex items-center gap-3 text-blue-600 mb-6">
                  <BookOpen size={20} />
                  <span className="text-[11px] font-black uppercase tracking-[0.3em]">Operational Truth Index</span>
                </div>
                <div className="space-y-4">
                   <p className="text-xs text-slate-500 font-medium leading-relaxed italic">Ground-truth sources for regional sector verification.</p>
                   <div className="grid gap-3">
                     {OPERATIONAL_RESOURCES.map((res, i) => (
                       <a 
                        key={i} 
                        href={res.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex flex-col gap-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/50 transition-all group shadow-sm"
                       >
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{res.region}</span>
                            <ExternalLink size={10} className="text-slate-400 group-hover:text-blue-500" />
                          </div>
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">{res.agency}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-index font-bold text-slate-500">{res.scope}</span>
                            <span className="text-[8px] font-black px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded uppercase">{res.status}</span>
                          </div>
                       </a>
                     ))}
                   </div>
                </div>
             </div>
          </div>
        ) : activeTab === 'archives' ? (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Encyclopedia (Brands, Models, Regions)..."
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl py-4.5 pl-12 pr-6 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all dark:text-white shadow-xl shadow-slate-200/50 dark:shadow-none"
              />
            </div>

            {archiveResult ? (
              <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-8 shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
                <button 
                  onClick={() => setArchiveResult(null)}
                  className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-400"
                >
                  <X size={18} />
                </button>
                
                <div className="flex items-center gap-3 text-emerald-500 mb-6">
                  <Landmark size={20} />
                  <span className="text-[11px] font-black uppercase tracking-[0.3em]">Encyclopedia Entry</span>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-2">{archiveResult.make}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{archiveResult.country}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{archiveResult.period}</span>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">
                      {archiveResult.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <HistoryIcon size={12} className="text-blue-500" /> Evolution
                      </p>
                      <div className="space-y-2">
                        {archiveResult.logoEvolution.map((evo, i) => (
                          <div key={i} className="text-[10px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                            {evo}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap size={12} className="text-amber-500" /> Technology
                      </p>
                      <div className="space-y-2">
                        {archiveResult.techContributions.map((tech, i) => (
                          <div key={i} className="text-[10px] font-bold text-emerald-600 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                            {tech}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {archiveResult.legacyModels && archiveResult.legacyModels.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notable Lineage</p>
                      <div className="flex flex-wrap gap-2">
                        {archiveResult.legacyModels.map((m, i) => (
                          <span key={i} className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredArchives.map((archive) => (
                  <button 
                    key={archive.make}
                    onClick={() => setArchiveResult(archive)}
                    className="flex items-center justify-between p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] text-left hover:border-blue-500/50 transition-all shadow-sm active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                        <HistoryIcon size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">{archive.make}</h4>
                        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <span>{archive.country}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span>{archive.period}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-xl" />
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={activeTab === 'search' ? "Query operational databases..." : "Analyze sector coordinates..."}
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl py-4.5 pl-6 pr-16 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all dark:text-white relative z-10 shadow-xl"
              />
              <button 
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 z-20 flex items-center justify-center"
              >
                {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </form>

            {activeTab === 'maps' && currentCoords && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Geo-Fence Locked: {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}</span>
              </div>
            )}

            {results && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12"><Activity size={120} /></div>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3 text-blue-600">
                      <Activity size={20} />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em]">Operational Dossier</span>
                    </div>
                    <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle2 size={10} /> Grounded Result
                    </div>
                  </div>

                  <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium space-y-4 prose dark:prose-invert max-w-none">
                    {results.text.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                  
                  {results.sources.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Globe size={12} className="text-blue-500" /> Tactical Intelligence Sources
                      </p>
                      <div className="grid grid-cols-1 gap-3">
                        {results.sources.map((src, i) => (
                          <a 
                            key={i} 
                            href={src.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:border-blue-500/50 transition-all shadow-sm"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                               <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-400 group-hover:text-blue-500 transition-colors">
                                 {src.uri.includes('google.com/maps') ? <MapPinned size={14} /> : <Globe size={14} />}
                               </div>
                               <div className="flex-1 min-w-0">
                                 <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate group-hover:text-blue-500 transition-colors">{src.title}</p>
                                 <p className="text-[8px] font-mono text-slate-400 truncate mt-0.5">{src.uri}</p>
                               </div>
                            </div>
                            <ExternalLink size={14} className="text-slate-300 group-hover:text-blue-500 flex-shrink-0 transition-all group-hover:translate-x-0.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelHub;

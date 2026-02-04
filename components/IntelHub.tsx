
import React, { useState, useEffect } from 'react';
import { Search, MapPin, Radio, Globe, History, Send, Loader2, ExternalLink, Activity, ShieldAlert, ArrowRight } from 'lucide-react';
import { searchIntelligence, mapIntelligence, IntelResult } from '../services/geminiService';
import LiveChat from './LiveChat';

const IntelHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'maps' | 'live'>('live');
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<IntelResult | null>(null);
  const [history, setHistory] = useState<{ query: string; type: string; timestamp: string }[]>([]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setResults(null);

    try {
      let res;
      if (activeTab === 'search') {
        res = await searchIntelligence(query);
      } else if (activeTab === 'maps') {
        const pos = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(null));
        });
        res = await mapIntelligence(query, pos?.coords.latitude, pos?.coords.longitude);
      }
      
      if (res) {
        setResults(res);
        setHistory(prev => [{ query, type: activeTab, timestamp: new Date().toISOString() }, ...prev].slice(0, 5));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col h-full pb-20 bg-slate-50 dark:bg-slate-900 transition-colors">
      <header className="p-6 pt-10 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
              <ShieldAlert className="text-blue-600" size={24} /> BRIEFING CENTER
            </h1>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-1">Multi-Domain Operational Intel</p>
          </div>
          <div className="flex gap-1">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse delay-75" />
          </div>
        </div>
      </header>

      <div className="flex p-1.5 gap-1 bg-white dark:bg-slate-800 shadow-sm mx-4 mt-6 rounded-[1.5rem] border border-slate-200 dark:border-slate-700">
        {[
          { id: 'live', icon: Radio, label: 'Live Ops' },
          { id: 'search', icon: Globe, label: 'Search' },
          { id: 'maps', icon: MapPin, label: 'Geospatial' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setResults(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.25rem] text-[10px] font-black uppercase transition-all tracking-widest ${
                isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Icon size={16} />
              <span className="hidden xs:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        {activeTab === 'live' ? (
          <LiveChat />
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-xl" />
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={activeTab === 'search' ? "Query operational databases..." : "Analyze sector coordinates..."}
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4.5 pl-6 pr-16 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all dark:text-white relative z-10"
              />
              <button 
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 text-white rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 z-20 flex items-center justify-center"
              >
                {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </form>

            {results && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
                    <Activity size={120} />
                  </div>
                  <div className="flex items-center gap-3 text-blue-600 mb-6">
                    <Activity size={20} />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">Operational Dossier</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium space-y-4 prose dark:prose-invert max-w-none">
                    {results.text.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                  
                  {results.sources.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Confirmed Data Sources</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {results.sources.map((src, i) => (
                          <a 
                            key={i} 
                            href={src.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl group hover:border-blue-500/50 transition-all"
                          >
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate uppercase tracking-tight group-hover:text-blue-500">{src.title}</span>
                            <ExternalLink size={12} className="text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!results && !isSearching && (
              <div className="space-y-6">
                {history.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                      <History size={14} /> RECENT INTEL
                    </h3>
                    <div className="grid gap-2">
                      {history.map((h, i) => (
                        <button 
                          key={i} 
                          onClick={() => { setQuery(h.query); handleSearch(); }}
                          className="w-full text-left bg-white dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800 transition-all group shadow-sm"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate pr-4">{h.query}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{h.type} • {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-all group-hover:translate-x-1" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
                   <div className="absolute -bottom-8 -right-8 opacity-20 rotate-12">
                     <Globe size={160} />
                   </div>
                   <h4 className="text-xl font-black uppercase tracking-tighter mb-2">Global Surveillance</h4>
                   <p className="text-blue-100 text-xs font-medium leading-relaxed opacity-90">
                     Access high-frequency datasets. Query license databases, property records, or satellite coordinates directly through the KLECT command node.
                   </p>
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

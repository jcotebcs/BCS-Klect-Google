
import React, { useState, useMemo } from 'react';
import { Search, MapPin, Radio, Globe, History, Send, Loader2, ExternalLink, Activity, ShieldAlert, ArrowRight, Database, Library, Landmark, BookOpen, Info, CheckCircle2, ChevronRight, Zap, Target, Cpu, Landmark as HistoryIcon, X } from 'lucide-react';
import { searchIntelligence, mapIntelligence, IntelResult } from '../services/geminiService';
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

const IntelHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'maps' | 'live' | 'archives' | 'manual'>('live');
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<IntelResult | null>(null);
  const [archiveResult, setArchiveResult] = useState<HistoricalSignatures | null>(null);
  const [history, setHistory] = useState<{ query: string; type: string; timestamp: string }[]>([]);

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
          { id: 'live', icon: Radio, label: 'Live' },
          { id: 'search', icon: Globe, label: 'Search' },
          { id: 'maps', icon: MapPin, label: 'Map' },
          { id: 'archives', icon: Library, label: 'Archives' },
          { id: 'manual', icon: BookOpen, label: 'Manual' }
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

      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        {activeTab === 'live' ? (
          <LiveChat />
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
                            <span className="text-[9px] font-bold text-slate-500">{res.scope}</span>
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

                  {archiveResult.modelSpecificEmblems.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Model Emblems</p>
                      <div className="grid grid-cols-1 gap-2">
                        {archiveResult.modelSpecificEmblems.map((emb, i) => (
                          <div key={i} className="bg-blue-600/5 border border-blue-500/10 p-4 rounded-2xl flex items-start gap-4">
                            <div className="p-2 bg-blue-600 rounded-lg text-white"><Target size={14} /></div>
                            <div>
                              <p className="text-xs font-black text-blue-600 uppercase">{emb.model}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic mt-0.5">"{emb.description}"</p>
                            </div>
                          </div>
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
                
                {filteredArchives.length === 0 && (
                  <div className="py-20 text-center space-y-4">
                    <SearchX size={48} className="mx-auto text-slate-200 dark:text-slate-800" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Historical Matches in Hub</p>
                  </div>
                )}
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

            {results && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12"><Activity size={120} /></div>
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
                            className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl group hover:border-blue-500/50 transition-all shadow-sm"
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
          </div>
        )}
      </div>
    </div>
  );
};

const SearchX: React.FC<{className?: string, size?: number}> = ({className, size=24}) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" 
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
    className={className}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);

export default IntelHub;

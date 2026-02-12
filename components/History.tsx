
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronRight, 
  ShieldAlert, 
  Calendar, 
  X, 
  ListFilter, 
  RotateCcw, 
  CarFront, 
  Fingerprint,
  Activity,
  Target,
  DollarSign,
  Clock,
  Zap,
  Filter,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { VehicleRecord, VehicleCategory, Interaction, InteractionType } from '../types';

interface HistoryProps {
  records: VehicleRecord[];
  interactions: Interaction[];
  onSelect: (record: VehicleRecord) => void;
  initialFilterOpen?: boolean;
}

const BRANDS = ['Ford', 'Chevrolet', 'Toyota', 'Honda', 'Nissan', 'Dodge', 'Jeep', 'BMW', 'Mercedes-Benz', 'Tesla', 'Hyundai', 'Kia', 'Ram', 'GMC'];

const History: React.FC<HistoryProps> = ({ records, interactions, onSelect, initialFilterOpen = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<VehicleCategory[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [vinPattern, setVinPattern] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(initialFilterOpen);
  
  // Advanced Range Filters
  const [minAppraisal, setMinAppraisal] = useState('');

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // 1. Global Keyword Search (Plate, Make, Model, Notes)
      const matchesGlobal = !searchTerm || 
        r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. VIN Pattern (Specific match against full VIN string)
      const matchesVIN = !vinPattern || r.vin.toLowerCase().includes(vinPattern.toLowerCase());

      // 3. Category Multi-select
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(r.category);

      // 4. Brand Multi-select
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(r.make);

      // 5. Date Range
      const recordTime = new Date(r.timestamp).getTime();
      let matchesDate = true;
      if (startDate) {
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        if (recordTime < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        if (recordTime > end) matchesDate = false;
      }

      // 6. Appraisal Minimum
      const matchesAppraisal = !minAppraisal || (r.marketValue || 0) >= parseInt(minAppraisal);
      
      return matchesGlobal && matchesVIN && matchesCategory && matchesBrand && matchesDate && matchesAppraisal;
    });
  }, [records, searchTerm, vinPattern, selectedCategories, selectedBrands, startDate, endDate, minAppraisal]);

  const toggleCategory = (cat: VehicleCategory) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setVinPattern('');
    setSelectedCategories([]);
    setSelectedBrands([]);
    setStartDate('');
    setEndDate('');
    setMinAppraisal('');
  };

  const setQuickPreset = (type: 'ALERTS' | 'RECENT' | 'HIGH_VALUE') => {
    clearFilters();
    switch(type) {
      case 'ALERTS':
        setSelectedCategories([VehicleCategory.WANTED, VehicleCategory.STOLEN, VehicleCategory.SUSPICIOUS]);
        break;
      case 'RECENT':
        const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString().split('T')[0];
        setStartDate(eightHoursAgo);
        break;
      case 'HIGH_VALUE':
        setMinAppraisal('40000');
        break;
    }
    setIsPanelOpen(false);
  };

  const hasActiveFilters = searchTerm || vinPattern || selectedCategories.length > 0 || selectedBrands.length > 0 || startDate || endDate || minAppraisal;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <header className="p-4 pt-safe sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-40 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mt-4 mb-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Sector Matrix</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
              <Activity size={10} className="text-blue-500" /> 
              {filteredRecords.length} Signal Matches Found
            </p>
          </div>
          <button 
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className={`p-3 rounded-2xl border transition-all flex items-center gap-2 ${
              isPanelOpen || hasActiveFilters 
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
          >
            <ListFilter size={20} />
            {hasActiveFilters && <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
          </button>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
          <input 
            type="text"
            placeholder="Global identification query..."
            className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-3 px-1 mt-1">
            <button onClick={clearFilters} className="flex-shrink-0 p-2 bg-red-500/10 text-red-500 rounded-xl active:scale-95 border border-red-500/20"><RotateCcw size={12} /></button>
            {vinPattern && <span className="flex-shrink-0 px-3 py-1.5 bg-slate-800 text-white rounded-xl text-[8px] font-black uppercase tracking-widest border border-slate-700 flex items-center gap-2">VIN: {vinPattern} <X size={10} onClick={() => setVinPattern('')}/></span>}
            {selectedCategories.map(cat => <span key={cat} className="flex-shrink-0 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">{cat} <X size={10} onClick={() => toggleCategory(cat)}/></span>)}
            {selectedBrands.map(b => <span key={b} className="flex-shrink-0 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[8px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">{b} <X size={10} onClick={() => toggleBrand(b)}/></span>)}
            {minAppraisal && <span className="flex-shrink-0 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[8px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">${minAppraisal}+ <X size={10} onClick={() => setMinAppraisal('')}/></span>}
          </div>
        )}
      </header>

      {/* Advanced Parameters Panel */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-50 flex flex-col pt-safe px-4 pb-20 pointer-events-none">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md pointer-events-auto" onClick={() => setIsPanelOpen(false)} />
          <div className="relative w-full max-h-[90%] bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col mt-4 pointer-events-auto animate-in slide-in-from-top-4 duration-300">
            <div className="p-6 overflow-y-auto no-scrollbar space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-xl text-white"><Filter size={18} /></div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Query Engine</h2>
                </div>
                <button onClick={() => setIsPanelOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400"><X size={20} /></button>
              </div>

              {/* Quick Presets */}
              <section className="space-y-4">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Tactical Presets</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setQuickPreset('ALERTS')} className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center gap-1 group active:scale-95 transition-all">
                    <ShieldAlert size={16} className="text-red-500" />
                    <span className="text-[8px] font-black text-red-500 uppercase">Alerts</span>
                  </button>
                  <button onClick={() => setQuickPreset('RECENT')} className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex flex-col items-center gap-1 active:scale-95 transition-all">
                    <Clock size={16} className="text-blue-500" />
                    <span className="text-[8px] font-black text-blue-500 uppercase">Shift</span>
                  </button>
                  <button onClick={() => setQuickPreset('HIGH_VALUE')} className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center gap-1 active:scale-95 transition-all">
                    <Zap size={16} className="text-emerald-500" />
                    <span className="text-[8px] font-black text-emerald-500 uppercase">Premium</span>
                  </button>
                </div>
              </section>

              {/* Signature Data */}
              <section className="space-y-4">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2"><Fingerprint size={12} className="text-blue-500" /> Signature Filters</label>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-500 uppercase px-1">VIN Pattern Signature</label>
                    <input 
                      type="text" 
                      placeholder="e.g. JS1VP, 4HGB, last 6..." 
                      value={vinPattern}
                      onChange={e => setVinPattern(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-xs font-mono font-bold dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-slate-500 uppercase px-1">Min Value</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                        <input type="number" placeholder="5000" value={minAppraisal} onChange={e => setMinAppraisal(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-4 py-3.5 text-xs font-bold dark:text-white outline-none focus:border-blue-500" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-slate-500 uppercase px-1">Sector Class</label>
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                         {Object.values(VehicleCategory).slice(0, 4).map(cat => (
                           <button key={cat} onClick={() => toggleCategory(cat)} className={`flex-shrink-0 px-3 py-2.5 rounded-lg text-[7px] font-black uppercase transition-all ${selectedCategories.includes(cat) ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{cat}</button>
                         ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Temporal Window */}
              <section className="space-y-4">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2"><Calendar size={12} className="text-rose-500" /> Temporal Window</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-500 uppercase px-1">From</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-xs font-bold dark:text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-500 uppercase px-1">To</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-xs font-bold dark:text-white" />
                  </div>
                </div>
              </section>

              {/* Manufacturer Matrix */}
              <section className="space-y-4 pb-12">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2"><CarFront size={12} className="text-emerald-500" /> Manufacturer Signature</label>
                <div className="grid grid-cols-3 gap-2">
                  {BRANDS.map(brand => (
                    <button 
                      key={brand} 
                      onClick={() => toggleBrand(brand)} 
                      className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-wider border transition-all ${selectedBrands.includes(brand) ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'}`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-6 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
              <button onClick={clearFilters} className="flex-1 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all">Clear Engine</button>
              <button onClick={() => setIsPanelOpen(false)} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                Analyze Records <span className="px-2 py-0.5 bg-white/20 rounded-md tabular-nums">{filteredRecords.length}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Rendering */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar pb-[var(--nav-height)]">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record) => (
            <button
              key={record.id}
              onClick={() => onSelect(record)}
              className="w-full text-left bg-white dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-[2rem] p-4 flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm hover:border-blue-500/30 group"
            >
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0 group-hover:border-blue-500/50 transition-colors relative">
                {record.photos?.[0] ? (
                  <img src={record.photos[0].url} className="w-full h-full object-cover" />
                ) : (
                  <CarFront size={24} className="text-slate-300 mx-auto mt-7" />
                )}
                <div className={`absolute top-1 left-1 w-2 h-2 rounded-full border-2 border-white dark:border-slate-950 ${
                  record.category === VehicleCategory.NORMAL ? 'bg-emerald-500' :
                  record.category === VehicleCategory.WANTED ? 'bg-red-500' :
                  'bg-blue-500'
                }`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-mono font-black text-slate-900 dark:text-white tracking-tighter truncate uppercase group-hover:text-blue-500 transition-colors">
                    {record.plate !== 'Unknown' ? record.plate : (record.vin.slice(-8) || 'SIGNATURE')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate mb-1.5">
                  <span>{record.year} {record.make} {record.model}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter ${
                    record.category === VehicleCategory.NORMAL ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {record.category}
                  </div>
                  {record.marketValue && (
                    <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[7px] font-black text-emerald-500 uppercase">
                      ${record.marketValue.toLocaleString()}
                    </div>
                  )}
                  <span className="text-[7px] font-black text-slate-400 uppercase ml-auto tabular-nums">
                    {new Date(record.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={20} />
            </button>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400 space-y-6">
            <div className="relative">
              <Activity size={64} className="opacity-10 animate-pulse-slow" />
              <Search className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500/20" size={32} />
            </div>
            <div className="text-center px-12">
              <p className="text-sm font-black uppercase tracking-widest text-slate-500">Zero Multi-Domain Hits</p>
              <p className="text-[10px] font-bold opacity-40 mt-2 leading-relaxed uppercase">The current query parameters yielded no signatures in the active Sector Grid.</p>
              <button 
                onClick={clearFilters}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95"
              >
                Reset Engine Matrix
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;

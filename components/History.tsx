
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
  Trash2,
  Siren,
  Plus,
  MapPin,
  MapPinned
} from 'lucide-react';
import { VehicleRecord, VehicleCategory, Interaction, InteractionType } from '../types';

interface HistoryProps {
  records: VehicleRecord[];
  interactions: Interaction[];
  onSelect: (record: VehicleRecord) => void;
  onAddAsset?: () => void;
  initialFilterOpen?: boolean;
}

const BRANDS = ['Ford', 'Chevrolet', 'Toyota', 'Honda', 'Nissan', 'Dodge', 'Jeep', 'BMW', 'Mercedes-Benz', 'Tesla', 'Hyundai', 'Kia', 'Ram', 'GMC'];

const History: React.FC<HistoryProps> = ({ records, interactions, onSelect, onAddAsset, initialFilterOpen = false }) => {
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

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now.getTime() - then.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'JUST NOW';
    if (hours < 24) return `${hours}H AGO`;
    return `${Math.floor(hours/24)}D AGO`;
  };

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

  const hasActiveFilters = searchTerm || vinPattern || selectedCategories.length > 0 || selectedBrands.length > 0 || startDate || endDate || minAppraisal;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative">
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

              {/* Signature Data */}
              <section className="space-y-4">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2"><Fingerprint size={12} className="text-blue-500" /> Signature Filters</label>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-500 uppercase px-1">VIN Pattern Signature</label>
                    <input 
                      type="text" 
                      placeholder="e.g. JS1VP..." 
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
              <button onClick={clearFilters} className="flex-1 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all">Clear</button>
              <button onClick={() => setIsPanelOpen(false)} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                Apply Matrix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Rendering with Enhanced History Details */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar pb-32">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record) => (
            <button
              key={record.id}
              onClick={() => onSelect(record)}
              className="w-full text-left bg-white dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-[2rem] p-4 flex flex-col gap-3 active:scale-[0.98] transition-all shadow-sm hover:border-blue-500/30 group"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0 group-hover:border-blue-500/50 transition-colors relative">
                  {record.photos?.[0] ? (
                    <img src={record.photos[0].url} className="w-full h-full object-cover" />
                  ) : (
                    <CarFront size={24} className="text-slate-300 mx-auto mt-5" />
                  )}
                  <div className={`absolute top-1 left-1 w-2 h-2 rounded-full border-2 border-white dark:border-slate-950 ${
                    record.category === VehicleCategory.NORMAL ? 'bg-emerald-500' :
                    record.category === VehicleCategory.STOLEN ? 'bg-red-600 animate-pulse' :
                    'bg-blue-500'
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-lg font-mono font-black text-slate-900 dark:text-white tracking-tighter truncate uppercase group-hover:text-blue-500 transition-colors">
                      {record.plate !== 'Unknown' ? record.plate : (record.vin.slice(-8) || 'SIGNATURE')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-slate-500 font-bold uppercase tracking-wider truncate mb-1">
                    <span>{record.year} {record.make} {record.model}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter ${
                      record.category === VehicleCategory.NORMAL ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 
                      record.category === VehicleCategory.STOLEN ? 'bg-red-600 text-white border border-red-500' :
                      'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      {record.category}
                    </div>
                    <span className="text-[7px] font-black text-slate-400 uppercase tabular-nums">
                      {getTimeAgo(record.timestamp)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-all" size={20} />
              </div>

              {/* Enhanced History Detail Snippet */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <MapPinned size={12} className="text-blue-500" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    {record.location ? `Sector: ${record.location.lat.toFixed(3)}, ${record.location.lng.toFixed(3)}` : 'Location Unlocked'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={10} className="text-slate-400" />
                  <span className="text-[8px] font-black text-slate-400 uppercase tabular-nums">{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
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
              <button 
                onClick={clearFilters}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
              >
                Reset Engine
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;

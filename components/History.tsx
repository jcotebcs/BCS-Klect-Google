
import React, { useState } from 'react';
import { Search, Filter, ChevronRight, Hash, ShieldAlert, Tag, ChevronDown, Calendar, X } from 'lucide-react';
import { VehicleRecord, VehicleCategory } from '../types';

interface HistoryProps {
  records: VehicleRecord[];
  onSelect: (record: VehicleRecord) => void;
}

const History: React.FC<HistoryProps> = ({ records, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory | 'All'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);

  const categories = ['All', ...Object.values(VehicleCategory)];

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || r.category === selectedCategory;
    
    // Date filtering logic
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
    
    return matchesSearch && matchesCategory && matchesDate;
  });

  const clearDates = () => {
    setStartDate('');
    setEndDate('');
  };

  const hasDateFilter = startDate || endDate;

  return (
    <div className="flex flex-col h-full pb-20">
      <header className="p-4 pt-6 sticky top-0 bg-slate-50 dark:bg-slate-900 z-30 border-b border-slate-200 dark:border-slate-800 space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Field Logs</h1>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Sync</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
            <input 
              type="text"
              placeholder="Search intel..."
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            {/* Category Filter */}
            <div className="relative flex-1">
              <button 
                onClick={() => {
                  setIsFilterOpen(!isFilterOpen);
                  setIsDateOpen(false);
                }}
                className={`w-full h-full px-4 py-2.5 flex items-center justify-between gap-2 rounded-xl border font-black text-[10px] uppercase tracking-wider transition-all ${
                  selectedCategory !== 'All' 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Filter size={14} />
                  <span className="max-w-[100px] truncate">{selectedCategory === 'All' ? 'Type' : selectedCategory}</span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                    <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat as any);
                            setIsFilterOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-between ${
                            selectedCategory === cat 
                              ? 'bg-blue-600 text-white' 
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          {cat}
                          {selectedCategory === cat && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Date Range Filter */}
            <div className="relative flex-1">
              <button 
                onClick={() => {
                  setIsDateOpen(!isDateOpen);
                  setIsFilterOpen(false);
                }}
                className={`w-full h-full px-4 py-2.5 flex items-center justify-between gap-2 rounded-xl border font-black text-[10px] uppercase tracking-wider transition-all ${
                  hasDateFilter
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>Range</span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isDateOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDateOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                        <input 
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">End Date</label>
                        <input 
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <button 
                          onClick={clearDates}
                          className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-[9px] font-black uppercase text-slate-500 dark:text-slate-300 flex items-center justify-center gap-1"
                        >
                          <X size={10} /> Reset
                        </button>
                        <button 
                          onClick={() => setIsDateOpen(false)}
                          className="flex-1 py-2 rounded-lg bg-blue-600 text-[9px] font-black uppercase text-white shadow-lg shadow-blue-600/20"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar z-10">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record) => (
            <button
              key={record.id}
              onClick={() => onSelect(record)}
              className="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm hover:shadow-md hover:border-blue-500/30 group"
            >
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0 group-hover:border-blue-500/50 transition-colors">
                {record.photos && record.photos[0] ? (
                  <img src={record.photos[0]} className="w-full h-full object-cover" alt="Vehicle" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Hash size={20} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-mono font-black text-slate-900 dark:text-white tracking-tighter truncate uppercase group-hover:text-blue-500 transition-colors">
                    {record.plate && record.plate !== 'N/A' ? record.plate : (record.vin.slice(-8) || 'Unknown')}
                  </span>
                  {record.category !== VehicleCategory.NORMAL && (
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      <Tag size={8} className="text-blue-500" />
                      <span className="text-[7px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-tighter">{record.category}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <span className="truncate">{record.make} {record.model}</span>
                  <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full flex-shrink-0" />
                  <span className="flex-shrink-0 tabular-nums opacity-60">
                    {new Date(record.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
              <ChevronRight className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={20} />
            </button>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
            <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full">
              <Search size={32} className="opacity-20" />
            </div>
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Zero matches found</p>
              <p className="text-[10px] font-bold opacity-40 mt-1">Adjust filters or search parameters</p>
              {(searchTerm || selectedCategory !== 'All' || hasDateFilter) && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('All');
                    clearDates();
                  }}
                  className="mt-4 text-[10px] font-black uppercase text-blue-500 hover:underline"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;

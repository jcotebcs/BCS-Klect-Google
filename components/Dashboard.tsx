
import React from 'react';
import { 
  ShieldAlert, 
  Car, 
  Activity, 
  TrendingUp, 
  Clock, 
  Users,
  Eye,
  Bell,
  Search,
  PieChart as PieChartIcon,
  Library,
  BookOpen,
  History,
  Landmark,
  ChevronRight,
  Layers,
  Zap,
  PlusCircle,
  Plus
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { VehicleRecord, VehicleCategory, PersonRecord, Interaction, InteractionType, AppView } from '../types';
import BrandLogo from './BrandLogo';

interface DashboardProps {
  vehicles: VehicleRecord[];
  people: PersonRecord[];
  interactions: Interaction[];
  onQuickSearch: () => void;
  onNavigate?: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ vehicles, people, interactions, onQuickSearch, onNavigate }) => {
  const sightings = interactions.filter(i => i.type === InteractionType.SIGHTING).length;
  const trespasses = interactions.filter(i => i.type === InteractionType.TRESPASS).length;
  const notifications = interactions.filter(i => i.type === InteractionType.NOTIFICATION).length;

  const interactionData = [
    { name: 'Sightings', count: sightings, color: '#3b82f6' },
    { name: 'Trespass', count: trespasses, color: '#ef4444' },
    { name: 'Notified', count: notifications, color: '#10b981' },
  ];

  const stats = [
    { label: 'Vehicles', value: vehicles.length, icon: Car, color: 'text-blue-500' },
    { label: 'Subjects', value: people.length, icon: Users, color: 'text-purple-500' },
    { label: 'Sightings', value: sightings, icon: Eye, color: 'text-blue-400' },
    { label: 'Trespasses', value: trespasses, icon: ShieldAlert, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6 pt-safe pb-8">
      <header className="flex justify-between items-center px-4 pt-8 mb-4">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" showText={false} />
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">KLECT OPS Center</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Tactical Command Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onQuickSearch}
            className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
            title="Advanced Search"
          >
            <Search size={20} />
          </button>
          <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Activity className="text-blue-500" size={20} />
          </div>
        </div>
      </header>

      {/* Action Hub */}
      <section className="px-4 space-y-4">
        {/* NEW ASSET BUTTON */}
        <button 
          onClick={() => onNavigate?.('new-asset')}
          className="w-full bg-blue-600 rounded-[2rem] p-6 text-white shadow-2xl shadow-blue-600/30 flex items-center justify-between group active:scale-[0.98] transition-all border border-blue-400/20"
        >
          <div className="flex items-center gap-4">
             <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner group-hover:scale-105 transition-transform">
               <Plus size={28} strokeWidth={3} />
             </div>
             <div className="text-left">
               <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-0.5">Tactical Entry</p>
               <h3 className="text-xl font-black uppercase tracking-tighter">New Asset Package</h3>
               <p className="text-[10px] text-blue-100/70 font-bold uppercase mt-1 italic">Single asset, multi-source ingestion</p>
             </div>
          </div>
          <ChevronRight size={24} className="text-blue-200 group-hover:translate-x-1 transition-all" />
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => onNavigate?.('bulk-upload')}
            className="bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 rounded-[2rem] p-5 text-white shadow-xl flex flex-col gap-3 group active:scale-[0.98] transition-all"
          >
             <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
               <Layers size={20} />
             </div>
             <div className="text-left">
               <h3 className="text-sm font-black uppercase tracking-tighter">Bulk Import</h3>
               <p className="text-[8px] text-slate-500 font-bold uppercase mt-1 tracking-wider">Multi-Asset Pipeline</p>
             </div>
          </button>

          <button 
            onClick={() => onNavigate?.('intel')}
            className="bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 rounded-[2rem] p-5 text-white shadow-xl flex flex-col gap-3 group active:scale-[0.98] transition-all"
          >
             <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
               <Landmark size={20} />
             </div>
             <div className="text-left">
               <h3 className="text-sm font-black uppercase tracking-tighter">Archives</h3>
               <p className="text-[8px] text-slate-500 font-bold uppercase mt-1 tracking-wider">Industrial History</p>
             </div>
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 px-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-[2rem] border border-slate-200 dark:border-slate-700/50 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} className={stat.color} />
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="bg-white dark:bg-slate-800/80 backdrop-blur-md mx-4 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] rotate-12 text-slate-900 dark:text-white">
          <TrendingUp size={120} />
        </div>
        <h3 className="text-[10px] font-black text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-[0.2em]">
          Operational Activity
        </h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={interactionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} opacity={0.3} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}}
              />
              <Tooltip 
                cursor={{fill: 'rgba(59, 130, 246, 0.05)'}}
                contentStyle={{backgroundColor: 'white', border: 'none', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', color: '#1e293b', fontSize: '10px'}}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                {interactionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="px-4 pb-12">
        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-[0.2em]">
          Tactical Event Stream
        </h3>
        <div className="space-y-3">
          {interactions.slice(0, 5).map((inter) => (
            <div key={inter.id} className="bg-white dark:bg-slate-800/40 p-5 rounded-[2rem] flex items-center gap-4 border border-slate-200 dark:border-slate-700/50 active:scale-[0.98] transition-all">
              <div className={`p-3 rounded-2xl ${
                inter.type === InteractionType.TRESPASS ? 'bg-red-500/10 text-red-500' :
                inter.type === InteractionType.NOTIFICATION ? 'bg-emerald-500/10 text-emerald-500' :
                'bg-blue-500/10 text-blue-500'
              }`}>
                {inter.type === InteractionType.TRESPASS ? <ShieldAlert size={20} /> : 
                 inter.type === InteractionType.NOTIFICATION ? <Bell size={20} /> : <Eye size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{inter.type}</p>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                    {new Date(inter.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate font-medium">{inter.notes}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

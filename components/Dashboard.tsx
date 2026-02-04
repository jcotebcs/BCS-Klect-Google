
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
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { VehicleRecord, VehicleCategory, PersonRecord, Interaction, InteractionType } from '../types';
import BrandLogo from './BrandLogo';

interface DashboardProps {
  vehicles: VehicleRecord[];
  people: PersonRecord[];
  interactions: Interaction[];
}

const Dashboard: React.FC<DashboardProps> = ({ vehicles, people, interactions }) => {
  const sightings = interactions.filter(i => i.type === InteractionType.SIGHTING).length;
  const trespasses = interactions.filter(i => i.type === InteractionType.TRESPASS).length;
  const notifications = interactions.filter(i => i.type === InteractionType.NOTIFICATION).length;

  const interactionData = [
    { name: 'Sightings', count: sightings, color: '#3b82f6' },
    { name: 'Trespass', count: trespasses, color: '#ef4444' },
    { name: 'Notified', count: notifications, color: '#10b981' },
  ];

  const fleetMap = vehicles.reduce((acc, v) => {
    acc[v.category] = (acc[v.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const fleetData = Object.entries(fleetMap).map(([name, count]) => ({
    name,
    count: count as number,
  })).sort((a, b) => b.count - a.count);

  const stats = [
    { label: 'Vehicles', value: vehicles.length, icon: Car, color: 'text-blue-500' },
    { label: 'Subjects', value: people.length, icon: Users, color: 'text-purple-500' },
    { label: 'Sightings', value: sightings, icon: Eye, color: 'text-blue-400' },
    { label: 'Trespasses', value: trespasses, icon: ShieldAlert, color: 'text-red-500' },
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4'];

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center px-4 pt-8 mb-4">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" showText={false} />
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">KLECT OPS Center</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Tactical Command Hub</p>
          </div>
        </div>
        <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20 shadow-lg shadow-blue-500/5">
          <Activity className="text-blue-500" size={20} />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 px-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} className={stat.color} />
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="bg-white dark:bg-slate-800/80 backdrop-blur-md mx-4 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] rotate-12 text-slate-900 dark:text-white">
          <TrendingUp size={120} />
        </div>
        <h3 className="text-[10px] font-black text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-[0.2em]">
          Operational Activity
        </h3>
        <div className="h-48 w-full min-h-[192px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={interactionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" dark:stroke="#334155" vertical={false} opacity={0.3} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
              />
              <Tooltip 
                cursor={{fill: 'rgba(59, 130, 246, 0.05)'}}
                contentStyle={{backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b', fontSize: '10px'}}
                itemStyle={{fontWeight: 700}}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                {interactionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800/80 backdrop-blur-md mx-4 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-2xl">
        <h3 className="text-[10px] font-black text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-[0.2em]">
          Asset Distribution
        </h3>
        <div className="h-40 w-full flex items-center">
          <div className="w-1/2 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fleetData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={8}
                  dataKey="count"
                >
                  {fleetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b', fontSize: '10px'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 flex flex-col gap-2.5 max-h-full overflow-y-auto no-scrollbar pr-2">
            {fleetData.slice(0, 4).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/30 pb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shadow-sm" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase truncate max-w-[80px]">{item.name}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-900 dark:text-white tabular-nums">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4">
        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-[0.2em]">
          Real-Time Intelligence
        </h3>
        <div className="space-y-3">
          {interactions.slice(0, 5).map((inter) => (
            <div key={inter.id} className="bg-white dark:bg-slate-800/40 p-4 rounded-2xl flex items-center gap-4 border border-slate-200 dark:border-slate-700/50 transition-all hover:border-blue-200 dark:hover:bg-slate-800/60 active:scale-[0.98]">
              <div className={`p-3 rounded-xl shadow-inner ${
                inter.type === InteractionType.TRESPASS ? 'bg-red-500/10 text-red-500' :
                inter.type === InteractionType.NOTIFICATION ? 'bg-emerald-500/10 text-emerald-500' :
                'bg-blue-500/10 text-blue-500'
              }`}>
                {inter.type === InteractionType.TRESPASS ? <ShieldAlert size={18} /> : 
                 inter.type === InteractionType.NOTIFICATION ? <Bell size={18} /> : <Eye size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{inter.type}</p>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                    {new Date(inter.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate">{inter.notes}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

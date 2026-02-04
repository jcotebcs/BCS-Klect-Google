
import React from 'react';
import { User as UserIcon, LogOut, Shield, BadgeCheck, FileText, Settings, ChevronRight, Sun, Moon, Monitor } from 'lucide-react';
import { User, ThemeMode } from '../types';

interface ProfileProps {
  user: User;
  onLogout: () => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onLogout, theme, setTheme }) => {
  const menuItems = [
    { icon: BadgeCheck, label: 'Certifications', value: 'Active' },
    { icon: FileText, label: 'Operational History', value: '42 logs' },
  ];

  const themeOptions = [
    { id: 'light', icon: Sun, label: 'Light' },
    { id: 'dark', icon: Moon, label: 'Dark' },
    { id: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className="space-y-6 pb-20">
      <header className="px-4 pt-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Operator Profile</h1>
        
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-[0.05] dark:opacity-10 pointer-events-none">
            <Shield size={80} className="text-blue-500" />
          </div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <UserIcon size={32} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user.name}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-mono">{user.operatorId}</p>
            </div>
          </div>
          
          <div className="mt-6 flex gap-2">
            <div className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-100 dark:border-blue-500/20 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              Level 4 Access
            </div>
            <div className="px-3 py-1 bg-green-50 dark:bg-green-500/10 rounded-full border border-green-100 dark:border-green-500/20 text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">
              Verified
            </div>
          </div>
        </div>
      </header>

      <section className="px-4 space-y-4">
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Display Mode</h3>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-2xl flex transition-colors">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id as ThemeMode)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                  }`}
                >
                  <Icon size={14} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Tactical Info</h3>
          {menuItems.map((item, idx) => (
            <button key={idx} className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-400 group-hover:text-blue-500 transition-colors">
                  <item.icon size={18} />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 tabular-nums">{item.value}</span>
                <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="px-4 pt-4">
        <button
          onClick={onLogout}
          className="w-full bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-500 py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
        >
          <LogOut size={18} />
          <span>Terminate Session</span>
        </button>
        <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center mt-6 uppercase tracking-[0.2em] font-black">
          Terminal ID: {crypto.randomUUID().slice(0,8).toUpperCase()}
        </p>
      </section>
    </div>
  );
};

export default Profile;

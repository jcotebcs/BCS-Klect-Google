
import React from 'react';
import { LayoutDashboard, Camera, History, User, Users, Globe, Plus } from 'lucide-react';
import { AppView } from '../types';

interface NavigationProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, setActiveView }) => {
  // Balanced navigation items around a central action button
  const leftItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Ops' },
    { id: 'intel', icon: Globe, label: 'Intel' },
  ];

  const rightItems = [
    { id: 'people', icon: Users, label: 'People' },
    { id: 'history', icon: History, label: 'Log' },
  ];

  const NavItem = ({ item }: { item: any }) => {
    const Icon = item.icon;
    const isActive = activeView === item.id;
    return (
      <button
        onClick={() => setActiveView(item.id as AppView)}
        className={`flex flex-col items-center justify-center w-14 h-full transition-all duration-200 ${
          isActive ? 'text-blue-600 dark:text-blue-500 scale-105' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
        }`}
      >
        <div className="relative">
          <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
          {isActive && (
            <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-600 dark:bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
          )}
        </div>
        <span className="text-[8px] mt-1 font-black uppercase tracking-[0.1em]">
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-[100] shadow-[0_-8px_30px_rgb(0,0,0,0.1)] transition-colors duration-300" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-between items-center h-16 px-4 relative">
        <div className="flex gap-4">
          {leftItems.map(item => <NavItem key={item.id} item={item} />)}
        </div>

        {/* Central Tactical Action Button */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6">
          <button 
            onClick={() => setActiveView('new-asset')}
            className={`w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-600/40 border-4 border-white dark:border-slate-900 active:scale-90 transition-all ${activeView === 'new-asset' ? 'bg-emerald-500 shadow-emerald-500/40' : ''}`}
          >
            <Plus size={28} strokeWidth={3} />
          </button>
        </div>

        <div className="flex gap-4">
          {rightItems.map(item => <NavItem key={item.id} item={item} />)}
          <button
            onClick={() => setActiveView('profile')}
            className={`flex flex-col items-center justify-center w-14 h-full transition-all duration-200 ${
              activeView === 'profile' ? 'text-blue-600 dark:text-blue-500 scale-105' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <User size={22} strokeWidth={activeView === 'profile' ? 2.5 : 2} />
            <span className="text-[8px] mt-1 font-black uppercase tracking-[0.1em]">User</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

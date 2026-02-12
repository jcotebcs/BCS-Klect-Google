
import React from 'react';
import { LayoutDashboard, Camera, History, User, Users, Globe } from 'lucide-react';
import { AppView } from '../types';

interface NavigationProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, setActiveView }) => {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Ops' },
    { id: 'scanner', icon: Camera, label: 'Scan' },
    { id: 'intel', icon: Globe, label: 'Intel' },
    { id: 'people', icon: Users, label: 'People' },
    { id: 'history', icon: History, label: 'Log' },
    { id: 'profile', icon: User, label: 'User' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] transition-colors duration-300" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id || (item.id === 'scanner' && activeView === 'person-scanner');
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as AppView)}
              className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${
                isActive ? 'text-blue-600 dark:text-blue-500 scale-105' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
              }`}
            >
              <div className="relative">
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                )}
              </div>
              <span className="text-[9px] mt-1.5 font-black uppercase tracking-[0.15em]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;

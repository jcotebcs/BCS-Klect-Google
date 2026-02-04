
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-pb z-50 shadow-lg transition-colors duration-300">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id || (item.id === 'scanner' && activeView === 'person-scanner');
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as AppView)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive ? 'text-blue-600 dark:text-blue-500' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-bold uppercase tracking-wider">
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

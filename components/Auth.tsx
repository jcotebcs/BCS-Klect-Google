
import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { User as UserType } from '../types';
import BrandLogo from './BrandLogo';

interface AuthProps {
  onLogin: (user: UserType) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    if (isLogin) {
      const storedUsers = JSON.parse(localStorage.getItem('bc_ops_users') || '[]');
      const user = storedUsers.find((u: any) => u.email === formData.email && u.password === formData.password);
      
      if (user) {
        onLogin({
          id: user.id,
          email: user.email,
          name: user.name,
          operatorId: user.operatorId
        });
      } else {
        setError('Invalid credentials or operator not found.');
      }
    } else {
      const storedUsers = JSON.parse(localStorage.getItem('bc_ops_users') || '[]');
      if (storedUsers.some((u: any) => u.email === formData.email)) {
        setError('Operator email already registered.');
      } else {
        const newUser = {
          id: crypto.randomUUID(),
          email: formData.email,
          password: formData.password,
          name: formData.name || 'New Operator',
          operatorId: `OP-${Math.floor(1000 + Math.random() * 9000)}`
        };
        localStorage.setItem('bc_ops_users', JSON.stringify([...storedUsers, newUser]));
        onLogin({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          operatorId: newUser.operatorId
        });
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative flex flex-col items-center justify-center p-6 overflow-hidden transition-colors duration-300">
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-5 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center mb-12">
          <BrandLogo size="lg" className="mx-auto" />
        </div>

        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-widest">Operator Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700"
                    placeholder="Enter operator name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-widest">Operator Auth ID</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700"
                  placeholder="name@ops-grid.io"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-widest">Command Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-xs font-bold text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-70 mt-6 uppercase tracking-widest text-xs"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <span>Uplink Authorization</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/50 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-emerald-500 transition-colors"
            >
              {isLogin ? "Request Command Authorization" : "Switch to Operator Login"}
            </button>
          </div>
        </div>
        
        <div className="text-center space-y-3 opacity-60">
          <p className="text-[10px] text-slate-500 dark:text-slate-600 uppercase tracking-[0.3em] font-black">
            KLECT.OPS Asset Management • Grid Access 4.0
          </p>
          <div className="flex items-center justify-center gap-4 text-slate-300 dark:text-slate-800">
            <div className="h-[1px] w-8 bg-current" />
            <span className="text-[8px] font-bold">SECURE ENCRYPTED UPLINK</span>
            <div className="h-[1px] w-8 bg-current" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

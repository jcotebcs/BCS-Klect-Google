
import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 'md', showText = true }) => {
  const sizeClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-6'
  };

  const iconContainerSize = {
    sm: 'w-10 h-10 p-1.5',
    md: 'w-16 h-16 p-2',
    lg: 'w-24 h-24 p-3',
    xl: 'w-32 h-32 p-4'
  };

  return (
    <div className={`flex flex-col items-center ${sizeClasses[size]} ${className}`}>
      {/* Tactical Trinity Cluster */}
      <div className="flex items-end gap-1.5 mb-1">
        {/* P-NODE (Parking/Proximity) */}
        <div className="bg-emerald-500 rounded-full flex items-center justify-center p-1.5 shadow-lg shadow-emerald-500/20 border-2 border-emerald-400/30">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" strokeDasharray="2 2" className="opacity-40" />
            <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
          </svg>
        </div>
        
        {/* THE SECTOR (Property/Asset Management) */}
        <div className={`${iconContainerSize[size]} bg-blue-600 rounded-[22%] flex items-center justify-center overflow-hidden shadow-2xl shadow-blue-600/30 relative border-2 border-blue-400/20`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
          <svg 
            viewBox="0 0 24 24" 
            className="w-full h-full text-white relative z-10 p-1"
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.8" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            {/* Structural Frame */}
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" className="text-white" />
            {/* Tool/Figure Node */}
            <path d="M12 9v4" className="text-emerald-400" />
            <path d="M9 13h6" className="text-emerald-400" />
            <circle cx="12" cy="17" r="1.5" className="fill-emerald-400 text-emerald-400" />
          </svg>
        </div>

        {/* THE ASSET (Vehicle/VIN Tracking) */}
        <div className="bg-blue-500 rounded-lg flex items-center justify-center p-1.5 shadow-lg shadow-blue-500/20 mb-1 border-2 border-blue-400/20">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" className="text-emerald-400" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" className="text-emerald-400" />
          </svg>
        </div>
      </div>

      {/* Industrial Modern Typography */}
      {showText && (
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center">
            <span className={`font-black text-blue-600 uppercase tracking-tighter leading-none ${size === 'xl' ? 'text-5xl' : size === 'lg' ? 'text-4xl' : 'text-3xl'}`}>
              KLECT
            </span>
            <span className={`font-black text-slate-400 dark:text-slate-600 px-1 ${size === 'xl' ? 'text-5xl' : size === 'lg' ? 'text-4xl' : 'text-3xl'}`}>.</span>
            <span className={`font-black text-emerald-500 uppercase tracking-tighter leading-none ${size === 'xl' ? 'text-5xl' : size === 'lg' ? 'text-4xl' : 'text-3xl'}`}>
              OPS
            </span>
          </div>
          
          <div className="flex items-center gap-3 w-full mt-2">
            <div className="h-[1.5px] flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.45em] whitespace-nowrap">
              OPERATIONAL INTEL HUB
            </span>
            <div className="h-[1.5px] flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;


import React, { useState } from 'react';
import { Search, User, ShieldAlert, ChevronRight, Fingerprint, MapPin } from 'lucide-react';
import { PersonRecord, Interaction, InteractionType } from '../types';

interface SubjectListProps {
  people: PersonRecord[];
  interactions: Interaction[];
  onSelect: (person: PersonRecord) => void;
}

const SubjectList: React.FC<SubjectListProps> = ({ people, interactions, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.ssn && p.ssn.includes(searchTerm))
  );

  const getStatus = (personId: string) => {
    const personInteractions = interactions.filter(i => i.subjectId === personId);
    if (personInteractions.some(i => i.type === InteractionType.TRESPASS)) return 'Trespasser';
    if (personInteractions.some(i => i.type === InteractionType.NOTIFICATION)) return 'Notified';
    return 'Observed';
  };

  return (
    <div className="flex flex-col h-full pb-20">
      <header className="p-4 pt-6 sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-3 text-slate-900 dark:text-white">
          <Fingerprint className="text-blue-500" /> Subject Intel
        </h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search by name or ID..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
        {filteredPeople.length > 0 ? (
          filteredPeople.map((person) => {
            const status = getStatus(person.id);
            const isTrespasser = status === 'Trespasser';
            
            return (
              <button
                key={person.id}
                onClick={() => onSelect(person)}
                className="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm"
              >
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0">
                  {person.photos[0] ? (
                    <img src={person.photos[0]} className="w-full h-full object-cover" alt={person.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <User size={24} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate uppercase tracking-tight">
                      {person.name}
                    </span>
                    {isTrespasser && <ShieldAlert size={14} className="text-red-500" />}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase font-bold tracking-wider">
                    <span className={`px-1.5 py-0.5 rounded border ${
                      status === 'Trespasser' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-500 dark:border-red-500/20' :
                      status === 'Notified' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20' :
                      'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-500 dark:border-blue-500/20'
                    }`}>
                      {status}
                    </span>
                  </div>
                </div>
                <ChevronRight className="text-slate-300 dark:text-slate-600 flex-shrink-0" size={20} />
              </button>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300 space-y-2">
            <User size={48} className="opacity-10" />
            <p className="text-sm font-medium">No subjects in current sector</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectList;

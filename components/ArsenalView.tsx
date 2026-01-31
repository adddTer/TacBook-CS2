
import React, { useState } from 'react';
import { WEAPONS } from '../data/weapons';
import { ECONOMY_RULES } from '../data/economy';
import { WeaponCategory, Side } from '../types';

export const ArsenalView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<WeaponCategory | 'all'>('all');
  const [activeSide, setActiveSide] = useState<Side | 'Both'>('Both');

  const categories: { id: WeaponCategory | 'all', label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'pistol', label: '手枪' },
    { id: 'mid-tier', label: '冲锋/喷子' },
    { id: 'rifle', label: '步枪' },
    { id: 'grenade', label: '投掷物' },
    { id: 'gear', label: '装备' },
  ];

  const filteredWeapons = WEAPONS.filter(w => {
      // 1. Filter by Category
      if (activeCategory !== 'all' && w.category !== activeCategory) return false;
      
      // 2. Filter by Side
      if (activeSide !== 'Both') {
          if (w.side !== 'Both' && w.side !== activeSide) return false;
      }
      return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Economy Section */}
      <section className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50">
           <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="text-green-600 dark:text-green-500">$</span>
              经济系统速查
           </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {ECONOMY_RULES.map((rule, idx) => (
                <div key={idx} className="space-y-3">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{rule.title}</h4>
                    <div className="space-y-2">
                        {rule.values.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-sm border-b border-dashed border-neutral-200 dark:border-neutral-800 pb-1 last:border-0">
                                <span className="text-neutral-600 dark:text-neutral-400">{item.label}</span>
                                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-200">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* Weapons Section */}
      <section className="space-y-4">
        {/* Controls Row */}
        <div className="flex flex-col gap-3">
             {/* Side Selector */}
            <div className="flex gap-2">
                {(['Both', 'T', 'CT'] as const).map(s => (
                    <button
                        key={s}
                        onClick={() => setActiveSide(s)}
                        className={`
                            flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border
                            ${activeSide === s 
                                ? s === 'T' ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-800' 
                                : s === 'CT' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800'
                                : 'bg-neutral-800 text-white border-transparent dark:bg-neutral-200 dark:text-black'
                                : 'bg-white dark:bg-neutral-900 text-neutral-500 border-neutral-200 dark:border-neutral-800'}
                        `}
                    >
                        {s === 'Both' ? '全部阵营' : s}
                    </button>
                ))}
            </div>

            {/* Category Selector */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`
                            px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border
                            ${activeCategory === cat.id 
                                ? 'bg-neutral-900 dark:bg-white text-white dark:text-black border-transparent' 
                                : 'bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800'}
                        `}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            {filteredWeapons.map(weapon => (
                <div key={weapon.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col justify-between group hover:border-blue-500/50 transition-colors">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                weapon.side === 'CT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                weapon.side === 'T' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                            }`}>
                                {weapon.side}
                            </span>
                            {weapon.killAward !== undefined && (
                                <span className="text-[10px] font-mono text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                                    +${weapon.killAward}
                                </span>
                            )}
                        </div>
                        <h4 className="font-bold text-neutral-900 dark:text-white">{weapon.name}</h4>
                        {weapon.desc && <p className="text-xs text-neutral-400 mt-1">{weapon.desc}</p>}
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-end">
                         <span className="text-lg font-black font-mono tracking-tight text-neutral-900 dark:text-white">
                            ${weapon.price}
                         </span>
                    </div>
                </div>
            ))}
        </div>
      </section>

    </div>
  );
};

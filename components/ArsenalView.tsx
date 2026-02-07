
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
    { id: 'mid-tier', label: '重型' },
    { id: 'rifle', label: '步枪' },
    { id: 'grenade', label: '投掷物' },
    { id: 'gear', label: '装备' },
  ];

  const categoryMap: Record<string, string> = {
      'pistol': '手枪',
      'mid-tier': '重型',
      'rifle': '步枪',
      'grenade': '投掷物',
      'gear': '装备'
  };

  const filteredWeapons = WEAPONS.filter(w => {
      if (activeCategory !== 'all' && w.category !== activeCategory) return false;
      if (activeSide !== 'Both') {
          if (w.side !== 'Both' && w.side !== activeSide) return false;
      }
      return true;
  });

  return (
    <div className="space-y-0 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Horizontal Scrolling Economy Rules */}
      <section className="bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-950 -mx-4 px-4 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           经济规则
        </h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {ECONOMY_RULES.map((rule, idx) => (
                <div key={idx} className="shrink-0 w-44 bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700 shadow-sm">
                    <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">{rule.title}</h4>
                    <div className="space-y-1.5">
                        {rule.values.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-[10px]">
                                <span className="text-neutral-500 dark:text-neutral-400">{item.label}</span>
                                <span className="font-mono font-bold text-neutral-900 dark:text-white">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* Arsenal Section */}
      <section className="space-y-4">
        {/* Controls - Sticky Toolbar */}
        <div className="sticky top-[56px] z-30 bg-neutral-50/95 dark:bg-neutral-950/95 backdrop-blur-md py-3 -mx-4 px-4 border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
             <div className="flex flex-col gap-3">
                {/* Side Selector */}
                <div className="flex p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl">
                    {(['Both', 'T', 'CT'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setActiveSide(s)}
                            className={`
                                flex-1 py-1.5 rounded-lg text-xs font-bold transition-all
                                ${activeSide === s 
                                    ? s === 'T' ? 'bg-yellow-500 text-black shadow-sm' 
                                    : s === 'CT' ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white text-black shadow-sm dark:bg-neutral-600 dark:text-white'
                                    : 'text-neutral-500 dark:text-neutral-400'}
                            `}
                        >
                            {s === 'Both' ? '全部' : s}
                        </button>
                    ))}
                </div>

                {/* Category Selector */}
                <div className="flex overflow-x-auto no-scrollbar gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`
                                px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border
                                ${activeCategory === cat.id 
                                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-black border-transparent' 
                                    : 'bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'}
                            `}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
             </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pt-2">
            {filteredWeapons.map(weapon => (
                <div key={weapon.id} className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden group hover:border-blue-400 transition-colors">
                    {/* Side Indicator Strip */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 
                        ${weapon.side === 'T' ? 'bg-yellow-500' : weapon.side === 'CT' ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-700'}
                    `}></div>
                    
                    <div className="p-3 pl-4 flex flex-col h-full justify-between gap-3">
                        <div>
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-sm text-neutral-900 dark:text-white leading-tight">{weapon.name}</h4>
                            </div>
                            <div className="flex flex-col gap-1">
                                 {weapon.killAward !== undefined && (
                                     <span className="text-[10px] font-bold text-green-600 dark:text-green-500 flex items-center gap-1 bg-green-50 dark:bg-green-900/20 w-fit px-1.5 py-0.5 rounded">
                                        <span className="opacity-70 text-[9px] uppercase">赏金</span> ${weapon.killAward}
                                     </span>
                                 )}
                                 {weapon.desc && <p className="text-[10px] text-neutral-400 leading-tight line-clamp-2 mt-1">{weapon.desc}</p>}
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-end mt-1">
                             <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                 {categoryMap[weapon.category] || weapon.category}
                             </span>
                             <span className="text-base font-black font-mono tracking-tight text-neutral-900 dark:text-white">
                                ${weapon.price}
                             </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </section>

    </div>
  );
};

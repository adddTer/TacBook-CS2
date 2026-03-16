import React, { useState } from 'react';
import { Tactic, Utility } from '../types';

interface ScheduleItem {
  id: string;
  type: 'tactic' | 'utility' | 'text';
  refId?: string; // ID for tactic or utility
  description: string;
}

interface TrainingPlan {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  schedule: ScheduleItem[];
}

const initialPlans: TrainingPlan[] = [
  {
    id: '1',
    date: '2026-03-21',
    title: 'Mirage 和 Nuke 战术讨论与跑图训练',
    schedule: []
  }
];

interface TrainingCampProps {
  allTactics: Tactic[];
  allUtilities: Utility[];
}

export const TrainingCamp: React.FC<TrainingCampProps> = ({ allTactics, allUtilities }) => {
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);

  const getDayOfWeek = (dateString: string) => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const date = new Date(dateString);
    return days[date.getDay()];
  };

  const sortedPlans = [...initialPlans].sort((a, b) => {
    const today = new Date().toISOString().split('T')[0];
    if (a.date === today) return -1;
    if (b.date === today) return 1;
    return a.date.localeCompare(b.date);
  });

  if (selectedPlan) {
    return (
      <div className="p-4 lg:p-8 max-w-[1920px] mx-auto">
        <button onClick={() => setSelectedPlan(null)} className="mb-4 text-blue-600 hover:underline">← 返回列表</button>
        <h1 className="text-2xl font-bold mb-2">{selectedPlan.title}</h1>
        <p className="text-neutral-500 mb-6">{selectedPlan.date} {getDayOfWeek(selectedPlan.date)}</p>
        
        <div className="space-y-4">
          {selectedPlan.schedule.map(item => {
            const exists = item.type === 'text' || 
                           (item.type === 'tactic' && allTactics.find(t => t.id === item.refId)) ||
                           (item.type === 'utility' && allUtilities.find(u => u.id === item.refId));
            
            return (
              <div key={item.id} className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <div className="flex justify-between items-center">
                  <p className="font-medium">{item.description}</p>
                  {!exists && (
                    <span className="text-xs text-red-500 bg-red-100 dark:bg-red-900/20 px-2 py-1 rounded">缺少资源，请导入战术包</span>
                  )}
                </div>
                {item.type !== 'text' && (
                  <p className="text-xs text-neutral-400 font-mono mt-1">ID: {item.refId}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1920px] mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-neutral-100">集训中心</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedPlans.map(plan => (
          <button 
            key={plan.id}
            onClick={() => setSelectedPlan(plan)}
            className="bg-white dark:bg-neutral-900 p-6 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 text-left hover:border-blue-500 transition-colors"
          >
            <h2 className="text-lg font-semibold mb-2">{plan.title}</h2>
            <p className="text-neutral-500">{plan.date} {getDayOfWeek(plan.date)}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

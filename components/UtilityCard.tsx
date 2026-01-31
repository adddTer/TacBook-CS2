
import React, { useState } from 'react';
import { Utility } from '../types';

interface UtilityCardProps {
  utility: Utility;
}

const typeConfig = {
  smoke: { label: '烟雾', color: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300' },
  flash: { label: '闪光', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  molotov: { label: '燃烧', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  grenade: { label: '手雷', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export const UtilityCard: React.FC<UtilityCardProps> = ({ utility }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const config = typeConfig[utility.type];

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(utility.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className={`
        mb-3 rounded-2xl overflow-hidden transition-all duration-300 border
        bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800
        ${isOpen ? 'shadow-lg ring-1 ring-neutral-200 dark:ring-neutral-700' : 'shadow-sm'}
    `}>
      <div 
        className="p-4 cursor-pointer flex gap-4 items-start"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Thumbnail */}
        <div className="w-16 h-16 shrink-0 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden border border-neutral-100 dark:border-neutral-800">
           {utility.image ? (
               <img src={utility.image} className="w-full h-full object-cover" alt={utility.title} />
           ) : (
               <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">无图</div>
           )}
        </div>

        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${config.color}`}>
                    {config.label}
                </span>
                <button 
                    onClick={handleCopyId}
                    className="text-[10px] font-mono text-neutral-400 hover:text-blue-500 transition-colors flex items-center gap-1 group"
                    title="点击复制ID"
                >
                    #{utility.id}
                    <span className="opacity-0 group-hover:opacity-100">
                        {copiedId ? (
                            <span className="text-green-500">已复制</span>
                        ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        )}
                    </span>
                </button>
            </div>
            <h3 className="font-bold text-neutral-900 dark:text-white truncate">
                {utility.title}
            </h3>
            <p className="text-xs text-neutral-500 mt-1 line-clamp-1">
                {utility.content}
            </p>
        </div>
      </div>

      {isOpen && (
          <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
              <hr className="my-3 border-neutral-100 dark:border-neutral-800" />
              <div className="space-y-3">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {utility.content}
                  </p>
                  
                  {utility.image && (
                      <div 
                        className="relative rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 cursor-zoom-in"
                        onClick={(e) => { e.stopPropagation(); setIsZoomed(true); }}
                      >
                          <img src={utility.image} className="w-full h-auto" alt="Detail" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                               <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">点击放大</span>
                          </div>
                      </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] text-neutral-400 mt-2">
                        <span>Site: {utility.site}</span>
                        {utility.metadata?.author && <span>By {utility.metadata.author}</span>}
                  </div>
              </div>
          </div>
      )}

      {/* Zoom Modal */}
      {isZoomed && utility.image && (
          <div 
            className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
          >
              <img src={utility.image} className="max-w-full max-h-full rounded" />
          </div>
      )}
    </div>
  );
};

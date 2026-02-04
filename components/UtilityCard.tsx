
import React, { useState } from 'react';
import { Utility } from '../types';

interface UtilityCardProps {
  utility: Utility;
  viewMode?: 'detail' | 'accordion'; 
  onClick?: () => void; 
  onEdit?: () => void;
  onDelete?: () => void; // New prop
}

const typeConfig = {
  smoke: { label: '烟雾', color: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300' },
  flash: { label: '闪光', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  molotov: { label: '燃烧', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  grenade: { label: '手雷', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const toleranceConfig = {
    easy: { label: '简单', color: 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' },
    medium: { label: '普通', color: 'text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20' },
    hard: { label: '困难', color: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' },
    pixel: { label: '像素级', color: 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20' },
};

export const UtilityCard: React.FC<UtilityCardProps> = ({ utility, viewMode = 'detail', onClick, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const config = typeConfig[utility.type];
  const tolerance = utility.tolerance ? toleranceConfig[utility.tolerance] : null;

  const mainImage = utility.images && utility.images.length > 0 
      ? utility.images[0].url 
      : utility.image;
  
  const imageCount = utility.images?.length || (utility.image ? 1 : 0);

  const handleCardClick = () => {
      if (viewMode === 'detail' && onClick) {
          onClick();
      } else {
          setIsOpen(!isOpen);
      }
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(utility.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className={`
        mb-3 rounded-2xl overflow-hidden transition-all duration-300 border group
        bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800
        ${isOpen ? 'shadow-lg ring-1 ring-neutral-200 dark:ring-neutral-700' : 'shadow-sm hover:border-blue-500/30'}
        ${viewMode === 'detail' ? 'cursor-pointer active:scale-[0.99]' : ''}
    `}>
      <div 
        className="p-4 flex gap-4 items-start"
        onClick={handleCardClick}
      >
        {/* Thumbnail */}
        <div className="w-16 h-16 shrink-0 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden border border-neutral-100 dark:border-neutral-800 relative">
           {mainImage ? (
               <img src={mainImage} className="w-full h-full object-cover" alt={utility.title} />
           ) : (
               <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">无图</div>
           )}
           {viewMode === 'detail' && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors"></div>
           )}
           {imageCount > 1 && (
               <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] font-bold px-1 rounded-tl-md">
                   +{imageCount - 1}
               </div>
           )}
        </div>

        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${config.color}`}>
                        {config.label}
                    </span>
                    {tolerance && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${tolerance.color}`}>
                            {tolerance.label}
                        </span>
                    )}
                    {utility.seriesId && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800">
                            {utility.variantLabel || '系列'}
                        </span>
                    )}
                    <button 
                        onClick={handleCopyId}
                        className="text-[10px] font-mono text-neutral-400 hover:text-blue-500 transition-colors flex items-center gap-1 group/id"
                        title="点击复制ID"
                    >
                        #{utility.id}
                        <span className="opacity-0 group-hover/id:opacity-100">
                            {copiedId ? (
                                <span className="text-green-500">已复制</span>
                            ) : (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            )}
                        </span>
                    </button>
                    {utility._isTemp && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            已编辑
                        </span>
                    )}
                </div>
                {onDelete && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="text-red-400 hover:text-red-600 p-1"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="flex justify-between items-start">
                <h3 className="font-bold text-neutral-900 dark:text-white truncate pr-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {utility.title}
                </h3>
                {viewMode === 'detail' && (
                    <svg className="w-4 h-4 text-neutral-400 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                )}
                {viewMode === 'accordion' && (
                    <svg className={`w-4 h-4 text-neutral-400 shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                )}
            </div>
            <p className="text-xs text-neutral-500 mt-1 line-clamp-1">
                {utility.content}
            </p>
        </div>
      </div>

      {/* Accordion Content (Only for accordion mode) */}
      {viewMode === 'accordion' && isOpen && (
          <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200 cursor-default" onClick={e => e.stopPropagation()}>
              <hr className="my-3 border-neutral-100 dark:border-neutral-800" />
              <div className="space-y-3">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {utility.content}
                  </p>
                  
                  {mainImage && (
                      <div 
                        className="relative rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 cursor-zoom-in"
                        onClick={(e) => { e.stopPropagation(); setIsZoomed(true); }}
                      >
                          <img src={mainImage} className="w-full h-auto" alt="Detail" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                               <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">
                                   {imageCount > 1 ? `查看 ${imageCount} 张图片` : '点击放大'}
                               </span>
                          </div>
                      </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] text-neutral-400 mt-2">
                        <div className="flex items-center gap-3">
                            <span>Site: {utility.site}</span>
                            {utility.metadata?.author && <span>By {utility.metadata.author}</span>}
                        </div>
                        {onEdit && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
                            >
                                编辑
                            </button>
                        )}
                  </div>
              </div>
          </div>
      )}

      {/* Zoom Modal (Used in accordion mode - just shows main image for simplicity or first) */}
      {isZoomed && mainImage && (
          <div 
            className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
          >
              <img src={mainImage} className="max-w-full max-h-full rounded" />
          </div>
      )}
    </div>
  );
};

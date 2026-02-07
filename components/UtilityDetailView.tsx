
import React, { useState, useMemo } from 'react';
import { Utility } from '../types';
import { shareFile, downloadBlob } from '../utils/shareHelper';
import { ShareOptionsModal } from './ShareOptionsModal';
import html2canvas from 'html2canvas';

interface UtilityDetailViewProps {
  utility: Utility;
  allUtilities?: Utility[]; // Optional list to find siblings in a series
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSelectSibling?: (sibling: Utility) => void;
}

const typeConfig = {
  smoke: { label: '烟雾 (Smoke)', color: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300' },
  flash: { label: '闪光 (Flash)', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  molotov: { label: '燃烧 (Molotov)', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  grenade: { label: '手雷 (HE)', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const toleranceConfig = {
    easy: { label: '容错: 高 (简单)', color: 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' },
    medium: { label: '容错: 中 (普通)', color: 'text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20' },
    hard: { label: '容错: 低 (困难)', color: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' },
    pixel: { label: '容错: 极低 (像素级)', color: 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20' },
};

export const UtilityDetailView: React.FC<UtilityDetailViewProps> = ({ 
    utility, 
    allUtilities = [], 
    onBack, 
    onEdit,
    onDelete,
    onSelectSibling
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const config = typeConfig[utility.type];
  const tolerance = utility.tolerance ? toleranceConfig[utility.tolerance] : null;

  // Combine legacy and new images
  const images = utility.images && utility.images.length > 0 
      ? utility.images 
      : utility.image 
          ? [{ id: 'legacy', url: utility.image, description: '' }] 
          : [];

  // Find siblings in the same series
  const siblings = useMemo(() => {
      if (!utility.seriesId) return [];
      return allUtilities.filter(u => u.seriesId === utility.seriesId && u.id !== utility.id);
  }, [utility, allUtilities]);

  const handleShareFile = async () => {
      const jsonString = JSON.stringify(utility, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const safeTitle = utility.title.replace(/\s+/g, '_');
      const filename = `${utility.mapId}_${utility.type}_${safeTitle}_${utility.id}.utility`;
      
      const success = await shareFile(blob, filename, "分享道具", `CS2道具：${utility.title}`);
      if (!success) {
          downloadBlob(blob, filename);
      }
  };

  const handleShareImage = async () => {
      setIsGeneratingImage(true);
      try {
          const element = document.getElementById('utility-view-container');
          if (element) {
              const canvas = await html2canvas(element, {
                  backgroundColor: document.documentElement.classList.contains('dark') ? '#0a0a0a' : '#ffffff',
                  useCORS: true,
                  scale: 2,
                  ignoreElements: (el) => el.classList.contains('no-capture'), // Optional: ignore specific elements
                  onclone: (clonedDoc) => {
                      const clonedElement = clonedDoc.getElementById('utility-view-container');
                      if (clonedElement) {
                          // Force width to avoid mobile layout quirks
                          clonedElement.style.width = '600px'; 
                          clonedElement.style.height = 'auto';
                          clonedElement.style.overflow = 'visible';
                          clonedElement.style.position = 'static';
                          
                          // Reset typography to system fonts
                          const allElements = clonedElement.querySelectorAll('*');
                          allElements.forEach((el) => {
                              const e = el as HTMLElement;
                              e.style.fontFamily = 'sans-serif';
                              e.style.letterSpacing = 'normal';
                              e.style.lineHeight = '1.4';
                          });
                      }
                  }
              });
              
              canvas.toBlob(async (blob) => {
                  if (blob) {
                      const safeTitle = utility.title.replace(/\s+/g, '_');
                      const filename = `${safeTitle}_card.png`;
                      const success = await shareFile(blob, filename, "分享道具图片", `CS2道具：${utility.title}`);
                      if (!success) {
                          downloadBlob(blob, filename);
                      }
                  }
                  setIsGeneratingImage(false);
                  setShowShareModal(false);
              }, 'image/png');
          }
      } catch (e) {
          console.error("Image generation failed", e);
          setIsGeneratingImage(false);
          setShowShareModal(false);
          alert("图片生成失败");
      }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-neutral-950 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md sticky top-0 z-10">
            <button onClick={onBack} className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors pl-0 pr-4 py-2">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                 <span className="font-bold text-sm">返回</span>
            </button>
            
            <div className="flex items-center gap-2 max-w-[50%]">
                <h2 className="font-bold text-neutral-900 dark:text-white text-sm truncate text-center">
                    {utility.title}
                </h2>
            </div>

            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setShowShareModal(true)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="分享"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
                {onEdit && (
                    <button 
                        onClick={onEdit}
                        className="text-blue-600 dark:text-blue-400 text-xs font-bold px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                    >
                        编辑
                    </button>
                )}
                {onDelete && (
                    <button 
                        onClick={onDelete}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="删除"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}
            </div>
        </div>

        {/* Scrollable Content */}
        <div id="utility-view-container" className="flex-1 overflow-y-auto p-4 pb-20 overscroll-contain bg-white dark:bg-neutral-950">
             {/* Header Info */}
             <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded ${config.color}`}>
                        {config.label}
                    </span>
                    <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700">
                        {utility.site} 区
                    </span>
                    {tolerance && (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${tolerance.color}`}>
                            {tolerance.label}
                        </span>
                    )}
                    {utility._isTemp && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            已编辑
                        </span>
                    )}
                </div>
                
                <h1 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 leading-tight">{utility.title}</h1>
                
                <div className="flex items-center gap-4 text-xs text-neutral-500 font-medium">
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {utility.metadata?.author || 'Unknown'}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[10px] opacity-50">ID: {utility.id}</span>
                </div>
             </div>

             {/* Series / Variants Section */}
             {siblings.length > 0 && (
                 <div className="mb-6 no-capture">
                     <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        系列相关投掷 ({siblings.length})
                     </h4>
                     <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                         {/* Current Item (Active State) */}
                         <div className="shrink-0 w-32 p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 opacity-100 ring-2 ring-blue-500/50">
                             <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1">当前查看</div>
                             <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                                 {utility.variantLabel || utility.title}
                             </div>
                         </div>
                         
                         {/* Siblings */}
                         {siblings.map(sib => (
                             <button
                                key={sib.id}
                                onClick={() => onSelectSibling && onSelectSibling(sib)}
                                className="shrink-0 w-32 p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left"
                             >
                                 <div className="flex justify-between items-center mb-1">
                                     <span className="text-[9px] font-bold text-neutral-400">变体</span>
                                     {sib.tolerance && (
                                         <span className={`w-1.5 h-1.5 rounded-full ${toleranceConfig[sib.tolerance].color.split(' ')[0].replace('text-', 'bg-')}`}></span>
                                     )}
                                 </div>
                                 <div className="text-xs font-bold text-neutral-600 dark:text-neutral-300 truncate">
                                     {sib.variantLabel || sib.title}
                                 </div>
                             </button>
                         ))}
                     </div>
                 </div>
             )}

             {/* Images Gallery */}
             {images.length > 0 ? (
                <div className="space-y-6 mb-6">
                    {images.map((img, idx) => (
                        <div key={idx} className="relative rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm group">
                            <img 
                                src={img.url} 
                                alt={img.description || utility.title} 
                                className="w-full h-auto object-contain max-h-[50vh] bg-black/5 dark:bg-black/20"
                                onClick={() => setSelectedImageIndex(idx)}
                            />
                            {img.description && (
                                <div className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md p-3 text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                                    {img.description}
                                </div>
                            )}
                            <div 
                                className="absolute top-2 right-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-zoom-in no-capture"
                                onClick={() => setSelectedImageIndex(idx)}
                            >
                                <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded-full font-bold backdrop-blur-md">
                                    放大
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
             ) : (
                 <div className="mb-6 h-32 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-400 text-xs border border-dashed border-neutral-300 dark:border-neutral-800">
                     暂无参考图片
                 </div>
             )}

             {/* Content */}
             <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl p-5 border border-neutral-100 dark:border-neutral-800">
                 <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    详细说明
                </h4>
                <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                    {utility.content}
                </p>
             </div>
             
             {/* Watermark for screenshot */}
            <div className="text-center mt-8 pb-4 opacity-30 text-[10px] font-bold uppercase tracking-widest select-none">
                Shared via TacBook CS2
            </div>
        </div>

        {/* Full Screen Image Slider Modal */}
        {selectedImageIndex !== null && images.length > 0 && (
            <div 
                className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-0 animate-in fade-in duration-200"
                onClick={() => setSelectedImageIndex(null)}
            >
                <div 
                    className="flex overflow-x-auto snap-x snap-mandatory w-full h-full items-center no-scrollbar"
                    onClick={e => e.stopPropagation()}
                >
                    {images.map((img, idx) => (
                        <div 
                            key={idx} 
                            id={`slide-${idx}`}
                            className="snap-center shrink-0 w-full h-full flex flex-col items-center justify-center p-4 relative"
                            style={{ display: idx === selectedImageIndex ? 'flex' : 'none' }} // Simple logic for now, could be improved with real carousel
                        >
                            <img 
                                src={img.url} 
                                alt="Full View" 
                                className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain" 
                            />
                            {img.description && (
                                <div className="mt-6 bg-white/10 px-4 py-2 rounded-xl text-white text-sm backdrop-blur-md max-w-lg text-center">
                                    {img.description}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2">
                    {images.length > 1 && images.map((_, idx) => (
                        <button 
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(idx); }}
                            className={`w-2 h-2 rounded-full transition-colors ${idx === selectedImageIndex ? 'bg-white' : 'bg-white/30'}`}
                        />
                    ))}
                </div>

                <button 
                    onClick={() => setSelectedImageIndex(null)}
                    className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2"
                >
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                
                {/* Navigation Arrows */}
                {images.length > 1 && (
                    <>
                        <button 
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/30 hover:text-white"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImageIndex(prev => (prev! > 0 ? prev! - 1 : images.length - 1));
                            }}
                        >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button 
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/30 hover:text-white"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImageIndex(prev => (prev! < images.length - 1 ? prev! + 1 : 0));
                            }}
                        >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </>
                )}
            </div>
        )}

        <ShareOptionsModal 
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            onShareFile={handleShareFile}
            onShareImage={handleShareImage}
            title={`分享 "${utility.title}"`}
            isGenerating={isGeneratingImage}
        />
    </div>
  );
};


import React, { useState, useMemo } from 'react';
import { Tactic } from '../types';
import { ActionList } from './ActionList';
import { exportTacticToZip } from '../utils/exportHelper';
import { shareFile, downloadBlob } from '../utils/shareHelper';
import { ShareOptionsModal } from './ShareOptionsModal';
import { VersionHistoryModal } from './VersionHistoryModal';
import { TacticPrintPreview } from './TacticPrintPreview';
import html2canvas from 'html2canvas';

interface TacticDetailViewProps {
  tactic: Tactic;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestoreVersion?: (data: Tactic, timestamp: number) => void;
  highlightRole?: string;
}

export const TacticDetailView: React.FC<TacticDetailViewProps> = ({ tactic, onBack, onEdit, onDelete, onRestoreVersion, highlightRole }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const handlePrint = () => {
      setShowPrintPreview(true);
  };

  const createExportBlob = async () => {
      const blob = await exportTacticToZip(tactic);
      const safeTitle = (tactic.title || (tactic as any).name || 'untitled').replace(/\s+/g, '_');
      const filename = `${tactic.mapId}_${tactic.side}_${safeTitle}_${tactic.id}.tactic`;
      return { blob, filename };
  };

  const handleShareFile = async () => {
      try {
          const { blob, filename } = await createExportBlob();
          await shareFile(blob, filename, "分享战术", `CS2战术：${tactic.title || (tactic as any).name || '无标题'}`);
          setShowShareModal(false);
      } catch (e) {
          console.error("Share failed", e);
      }
  };

  const handleDownloadFile = async () => {
      try {
          const { blob, filename } = await createExportBlob();
          downloadBlob(blob, filename);
          setShowShareModal(false);
      } catch (e) {
          console.error("Download failed", e);
      }
  };

  const generateImage = async (callback: (blob: Blob) => void) => {
      setIsGeneratingImage(true);
      try {
          const element = document.getElementById('tactic-view-container');
          if (element) {
              const canvas = await html2canvas(element, {
                  backgroundColor: document.documentElement.classList.contains('dark') ? '#0a0a0a' : '#ffffff',
                  useCORS: true,
                  scale: 2,
                  onclone: (clonedDoc) => {
                      const clonedElement = clonedDoc.getElementById('tactic-view-container');
                      if (clonedElement) {
                          clonedElement.style.width = '600px'; 
                          clonedElement.style.height = 'auto';
                          clonedElement.style.overflow = 'visible';
                          clonedElement.style.position = 'static';
                          
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
              
              canvas.toBlob((blob) => {
                  if (blob) callback(blob);
                  setIsGeneratingImage(false);
                  setShowShareModal(false);
              }, 'image/png');
          } else {
             setIsGeneratingImage(false);
          }
      } catch (e) {
          console.error("Image generation failed", e);
          setIsGeneratingImage(false);
          setShowShareModal(false);
          alert("图片生成失败");
      }
  };

  const handleShareImage = () => {
      generateImage(async (blob) => {
          const safeTitle = (tactic.title || (tactic as any).name || 'untitled').replace(/\s+/g, '_');
          const filename = `${safeTitle}_card.png`;
          await shareFile(blob, filename, "分享战术图片", `CS2战术：${tactic.title || (tactic as any).name || '无标题'}`);
      });
  };

  const handleDownloadImage = () => {
      generateImage((blob) => {
          const safeTitle = (tactic.title || (tactic as any).name || 'untitled').replace(/\s+/g, '_');
          const filename = `${safeTitle}_card.png`;
          downloadBlob(blob, filename);
      });
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
                    {tactic.title || (tactic as any).name || '无标题战术'}
                </h2>
            </div>

            <div className="flex items-center gap-2">
                <button 
                    onClick={handlePrint}
                    className="p-2 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="打印 (Print)"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                </button>
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
                {onRestoreVersion && (
                    <button 
                        onClick={() => setShowVersionModal(true)}
                        className="p-2 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="版本历史"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
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
        <div id="tactic-view-container" className="flex-1 overflow-y-auto p-4 pb-20 overscroll-contain bg-white dark:bg-neutral-950">
             {/* Header Info */}
             <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-3">
                    {(tactic.tags || []).map((tag, index) => (
                    <span key={`${tag.label}-${index}`} className={`
                        text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded
                        ${tag.category === 'economy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        tag.category === 'playstyle' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}
                    `}>
                        {tag.label}
                    </span>
                    ))}
                </div>
                
                <h1 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 leading-tight">{tactic.title || (tactic as any).name || '无标题战术'}</h1>
                
                <div className="flex items-center gap-4 text-xs text-neutral-500 font-medium">
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {tactic.metadata?.author || 'Unknown'}
                    </span>
                    <span>•</span>
                    <span>{tactic.metadata?.lastUpdated || ''}</span>
                     {tactic.metadata?.difficulty && (
                        <>
                            <span>•</span>
                             <span className={`
                                ${tactic.metadata.difficulty === 'Easy' ? 'text-green-500' : 
                                tactic.metadata.difficulty === 'Medium' ? 'text-yellow-500' : 'text-red-500'}
                             `}>{tactic.metadata.difficulty}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Document Sections (Strat Sheet) */}
            {tactic.sections && tactic.sections.length > 0 && (
                <div className="mb-8">
                     <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        战术模块
                    </h4>
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                        {tactic.sections.map(section => (
                            <div key={section.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col break-inside-avoid w-full">
                                <h5 className="font-black text-sm uppercase tracking-wider text-neutral-900 dark:text-white mb-3 border-b border-neutral-200 dark:border-neutral-800 pb-2">{section.title}</h5>
                                <div className="text-xs text-neutral-700 dark:text-neutral-300 font-medium whitespace-pre-wrap leading-relaxed">
                                    {section.content}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action List (Legacy Timeline) */}
            {tactic.actions && tactic.actions.length > 0 && (
            <div className="mb-4">
                 <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    战术流程
                </h4>
                <ActionList 
                    actions={tactic.actions || []} 
                    highlightRole={highlightRole}
                />
            </div>
            )}
            
            {/* Watermark for screenshot */}
            <div className="text-center mt-8 pb-4 opacity-30 text-[10px] font-bold uppercase tracking-widest select-none">
                Shared via TacBook CS2
            </div>
        </div>
        
        <ShareOptionsModal 
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            onShareFile={handleShareFile}
            onDownloadFile={handleDownloadFile}
            onShareImage={handleShareImage}
            onDownloadImage={handleDownloadImage}
            title={`分享 "${tactic.title || (tactic as any).name || '无标题战术'}"`}
            isGenerating={isGeneratingImage}
        />

        {onRestoreVersion && (
            <VersionHistoryModal 
                isOpen={showVersionModal}
                onClose={() => setShowVersionModal(false)}
                itemId={tactic.id}
                currentItem={tactic}
                onRestore={onRestoreVersion}
            />
        )}

        {showPrintPreview && (
            <TacticPrintPreview tactic={tactic} onClose={() => setShowPrintPreview(false)} />
        )}
    </div>
  );
};

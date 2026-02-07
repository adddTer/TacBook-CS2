
import React, { useState, useEffect } from 'react';
import { Tactic, Action, Side, MapId, Tag, Utility, ImageAttachment, ContentGroup } from '../types';
import { generateId } from '../utils/idGenerator';
import { getRoles } from '../constants/roles';
import { ALL_TAGS } from '../constants/tags';
import { UTILITIES } from '../data/utilities';
import { AiConfigModal } from './AiConfigModal';
import { CopilotChat } from './ai/CopilotChat';
import { compressImage } from '../utils/imageHelper';
import { exportTacticToZip } from '../utils/exportHelper';
import { shareFile, downloadBlob } from '../utils/shareHelper';
import { ShareOptionsModal } from './ShareOptionsModal';
import html2canvas from 'html2canvas';

interface TacticEditorProps {
  initialTactic?: Tactic;
  onCancel: () => void;
  onSave: (tactic: Tactic, targetGroupId: string) => void;
  currentMapId: MapId;
  currentSide: Side;
  writableGroups: ContentGroup[];
}

const DRAFT_KEY = 'tacbook_tactic_draft';

// Helper to get default author
const getDefaultAuthor = () => localStorage.getItem('tacbook_default_author') || '';

export const TacticEditor: React.FC<TacticEditorProps> = ({
  initialTactic,
  onCancel,
  onSave,
  currentMapId,
  currentSide,
  writableGroups
}) => {
  // --- Form State ---
  const [formData, setFormData] = useState<Partial<Tactic>>({
    id: generateId('1'), // Tactics start with 1
    mapId: currentMapId,
    side: currentSide,
    site: 'A',
    tags: [],
    metadata: {
        author: '',
        lastUpdated: new Date().toISOString().split('T')[0],
        difficulty: 'Medium'
    },
    actions: [],
    map_visual: '',
    title: ''
  });

  // Target Group selection
  const [targetGroupId, setTargetGroupId] = useState<string>('');

  // --- View State ---
  const [isAiOpen, setIsAiOpen] = useState(false); // Controls AI Sidebar on Desktop / Modal on Mobile
  const [isAiMaximized, setIsAiMaximized] = useState(false); // New: Controls PC Fullscreen
  
  // --- Image State ---
  const [mapImagePreview, setMapImagePreview] = useState<string>('');
  
  // --- Utility Modal State ---
  const [showUtilityModal, setShowUtilityModal] = useState<string | null>(null);
  const [utilitySearchQuery, setUtilitySearchQuery] = useState('');

  // --- AI State ---
  const [showAiConfig, setShowAiConfig] = useState(false);
  
  // --- Share State ---
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Initialize
  useEffect(() => {
    if (initialTactic) {
      setFormData(JSON.parse(JSON.stringify(initialTactic))); // Deep copy
      setMapImagePreview(initialTactic.map_visual || '');
      // If editing existing, try to keep it in the same group IF it's writable.
      // If not writable (Read-Only group), default to the first writable group (Save Copy).
      if (initialTactic.groupId && writableGroups.some(g => g.metadata.id === initialTactic.groupId)) {
          setTargetGroupId(initialTactic.groupId);
      } else if (writableGroups.length > 0) {
          setTargetGroupId(writableGroups[0].metadata.id);
      }
    } else {
      // New Tactic
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
          try {
              const parsed = JSON.parse(draft);
              if (parsed.mapId === currentMapId) {
                 setFormData(parsed);
                 setMapImagePreview(parsed.map_visual || '');
              }
          } catch (e) {}
      } else {
          setFormData(prev => ({ 
              ...prev, 
              metadata: { ...prev.metadata!, author: getDefaultAuthor() } 
          }));
      }
      // Default to first writable group
      if (writableGroups.length > 0) {
          setTargetGroupId(writableGroups[0].metadata.id);
      }
    }
  }, []); 

  // Save draft
  useEffect(() => {
     if (!initialTactic) {
         localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
     }
  }, [formData, initialTactic]);

  const updateField = (key: keyof Tactic, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleTag = (tag: Tag) => {
    const currentTags = formData.tags || [];
    const exists = currentTags.some(t => t.label === tag.label);
    if (exists) {
      updateField('tags', currentTags.filter(t => t.label !== tag.label));
    } else {
      updateField('tags', [...currentTags, tag]);
    }
  };

  const addAction = () => {
    const newAction: Action = { id: generateId(), who: '全员', content: '', time: '1:55', type: 'movement', images: [] };
    updateField('actions', [...(formData.actions || []), newAction]);
  };
  const updateAction = (id: string, key: keyof Action, value: any) => {
    updateField('actions', (formData.actions || []).map(a => a.id === id ? { ...a, [key]: value } : a));
  };
  const removeAction = (id: string) => {
    updateField('actions', (formData.actions || []).filter(a => a.id !== id));
  };
  const handleActionAddImage = async (actionId: string, file: File) => {
      const compressed = await compressImage(file);
      const newImage: ImageAttachment = { id: generateId('img'), url: compressed, description: '' };
      updateField('actions', (formData.actions || []).map(a => a.id === actionId ? { ...a, images: [...(a.images || []), newImage] } : a));
  };
   const handleActionRemoveImage = (actionId: string, imageId: string) => {
      updateField('actions', (formData.actions || []).map(a => a.id === actionId ? { ...a, images: (a.images || []).filter(i => i.id !== imageId) } : a));
  };
  const handleActionImageDesc = (actionId: string, imageId: string, desc: string) => {
      updateField('actions', (formData.actions || []).map(a => a.id === actionId ? { ...a, images: (a.images || []).map(i => i.id === imageId ? {...i, description: desc} : i) } : a));
  };
  const linkUtilityToAction = (actionId: string, utility: Utility) => {
      updateAction(actionId, 'utilityId', utility.id);
      const action = formData.actions?.find(a => a.id === actionId);
      if (action && !action.content) {
          updateAction(actionId, 'content', `投掷${utility.title}。`);
          updateAction(actionId, 'type', 'utility');
      }
      setShowUtilityModal(null);
  };
  const handleMapImageUpload = async (file: File) => {
      const compressed = await compressImage(file);
      setMapImagePreview(compressed);
      updateField('map_visual', compressed);
  };

  // --- Save Logic ---
  const validate = () => {
       if (!formData.title) {
          alert("请输入战术标题"); 
          return false;
      }
      if (!targetGroupId) {
          alert("请选择一个可编辑的战术包进行保存。如果没有，请先在主页新建战术包。");
          return false;
      }
      return true;
  };

  const handleSaveToGroup = () => {
      if (!validate()) return;
      onSave(formData as Tactic, targetGroupId);
      if (!initialTactic) localStorage.removeItem(DRAFT_KEY);
  };

  const prepareExport = async () => {
      if (!formData.title) return null;
      try {
          const zipBlob = await exportTacticToZip(formData as Tactic);
          const safeTitle = formData.title.replace(/\s+/g, '_');
          const filename = `${formData.mapId}_${formData.side}_${safeTitle}_${formData.id}.tactic`;
          return { blob: zipBlob, filename, title: formData.title };
      } catch (e) {
          console.error("Export prep failed", e);
          return null;
      }
  };

  const handleShareFile = async () => {
      const result = await prepareExport();
      if (!result) {
          alert("请先填写战术标题");
          return;
      }
      const success = await shareFile(result.blob, result.filename, "分享战术", `CS2战术分享：${result.title}`);
      if (!success) {
           downloadBlob(result.blob, result.filename);
      }
      setShowShareModal(false);
  };

  const handleShareImage = async () => {
      setIsGeneratingImage(true);
      try {
          const element = document.getElementById('editor-view-container');
          if (element) {
               // Force light mode for consistent screenshot if needed, or keep current
               const canvas = await html2canvas(element, {
                  backgroundColor: document.documentElement.classList.contains('dark') ? '#0a0a0a' : '#ffffff',
                  useCORS: true,
                  scale: 2,
                  ignoreElements: (el) => el.classList.contains('no-capture')
              });
              
              canvas.toBlob(async (blob) => {
                  if (blob) {
                      const safeTitle = formData.title ? formData.title.replace(/\s+/g, '_') : 'tactic';
                      const filename = `${safeTitle}_card.png`;
                      const success = await shareFile(blob, filename, "分享战术图片", `CS2战术：${formData.title}`);
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

  // --- Constants ---
  const currentRoles = getRoles(formData.side as Side || 'T', formData.mapId || 'mirage');
  const groupedTags = {
      economy: ALL_TAGS.filter(t => t.category === 'economy'),
      playstyle: ALL_TAGS.filter(t => t.category === 'playstyle'),
      utility: ALL_TAGS.filter(t => t.category === 'utility'),
  };
  const filteredUtilities = UTILITIES.filter(u => {
      return u.mapId === formData.mapId && u.side === formData.side && (u.title.includes(utilitySearchQuery) || u.type.includes(utilitySearchQuery));
  });
  const applyDefaultAuthor = () => {
      const def = getDefaultAuthor();
      if(def) updateField('metadata', { ...formData.metadata, author: def });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-neutral-950 flex flex-col md:flex-row animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Main Editor Area - Always rendered to prevent background flash, obscured when AI is maximized */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isAiOpen && !isAiMaximized ? 'mr-0 md:mr-96' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md sticky top-0 z-20">
                <button onClick={onCancel} className="text-neutral-500 font-bold hover:text-neutral-900 dark:hover:text-white transition-colors">
                    取消
                </button>
                
                {/* Center: Copilot Button (Visible & Centered on Mobile) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                     <button 
                        onClick={() => { setIsAiOpen(!isAiOpen); setIsAiMaximized(false); }} 
                        className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${isAiOpen ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span>Copilot</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setShowShareModal(true)} className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-2 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    </button>
                    <button 
                        onClick={handleSaveToGroup} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        保存
                    </button>
                </div>
            </div>

            {/* Editor Content */}
            <div id="editor-view-container" className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
                <div className="max-w-[1920px] mx-auto p-4 lg:p-8">
                     
                     {/* Save Target Group Warning */}
                     {writableGroups.length === 0 ? (
                         <div className="mb-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left no-capture">
                             <div>
                                 <h4 className="font-bold text-red-700 dark:text-red-400 text-sm">只读模式 (Read Only Mode)</h4>
                                 <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">当前没有可编辑的战术包。您可以编辑此战术，但需要新建一个战术包才能保存。</p>
                             </div>
                             <button onClick={() => alert("请先在主页左下角点击'战术包管理'，然后新建一个空白组。")} className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap">
                                 如何新建？
                             </button>
                         </div>
                     ) : (
                         <div className="mb-6 flex items-center justify-end no-capture">
                             <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-1 pr-3">
                                 <div className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded text-[10px] font-bold text-neutral-500 uppercase">保存到</div>
                                 <select 
                                    value={targetGroupId}
                                    onChange={(e) => setTargetGroupId(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-neutral-900 dark:text-white outline-none cursor-pointer min-w-[100px]"
                                 >
                                     {writableGroups.map(g => (
                                         <option key={g.metadata.id} value={g.metadata.id}>{g.metadata.name}</option>
                                     ))}
                                 </select>
                             </div>
                         </div>
                     )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                        {/* LEFT COLUMN: Metadata (5 cols) */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Basic Info Card */}
                            <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">ID: {formData.id}</span>
                                    <div className="flex gap-2">
                                        <select 
                                            value={formData.side} 
                                            onChange={e => updateField('side', e.target.value)} 
                                            className={`text-xs font-bold p-1.5 rounded-lg border-2 cursor-pointer outline-none ${formData.side === 'T' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}
                                        >
                                            <option value="T">T Side</option>
                                            <option value="CT">CT Side</option>
                                        </select>
                                        <select 
                                            value={formData.site} 
                                            onChange={e => updateField('site', e.target.value)} 
                                            className="bg-neutral-100 dark:bg-neutral-800 text-xs font-bold p-1.5 rounded-lg border-2 border-transparent cursor-pointer outline-none focus:border-neutral-300 dark:text-white"
                                        >
                                            <option value="A">A Site</option>
                                            <option value="Mid">Mid</option>
                                            <option value="B">B Site</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <input 
                                        type="text" 
                                        value={formData.title} 
                                        onChange={e => updateField('title', e.target.value)} 
                                        placeholder="输入战术标题..." 
                                        className="w-full text-xl font-black bg-transparent border-none p-0 focus:ring-0 placeholder-neutral-300 dark:text-white leading-tight" 
                                    />
                                    <div className="h-0.5 w-10 bg-blue-500 mt-2 rounded-full"></div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">作者</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={formData.metadata?.author || ''} 
                                            onChange={e => updateField('metadata', { ...formData.metadata, author: e.target.value })} 
                                            className="flex-1 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-xl text-sm font-medium dark:text-white border border-neutral-100 dark:border-neutral-700 focus:border-blue-500 outline-none transition-colors" 
                                            placeholder="Unknown"
                                        />
                                        <button onClick={applyDefaultAuthor} className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-3 rounded-xl font-bold hover:bg-neutral-200 transition-colors">
                                            使用默认
                                        </button>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">标签 (Tags)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[...groupedTags.economy, ...groupedTags.playstyle, ...groupedTags.utility].map(tag => {
                                            const isSelected = formData.tags?.some(t => t.label === tag.label);
                                            return (
                                                <button 
                                                    key={tag.label} 
                                                    onClick={() => toggleTag(tag)} 
                                                    className={`
                                                        px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95
                                                        ${isSelected 
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20' 
                                                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-300'}
                                                    `}
                                                >
                                                    {tag.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Map Visual Card */}
                            <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">战术示意图</label>
                                <label className="block w-full aspect-video bg-neutral-50 dark:bg-neutral-950 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-center cursor-pointer overflow-hidden relative group hover:border-blue-400 transition-colors">
                                    {mapImagePreview ? (
                                        <>
                                            <img src={mapImagePreview} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">更换图片</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center text-neutral-400 group-hover:text-blue-500 transition-colors">
                                            <svg className="w-8 h-8 mx-auto mb-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            <span className="text-xs font-bold">点击上传图片</span>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleMapImageUpload(e.target.files[0])} />
                                </label>
                            </div>

                            {/* Loadout Card */}
                            <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">配装分配 (Loadout)</label>
                                <div className="space-y-2">
                                    {(formData.loadout && formData.loadout.length > 0 ? formData.loadout : currentRoles.map(r => ({ role: r, equipment: '' }))).map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                            <span className="w-16 font-bold text-neutral-600 dark:text-neutral-400 shrink-0 text-right">{item.role}</span>
                                            <input 
                                                type="text" 
                                                value={item.equipment} 
                                                onChange={(e) => { const newLoadout = [...(formData.loadout || currentRoles.map(r => ({ role: r, equipment: '' })))]; newLoadout[idx] = { ...newLoadout[idx], equipment: e.target.value }; updateField('loadout', newLoadout); }} 
                                                placeholder="例如: 半甲, 烟闪..." 
                                                className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 focus:border-blue-500 outline-none dark:text-white transition-colors" 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Actions (7 cols) */}
                        <div className="lg:col-span-7 space-y-4">
                             <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm min-h-[600px] flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">战术步骤 (Timeline)</label>
                                    <button onClick={addAction} className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        添加步骤
                                    </button>
                                </div>
                                
                                <div className="space-y-4 flex-1">
                                    {formData.actions?.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-48 text-neutral-400 border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-xl">
                                            <span className="text-xs">暂无步骤，点击右上角添加</span>
                                        </div>
                                    )}

                                    {formData.actions?.map((action, idx) => {
                                        const displayImages = action.images || [];
                                        if (action.image && !displayImages.some(img => img.url === action.image)) {
                                            displayImages.unshift({ id: 'legacy', url: action.image, description: 'Legacy Image' });
                                        }
                                        return (
                                        <div key={action.id} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 rounded-xl p-3 relative group transition-all hover:shadow-md hover:border-neutral-200 dark:hover:border-neutral-700">
                                            <button 
                                                onClick={() => removeAction(action.id)} 
                                                className="absolute top-2 right-2 text-neutral-300 hover:text-red-500 p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                                                title="删除步骤"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                            
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1">
                                                    <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    <input type="text" value={action.time || ''} onChange={e => updateAction(action.id, 'time', e.target.value)} placeholder="0:00" className="w-10 bg-transparent text-xs font-mono font-bold dark:text-white outline-none text-center" />
                                                </div>
                                                
                                                <select value={action.who} onChange={e => updateAction(action.id, 'who', e.target.value)} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs font-bold dark:text-white outline-none cursor-pointer hover:border-blue-300 transition-colors">
                                                    <option value="全员">全员</option>
                                                    {currentRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                                
                                                <select value={action.type} onChange={e => updateAction(action.id, 'type', e.target.value)} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs dark:text-white outline-none cursor-pointer">
                                                    <option value="movement">移动</option>
                                                    <option value="utility">道具</option>
                                                    <option value="frag">击杀</option>
                                                    <option value="hold">架枪</option>
                                                </select>
                                            </div>
                                            
                                            <textarea 
                                                value={action.content} 
                                                onChange={e => updateAction(action.id, 'content', e.target.value)} 
                                                placeholder="描述具体行动..." 
                                                rows={2} 
                                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2.5 text-sm resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-2 dark:text-white transition-shadow" 
                                            />
                                            
                                            <div className="flex justify-between items-center pt-1">
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => setShowUtilityModal(action.id)} 
                                                        className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${action.utilityId ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm' : 'bg-white dark:bg-neutral-900 text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'}`}
                                                    >
                                                        {action.utilityId ? (
                                                            <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>已关联</>
                                                        ) : (
                                                            <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>关联道具</>
                                                        )}
                                                    </button>
                                                    
                                                    <label className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all bg-white dark:bg-neutral-900 text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100`}>
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        图片
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleActionAddImage(action.id, e.target.files[0])} />
                                                    </label>
                                                </div>
                                                <span className="text-[9px] font-mono text-neutral-300">#{action.id}</span>
                                            </div>
                                            
                                            {/* Action Images List */}
                                            {displayImages.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    {displayImages.map((img) => (
                                                        <div key={img.id} className="flex gap-2 items-start bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-1.5 rounded-lg">
                                                            <div className="w-10 h-10 shrink-0 bg-neutral-100 dark:bg-neutral-800 rounded-md overflow-hidden border border-neutral-100 dark:border-neutral-800">
                                                                <img src={img.url} className="w-full h-full object-cover" />
                                                            </div>
                                                            <input 
                                                                type="text" 
                                                                value={img.description || ''} 
                                                                onChange={(e) => handleActionImageDesc(action.id, img.id, e.target.value)} 
                                                                placeholder="图片描述..." 
                                                                className="flex-1 bg-transparent text-[10px] py-1 outline-none dark:text-neutral-300 placeholder-neutral-400 min-w-0" 
                                                            />
                                                            <button onClick={() => handleActionRemoveImage(action.id, img.id)} className="text-neutral-400 hover:text-red-500 p-1 transition-colors">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )})}
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* AI Sidebar (Desktop Slide-over / Mobile Fullscreen) */}
        <div 
            className={`
                fixed inset-y-0 right-0 z-[110] bg-white dark:bg-neutral-950 shadow-2xl transform transition-all duration-300 ease-in-out border-l border-neutral-200 dark:border-neutral-800
                ${isAiOpen ? 'translate-x-0' : 'translate-x-full'}
                ${isAiMaximized ? 'w-full' : 'w-full md:w-96'}
            `}
        >
            <CopilotChat 
                currentTactic={formData}
                onApplySnapshot={(snap) => setFormData(prev => ({...prev, ...snap}))}
                onUpdateTactic={(newTactic) => setFormData(prev => ({...prev, ...newTactic}))}
                onOpenConfig={() => setShowAiConfig(true)}
                onClose={() => setIsAiOpen(false)}
                isMaximized={isAiMaximized}
                onToggleMaximize={() => setIsAiMaximized(!isAiMaximized)}
            />
        </div>

        {/* Utility Modal */}
        {showUtilityModal && (
            <div className="absolute inset-0 z-[150] bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md animate-in zoom-in-95 duration-200 flex flex-col p-4">
                <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col h-full max-w-2xl mx-auto w-full overflow-hidden">
                    <div className="flex items-center gap-3 p-4 border-b border-neutral-100 dark:border-neutral-800">
                        <button onClick={() => setShowUtilityModal(null)} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                            <svg className="w-6 h-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div className="flex-1 relative">
                             <svg className="w-5 h-5 text-neutral-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                             <input type="text" value={utilitySearchQuery} onChange={e => setUtilitySearchQuery(e.target.value)} placeholder="搜索道具 (烟, 闪...)" autoFocus className="w-full bg-neutral-100 dark:bg-neutral-950 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none dark:text-white font-bold" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredUtilities.map(u => (
                            <div key={u.id} onClick={() => linkUtilityToAction(showUtilityModal, u)} className="flex gap-4 p-3 rounded-xl border border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 cursor-pointer transition-all group">
                                <div className="w-14 h-14 bg-neutral-200 dark:bg-neutral-950 rounded-lg overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-800">
                                    {u.image ? <img src={u.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/> : null}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${u.type === 'smoke' ? 'bg-neutral-200 text-neutral-700' : 'bg-yellow-100 text-yellow-700'}`}>{u.type}</span>
                                        <span className="text-[10px] text-neutral-400 font-mono">#{u.id}</span>
                                    </div>
                                    <div className="text-sm font-bold dark:text-white truncate">{u.title}</div>
                                </div>
                                <div className="flex items-center text-blue-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                                    选择
                                </div>
                            </div>
                        ))}
                        {filteredUtilities.length === 0 && (
                            <div className="text-center py-10 text-neutral-400 text-sm">未找到相关道具</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {showAiConfig && <AiConfigModal onClose={() => setShowAiConfig(false)} onSave={() => setShowAiConfig(false)} />}
        
        <ShareOptionsModal 
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            onShareFile={handleShareFile}
            onShareImage={handleShareImage}
            title={`分享 "${formData.title || '战术'}"`}
            isGenerating={isGeneratingImage}
        />
    </div>
  );
};

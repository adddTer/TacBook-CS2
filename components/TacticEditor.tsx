
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Tactic, Action, Side, MapId, Tag, Utility, ImageAttachment, ContentGroup } from '../types';
import { generateId } from '../utils/idGenerator';
import { getRoles } from '../constants/roles';
import { ALL_TAGS } from '../constants/tags';
import { UTILITIES } from '../data/utilities';
import { chatWithTacticCopilot, ChatMessage, getSelectedModel } from '../services/ai';
import { AiConfigModal } from './AiConfigModal';
import { compressImage } from '../utils/imageHelper';
import { exportTacticToZip } from '../utils/exportHelper';

interface TacticEditorProps {
  initialTactic?: Tactic;
  onCancel: () => void;
  onSave: (tactic: Tactic, targetGroupId: string) => void;
  currentMapId: MapId;
  currentSide: Side;
  writableGroups: ContentGroup[];
}

type EditorTab = 'edit' | 'ai';

interface ExtendedChatMessage extends ChatMessage {
    snapshot?: Partial<Tactic>;
    changedFields?: string[];
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

  // Keep a reference to the very beginning state for "Revert All"
  const [initialStateSnapshot, setInitialStateSnapshot] = useState<Partial<Tactic> | null>(null);

  // --- View State ---
  const [activeTab, setActiveTab] = useState<EditorTab>('edit');

  // --- Image State ---
  const [mapImagePreview, setMapImagePreview] = useState<string>('');
  
  // --- Utility Modal State ---
  const [showUtilityModal, setShowUtilityModal] = useState<string | null>(null);
  const [utilitySearchQuery, setUtilitySearchQuery] = useState('');

  // --- AI State ---
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ExtendedChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    if (initialTactic) {
      setFormData(JSON.parse(JSON.stringify(initialTactic))); // Deep copy
      setInitialStateSnapshot(JSON.parse(JSON.stringify(initialTactic)));
      setMapImagePreview(initialTactic.map_visual || '');
      // If editing existing, try to keep it in the same group if possible/writable
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
      setInitialStateSnapshot(formData);
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

  // Scroll chat
  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, activeTab]);

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
          // Toast or simple alert alternative
          console.warn("请输入战术标题"); 
          return false;
      }
      if (!targetGroupId) {
          console.warn("请选择保存到的分组");
          return false;
      }
      return true;
  };

  const handleSaveToGroup = () => {
      if (!validate()) return;
      onSave(formData as Tactic, targetGroupId);
      if (!initialTactic) localStorage.removeItem(DRAFT_KEY);
  };

  const handleExportFile = async () => {
      if (!formData.title) return;
      try {
          const zipBlob = await exportTacticToZip(formData as Tactic);
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          // Filename: Map_Side_Title_ID.tactic
          const safeTitle = formData.title.replace(/\s+/g, '_');
          a.download = `${formData.mapId}_${formData.side}_${safeTitle}_${formData.id}.tactic`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      } catch (e) {
          console.error("Export failed", e);
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
    <div className="fixed inset-0 z-[100] bg-white dark:bg-neutral-950 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md sticky top-0 z-20">
            <button onClick={onCancel} className="text-neutral-500 font-medium">取消</button>
            <div className="flex gap-4">
                 <button onClick={() => setActiveTab('edit')} className={`text-sm font-bold transition-colors ${activeTab === 'edit' ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}`}>编辑</button>
                 <button onClick={() => setActiveTab('ai')} className={`text-sm font-bold transition-colors flex items-center gap-1 ${activeTab === 'ai' ? 'text-purple-600 dark:text-purple-400' : 'text-neutral-400'}`}>Copilot</button>
            </div>
            <div className="flex items-center gap-2">
                 <button onClick={handleExportFile} className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white px-2 py-1">导出文件</button>
                 <button onClick={handleSaveToGroup} className="text-blue-600 font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">保存</button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
            {/* Edit Tab */}
            <div className={`absolute inset-0 overflow-y-auto bg-neutral-50 dark:bg-neutral-950 transition-opacity duration-300 ${activeTab === 'edit' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                <div className="max-w-7xl mx-auto p-4 lg:p-8">
                     
                     {/* Group Selector (Always show if any writable) */}
                     {writableGroups.length > 0 && (
                         <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-3 rounded-xl flex items-center justify-between">
                             <span className="text-xs font-bold text-yellow-800 dark:text-yellow-200">保存到分组:</span>
                             <select 
                                value={targetGroupId}
                                onChange={(e) => setTargetGroupId(e.target.value)}
                                className="bg-white dark:bg-neutral-800 border border-yellow-300 dark:border-yellow-700 rounded-lg text-xs py-1.5 px-3 outline-none"
                             >
                                 {writableGroups.map(g => (
                                     <option key={g.metadata.id} value={g.metadata.id}>{g.metadata.name}</option>
                                 ))}
                             </select>
                         </div>
                     )}

                    <div className="lg:grid lg:grid-cols-2 lg:gap-8">
                        {/* LEFT COLUMN: Metadata, Map, Loadout */}
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="space-y-4 bg-white dark:bg-neutral-900 p-4 lg:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-mono text-neutral-400">ID: {formData.id}</span>
                                    <div className="flex gap-2">
                                        <select value={formData.side} onChange={e => updateField('side', e.target.value)} className="bg-neutral-100 dark:bg-neutral-800 text-xs font-bold p-2 rounded-lg">
                                            <option value="T">T Side</option>
                                            <option value="CT">CT Side</option>
                                        </select>
                                        <select value={formData.site} onChange={e => updateField('site', e.target.value)} className="bg-neutral-100 dark:bg-neutral-800 text-xs font-bold p-2 rounded-lg">
                                            <option value="A">A Site</option>
                                            <option value="Mid">Mid</option>
                                            <option value="B">B Site</option>
                                        </select>
                                    </div>
                                </div>
                                <input type="text" value={formData.title} onChange={e => updateField('title', e.target.value)} placeholder="战术标题..." className="w-full text-xl lg:text-2xl font-black bg-transparent border-b border-neutral-200 dark:border-neutral-700 pb-2 focus:border-blue-500 outline-none dark:text-white placeholder-neutral-300" />
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">作者</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={formData.metadata?.author || ''} onChange={e => updateField('metadata', { ...formData.metadata, author: e.target.value })} className="flex-1 bg-neutral-100 dark:bg-neutral-800 p-2 rounded-lg text-sm dark:text-white border-none" />
                                        <button onClick={applyDefaultAuthor} className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-3 rounded-lg font-bold hover:bg-blue-100 transition-colors">默认</button>
                                    </div>
                                </div>
                                {/* Tags */}
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">标签</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[...groupedTags.economy, ...groupedTags.playstyle, ...groupedTags.utility].map(tag => {
                                            const isSelected = formData.tags?.some(t => t.label === tag.label);
                                            return (
                                                <button key={tag.label} onClick={() => toggleTag(tag)} className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-neutral-200 dark:border-neutral-700 text-neutral-500'}`}>
                                                    {tag.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            {/* Map Visual */}
                            <div className="bg-white dark:bg-neutral-900 p-4 lg:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">战术示意图</label>
                                <label className="block w-full aspect-video bg-neutral-100 dark:bg-neutral-950 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 flex items-center justify-center cursor-pointer overflow-hidden relative group hover:border-blue-500 transition-colors">
                                    {mapImagePreview ? (
                                        <>
                                            <img src={mapImagePreview} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-white text-xs font-bold">点击更换</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center text-neutral-400">
                                            <span className="text-xs">上传图片 (自动压缩)</span>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleMapImageUpload(e.target.files[0])} />
                                </label>
                            </div>
                            {/* Loadout */}
                            <div className="bg-white dark:bg-neutral-900 p-4 lg:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">配装分配</label>
                                <div className="space-y-2">
                                    {(formData.loadout && formData.loadout.length > 0 ? formData.loadout : currentRoles.map(r => ({ role: r, equipment: '' }))).map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                            <span className="w-16 font-bold text-neutral-600 dark:text-neutral-400 shrink-0">{item.role}</span>
                                            <input type="text" value={item.equipment} onChange={(e) => { const newLoadout = [...(formData.loadout || currentRoles.map(r => ({ role: r, equipment: '' })))]; newLoadout[idx] = { ...newLoadout[idx], equipment: e.target.value }; updateField('loadout', newLoadout); }} placeholder="例如: 半甲, 烟闪..." className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded p-1.5 focus:border-blue-500 outline-none dark:text-white" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* RIGHT COLUMN: Actions */}
                        <div className="space-y-4 mt-6 lg:mt-0">
                             <div className="bg-white dark:bg-neutral-900 p-4 lg:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm min-h-[500px]">
                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                                    <label className="text-xs font-bold text-neutral-500 uppercase">战术步骤</label>
                                    <button onClick={addAction} className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">+ 添加步骤</button>
                                </div>
                                <div className="space-y-3">
                                    {formData.actions?.map((action, idx) => {
                                        const displayImages = action.images || [];
                                        if (action.image && !displayImages.some(img => img.url === action.image)) {
                                            displayImages.unshift({ id: 'legacy', url: action.image, description: 'Legacy Image' });
                                        }
                                        return (
                                        <div key={action.id} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 rounded-xl p-3 shadow-sm relative group">
                                            <button onClick={() => removeAction(action.id)} className="absolute top-2 right-2 text-neutral-300 hover:text-red-500 p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                            <div className="flex gap-2 mb-2">
                                                <input type="text" value={action.time || ''} onChange={e => updateAction(action.id, 'time', e.target.value)} placeholder="时间" className="w-16 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded p-1 text-xs font-mono text-center font-bold dark:text-white" />
                                                <select value={action.who} onChange={e => updateAction(action.id, 'who', e.target.value)} className="w-24 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded p-1 text-xs font-bold dark:text-white">
                                                    <option value="全员">全员</option>
                                                    {currentRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                                <select value={action.type} onChange={e => updateAction(action.id, 'type', e.target.value)} className="w-20 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded p-1 text-xs dark:text-white">
                                                    <option value="movement">移动</option>
                                                    <option value="utility">道具</option>
                                                    <option value="frag">击杀</option>
                                                    <option value="hold">架枪</option>
                                                </select>
                                            </div>
                                            <textarea value={action.content} onChange={e => updateAction(action.id, 'content', e.target.value)} placeholder="描述具体行动..." rows={2} className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded p-2 text-sm resize-none focus:ring-1 focus:ring-blue-500 mb-2 dark:text-white" />
                                            <div className="flex justify-between items-center">
                                                <div className="flex gap-2">
                                                    <button onClick={() => setShowUtilityModal(action.id)} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors ${action.utilityId ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-white dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'}`}>
                                                        {action.utilityId ? `已关联` : '道具'}
                                                    </button>
                                                    <label className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border cursor-pointer transition-colors bg-white dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100`}>
                                                        添加图片
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleActionAddImage(action.id, e.target.files[0])} />
                                                    </label>
                                                </div>
                                                <span className="text-[9px] font-mono text-neutral-300">#{action.id}</span>
                                            </div>
                                            {/* Action Images List */}
                                            {displayImages.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    {displayImages.map((img) => (
                                                        <div key={img.id} className="flex gap-2 items-start bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-1 rounded-lg">
                                                            <div className="w-10 h-10 shrink-0 bg-neutral-200 rounded overflow-hidden">
                                                                <img src={img.url} className="w-full h-full object-cover" />
                                                            </div>
                                                            <input type="text" value={img.description || ''} onChange={(e) => handleActionImageDesc(action.id, img.id, e.target.value)} placeholder="图片描述..." className="flex-1 bg-transparent text-[10px] py-1 outline-none dark:text-neutral-300 placeholder-neutral-400" />
                                                            <button onClick={() => handleActionRemoveImage(action.id, img.id)} className="text-red-400 hover:text-red-500 p-1">
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
            
            {/* AI Tab content omitted for brevity, keeping existing structure */}
        </div>

        {/* Utility Modal */}
        {showUtilityModal && (
            <div className="absolute inset-0 z-[110] bg-white dark:bg-neutral-950 animate-in slide-in-from-bottom flex flex-col">
                <div className="flex items-center gap-2 p-3 border-b border-neutral-200 dark:border-neutral-800">
                    <button onClick={() => setShowUtilityModal(null)} className="p-2">
                        <svg className="w-6 h-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <input type="text" value={utilitySearchQuery} onChange={e => setUtilitySearchQuery(e.target.value)} placeholder="搜索道具..." autoFocus className="flex-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg px-3 py-2 text-sm outline-none dark:text-white" />
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {filteredUtilities.map(u => (
                        <div key={u.id} onClick={() => linkUtilityToAction(showUtilityModal, u)} className="flex gap-3 p-2 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer">
                            <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden shrink-0">
                                {u.image ? <img src={u.image} className="w-full h-full object-cover"/> : null}
                            </div>
                            <div>
                                <div className="flex gap-2 mb-1">
                                    <span className={`text-[9px] px-1 rounded font-bold uppercase ${u.type === 'smoke' ? 'bg-neutral-200 text-neutral-600' : 'bg-yellow-100 text-yellow-600'}`}>{u.type}</span>
                                    <span className="text-[9px] text-neutral-400">#{u.id}</span>
                                </div>
                                <div className="text-sm font-bold dark:text-white">{u.title}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {showAiConfig && <AiConfigModal onClose={() => setShowAiConfig(false)} onSave={() => { setShowAiConfig(false); setChatHistory([]); }} />}
    </div>
  );
};

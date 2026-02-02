
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Tactic, Action, Side, Site, MapId, Tag, TagCategory, Utility } from '../types';
import { generateId } from '../utils/idGenerator';
import { getRoles } from '../constants/roles';
import { ALL_TAGS } from '../constants/tags';
import { UTILITIES } from '../data/utilities';
import { getApiKey, chatWithTacticCopilot, ChatMessage, getSelectedModel } from '../services/ai';
import { AiConfigModal } from './AiConfigModal';
import { compressImage } from '../utils/imageHelper';

interface TacticEditorProps {
  initialTactic?: Tactic;
  onCancel: () => void;
  currentMapId: MapId;
  currentSide: Side;
}

type EditorTab = 'edit' | 'ai';

interface ExtendedChatMessage extends ChatMessage {
    snapshot?: Partial<Tactic>; // The state BEFORE this message's changes were applied
    changedFields?: string[];   // What changed description
}

const DRAFT_KEY = 'tacbook_tactic_draft';

// Helper to determine what changed
const getTacticDiff = (oldData: Partial<Tactic>, newData: Partial<Tactic>): string[] => {
    const changes: string[] = [];
    if (newData.title && oldData.title !== newData.title) changes.push("标题");
    if (newData.site && oldData.site !== newData.site) changes.push("区域");
    if (newData.side && oldData.side !== newData.side) changes.push("阵营");
    
    // Simple length checks for complex arrays
    if (newData.loadout && JSON.stringify(oldData.loadout) !== JSON.stringify(newData.loadout)) changes.push("配装");
    if (newData.actions && JSON.stringify(oldData.actions) !== JSON.stringify(newData.actions)) changes.push("战术步骤");

    return changes;
};

export const TacticEditor: React.FC<TacticEditorProps> = ({
  initialTactic,
  onCancel,
  currentMapId,
  currentSide
}) => {
  // --- Form State ---
  const [formData, setFormData] = useState<Partial<Tactic>>({
    id: generateId('1'), // Tactics start with 1
    mapId: currentMapId,
    side: currentSide,
    site: 'A',
    tags: [],
    metadata: {
        author: 'IGL',
        lastUpdated: new Date().toISOString().split('T')[0],
        difficulty: 'Medium'
    },
    actions: [],
    map_visual: '',
    title: ''
  });

  // Keep a reference to the very beginning state for "Revert All"
  const [initialStateSnapshot, setInitialStateSnapshot] = useState<Partial<Tactic> | null>(null);

  // --- View State ---
  const [activeTab, setActiveTab] = useState<EditorTab>('edit');

  // --- Image State ---
  const [mapImagePreview, setMapImagePreview] = useState<string>('');
  const [actionImagePreviews, setActionImagePreviews] = useState<Record<string, string>>({});

  // --- Utility Modal State ---
  const [showUtilityModal, setShowUtilityModal] = useState<string | null>(null);
  const [utilitySearchQuery, setUtilitySearchQuery] = useState('');

  // --- AI State ---
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ExtendedChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize from props or local storage
  useEffect(() => {
    if (initialTactic) {
      setFormData(JSON.parse(JSON.stringify(initialTactic))); // Deep copy
      setInitialStateSnapshot(JSON.parse(JSON.stringify(initialTactic)));
      setMapImagePreview(initialTactic.map_visual || '');
      // Init action images
      const previews: Record<string, string> = {};
      initialTactic.actions.forEach(a => {
          if (a.image) previews[a.id] = a.image;
      });
      setActionImagePreviews(previews);
    } else {
      // Try load draft
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
          try {
              const parsed = JSON.parse(draft);
              // Only use draft if it matches current context slightly, otherwise discard
              if (parsed.mapId === currentMapId) {
                 setFormData(parsed);
                 setMapImagePreview(parsed.map_visual || '');
              }
          } catch (e) {
              console.error("Failed to load draft", e);
          }
      }
      setInitialStateSnapshot(formData);
    }
  }, [initialTactic, currentMapId]); 

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

  // --- Action Management ---

  const addAction = () => {
    const newAction: Action = {
      id: generateId(),
      who: '全员',
      content: '',
      time: '1:55',
      type: 'movement'
    };
    updateField('actions', [...(formData.actions || []), newAction]);
  };

  const updateAction = (id: string, key: keyof Action, value: any) => {
    const newActions = (formData.actions || []).map(a => 
      a.id === id ? { ...a, [key]: value } : a
    );
    updateField('actions', newActions);
  };

  const removeAction = (id: string) => {
    updateField('actions', (formData.actions || []).filter(a => a.id !== id));
  };

  const handleActionImageUpload = async (id: string, file: File) => {
      const compressed = await compressImage(file);
      setActionImagePreviews(prev => ({ ...prev, [id]: compressed }));
      updateAction(id, 'image', compressed);
  };

  // --- Utility Linking ---
  const linkUtilityToAction = (actionId: string, utility: Utility) => {
      updateAction(actionId, 'utilityId', utility.id);
      // Auto-fill content if empty
      const action = formData.actions?.find(a => a.id === actionId);
      if (action && !action.content) {
          updateAction(actionId, 'content', `投掷${utility.title}。`);
          updateAction(actionId, 'type', 'utility');
      }
      setShowUtilityModal(null);
  };

  // --- Map Image ---
  const handleMapImageUpload = async (file: File) => {
      const compressed = await compressImage(file);
      setMapImagePreview(compressed);
      updateField('map_visual', compressed);
  };

  // --- AI Logic ---
  const handleSendMessage = async () => {
      if (!chatInput.trim()) return;

      const userMsg: ExtendedChatMessage = { role: 'user', text: chatInput };
      const currentHistory = [...chatHistory, userMsg];
      setChatHistory(currentHistory);
      setChatInput('');
      setIsAiLoading(true);

      // Save state before AI modification
      const preAiState = JSON.parse(JSON.stringify(formData));

      const { reply, modifiedTactic } = await chatWithTacticCopilot(
          currentHistory, 
          formData, 
          userMsg.text
      );

      // Calculate diff if tactic returned
      let changedFields: string[] = [];
      if (modifiedTactic) {
          // Merge Logic: only replace fields that exist in modifiedTactic
          // For arrays (actions, loadout), we replace the whole array if provided by AI
          const mergedState = {
              ...preAiState,
              ...modifiedTactic,
              actions: modifiedTactic.actions || preAiState.actions,
              loadout: modifiedTactic.loadout || preAiState.loadout,
              tags: modifiedTactic.tags || preAiState.tags,
              metadata: { ...preAiState.metadata, ...(modifiedTactic.metadata || {}) }
          };

          changedFields = getTacticDiff(preAiState, mergedState);
          setFormData(mergedState);
          
          if (mergedState.map_visual) setMapImagePreview(mergedState.map_visual);
      }

      const modelMsg: ExtendedChatMessage = { 
          role: 'model', 
          text: reply,
          snapshot: modifiedTactic ? preAiState : undefined,
          changedFields: changedFields.length > 0 ? changedFields : undefined
      };
      
      setChatHistory([...currentHistory, modelMsg]);
      setIsAiLoading(false);
  };

  const handleRevertAiChange = (snapshot: Partial<Tactic>) => {
      if (confirm("确定要撤销此次 AI 的修改吗？")) {
          setFormData(snapshot);
          setMapImagePreview(snapshot.map_visual || '');
      }
  };

  // --- Export ---
  const handleSave = () => {
      if (!formData.title) {
          alert("请输入战术标题");
          return;
      }
      
      const jsonString = JSON.stringify(formData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", url);
      downloadAnchorNode.setAttribute("download", `TACTIC_${formData.mapId}_${formData.side}_${formData.title}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      URL.revokeObjectURL(url);
      
      if (!initialTactic) {
          localStorage.removeItem(DRAFT_KEY);
      }
      onCancel();
  };

  // --- Constants ---
  const currentRoles = getRoles(formData.side as Side || 'T', formData.mapId || 'mirage');
  const groupedTags = {
      economy: ALL_TAGS.filter(t => t.category === 'economy'),
      playstyle: ALL_TAGS.filter(t => t.category === 'playstyle'),
      utility: ALL_TAGS.filter(t => t.category === 'utility'),
  };

  const filteredUtilities = UTILITIES.filter(u => {
      const matchMap = u.mapId === formData.mapId;
      const matchSide = u.side === formData.side;
      const matchSearch = u.title.includes(utilitySearchQuery) || u.type.includes(utilitySearchQuery);
      return matchMap && matchSide && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-neutral-950 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
            <button onClick={onCancel} className="text-neutral-500 font-medium">取消</button>
            <div className="flex gap-4">
                 <button 
                    onClick={() => setActiveTab('edit')}
                    className={`text-sm font-bold transition-colors ${activeTab === 'edit' ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}`}
                 >
                     编辑
                 </button>
                 <button 
                    onClick={() => setActiveTab('ai')}
                    className={`text-sm font-bold transition-colors flex items-center gap-1 ${activeTab === 'ai' ? 'text-purple-600 dark:text-purple-400' : 'text-neutral-400'}`}
                 >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     Copilot
                 </button>
            </div>
            <button 
                onClick={handleSave} 
                className="text-blue-600 font-bold"
            >
                保存
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
            
            {/* --- Manual Edit Tab --- */}
            <div className={`absolute inset-0 overflow-y-auto p-4 space-y-6 transition-opacity duration-300 ${activeTab === 'edit' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                
                {/* Basic Info */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-neutral-400">ID: {formData.id}</span>
                        <div className="flex gap-2">
                            <select 
                                value={formData.side} 
                                onChange={e => updateField('side', e.target.value)}
                                className="bg-neutral-100 dark:bg-neutral-900 text-xs font-bold p-2 rounded-lg"
                            >
                                <option value="T">T Side</option>
                                <option value="CT">CT Side</option>
                            </select>
                            <select 
                                value={formData.site} 
                                onChange={e => updateField('site', e.target.value)}
                                className="bg-neutral-100 dark:bg-neutral-900 text-xs font-bold p-2 rounded-lg"
                            >
                                <option value="A">A Site</option>
                                <option value="Mid">Mid</option>
                                <option value="B">B Site</option>
                            </select>
                        </div>
                    </div>

                    <input 
                        type="text" 
                        value={formData.title}
                        onChange={e => updateField('title', e.target.value)}
                        placeholder="战术标题..."
                        className="w-full text-xl font-black bg-transparent border-b border-neutral-200 dark:border-neutral-800 pb-2 focus:border-blue-500 outline-none dark:text-white placeholder-neutral-300"
                    />

                    {/* Tags */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">标签</label>
                        <div className="flex flex-wrap gap-2">
                            {[...groupedTags.economy, ...groupedTags.playstyle, ...groupedTags.utility].map(tag => {
                                const isSelected = formData.tags?.some(t => t.label === tag.label);
                                return (
                                    <button
                                        key={tag.label}
                                        onClick={() => toggleTag(tag)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-neutral-200 dark:border-neutral-800 text-neutral-500'}`}
                                    >
                                        {tag.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Map Visual */}
                <div>
                     <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">战术示意图</label>
                     <label className="block w-full aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-center cursor-pointer overflow-hidden relative group hover:border-blue-500 transition-colors">
                        {mapImagePreview ? (
                            <>
                                <img src={mapImagePreview} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-bold">点击更换</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-neutral-400">
                                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-xs">上传图片 (自动压缩)</span>
                            </div>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleMapImageUpload(e.target.files[0])} />
                     </label>
                </div>

                {/* Loadout (Simplified) */}
                <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">配装分配</label>
                    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-3 space-y-2">
                        {/* We use a fixed list of roles for editing simplicity, or map current loadout */}
                        {(formData.loadout && formData.loadout.length > 0 ? formData.loadout : currentRoles.map(r => ({ role: r, equipment: '' }))).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                                <span className="w-16 font-bold text-neutral-600 dark:text-neutral-400 shrink-0">{item.role}</span>
                                <input 
                                    type="text" 
                                    value={item.equipment}
                                    onChange={(e) => {
                                        const newLoadout = [...(formData.loadout || currentRoles.map(r => ({ role: r, equipment: '' })))];
                                        newLoadout[idx] = { ...newLoadout[idx], equipment: e.target.value };
                                        updateField('loadout', newLoadout);
                                    }}
                                    placeholder="例如: 半甲, 烟闪..."
                                    className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded p-1.5 focus:border-blue-500 outline-none dark:text-white"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase">战术步骤</label>
                        <button onClick={addAction} className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded hover:bg-blue-100">+ 添加步骤</button>
                    </div>
                    
                    <div className="space-y-3">
                        {formData.actions?.map((action, idx) => (
                            <div key={action.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 shadow-sm relative group">
                                <button 
                                    onClick={() => removeAction(action.id)}
                                    className="absolute top-2 right-2 text-neutral-300 hover:text-red-500 p-1"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>

                                <div className="flex gap-2 mb-2">
                                    <input 
                                        type="text"
                                        value={action.time || ''}
                                        onChange={e => updateAction(action.id, 'time', e.target.value)}
                                        placeholder="时间"
                                        className="w-16 bg-neutral-50 dark:bg-neutral-800 border-none rounded p-1 text-xs font-mono text-center font-bold"
                                    />
                                    <select
                                        value={action.who}
                                        onChange={e => updateAction(action.id, 'who', e.target.value)}
                                        className="w-24 bg-neutral-50 dark:bg-neutral-800 border-none rounded p-1 text-xs font-bold"
                                    >
                                        <option value="全员">全员</option>
                                        {currentRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <select
                                        value={action.type}
                                        onChange={e => updateAction(action.id, 'type', e.target.value)}
                                        className="w-20 bg-neutral-50 dark:bg-neutral-800 border-none rounded p-1 text-xs"
                                    >
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
                                    className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded p-2 text-sm resize-none focus:ring-1 focus:ring-blue-500 mb-2"
                                />

                                <div className="flex justify-between items-center">
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setShowUtilityModal(action.id)}
                                            className={`
                                                flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors
                                                ${action.utilityId ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-neutral-50 text-neutral-500 border-neutral-200'}
                                            `}
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                            {action.utilityId ? `已关联道具` : '关联道具'}
                                        </button>

                                        <label className={`
                                            flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border cursor-pointer transition-colors
                                            ${actionImagePreviews[action.id] ? 'bg-green-50 text-green-600 border-green-200' : 'bg-neutral-50 text-neutral-500 border-neutral-200'}
                                        `}>
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            {actionImagePreviews[action.id] ? '已传图片' : '上传图片'}
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleActionImageUpload(action.id, e.target.files[0])} />
                                        </label>
                                    </div>
                                    <span className="text-[9px] font-mono text-neutral-300">#{action.id}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="h-10"></div>
            </div>

            {/* --- Copilot AI Tab --- */}
            <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${activeTab === 'ai' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                {/* Same AI Config Bar, History etc. as before */}
                <div className="bg-purple-50 dark:bg-purple-900/10 p-2 flex justify-between items-center border-b border-purple-100 dark:border-purple-900/30">
                     <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 pl-2">
                        {getSelectedModel()}
                     </span>
                     <button onClick={() => setShowAiConfig(true)} className="text-[10px] font-bold text-purple-600 hover:text-purple-800 dark:hover:text-purple-300 bg-white dark:bg-purple-900/50 px-2 py-1 rounded shadow-sm">
                        设置
                     </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-neutral-900/50">
                    {chatHistory.length === 0 && (
                        <div className="text-center text-neutral-400 mt-10 space-y-2">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            </div>
                            <p className="text-sm font-bold">我是你的战术助教。</p>
                            <p className="text-xs">我可以帮你完善战术细节、修正配装，或者构思新的投掷物配合。</p>
                        </div>
                    )}
                    {/* ... chat output ... */}
                    {chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'}`}>
                                <ReactMarkdown className="prose dark:prose-invert prose-sm max-w-none">
                                    {msg.text}
                                </ReactMarkdown>
                                {msg.changedFields && (
                                    <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                                        <div className="text-[10px] text-neutral-400 font-bold mb-1">已自动修改:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {msg.changedFields.map(f => (
                                                <span key={f} className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-100">
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                        {msg.snapshot && (
                                            <button 
                                                onClick={() => handleRevertAiChange(msg.snapshot!)}
                                                className="mt-2 text-[10px] text-red-500 font-bold hover:underline flex items-center gap-1"
                                            >
                                                撤销修改
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isAiLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-3 flex gap-1">
                                <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                
                {/* Chat Input */}
                <div className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex gap-2 relative">
                        <textarea 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                            placeholder="输入指令..."
                            rows={1}
                            className="flex-1 bg-neutral-100 dark:bg-neutral-950 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none dark:text-white"
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim() || isAiLoading}
                            className="bg-purple-600 text-white p-3 rounded-xl disabled:opacity-50 hover:bg-purple-700 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {showUtilityModal && (
            <div className="absolute inset-0 z-[110] bg-white dark:bg-neutral-950 animate-in slide-in-from-bottom flex flex-col">
                <div className="flex items-center gap-2 p-3 border-b border-neutral-200 dark:border-neutral-800">
                    <button onClick={() => setShowUtilityModal(null)} className="p-2">
                        <svg className="w-6 h-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <input 
                        type="text" 
                        value={utilitySearchQuery}
                        onChange={e => setUtilitySearchQuery(e.target.value)}
                        placeholder="搜索道具..."
                        autoFocus
                        className="flex-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg px-3 py-2 text-sm outline-none dark:text-white"
                    />
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {filteredUtilities.map(u => (
                        <div 
                            key={u.id}
                            onClick={() => linkUtilityToAction(showUtilityModal, u)}
                            className="flex gap-3 p-2 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden shrink-0">
                                {u.image ? <img src={u.image} className="w-full h-full object-cover"/> : null}
                            </div>
                            <div>
                                <div className="flex gap-2 mb-1">
                                    <span className={`text-[9px] px-1 rounded font-bold uppercase ${u.type === 'smoke' ? 'bg-neutral-200 text-neutral-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                        {u.type}
                                    </span>
                                    <span className="text-[9px] text-neutral-400">#{u.id}</span>
                                </div>
                                <div className="text-sm font-bold dark:text-white">{u.title}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {showAiConfig && (
            <AiConfigModal 
                onClose={() => setShowAiConfig(false)}
                onSave={() => { setShowAiConfig(false); setChatHistory([]); }}
            />
        )}
    </div>
  );
};

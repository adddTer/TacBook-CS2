
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
    if (oldData.title !== newData.title) changes.push("标题");
    if (oldData.site !== newData.site) changes.push("区域");
    if (oldData.side !== newData.side) changes.push("阵营");
    
    // Simple length checks for complex arrays, deep comparison is expensive but can be added if needed
    if (JSON.stringify(oldData.loadout) !== JSON.stringify(newData.loadout)) changes.push("配装");
    
    const oldActions = oldData.actions || [];
    const newActions = newData.actions || [];
    if (JSON.stringify(oldActions) !== JSON.stringify(newActions)) changes.push("战术步骤");

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
    id: generateId(),
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

  // --- History (for manual undo) ---
  const [manualHistory, setManualHistory] = useState<Partial<Tactic>[]>([]);

  // --- Image State ---
  const [mapImagePreview, setMapImagePreview] = useState<string>('');
  const [actionImagePreviews, setActionImagePreviews] = useState<Record<string, string>>({});

  // --- Utility Modal State ---
  const [showUtilityModal, setShowUtilityModal] = useState<string | null>(null);
  const [utilitySearchQuery, setUtilitySearchQuery] = useState('');

  // --- AI State ---
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ExtendedChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Track active model for display
  const [activeModelName, setActiveModelName] = useState('');

  // --- Draft & Initialization Logic ---
  useEffect(() => {
    // If we are editing an existing tactic
    if (initialTactic) {
      const data = JSON.parse(JSON.stringify(initialTactic)); // Deep copy
      setFormData(data);
      setInitialStateSnapshot(data);
      if (initialTactic.map_visual) setMapImagePreview(initialTactic.map_visual);
      
      const newActionPreviews: Record<string, string> = {};
      initialTactic.actions.forEach(a => {
          if (a.image) newActionPreviews[a.id] = a.image;
      });
      setActionImagePreviews(newActionPreviews);
    } else {
        // If creating new, check for draft
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
            setTimeout(() => {
                // Use window.confirm for simplicity
                if (window.confirm("发现上次未保存的草稿，是否恢复？")) {
                    try {
                        const parsed = JSON.parse(draft);
                        setFormData(parsed);
                        setInitialStateSnapshot(parsed); // Draft becomes base
                        if (parsed.map_visual) setMapImagePreview(parsed.map_visual);
                        
                        const newActionPreviews: Record<string, string> = {};
                        parsed.actions?.forEach((a: Action) => {
                            if (a.image) newActionPreviews[a.id] = a.image;
                        });
                        setActionImagePreviews(newActionPreviews);
                    } catch(e) {
                        console.error("Draft parse error", e);
                    }
                } else {
                    localStorage.removeItem(DRAFT_KEY);
                    const init = JSON.parse(JSON.stringify(formData));
                    setInitialStateSnapshot(init);
                }
            }, 50);
        } else {
             const init = JSON.parse(JSON.stringify(formData));
             setInitialStateSnapshot(init);
        }
    }
    
    const m = getSelectedModel();
    if(m) setActiveModelName(m);

  }, [initialTactic]);

  useEffect(() => {
      if (activeTab === 'ai') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatMessages, activeTab]);

  // --- Close / Draft Logic ---

  const handleClose = () => {
      // Check if dirty (different from initial snapshot)
      const isDirty = JSON.stringify(formData) !== JSON.stringify(initialStateSnapshot);
      
      if (isDirty) {
          if (window.confirm("您有未保存的修改。是否保存草稿以便下次继续编辑？\n(选择'取消'将清空当前内容)")) {
              localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
              onCancel();
          } else {
              localStorage.removeItem(DRAFT_KEY);
              onCancel();
          }
      } else {
          // Clean up draft if we are closing (assuming done or don't care)
          localStorage.removeItem(DRAFT_KEY);
          onCancel();
      }
  };

  // --- Logic Helpers ---

  const saveManualSnapshot = () => {
      setManualHistory(prev => [...prev, JSON.parse(JSON.stringify(formData))]);
  };

  const handleManualUndo = () => {
      setManualHistory(prev => {
          if (prev.length === 0) return prev;
          const newHistory = [...prev];
          const previousState = newHistory.pop();
          if (previousState) {
              setFormData(previousState);
              // Restore images
              if (previousState.map_visual) setMapImagePreview(previousState.map_visual);
              const newPreviews: Record<string, string> = {};
              previousState.actions?.forEach(a => {
                  if (a.image) newPreviews[a.id] = a.image;
              });
              setActionImagePreviews(newPreviews);
          }
          return newHistory;
      });
  };

  const handleRestoreToSnapshot = (snapshot: Partial<Tactic>) => {
      if (!snapshot) return;
      if (window.confirm("确定要回滚到此状态吗？之后的所有修改将丢失。")) {
          setFormData(JSON.parse(JSON.stringify(snapshot)));
          // Visuals update
          if (snapshot.map_visual) setMapImagePreview(snapshot.map_visual);
          const newPreviews: Record<string, string> = {};
          snapshot.actions?.forEach(a => {
              if (a.image) newPreviews[a.id] = a.image;
          });
          setActionImagePreviews(newPreviews);
          
          // Add system message
          setChatMessages(prev => [...prev, {
              role: 'model',
              text: '✅ **已成功回滚**至选定状态。'
          }]);
      }
  };
  
  const handleRevertAll = () => {
      if (initialStateSnapshot) {
          handleRestoreToSnapshot(initialStateSnapshot);
      }
  };

  const availableRoles = useMemo(() => getRoles(formData.side as Side, formData.mapId as string), [formData.side, formData.mapId]);

  // --- Action Handlers (Manual) ---

  const addAction = () => {
    saveManualSnapshot();
    const newAction: Action = {
        id: generateId(),
        who: availableRoles[0],
        time: '',
        content: '',
        type: 'movement'
    };
    setFormData(prev => ({
        ...prev,
        actions: [...(prev.actions || []), newAction]
    }));
  };

  const updateAction = (id: string, field: keyof Action, value: any) => {
    setFormData(prev => ({
        ...prev,
        actions: prev.actions?.map(a => a.id === id ? { ...a, [field]: value } : a)
    }));
  };

  const removeAction = (id: string) => {
    saveManualSnapshot();
    setFormData(prev => ({
        ...prev,
        actions: prev.actions?.filter(a => a.id !== id)
    }));
  };

  const handleActionImageUpload = async (id: string, file: File) => {
      const compressedBase64 = await compressImage(file);
      setActionImagePreviews(prev => ({ ...prev, [id]: compressedBase64 }));
      updateAction(id, 'image', compressedBase64);
  };

  const handleMapImageUpload = async (file: File) => {
      const compressedBase64 = await compressImage(file);
      setMapImagePreview(compressedBase64);
      setFormData(prev => ({ ...prev, map_visual: compressedBase64 }));
  };

  const toggleTag = (tag: Tag) => {
      const currentTags = formData.tags || [];
      const exists = currentTags.find(t => t.label === tag.label);
      if (exists) {
          setFormData({ ...formData, tags: currentTags.filter(t => t.label !== tag.label) });
      } else {
          setFormData({ ...formData, tags: [...currentTags, tag] });
      }
  };

  const handleUtilitySelect = (util: Utility) => {
      if (showUtilityModal) {
          const action = formData.actions?.find(a => a.id === showUtilityModal);
          if (action) {
              saveManualSnapshot();
              const prefix = action.content ? action.content + " " : "";
              updateAction(showUtilityModal, 'content', `${prefix}投掷[${util.title}]。${util.content}`);
              updateAction(showUtilityModal, 'type', 'utility');
              updateAction(showUtilityModal, 'utilityId', util.id);
          }
          setShowUtilityModal(null);
      }
  };

  const handleExportJSON = async () => {
    if (!formData.title) {
        alert("请输入战术名称");
        return;
    }
    const jsonString = JSON.stringify(formData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `TAC_${formData.mapId}_${formData.title}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
    
    // Clear draft on successful export
    localStorage.removeItem(DRAFT_KEY);
  };

  // --- AI Chat Logic ---

  const handleAiSend = async () => {
      if (!chatInput.trim()) return;
      
      if (!getApiKey()) {
          setShowAiConfig(true);
          return;
      }

      const userMsg = chatInput;
      setChatInput('');
      setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setIsAiLoading(true);

      try {
          // Snapshot state BEFORE AI change
          const stateBefore = JSON.parse(JSON.stringify(formData));
          
          // Use current formData to give context
          const result = await chatWithTacticCopilot(chatMessages, formData, userMsg);
          
          if (result.modifiedTactic) {
              // Compare to see if there are ACTUAL changes
              const changedFields = getTacticDiff(formData, result.modifiedTactic);
              
              if (changedFields.length > 0) {
                  // Apply changes
                  setFormData(prev => ({
                      ...prev,
                      ...result.modifiedTactic
                  }));
                  
                  // Add message with snapshot
                  setChatMessages(prev => [...prev, { 
                      role: 'model', 
                      text: result.reply,
                      snapshot: stateBefore,
                      changedFields: changedFields
                  }]);
              } else {
                  // AI sent modifiedTactic but same data, treat as text reply
                   setChatMessages(prev => [...prev, { role: 'model', text: result.reply }]);
              }
          } else {
              // Just text reply
              setChatMessages(prev => [...prev, { role: 'model', text: result.reply }]);
          }
      } catch (e) {
          setChatMessages(prev => [...prev, { role: 'model', text: "API Error: Please check your key or network." }]);
      } finally {
          setIsAiLoading(false);
      }
  };
  
  const handleConfigSaved = () => {
      setShowAiConfig(false);
      setActiveModelName(getSelectedModel());
  };

  const tagsByCategory = useMemo(() => {
      const groups: Record<TagCategory, Tag[]> = {
          economy: [],
          playstyle: [],
          utility: [],
          difficulty: [],
          type: []
      };
      ALL_TAGS.forEach(tag => {
          if (groups[tag.category]) groups[tag.category].push(tag);
      });
      return groups;
  }, []);

  const filteredUtilities = UTILITIES.filter(u => 
      u.mapId === formData.mapId && 
      u.side === formData.side &&
      (utilitySearchQuery ? u.title.includes(utilitySearchQuery) : true)
  );


  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-neutral-950 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
            <button onClick={handleClose} className="text-neutral-500 font-medium">关闭</button>
            <div className="flex gap-2 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('edit')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'edit' ? 'bg-white dark:bg-neutral-800 shadow text-black dark:text-white' : 'text-neutral-500'}`}
                >
                    编辑表单
                </button>
                <button 
                    onClick={() => setActiveTab('ai')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${activeTab === 'ai' ? 'bg-purple-600 shadow text-white' : 'text-neutral-500'}`}
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    AI 教练
                </button>
            </div>
            <button 
                onClick={handleExportJSON}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-blue-500/20"
            >
                保存/导出
            </button>
        </div>

        {/* --- TAB: EDIT --- */}
        {activeTab === 'edit' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Meta Inputs */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">战术名称</label>
                        <input 
                            type="text" 
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            className="w-full bg-neutral-100 dark:bg-neutral-900 p-3 rounded-xl dark:text-white font-bold border-none focus:ring-2 focus:ring-blue-500"
                            placeholder="例如：Mirage A区爆弹..."
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">地图</label>
                            <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-xl text-sm font-bold dark:text-neutral-400 capitalize">
                                {formData.mapId}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">阵营</label>
                            <select 
                                value={formData.side}
                                onChange={e => setFormData({...formData, side: e.target.value as Side})}
                                className="w-full bg-neutral-100 dark:bg-neutral-900 p-3 rounded-xl dark:text-white border-none"
                            >
                                <option value="T">Terrorist</option>
                                <option value="CT">Counter-Terrorist</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">主攻区域</label>
                            <select 
                                value={formData.site}
                                onChange={e => setFormData({...formData, site: e.target.value as Site})}
                                className="w-full bg-neutral-100 dark:bg-neutral-900 p-3 rounded-xl dark:text-white border-none"
                            >
                                <option value="A">A Site</option>
                                <option value="Mid">Mid</option>
                                <option value="B">B Site</option>
                                <option value="All">Global</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">难度</label>
                            <select 
                                value={formData.metadata?.difficulty}
                                onChange={e => setFormData({...formData, metadata: {...formData.metadata!, difficulty: e.target.value as any}})}
                                className="w-full bg-neutral-100 dark:bg-neutral-900 p-3 rounded-xl dark:text-white border-none"
                            >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                            </select>
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">标签</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(tagsByCategory).map(([cat, tags]) => {
                                const categoryTags = tags as Tag[];
                                return (
                                    categoryTags.length > 0 && (
                                        <div key={cat} className="flex flex-wrap gap-1 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800">
                                            <span className="text-[9px] text-neutral-400 w-full uppercase font-bold">{cat}</span>
                                            {categoryTags.map(tag => {
                                                const isActive = formData.tags?.some(t => t.label === tag.label);
                                                return (
                                                    <button
                                                        key={tag.label}
                                                        onClick={() => toggleTag(tag)}
                                                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${isActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500'}`}
                                                    >
                                                        {tag.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Map Visual */}
                <div className="border-t border-dashed border-neutral-200 dark:border-neutral-800 pt-4">
                     <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">战术图</label>
                     <div className="flex gap-4 items-start">
                         <label className="w-32 h-20 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                            <span className="text-[10px] text-neutral-400">点击上传</span>
                            <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleMapImageUpload(e.target.files[0])} />
                         </label>
                         {mapImagePreview && (
                             <div className="w-32 h-20 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 relative group">
                                 <img src={mapImagePreview} className="w-full h-full object-cover" />
                                 <button 
                                    onClick={() => { setMapImagePreview(''); setFormData({...formData, map_visual: ''}); }}
                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                 </button>
                             </div>
                         )}
                     </div>
                </div>

                {/* Loadout */}
                <div className="border-t border-dashed border-neutral-200 dark:border-neutral-800 pt-4">
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">配装 (Loadout)</label>
                    <div className="space-y-2 bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                        {availableRoles.map((role, idx) => {
                             const item = formData.loadout?.find(l => l.role === role);
                             return (
                                 <div key={role} className="flex items-center gap-2 text-xs">
                                     <span className="w-16 font-bold shrink-0 dark:text-neutral-400">{role}</span>
                                     <input 
                                        type="text"
                                        className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded p-1.5 focus:border-blue-500 outline-none"
                                        placeholder="例如：AK47, 烟闪, 半甲"
                                        value={item?.equipment || ''}
                                        onChange={e => {
                                            const newLoadout = [...(formData.loadout || [])];
                                            const existIdx = newLoadout.findIndex(l => l.role === role);
                                            if (existIdx >= 0) {
                                                newLoadout[existIdx] = { role, equipment: e.target.value };
                                            } else {
                                                newLoadout.push({ role, equipment: e.target.value });
                                            }
                                            setFormData({ ...formData, loadout: newLoadout });
                                        }}
                                     />
                                 </div>
                             );
                        })}
                    </div>
                </div>

                {/* Actions Editor */}
                <div className="border-t border-dashed border-neutral-200 dark:border-neutral-800 pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-neutral-500 uppercase">步骤 (Actions)</label>
                        <div className="flex gap-2">
                             <button 
                                onClick={handleManualUndo}
                                disabled={manualHistory.length === 0}
                                className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded disabled:opacity-30"
                             >
                                 撤销
                             </button>
                             <button 
                                onClick={addAction}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded font-bold"
                             >
                                + 添加步骤
                             </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {formData.actions?.map((action, index) => (
                            <div key={action.id} className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl shadow-sm group">
                                <button 
                                    onClick={() => removeAction(action.id)}
                                    className="absolute top-2 right-2 text-neutral-300 hover:text-red-500 p-1"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>

                                <div className="flex gap-2 mb-2">
                                    <div className="w-20 shrink-0">
                                        <label className="text-[9px] text-neutral-400 font-bold uppercase block mb-0.5">Time</label>
                                        <input 
                                            type="text" 
                                            value={action.time || ''}
                                            onChange={e => updateAction(action.id, 'time', e.target.value)}
                                            className="w-full bg-neutral-50 dark:bg-neutral-800 p-1.5 rounded text-xs font-mono border-none"
                                            placeholder="1:55"
                                        />
                                    </div>
                                    <div className="flex-1">
                                         <label className="text-[9px] text-neutral-400 font-bold uppercase block mb-0.5">Who</label>
                                         <select 
                                            value={action.who}
                                            onChange={e => updateAction(action.id, 'who', e.target.value)}
                                            className="w-full bg-neutral-50 dark:bg-neutral-800 p-1.5 rounded text-xs font-bold border-none"
                                         >
                                             {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                             <option value="全员">全员 (All)</option>
                                         </select>
                                    </div>
                                    <div className="w-24 shrink-0">
                                         <label className="text-[9px] text-neutral-400 font-bold uppercase block mb-0.5">Type</label>
                                         <select 
                                            value={action.type}
                                            onChange={e => updateAction(action.id, 'type', e.target.value)}
                                            className="w-full bg-neutral-50 dark:bg-neutral-800 p-1.5 rounded text-xs border-none"
                                         >
                                             <option value="movement">Movement</option>
                                             <option value="utility">Utility</option>
                                             <option value="frag">Frag/Hold</option>
                                         </select>
                                    </div>
                                </div>
                                
                                <div className="mb-2">
                                    <textarea 
                                        rows={2}
                                        value={action.content}
                                        onChange={e => updateAction(action.id, 'content', e.target.value)}
                                        placeholder="描述具体行动..."
                                        className="w-full bg-neutral-50 dark:bg-neutral-800 p-2 rounded-lg text-sm border-none resize-none"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setShowUtilityModal(action.id)}
                                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-colors ${action.utilityId ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-neutral-50 text-neutral-500 border-neutral-200'}`}
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        {action.utilityId ? '已关联道具' : '关联道具'}
                                    </button>

                                    <label className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border border-neutral-200 bg-neutral-50 text-neutral-500 cursor-pointer hover:bg-neutral-100">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        {action.image ? '更改图片' : '上传图片'}
                                        <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleActionImageUpload(action.id, e.target.files[0])} />
                                    </label>
                                    
                                    {actionImagePreviews[action.id] && (
                                        <div className="w-6 h-6 rounded overflow-hidden border border-neutral-200">
                                            <img src={actionImagePreviews[action.id]} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* --- TAB: AI COACH --- */}
        {activeTab === 'ai' && (
            <div className="flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-900">
                {showAiConfig && (
                    <AiConfigModal onClose={() => setShowAiConfig(false)} onSave={handleConfigSaved} />
                )}
                
                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Intro Banner with Global Revert */}
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="font-bold text-lg mb-1">AI 战术教练</h3>
                            <p className="text-xs opacity-80 mb-3">我可以帮你完善战术细节、检查漏洞或生成新的思路。</p>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setShowAiConfig(true)}
                                    className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded backdrop-blur-sm transition-colors"
                                >
                                    配置 API Key
                                </button>
                                {activeModelName && <span className="text-[10px] bg-black/20 px-2 py-1 rounded backdrop-blur-sm font-mono">{activeModelName}</span>}
                            </div>
                        </div>
                        <div className="absolute -bottom-4 -right-4 text-9xl opacity-10">
                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                    </div>
                    
                    {/* Global Revert Button - Show if changes exist */}
                    {JSON.stringify(formData) !== JSON.stringify(initialStateSnapshot) && (
                        <div className="flex justify-center">
                            <button 
                                onClick={handleRevertAll}
                                className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-full border border-red-200 dark:border-red-800 transition-colors flex items-center gap-1 bg-white dark:bg-neutral-900 shadow-sm"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                恢复至初始状态
                            </button>
                        </div>
                    )}

                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`
                                max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm
                                ${msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-white dark:bg-neutral-800 dark:text-neutral-200 rounded-bl-none border border-neutral-100 dark:border-neutral-700'}
                            `}>
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                </div>
                                
                                {/* Modification Info & Undo Button */}
                                {msg.snapshot && msg.changedFields && msg.changedFields.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-bold text-orange-500 uppercase">已修改</span>
                                            <div className="flex flex-wrap gap-1">
                                                {msg.changedFields.map(f => (
                                                    <span key={f} className="text-[9px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded">
                                                        {f}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRestoreToSnapshot(msg.snapshot!)}
                                            className="w-full py-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-900 rounded-lg transition-colors flex items-center justify-center gap-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                            撤销至此 (Undo)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isAiLoading && (
                        <div className="flex justify-start">
                             <div className="bg-white dark:bg-neutral-800 rounded-2xl rounded-bl-none p-3 shadow-sm border border-neutral-100 dark:border-neutral-700">
                                 <div className="flex gap-1.5">
                                     <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></span>
                                     <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce delay-100"></span>
                                     <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce delay-200"></span>
                                 </div>
                             </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-3 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAiSend()}
                            placeholder="描述你的需求，例如：'把B点进攻改为慢打'..."
                            className="flex-1 bg-neutral-100 dark:bg-neutral-900 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                        />
                        <button 
                            onClick={handleAiSend}
                            disabled={isAiLoading || !chatInput.trim()}
                            className="bg-purple-600 text-white rounded-xl px-4 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Utility Picker Modal */}
        {showUtilityModal && (
            <div className="absolute inset-0 z-[110] bg-black/80 flex flex-col justify-end">
                <div className="bg-white dark:bg-neutral-900 rounded-t-2xl max-h-[70%] flex flex-col overflow-hidden animate-in slide-in-from-bottom-full">
                    <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                        <span className="font-bold text-sm">选择关联道具</span>
                        <button onClick={() => setShowUtilityModal(null)} className="text-neutral-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-2 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-800">
                        <input 
                            className="w-full bg-white dark:bg-neutral-800 border-none rounded-lg p-2 text-xs"
                            placeholder="搜索道具..."
                            value={utilitySearchQuery}
                            onChange={e => setUtilitySearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="overflow-y-auto p-2 space-y-2">
                        {filteredUtilities.map(util => (
                            <button 
                                key={util.id}
                                onClick={() => handleUtilitySelect(util)}
                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition-all text-left group"
                            >
                                <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded overflow-hidden shrink-0">
                                    {util.image && <img src={util.image} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] px-1 rounded uppercase font-bold ${util.type === 'smoke' ? 'bg-neutral-200 text-neutral-700' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {util.type}
                                        </span>
                                        <span className="text-xs font-bold dark:text-neutral-200">{util.title}</span>
                                    </div>
                                    <p className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">{util.content}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

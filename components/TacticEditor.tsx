
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Tactic, Action, Side, Site, MapId, Tag, TagCategory, Utility } from '../types';
import { generateId } from '../utils/idGenerator';
import { getRoles } from '../constants/roles';
import { ALL_TAGS } from '../constants/tags';
import { UTILITIES } from '../data/utilities';

interface TacticEditorProps {
  initialTactic?: Tactic;
  onCancel: () => void;
  currentMapId: MapId;
  currentSide: Side;
}

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const TacticEditor: React.FC<TacticEditorProps> = ({
  initialTactic,
  onCancel,
  currentMapId,
  currentSide
}) => {
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

  // State for file handling
  const [mapImageFile, setMapImageFile] = useState<File | null>(null);
  const [mapImagePreview, setMapImagePreview] = useState<string>('');
  
  // Action images: key is action.id, value is File
  const [actionImageFiles, setActionImageFiles] = useState<Record<string, File>>({});
  const [actionImagePreviews, setActionImagePreviews] = useState<Record<string, string>>({});

  // Utility Modal State
  const [showUtilityModal, setShowUtilityModal] = useState<string | null>(null); // Action ID
  const [utilitySearchQuery, setUtilitySearchQuery] = useState('');

  useEffect(() => {
    if (initialTactic) {
      setFormData(initialTactic);
      if (initialTactic.map_visual) setMapImagePreview(initialTactic.map_visual);
      
      const newActionPreviews: Record<string, string> = {};
      initialTactic.actions.forEach(a => {
          if (a.image) newActionPreviews[a.id] = a.image;
      });
      setActionImagePreviews(newActionPreviews);
    }
  }, [initialTactic]);

  const availableRoles = useMemo(() => getRoles(formData.side as Side, formData.mapId as string), [formData.side, formData.mapId]);

  const addAction = () => {
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
    setFormData(prev => ({
        ...prev,
        actions: prev.actions?.filter(a => a.id !== id)
    }));
    // Cleanup file states
    const newFiles = { ...actionImageFiles };
    delete newFiles[id];
    setActionImageFiles(newFiles);
    
    const newPreviews = { ...actionImagePreviews };
    delete newPreviews[id];
    setActionImagePreviews(newPreviews);
  };

  const handleActionImageUpload = (id: string, file: File) => {
      // 1. Store File
      setActionImageFiles(prev => ({ ...prev, [id]: file }));
      // 2. Create Preview
      const url = URL.createObjectURL(file);
      setActionImagePreviews(prev => ({ ...prev, [id]: url }));
      // 3. Update Text Field (Visual indicator only)
      updateAction(id, 'image', `[Base64] ${file.name}`);
  };

  const handleMapImageUpload = (file: File) => {
      setMapImageFile(file);
      const url = URL.createObjectURL(file);
      setMapImagePreview(url);
      setFormData(prev => ({ ...prev, map_visual: `[Base64] ${file.name}` }));
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

    // Deep copy
    const finalData = JSON.parse(JSON.stringify(formData));
    
    // Embed Map Image
    if (mapImageFile) {
        finalData.map_visual = await fileToBase64(mapImageFile);
    } else if (mapImagePreview && mapImagePreview.startsWith('data:')) {
        // Keep existing base64 if editing
        finalData.map_visual = mapImagePreview;
    }

    // Embed Action Images
    if (finalData.actions) {
        for (const action of finalData.actions) {
            const file = actionImageFiles[action.id];
            if (file) {
                action.image = await fileToBase64(file);
            } else if (actionImagePreviews[action.id] && actionImagePreviews[action.id].startsWith('data:')) {
                action.image = actionImagePreviews[action.id];
            }
        }
    }

    // Create JSON blob
    const jsonString = JSON.stringify(finalData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `TAC_${formData.mapId}_${formData.title}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
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

  const relevantUtilities = useMemo(() => {
      let utils = UTILITIES.filter(u => u.mapId === formData.mapId && u.side === formData.side);
      if (utilitySearchQuery) {
          const q = utilitySearchQuery.toLowerCase();
          utils = utils.filter(u => 
            u.title.toLowerCase().includes(q) || 
            u.content.toLowerCase().includes(q) ||
            u.type.toLowerCase().includes(q)
          );
      }
      return utils;
  }, [formData.mapId, formData.side, utilitySearchQuery]);

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-neutral-950 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
            <button onClick={onCancel} className="text-neutral-500 font-medium">关闭</button>
            <h2 className="font-bold text-neutral-900 dark:text-white">
                {initialTactic ? '编辑战术' : '新建战术'}
            </h2>
            <button 
                onClick={handleExportJSON}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                导出 JSON
            </button>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Basic Info */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <div className="text-[10px] font-mono text-neutral-400">ID: {formData.id}</div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">战术名称</label>
                    <input 
                        type="text" 
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        className="w-full bg-neutral-100 dark:bg-neutral-900 p-3 rounded-xl dark:text-white font-bold border-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例如：A区快攻..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">作者 (Author)</label>
                        <input 
                            type="text" 
                            value={formData.metadata?.author || ''}
                            onChange={e => setFormData({
                                ...formData, 
                                metadata: { ...formData.metadata!, author: e.target.value }
                            })}
                            className="w-full bg-neutral-100 dark:bg-neutral-900 p-3 rounded-xl dark:text-white border-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">难度</label>
                        <select 
                            value={formData.metadata?.difficulty || 'Medium'}
                            onChange={e => setFormData({
                                ...formData, 
                                metadata: { ...formData.metadata!, difficulty: e.target.value as any }
                            })}
                            className="w-full bg-neutral-100 dark:bg-neutral-900 p-3 rounded-xl dark:text-white border-none"
                        >
                            <option value="Easy">Easy (简单)</option>
                            <option value="Medium">Medium (中等)</option>
                            <option value="Hard">Hard (困难)</option>
                        </select>
                    </div>
                </div>

                {/* Map Visual Upload */}
                <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">战术地图 (图片)</label>
                    <div className="flex gap-3 items-start">
                        <label className={`
                            flex-1 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all relative overflow-hidden
                            ${mapImagePreview ? 'min-h-[160px]' : 'h-12 border-neutral-300 dark:border-neutral-700'}
                        `}>
                            {mapImagePreview ? (
                                <img src={mapImagePreview} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                            ) : null}
                            <div className={`z-10 flex items-center gap-2 ${mapImagePreview ? 'flex-col' : 'flex-row'}`}>
                                <svg className={`text-neutral-400 ${mapImagePreview ? 'w-6 h-6 mb-1' : 'w-4 h-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-[10px] text-neutral-500 font-bold">{mapImagePreview ? '点击更换' : '上传图片'}</span>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleMapImageUpload(e.target.files[0])} />
                        </label>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">区域</label>
                        <select 
                            value={formData.site}
                            onChange={e => setFormData({...formData, site: e.target.value as Site})}
                            className="w-full bg-neutral-100 dark:bg-neutral-900 p-3 rounded-xl dark:text-white border-none"
                        >
                            <option value="A">A Site</option>
                            <option value="Mid">Mid</option>
                            <option value="B">B Site</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">阵营</label>
                        <select 
                            value={formData.side}
                            onChange={e => setFormData({...formData, side: e.target.value as Side})}
                            className="w-full bg-neutral-100 dark:bg-neutral-900 p-3 rounded-xl dark:text-white border-none"
                        >
                            <option value="T">T (进攻)</option>
                            <option value="CT">CT (防守)</option>
                        </select>
                    </div>
                </div>

                {/* Tag Selector */}
                <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">标签</label>
                    <div className="space-y-3">
                        {(Object.entries(tagsByCategory) as [string, Tag[]][]).map(([cat, tags]) => {
                            if (tags.length === 0) return null;
                            return (
                                <div key={cat} className="flex flex-wrap gap-2">
                                    <span className="text-[10px] uppercase text-neutral-400 w-full">{cat}</span>
                                    {tags.map(tag => {
                                        const isSelected = formData.tags?.some(t => t.label === tag.label);
                                        return (
                                            <button
                                                key={tag.label}
                                                onClick={() => toggleTag(tag)}
                                                className={`
                                                    px-2 py-1 rounded-md text-[10px] font-bold border transition-all
                                                    ${isSelected 
                                                        ? 'bg-blue-600 text-white border-blue-600' 
                                                        : 'bg-transparent text-neutral-500 border-neutral-200 dark:border-neutral-800'}
                                                `}
                                            >
                                                {tag.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Actions Editor */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase">战术步骤</label>
                    <button onClick={addAction} className="text-blue-500 text-xs font-bold">+ 添加步骤</button>
                </div>
                
                <div className="space-y-3">
                    {formData.actions?.map((action, idx) => (
                        <div key={action.id} className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl relative group">
                            <button 
                                onClick={() => removeAction(action.id)}
                                className="absolute top-2 right-2 text-neutral-400 hover:text-red-500 z-10"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <div className="grid grid-cols-[80px_1fr] gap-3 items-start">
                                <div className="space-y-2">
                                    <input 
                                        placeholder="时间"
                                        value={action.time || ''}
                                        onChange={e => updateAction(action.id, 'time', e.target.value)}
                                        className="w-full bg-white dark:bg-neutral-950 p-1.5 rounded text-xs text-center border border-neutral-200 dark:border-neutral-800" 
                                    />
                                    <select
                                        value={action.who}
                                        onChange={e => updateAction(action.id, 'who', e.target.value)}
                                        className="w-full bg-white dark:bg-neutral-950 p-1.5 rounded text-[10px] font-bold border border-neutral-200 dark:border-neutral-800"
                                    >
                                        {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    
                                    {/* Utility Button */}
                                    <button
                                        onClick={() => {
                                            setShowUtilityModal(action.id);
                                            setUtilitySearchQuery(''); 
                                        }}
                                        className="w-full py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-[10px] font-bold rounded flex items-center justify-center gap-1"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        引用道具
                                    </button>

                                    {/* Image Upload for Step */}
                                    <label className={`
                                        block w-full border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-950 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group/upload transition-all
                                        ${actionImagePreviews[action.id] ? 'aspect-square' : 'h-8 border-neutral-300 dark:border-neutral-700'}
                                    `}>
                                        {actionImagePreviews[action.id] ? (
                                            <img src={actionImagePreviews[action.id]} className="absolute inset-0 w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-[9px] text-neutral-400">图</span>
                                            </div>
                                        )}
                                        <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleActionImageUpload(action.id, e.target.files[0])} />
                                    </label>
                                </div>
                                
                                <div className="space-y-2">
                                    <textarea 
                                        placeholder="执行细节..."
                                        value={action.content}
                                        onChange={e => updateAction(action.id, 'content', e.target.value)}
                                        rows={4}
                                        className="w-full h-[120px] bg-white dark:bg-neutral-950 p-2 rounded text-sm border border-neutral-200 dark:border-neutral-800 focus:ring-1 focus:ring-blue-500 resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-20"></div> {/* Bottom Spacer */}
        </div>

        {/* Utility Library Modal */}
        {showUtilityModal && (
            <div className="fixed inset-0 z-[110] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-neutral-900 w-full max-w-md h-[80vh] sm:h-[600px] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-20">
                    <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold">选择道具引用</h3>
                            <button onClick={() => setShowUtilityModal(null)} className="text-neutral-500">关闭</button>
                        </div>
                        
                        {/* Search Input */}
                        <div className="relative">
                            <input 
                                type="text"
                                value={utilitySearchQuery}
                                onChange={e => setUtilitySearchQuery(e.target.value)}
                                placeholder="搜索道具名称、类型..."
                                className="w-full bg-neutral-100 dark:bg-neutral-950 p-2 pl-9 rounded-lg text-sm border-none"
                                autoFocus
                            />
                             <svg className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {relevantUtilities.length > 0 ? relevantUtilities.map(util => (
                            <button 
                                key={util.id} 
                                onClick={() => handleUtilitySelect(util)}
                                className="w-full text-left p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex gap-3 group active:scale-[0.98] transition-all"
                            >
                                <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-[10px] text-neutral-400">
                                    {util.image ? <img src={util.image} className="w-full h-full object-cover" /> : util.type}
                                </div>
                                <div>
                                    <div className="font-bold text-sm dark:text-white flex items-center gap-2">
                                        {util.title}
                                        <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-500 uppercase">{util.type}</span>
                                    </div>
                                    <div className="text-xs text-neutral-500 mt-1 line-clamp-1">{util.content}</div>
                                </div>
                            </button>
                        )) : (
                            <div className="text-center text-neutral-500 py-8 flex flex-col items-center">
                                <svg className="w-10 h-10 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <p className="text-sm">没有找到相关道具</p>
                                <p className="text-xs opacity-50 mt-1">请尝试更换搜索词或检查地图筛选</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

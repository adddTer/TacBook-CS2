
import React, { useState, useEffect } from 'react';
import { Utility, Side, Site, MapId, ImageAttachment, UtilityTolerance, ContentGroup } from '../types';
import { generateId } from '../utils/idGenerator';
import { compressImage } from '../utils/imageHelper';

interface UtilityEditorProps {
  initialUtility?: Utility;
  onCancel: () => void;
  onSave: (utility: Utility, targetGroupId: string) => void;
  currentMapId: MapId;
  currentSide: Side;
  writableGroups: ContentGroup[];
}

const getDefaultAuthor = () => localStorage.getItem('tacbook_default_author') || '';

export const UtilityEditor: React.FC<UtilityEditorProps> = ({
  initialUtility,
  onCancel,
  onSave,
  currentMapId,
  currentSide,
  writableGroups
}) => {
  const [formData, setFormData] = useState<Utility>({
    id: generateId('2'),
    mapId: currentMapId,
    side: currentSide,
    site: 'A',
    title: '',
    type: 'smoke',
    content: '',
    image: '',
    images: [],
    metadata: { author: '' }
  });

  const [targetGroupId, setTargetGroupId] = useState<string>('');
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
      if (initialUtility) {
          const loaded = JSON.parse(JSON.stringify(initialUtility));
          if (loaded.image && (!loaded.images || loaded.images.length === 0)) {
              loaded.images = [{ id: 'legacy_main', url: loaded.image, description: 'Main Image' }];
          }
          if (!loaded.images) loaded.images = [];
          setFormData(loaded);
          
          if (initialUtility.groupId && writableGroups.some(g => g.metadata.id === initialUtility.groupId)) {
              setTargetGroupId(initialUtility.groupId);
          } else if (writableGroups.length > 0) {
              setTargetGroupId(writableGroups[0].metadata.id);
          }
      } else {
          setFormData(prev => ({
              ...prev,
              metadata: { ...prev.metadata!, author: getDefaultAuthor() }
          }));
          if (writableGroups.length > 0) {
              setTargetGroupId(writableGroups[0].metadata.id);
          }
      }
  }, []);

  // ... (Image handler functions: handleAddImage, handleRemoveImage, handleImageDescChange - Keep as is) ...
  const handleAddImage = async (file: File) => {
      const compressed = await compressImage(file);
      const newImg: ImageAttachment = { id: generateId('img'), url: compressed, description: '' };
      setFormData(prev => {
          const updatedImages = [...(prev.images || []), newImg];
          return { ...prev, images: updatedImages, image: updatedImages[0]?.url || '' };
      });
  };
  const handleRemoveImage = (imgId: string) => {
      setFormData(prev => {
          const updatedImages = (prev.images || []).filter(img => img.id !== imgId);
          return { ...prev, images: updatedImages, image: updatedImages[0]?.url || '' };
      });
  };
  const handleImageDescChange = (imgId: string, desc: string) => {
      setFormData(prev => ({
          ...prev,
          images: (prev.images || []).map(img => img.id === imgId ? { ...img, description: desc } : img)
      }));
  };
  const handleCopyId = () => {
      if (formData.id) {
          navigator.clipboard.writeText(formData.id);
          setCopiedId(true);
          setTimeout(() => setCopiedId(false), 2000);
      }
  };

  const handleSaveToGroup = () => {
      if (!formData.title || !formData.content) {
          console.warn("请填写标题和描述");
          return;
      }
      if (!targetGroupId) {
          console.warn("请选择保存分组");
          return;
      }
      onSave(formData, targetGroupId);
  };

  const handleExportJSON = async () => {
    if (!formData.title || !formData.content) return;
    const jsonString = JSON.stringify(formData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Filename: Map_Type_Title_ID.utility
    const safeTitle = formData.title.replace(/\s+/g, '_');
    a.download = `${formData.mapId}_${formData.type}_${safeTitle}_${formData.id}.utility`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const applyDefaultAuthor = () => {
      const def = getDefaultAuthor();
      if(def) setFormData(prev => ({ ...prev, metadata: { ...prev.metadata!, author: def } }));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-neutral-950 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md sticky top-0 z-20">
            <button onClick={onCancel} className="text-neutral-500 font-medium">取消</button>
            <h2 className="font-bold text-neutral-900 dark:text-white">{initialUtility ? '编辑道具' : '新建道具'}</h2>
            <div className="flex gap-2">
                <button onClick={handleExportJSON} className="text-neutral-500 dark:text-neutral-400 text-xs font-bold px-2 py-1.5">导出文件</button>
                <button onClick={handleSaveToGroup} className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center gap-1">保存</button>
            </div>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
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
                    {/* LEFT: Metadata */}
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-neutral-900 p-4 lg:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <button onClick={handleCopyId} className="text-[10px] font-mono text-neutral-400 flex items-center gap-1 hover:text-blue-500">
                                    ID: {formData.id} {copiedId && <span className="text-green-500">已复制</span>}
                                </button>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">道具名称</label>
                                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-neutral-100 dark:bg-neutral-800 p-3 rounded-xl dark:text-white font-bold border-none focus:ring-2 focus:ring-blue-500" placeholder="例如：拱门烟..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">作者</label>
                                <div className="flex gap-2">
                                    <input type="text" value={formData.metadata?.author || ''} onChange={e => setFormData({...formData, metadata: { ...formData.metadata!, author: e.target.value }})} className="flex-1 bg-neutral-100 dark:bg-neutral-800 p-3 rounded-xl dark:text-white border-none" />
                                    <button onClick={applyDefaultAuthor} className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-3 rounded-xl font-bold hover:bg-blue-100 transition-colors">默认</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">区域</label>
                                    <select value={formData.site} onChange={e => setFormData({...formData, site: e.target.value as Site})} className="w-full bg-neutral-100 dark:bg-neutral-800 p-3 rounded-xl dark:text-white border-none">
                                        <option value="A">A Site</option>
                                        <option value="Mid">Mid</option>
                                        <option value="B">B Site</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">类型</label>
                                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-neutral-100 dark:bg-neutral-800 p-3 rounded-xl dark:text-white border-none">
                                        <option value="smoke">烟雾</option>
                                        <option value="flash">闪光</option>
                                        <option value="molotov">燃烧弹</option>
                                        <option value="grenade">手雷</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">容错率</label>
                                <select value={formData.tolerance || ''} onChange={e => setFormData({...formData, tolerance: e.target.value as UtilityTolerance || undefined})} className="w-full bg-neutral-100 dark:bg-neutral-800 p-3 rounded-xl dark:text-white border-none mb-3">
                                    <option value="">未选择</option>
                                    <option value="easy">Easy (简单)</option>
                                    <option value="medium">Medium (普通)</option>
                                    <option value="hard">Hard (困难)</option>
                                    <option value="pixel">Pixel (像素级)</option>
                                </select>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">系列 ID (Series)</label>
                                        <input type="text" value={formData.seriesId || ''} onChange={e => setFormData({...formData, seriesId: e.target.value})} className="w-full bg-neutral-100 dark:bg-neutral-800 p-3 rounded-xl dark:text-white border-none text-xs font-mono" placeholder="如: mirage_window_smoke" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">变体名称</label>
                                        <input type="text" value={formData.variantLabel || ''} onChange={e => setFormData({...formData, variantLabel: e.target.value})} className="w-full bg-neutral-100 dark:bg-neutral-800 p-3 rounded-xl dark:text-white border-none text-xs" placeholder="如: 出生点/跑投" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* RIGHT: Content & Image */}
                    <div className="space-y-4 mt-4 lg:mt-0">
                        <div className="bg-white dark:bg-neutral-900 p-4 lg:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">瞄点/丢法描述</label>
                                <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} rows={6} className="w-full bg-neutral-100 dark:bg-neutral-800 p-3 rounded-xl dark:text-white border-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="例如：瞄准天线顶端，按住W跳投..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">参考图集</label>
                                <div className="space-y-3">
                                    {(formData.images || []).map((img) => (
                                        <div key={img.id} className="flex gap-3 items-start bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 p-2 rounded-xl">
                                            <div className="w-16 h-16 shrink-0 bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden">
                                                <img src={img.url} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <input type="text" value={img.description || ''} onChange={(e) => handleImageDescChange(img.id, e.target.value)} placeholder="输入图片描述..." className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 text-xs mb-1 focus:border-blue-500 outline-none dark:text-white" />
                                                <button onClick={() => handleRemoveImage(img.id)} className="text-[10px] text-red-500 hover:text-red-600 font-bold">删除此图</button>
                                            </div>
                                        </div>
                                    ))}
                                    <label className={`block w-full border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden transition-all h-16 hover:border-blue-500`}>
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-xs text-neutral-500 font-bold flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>添加参考图</span>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleAddImage(e.target.files[0])} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

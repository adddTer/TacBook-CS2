
import React, { useState, useEffect } from 'react';
import { Utility, Side, Site, MapId, ImageAttachment, UtilityTolerance, ContentGroup } from '../types';
import { generateId } from '../utils/idGenerator';
import { compressImage } from '../utils/imageHelper';
import { shareFile, downloadBlob } from '../utils/shareHelper';

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
          alert("请填写标题和描述");
          return;
      }
      if (!targetGroupId) {
          alert("请选择保存分组");
          return;
      }
      onSave(formData, targetGroupId);
  };

  const prepareExport = () => {
    if (!formData.title || !formData.content) return null;
    const jsonString = JSON.stringify(formData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const safeTitle = formData.title.replace(/\s+/g, '_');
    const filename = `${formData.mapId}_${formData.type}_${safeTitle}_${formData.id}.utility`;
    return { blob, filename, title: formData.title };
  };

  const handleDownload = () => {
      const result = prepareExport();
      if (result) {
          downloadBlob(result.blob, result.filename);
      }
  };

  const handleShare = async () => {
      const result = prepareExport();
      if (result) {
          const success = await shareFile(result.blob, result.filename, "分享道具", `CS2道具分享：${result.title}`);
          if (!success) {
               alert("您的设备不支持直接分享文件，请使用下载功能。");
          }
      }
  };

  const applyDefaultAuthor = () => {
      const def = getDefaultAuthor();
      if(def) setFormData(prev => ({ ...prev, metadata: { ...prev.metadata!, author: def } }));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-neutral-950 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md sticky top-0 z-20">
            <button onClick={onCancel} className="text-neutral-500 font-bold hover:text-neutral-900 transition-colors">取消</button>
            <h2 className="font-bold text-neutral-900 dark:text-white text-sm">{initialUtility ? '编辑道具' : '新建道具'}</h2>
            <div className="flex gap-2">
                <button onClick={handleDownload} className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-2 rounded-lg" title="下载文件">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 </button>
                 <button onClick={handleShare} className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-2 rounded-lg" title="分享文件">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                 </button>
                <button onClick={handleSaveToGroup} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center gap-1 transition-all active:scale-95">保存</button>
            </div>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
            <div className="max-w-7xl mx-auto p-4 lg:p-8">
                 {/* Group Selector */}
                 {writableGroups.length > 0 ? (
                     <div className="mb-6 flex items-center justify-end">
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
                 ) : (
                     <div className="mb-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-xl text-center sm:text-left">
                         <h4 className="font-bold text-red-700 dark:text-red-400 text-sm">只读模式</h4>
                         <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">请先在主页新建一个战术包以保存您的修改。</p>
                     </div>
                 )}

                <div className="lg:grid lg:grid-cols-2 lg:gap-8">
                    {/* LEFT: Metadata */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
                            <div className="flex justify-between items-center">
                                <button onClick={handleCopyId} className="text-[10px] font-mono text-neutral-400 flex items-center gap-1 hover:text-blue-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded transition-colors">
                                    ID: {formData.id} {copiedId && <span className="text-green-500 ml-1">✓</span>}
                                </button>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">道具名称</label>
                                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl dark:text-white font-bold border border-neutral-100 dark:border-neutral-700 focus:border-blue-500 outline-none transition-colors" placeholder="例如：拱门烟..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">作者</label>
                                <div className="flex gap-2">
                                    <input type="text" value={formData.metadata?.author || ''} onChange={e => setFormData({...formData, metadata: { ...formData.metadata!, author: e.target.value }})} className="flex-1 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl dark:text-white border border-neutral-100 dark:border-neutral-700 focus:border-blue-500 outline-none transition-colors text-sm" />
                                    <button onClick={applyDefaultAuthor} className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-3 rounded-xl font-bold hover:bg-neutral-200 transition-colors">默认</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">区域</label>
                                    <select value={formData.site} onChange={e => setFormData({...formData, site: e.target.value as Site})} className="w-full bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl dark:text-white border border-neutral-100 dark:border-neutral-700 outline-none cursor-pointer">
                                        <option value="A">A Site</option>
                                        <option value="Mid">Mid</option>
                                        <option value="B">B Site</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">类型</label>
                                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl dark:text-white border border-neutral-100 dark:border-neutral-700 outline-none cursor-pointer">
                                        <option value="smoke">烟雾</option>
                                        <option value="flash">闪光</option>
                                        <option value="molotov">燃烧弹</option>
                                        <option value="grenade">手雷</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">容错率</label>
                                <select value={formData.tolerance || ''} onChange={e => setFormData({...formData, tolerance: e.target.value as UtilityTolerance || undefined})} className="w-full bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl dark:text-white border border-neutral-100 dark:border-neutral-700 outline-none cursor-pointer mb-4">
                                    <option value="">未选择</option>
                                    <option value="easy">Easy (简单)</option>
                                    <option value="medium">Medium (普通)</option>
                                    <option value="hard">Hard (困难)</option>
                                    <option value="pixel">Pixel (像素级)</option>
                                </select>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">系列 ID</label>
                                        <input type="text" value={formData.seriesId || ''} onChange={e => setFormData({...formData, seriesId: e.target.value})} className="w-full bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl dark:text-white border border-neutral-100 dark:border-neutral-700 outline-none text-xs font-mono" placeholder="如: mirage_window_smoke" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">变体名称</label>
                                        <input type="text" value={formData.variantLabel || ''} onChange={e => setFormData({...formData, variantLabel: e.target.value})} className="w-full bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl dark:text-white border border-neutral-100 dark:border-neutral-700 outline-none text-xs" placeholder="如: 出生点/跑投" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* RIGHT: Content & Image */}
                    <div className="space-y-6 mt-6 lg:mt-0">
                        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">瞄点/丢法描述</label>
                                <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} rows={6} className="w-full bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl dark:text-white border border-neutral-100 dark:border-neutral-700 focus:border-blue-500 outline-none resize-none text-sm leading-relaxed" placeholder="例如：瞄准天线顶端，按住W跳投..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">参考图集</label>
                                <div className="space-y-3">
                                    {(formData.images || []).map((img) => (
                                        <div key={img.id} className="flex gap-3 items-start bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 p-2 rounded-xl group hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors">
                                            <div className="w-16 h-16 shrink-0 bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden border border-neutral-100 dark:border-neutral-800">
                                                <img src={img.url} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <input type="text" value={img.description || ''} onChange={(e) => handleImageDescChange(img.id, e.target.value)} placeholder="输入图片描述..." className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 text-xs mb-1 focus:border-blue-500 outline-none dark:text-white" />
                                                <button onClick={() => handleRemoveImage(img.id)} className="text-[10px] text-red-500 hover:text-red-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">删除此图</button>
                                            </div>
                                        </div>
                                    ))}
                                    <label className={`block w-full border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden transition-all h-20 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10`}>
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-xs text-neutral-400 font-bold flex items-center gap-1 group-hover:text-blue-500">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                添加参考图
                                            </span>
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

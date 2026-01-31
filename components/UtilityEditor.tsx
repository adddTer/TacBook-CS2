import React, { useState } from 'react';
import { Utility, Side, Site, MapId } from '../types';
import { generateId } from '../utils/idGenerator';
import JSZip from 'jszip';

interface UtilityEditorProps {
  onCancel: () => void;
  currentMapId: MapId;
  currentSide: Side;
}

export const UtilityEditor: React.FC<UtilityEditorProps> = ({
  onCancel,
  currentMapId,
  currentSide
}) => {
  const [formData, setFormData] = useState<Utility>({
    id: generateId('util'),
    mapId: currentMapId,
    side: currentSide,
    site: 'A',
    title: '',
    type: 'smoke',
    content: '',
    image: '',
    metadata: {
        author: 'User'
    }
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const handleImageUpload = (file: File) => {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setFormData(prev => ({ ...prev, image: `[上传中] ${file.name}` }));
  };

  const handleDownloadZip = async () => {
    if (!formData.title || !formData.content) {
        alert("请填写标题和描述");
        return;
    }

    const zip = new JSZip();
    const finalData = JSON.parse(JSON.stringify(formData));

    if (imageFile) {
        const ext = imageFile.name.split('.').pop() || 'png';
        const fileName = `util_${formData.id}.${ext}`;
        zip.folder("images")?.file(fileName, imageFile);
        finalData.image = `./images/${fileName}`;
    }

    zip.file("data.json", JSON.stringify(finalData, null, 2));

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);

    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `UTIL_${formData.mapId}_${formData.type}_${formData.title}.zip`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-neutral-950 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
            <button onClick={onCancel} className="text-neutral-500 font-medium">关闭</button>
            <h2 className="font-bold text-neutral-900 dark:text-white">
                新建道具 (本地)
            </h2>
            <button 
                onClick={handleDownloadZip}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                导出 ZIP
            </button>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <div className="text-[10px] font-mono text-neutral-400">ID: {formData.id}</div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">道具名称</label>
                    <input 
                        type="text" 
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        className="w-full bg-neutral-100 dark:bg-neutral-900 p-3 rounded-xl dark:text-white font-bold border-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例如：拱门烟..."
                    />
                </div>

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
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">类型</label>
                        <select 
                            value={formData.type}
                            onChange={e => setFormData({...formData, type: e.target.value as any})}
                            className="w-full bg-neutral-100 dark:bg-neutral-900 p-3 rounded-xl dark:text-white border-none"
                        >
                            <option value="smoke">Smoke (烟雾)</option>
                            <option value="flash">Flash (闪光)</option>
                            <option value="molotov">Molotov (燃烧弹)</option>
                            <option value="grenade">Grenade (手雷)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">瞄点/丢法描述</label>
                    <textarea 
                        value={formData.content}
                        onChange={e => setFormData({...formData, content: e.target.value})}
                        rows={4}
                        className="w-full bg-neutral-100 dark:bg-neutral-900 p-3 rounded-xl dark:text-white border-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="例如：瞄准天线顶端，按住W跳投..."
                    />
                </div>

                {/* Utility Image Upload */}
                <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">参考图</label>
                    <label className={`
                        block w-full border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden transition-all
                        ${imagePreview ? 'min-h-[150px]' : 'h-12'}
                    `}>
                        {imagePreview ? (
                            <img src={imagePreview} className="absolute inset-0 w-full h-full object-contain" />
                        ) : (
                             <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs text-neutral-500">点击上传</span>
                            </div>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                    </label>
                </div>

                 <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30">
                    <h4 className="text-xs font-bold text-blue-700 dark:text-blue-500 mb-1">打包说明</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400/70">
                        将生成包含数据和图片的 .zip 文件。请解压到项目目录中以发布。
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};
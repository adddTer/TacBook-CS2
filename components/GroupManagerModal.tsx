
import React, { useRef, useState, useEffect } from 'react';
import { ContentGroup } from '../types';
import { exportGroupToZip, importGroupFromZip } from '../utils/groupSerializer';
import { generateGroupId } from '../utils/idGenerator';
import { ConfirmModal } from './ConfirmModal';

interface GroupManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    groups: ContentGroup[];
    setGroups: React.Dispatch<React.SetStateAction<ContentGroup[]>>;
    activeGroupIds: string[];
    onToggleGroup: (id: string) => void;
}

export const GroupManagerModal: React.FC<GroupManagerModalProps> = ({ 
    isOpen, 
    onClose, 
    groups, 
    setGroups,
    activeGroupIds,
    onToggleGroup,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [view, setView] = useState<'list' | 'create' | 'edit' | 'export_config'>('list');
    
    // Form State for Create/Edit
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

    // Form State for Export
    const [exportTargetGroup, setExportTargetGroup] = useState<ContentGroup | null>(null);
    const [exportReadOnly, setExportReadOnly] = useState(true);

    // Confirm Modal State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        validationString?: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    // Reset view when opening
    useEffect(() => {
        if (isOpen) {
            setView('list');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const closeConfirm = () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false, validationString: undefined }));
    };

    // --- Actions ---

    const handleInitiateExport = (group: ContentGroup) => {
        setExportTargetGroup(group);
        setFormName(group.metadata.name);
        setFormDesc(group.metadata.description || '');
        setExportReadOnly(true); 
        setView('export_config');
    };

    const handleConfirmExport = async () => {
        if (!exportTargetGroup) return;

        const groupToExport: ContentGroup = {
            ...exportTargetGroup,
            metadata: {
                ...exportTargetGroup.metadata,
                name: formName || exportTargetGroup.metadata.name,
                description: formDesc || exportTargetGroup.metadata.description,
                isReadOnly: exportReadOnly,
                lastUpdated: Date.now()
            }
        };

        try {
            const blob = await exportGroupToZip(groupToExport);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // File extension changed to .tacpack
            a.download = `TACPACK_${groupToExport.metadata.name.replace(/\s+/g, '_')}_v${groupToExport.metadata.version}.tacpack`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setView('list');
        } catch (e) {
            console.error("Export failed", e);
        }
    };

    const handleDelete = (group: ContentGroup) => {
        setConfirmConfig({
            isOpen: true,
            title: "删除战术包",
            message: `您确定要删除战术包【${group.metadata.name}】吗？\n此操作将永久删除包内所有战术和道具，且不可恢复！`,
            validationString: group.metadata.name, // Require name input
            onConfirm: () => {
                const newGroups = groups.filter(g => g.metadata.id !== group.metadata.id);
                setGroups(newGroups);
                closeConfirm();
            }
        });
    };

    // --- Import Logic ---
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const newGroup = await importGroupFromZip(file);
            
            setGroups(prev => {
                const existingIndex = prev.findIndex(g => g.metadata.id === newGroup.metadata.id);
                
                if (existingIndex !== -1) {
                    const existing = prev[existingIndex];
                    if (newGroup.metadata.version > existing.metadata.version) {
                        // Update
                        const updated = [...prev];
                        updated[existingIndex] = newGroup;
                        return updated;
                    } else {
                        console.log("Imported version is older or same.");
                        return prev;
                    }
                } else {
                    return [...prev, newGroup];
                }
            });
            
            // Auto activate
            onToggleGroup(newGroup.metadata.id);

        } catch (err) {
            console.error(err);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // --- Create / Edit Logic ---

    const startCreate = () => {
        setFormName('');
        setFormDesc('');
        setEditingGroupId(null);
        setView('create');
    };

    const startEdit = (group: ContentGroup) => {
        setFormName(group.metadata.name);
        setFormDesc(group.metadata.description);
        setEditingGroupId(group.metadata.id);
        setView('edit');
    };

    const handleSaveGroup = () => {
        if (!formName.trim()) return;

        if (view === 'create') {
            const newId = generateGroupId();
            const newGroup: ContentGroup = {
                metadata: {
                    id: newId,
                    name: formName,
                    description: formDesc,
                    version: 1,
                    isReadOnly: false,
                    author: localStorage.getItem('tacbook_default_author') || 'User',
                    lastUpdated: Date.now()
                },
                tactics: [],
                utilities: []
            };
            setGroups(prev => [...prev, newGroup]);
            onToggleGroup(newId); // Activate new group
        } else if (view === 'edit' && editingGroupId) {
            setGroups(prev => prev.map(g => {
                if (g.metadata.id === editingGroupId) {
                    return {
                        ...g,
                        metadata: {
                            ...g.metadata,
                            name: formName,
                            description: formDesc,
                            lastUpdated: Date.now()
                        }
                    };
                }
                return g;
            }));
        }
        setView('list');
    };

    const getTitle = () => {
        switch(view) {
            case 'create': return '新建战术组';
            case 'edit': return '编辑信息';
            case 'export_config': return '导出配置';
            default: return '战术包管理';
        }
    };

    return (
        <>
            <div 
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
                onClick={onClose}
            >
                <div 
                    className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[80vh]"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-xl text-neutral-900 dark:text-white">
                            {getTitle()}
                        </h3>
                        
                        <button onClick={() => view === 'list' ? onClose() : setView('list')} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
                            {view === 'list' ? (
                                <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                                <span className="text-xs font-bold text-neutral-500">返回</span>
                            )}
                        </button>
                    </div>

                    {/* List View */}
                    {view === 'list' && (
                        <>
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                                {groups.length === 0 && (
                                    <div className="text-center py-10 text-neutral-400">
                                        <p>暂无战术包，请新建或导入</p>
                                    </div>
                                )}
                                
                                {groups.map(group => {
                                    const isActive = activeGroupIds.includes(group.metadata.id);
                                    return (
                                        <div key={group.metadata.id} 
                                             className={`
                                                border rounded-xl p-4 flex flex-col gap-3 transition-colors
                                                ${isActive 
                                                    ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-500 dark:border-blue-500 ring-1 ring-blue-500' 
                                                    : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800'}
                                             `}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isActive ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600'}`}>
                                                                {isActive && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                            </div>
                                                            <input 
                                                                type="checkbox" 
                                                                className="hidden" 
                                                                checked={isActive}
                                                                onChange={() => onToggleGroup(group.metadata.id)}
                                                            />
                                                            <h4 className="font-bold text-neutral-900 dark:text-white select-none">{group.metadata.name}</h4>
                                                        </label>

                                                        {group.metadata.isReadOnly && (
                                                            <span className="text-[10px] border border-neutral-300 dark:border-neutral-700 text-neutral-500 px-1.5 py-0.5 rounded">只读</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-neutral-500 mt-1 pl-7">{group.metadata.description || "暂无简介"}</p>
                                                    <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-neutral-400 font-mono pl-7">
                                                        <span>ID: {group.metadata.id.substring(0, 8)}...</span>
                                                        <span>v{group.metadata.version}</span>
                                                        <span>T: {group.tactics.length} / U: {group.utilities.length}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-2 justify-end border-t border-neutral-200 dark:border-neutral-800 pt-3 pl-7">
                                                {!group.metadata.isReadOnly && (
                                                    <button 
                                                        onClick={() => startEdit(group)}
                                                        className="text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        编辑
                                                    </button>
                                                )}

                                                <button 
                                                    onClick={() => handleInitiateExport(group)}
                                                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                    导出
                                                </button>
                                                
                                                <button 
                                                    onClick={() => handleDelete(group)}
                                                    className="text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    删除
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-3">
                                <button 
                                    onClick={startCreate}
                                    className="py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    新建空白组
                                </button>
                                <button 
                                    onClick={handleImportClick}
                                    className="py-3 bg-neutral-900 dark:bg-white text-white dark:text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    导入 (.tacpack)
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".zip,.tacpack" 
                                    onChange={handleFileChange}
                                />
                            </div>
                        </>
                    )}

                    {/* Create/Edit View */}
                    {(view === 'create' || view === 'edit') && (
                        <div className="flex-1 flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">组名称</label>
                                <input 
                                    type="text" 
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">简介</label>
                                <textarea 
                                    value={formDesc}
                                    onChange={e => setFormDesc(e.target.value)}
                                    className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white resize-none h-32"
                                />
                            </div>
                            {view === 'edit' && editingGroupId && (
                                 <div className="text-[10px] text-neutral-400 font-mono">
                                     Group ID: {editingGroupId}
                                 </div>
                            )}
                            <div className="flex-1"></div>
                            <button 
                                onClick={handleSaveGroup}
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                            >
                                {view === 'create' ? '创建并启用' : '保存修改'}
                            </button>
                        </div>
                    )}

                    {/* Export Configuration View */}
                    {view === 'export_config' && exportTargetGroup && (
                        <div className="flex-1 flex flex-col gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-200">
                                正在导出：<span className="font-bold">{exportTargetGroup.metadata.name}</span>
                                <br/>
                                <span className="text-xs opacity-70 font-mono mt-1 block">ID: {exportTargetGroup.metadata.id}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">导出名称 (可选重命名)</label>
                                <input 
                                    type="text" 
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm font-bold dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">简介</label>
                                <textarea 
                                    value={formDesc}
                                    onChange={e => setFormDesc(e.target.value)}
                                    className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm dark:text-white resize-none h-24"
                                />
                            </div>

                            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={exportReadOnly}
                                        onChange={e => setExportReadOnly(e.target.checked)}
                                        className="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div>
                                        <div className="font-bold text-sm text-neutral-900 dark:text-white">锁定为只读 (Read Only)</div>
                                        <div className="text-xs text-neutral-500">
                                            如果勾选，其他人导入此包后将无法修改其中的内容。
                                            <br/>
                                            <span className="text-red-500">注意：如果您希望分享可编辑的模板，请取消勾选。</span>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <div className="flex-1"></div>
                            <button 
                                onClick={handleConfirmExport}
                                className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20"
                            >
                                确认导出 .tacpack
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                isDangerous={true}
                validationString={confirmConfig.validationString}
                onConfirm={confirmConfig.onConfirm}
                onCancel={closeConfirm}
            />
        </>
    );
};

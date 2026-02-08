
import React, { useState, useMemo } from 'react';

interface JsonDebuggerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const JsonDebugger: React.FC<JsonDebuggerProps> = ({ isOpen, onClose }) => {
    const [jsonContent, setJsonContent] = useState<any>(null);
    const [fileName, setFileName] = useState('');
    const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const eventStats = useMemo(() => {
        if (!jsonContent) return null;
        
        // Handle standard structure { meta: ..., events: [...] }
        const eventsArray = Array.isArray(jsonContent.events) ? jsonContent.events : 
                            Array.isArray(jsonContent) ? jsonContent : null;

        if (!eventsArray) return null;
        
        const stats: Record<string, { count: number, samples: any[], keys: Set<string> }> = {};
        
        eventsArray.forEach((ev: any) => {
            const name = ev.event_name || 'unknown_event';
            if (!stats[name]) {
                stats[name] = { count: 0, samples: [], keys: new Set() };
            }
            stats[name].count++;
            
            // Keep first 10 samples
            if (stats[name].samples.length < 10) {
                stats[name].samples.push(ev);
            }
            
            // Collect all unique keys seen for this event type
            Object.keys(ev).forEach(k => stats[name].keys.add(k));
        });
        
        // Convert to array and sort by frequency
        return Object.entries(stats).sort((a, b) => b[1].count - a[1].count);
    }, [jsonContent]);

    if (!isOpen) return null;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setIsProcessing(true);
        setCopySuccess(false);
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const content = ev.target?.result as string;
                const parsed = JSON.parse(content);
                setJsonContent(parsed);
                setSelectedEventType(null);
            } catch (err) {
                alert("无效的 JSON 文件");
                console.error(err);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
    };

    const handleCopyReport = () => {
        if (!eventStats) return;

        let report = `=== TACBOOK JSON DEBUG REPORT ===\n`;
        report += `File: ${fileName}\n`;
        report += `Date: ${new Date().toLocaleString()}\n`;
        report += `Total Events: ${eventStats.reduce((acc, curr) => acc + curr[1].count, 0)}\n`;
        report += `Event Types: ${eventStats.length}\n\n`;

        eventStats.forEach(([name, stat]) => {
            report += `----------------------------------------\n`;
            report += `EVENT: ${name}\n`;
            report += `COUNT: ${stat.count}\n`;
            report += `KEYS: [${Array.from(stat.keys).sort().join(', ')}]\n`;
            report += `SAMPLE (1st):\n${JSON.stringify(stat.samples[0], null, 2)}\n`;
            report += `\n`;
        });

        navigator.clipboard.writeText(report).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }).catch(err => {
            console.error('Failed to copy', err);
            alert('复制失败，请尝试手动截图');
        });
    };

    return (
        <div className="fixed inset-0 top-0 left-0 w-full h-full z-[999] bg-neutral-950 text-white flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-neutral-800 bg-neutral-900 shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        结构分析器
                    </h2>
                    {fileName && <span className="text-xs font-mono text-neutral-500 bg-neutral-800 px-2 py-1 rounded hidden sm:inline-block">{fileName}</span>}
                </div>
                
                <div className="flex items-center gap-2">
                    {jsonContent && (
                        <button 
                            onClick={handleCopyReport}
                            className={`
                                text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-2
                                ${copySuccess 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50'}
                            `}
                        >
                            {copySuccess ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    已复制
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                    复制报告
                                </>
                            )}
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
            
            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
                {!jsonContent ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-500">
                        {isProcessing ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <p>正在解析大文件，请稍候...</p>
                            </div>
                        ) : (
                            <>
                                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <p className="mb-6">请上传 Demo 解析生成的 .json 文件</p>
                                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl transition-colors shadow-lg shadow-blue-900/20">
                                    选择文件
                                    <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                                </label>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Sidebar: Event List */}
                        <div className="w-1/3 min-w-[200px] max-w-sm border-r border-neutral-800 flex flex-col bg-neutral-900/50">
                            <div className="p-3 border-b border-neutral-800 text-xs font-bold text-neutral-500 uppercase tracking-wider flex justify-between">
                                <span>Event Type</span>
                                <span>Count</span>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {eventStats ? (
                                    eventStats.map(([name, stat]) => (
                                        <button 
                                            key={name} 
                                            onClick={() => setSelectedEventType(name)}
                                            className={`w-full flex justify-between items-center p-3 text-sm border-b border-neutral-800/50 transition-colors text-left font-mono
                                                ${selectedEventType === name 
                                                    ? 'bg-blue-900/30 text-blue-400 border-l-2 border-l-blue-500' 
                                                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border-l-2 border-l-transparent'}
                                            `}
                                        >
                                            <span className="truncate pr-2" title={name}>{name}</span>
                                            <span className="bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded text-xs min-w-[30px] text-center">{stat.count}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-4 text-sm text-yellow-500">
                                        未找到 "events" 数组。请检查 JSON 结构是否为 &#123; meta: ..., events: [...] &#125;
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Main: Details */}
                        <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
                            {selectedEventType && eventStats ? (
                                (() => {
                                    const stat = eventStats.find(s => s[0] === selectedEventType)?.[1];
                                    if (!stat) return null;
                                    return (
                                        <div className="flex-1 overflow-y-auto p-6">
                                            <div className="flex items-center gap-3 mb-6">
                                                <h3 className="text-2xl font-black text-white font-mono break-all">{selectedEventType}</h3>
                                                <span className="bg-neutral-800 text-neutral-400 px-2 py-1 rounded text-xs font-mono shrink-0">
                                                    {stat.count} occurrences
                                                </span>
                                            </div>

                                            {/* Keys */}
                                            <div className="mb-8">
                                                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">包含字段 (Keys)</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {Array.from(stat.keys).sort().map(k => (
                                                        <span key={k} className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs font-mono text-green-400 select-all">
                                                            {k}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Samples */}
                                            <div>
                                                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">数据样本 (Top 10)</h4>
                                                <div className="space-y-4">
                                                    {stat.samples.map((sample, idx) => (
                                                        <div key={idx} className="relative group">
                                                            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-neutral-800 group-hover:bg-blue-600 transition-colors"></div>
                                                            <pre className="bg-neutral-900/50 p-4 rounded-lg overflow-x-auto text-xs font-mono text-neutral-300 border border-neutral-800 leading-relaxed whitespace-pre-wrap">
                                                                {JSON.stringify(sample, null, 2)}
                                                            </pre>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-neutral-600">
                                    <p>请从左侧选择一个事件类型查看详情</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

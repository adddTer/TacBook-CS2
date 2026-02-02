
import React, { useState, useEffect } from 'react';
import { getAIConfig, saveAIConfig, testConnection, fetchOpenAIModels, AIProvider, PRESET_MODELS } from '../services/ai';

interface AiConfigModalProps {
    onClose: () => void;
    onSave: () => void;
}

const PROVIDERS: { id: AIProvider, name: string, defaultBaseUrl: string }[] = [
    { id: 'google', name: 'Google Gemini', defaultBaseUrl: '' },
    { id: 'deepseek', name: 'DeepSeek', defaultBaseUrl: 'https://api.deepseek.com/v1' },
    { id: 'openai', name: 'OpenAI / Generic', defaultBaseUrl: 'https://api.openai.com/v1' },
    { id: 'custom', name: 'Custom / Proxy', defaultBaseUrl: '' },
];

export const AiConfigModal: React.FC<AiConfigModalProps> = ({ onClose, onSave }) => {
    const [provider, setProvider] = useState<AIProvider>('google');
    const [baseUrl, setBaseUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    
    // List of models to show in the dropdown
    const [availableModels, setAvailableModels] = useState<{id: string, name: string}[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    useEffect(() => {
        const config = getAIConfig();
        setProvider(config.provider);
        setBaseUrl(config.baseUrl);
        setApiKey(config.apiKey);
        setModel(config.model);
        
        // Initialize available models with presets for the current provider
        setAvailableModels(PRESET_MODELS[config.provider] || []);
    }, []);

    const handleProviderChange = (newProvider: AIProvider) => {
        setProvider(newProvider);
        
        const provData = PROVIDERS.find(p => p.id === newProvider);
        if (provData && newProvider !== 'custom' && newProvider !== 'google') {
            setBaseUrl(provData.defaultBaseUrl);
        }

        // Reset available models to presets
        const presets = PRESET_MODELS[newProvider] || [];
        setAvailableModels(presets);

        // Auto-select first preset if available
        if (presets.length > 0) {
            setModel(presets[0].id);
        } else {
            setModel('');
        }
    };

    const handleFetchModels = async () => {
        if (!baseUrl || !apiKey) {
            setStatusMsg('需要 Base URL 和 API Key 才能获取模型列表');
            return;
        }

        setIsFetchingModels(true);
        setStatusMsg('正在获取模型列表...');
        
        try {
            const fetched = await fetchOpenAIModels(baseUrl, apiKey);
            if (fetched.length > 0) {
                setAvailableModels(fetched);
                setStatusMsg(`成功获取 ${fetched.length} 个模型`);
                if (!model) setModel(fetched[0].id);
            } else {
                setStatusMsg('未找到模型，请检查 API 权限');
            }
        } catch (e) {
            console.error(e);
            setStatusMsg('获取失败，请手动输入');
        } finally {
            setIsFetchingModels(false);
        }
    };

    const handleTest = async () => {
        if (!apiKey) {
            setStatusMsg('请先输入 API Key');
            return;
        }
        setIsLoading(true);
        setStatusMsg('正在测试连接...');
        try {
            await testConnection(provider, baseUrl, apiKey, model);
            setStatusMsg('连接成功！API 可用。');
        } catch (e) {
            console.error(e);
            setStatusMsg('连接失败。请检查 Key、代理或模型名称。');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = () => {
        if (apiKey && model) {
            saveAIConfig(provider, baseUrl, apiKey, model);
            onSave();
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
                
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">配置 AI Copilot</h3>
                </div>

                <div className="space-y-4">
                    {/* Provider Selector */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">供应商 (Provider)</label>
                        <select 
                            value={provider}
                            onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                            className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-neutral-900 dark:text-neutral-100 appearance-none"
                        >
                            {PROVIDERS.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Base URL (Hidden for Google) */}
                    {provider !== 'google' && (
                        <div className="animate-in fade-in">
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Base URL (API 地址)</label>
                            <input 
                                type="text"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                placeholder="https://api.example.com/v1"
                                className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-neutral-900 dark:text-neutral-100 font-mono"
                            />
                        </div>
                    )}

                    {/* API Key */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">API Key</label>
                        <input 
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-neutral-900 dark:text-neutral-100"
                        />
                    </div>

                    {/* Model Selector / Input */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase">模型 (Model)</label>
                            {provider !== 'google' && (
                                <button 
                                    onClick={handleFetchModels}
                                    disabled={isFetchingModels || !apiKey}
                                    className="text-[10px] text-blue-500 hover:text-blue-600 disabled:opacity-50 flex items-center gap-1"
                                >
                                    {isFetchingModels ? '获取中...' : '刷新列表'}
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </button>
                            )}
                        </div>
                        
                        {/* If we have a list (either preset or fetched), show dropdown + custom input capability */}
                        <div className="relative">
                            <input 
                                type="text"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                placeholder="输入模型名称..."
                                className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-neutral-900 dark:text-neutral-100 pr-8"
                            />
                            
                            {/* Dropdown overlay for quick selection */}
                            <select 
                                onChange={(e) => setModel(e.target.value)}
                                value=""
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={availableModels.length === 0}
                            >
                                <option value="" disabled>选择模型...</option>
                                {availableModels.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>

                            <div className="absolute right-3 top-3 pointer-events-none text-neutral-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                        
                        {availableModels.length > 0 && (
                            <p className="text-[10px] text-neutral-400 mt-1 ml-1">
                                可直接输入，或点击下拉箭头选择。
                            </p>
                        )}
                    </div>

                    {/* Test Button */}
                    <button 
                        onClick={handleTest}
                        disabled={isLoading || !apiKey}
                        className="w-full py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <span className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        )}
                        测试连接 (Ping)
                    </button>
                    
                    {statusMsg && (
                        <div className={`text-[10px] text-center ${statusMsg.includes('失败') || statusMsg.includes('未找到') ? 'text-red-500' : 'text-green-500'}`}>
                            {statusMsg}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!apiKey || !model}
                        className="px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        保存并启用
                    </button>
                </div>
            </div>
        </div>
    );
};

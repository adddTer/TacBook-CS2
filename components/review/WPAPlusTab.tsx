import React from 'react';

export const WPAPlusTab: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px] bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[100px]" />
                <div className="absolute top-[60%] -right-[10%] w-[60%] h-[60%] bg-purple-500 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto">
                <div className="inline-flex items-center justify-center p-3 bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/30">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-black text-gradient-clip bg-gradient-wpa mb-4 tracking-tight">
                    WPA+ 胜率评估模型
                </h2>
                
                <div className="inline-block px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-bold uppercase tracking-widest rounded-full mb-8">
                    即将上线 · Coming Soon
                </div>

                <div className="space-y-6 text-left">
                    <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm md:text-base">
                        WPA+ (Win Probability Added Plus) 是基于深度神经网络构建的全新胜率评估模型。它突破了传统数据的局限，能够更精准、多维度地解析比赛中的每一个关键决策。
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <h3 className="font-bold text-neutral-900 dark:text-white">击杀与战术影响</h3>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                独立评估每小局中“击杀”与“战术执行”对胜率的分别贡献，让非击杀向的战术价值（如关键烟雾、拉扯走位）也能被精准量化。
                            </p>
                        </div>

                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <h3 className="font-bold text-neutral-900 dark:text-white">对枪压力指数</h3>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                实时计算交火瞬间的生存环境（下一个死亡概率 / 下一个击杀概率），直观反映选手在极端劣势下承受的火力压制程度。
                            </p>
                        </div>

                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 md:col-span-2">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full bg-purple-500" />
                                <h3 className="font-bold text-neutral-900 dark:text-white">击杀难度评估</h3>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                结合站位、血量、武器与人数差（下一个击杀概率 / 下一个死亡概率），动态评估每一次击杀的含金量。破局首杀与残局翻盘将获得更高的模型权重。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

import React from "react";
import { Tactic } from "../types";

interface TacticPrintPreviewProps {
  tactic: Tactic;
  onClose: () => void;
}

export const TacticPrintPreview: React.FC<TacticPrintPreviewProps> = ({
  tactic,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-100/90 dark:bg-neutral-900/90 backdrop-blur-md flex flex-col pt-safe print:bg-white print:z-auto print:fixed print:inset-0">
      {/* Toolbar - hidden in print */}
      <div className="flex-none bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-4 flex justify-between items-center print:hidden shadow-sm z-10">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
          打印预览
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            开始打印
          </button>
        </div>
      </div>

      {/* Print Canvas Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center print:p-0 print:overflow-visible text-[black]">
        {/* A4 Wrapper */}
        <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-2xl print:shadow-none print:w-full print:max-w-none print:min-h-0 text-black p-8 md:p-12 box-border">
          {/* Header */}
          <div className="text-center border-b-4 border-black pb-4 mb-6">
            <h1 className="text-3xl font-black uppercase tracking-widest leading-tight">
              {tactic.mapId} {tactic.side === "T" ? "T" : "CT"}
            </h1>
            {tactic.title && (
              <h2 className="text-2xl font-bold mt-1 uppercase tracking-wider">
                {tactic.title}
              </h2>
            )}
          </div>

          {/* Strat Sheet Grid */}
          {tactic.sections && tactic.sections.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-0 border-t-2 border-l-2 border-black">
              {tactic.sections.map((section) => (
                <div
                  key={section.id}
                  className="border-r-2 border-b-2 border-black p-4 break-inside-avoid"
                >
                  <h3 className="font-black text-sm uppercase tracking-widest border-b border-black pb-2 mb-3">
                    {section.title}
                  </h3>
                  <div className="text-xs font-medium whitespace-pre-wrap leading-relaxed">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-neutral-500 italic py-10">
              暂无战术模块内容
            </div>
          )}

          {/* Legacy Actions (if any) */}
          {tactic.actions &&
            tactic.actions.length > 0 &&
            !(tactic.sections && tactic.sections.length > 0) && (
              <div className="mt-8 border-2 border-black p-4">
                <h3 className="font-black text-sm uppercase tracking-widest border-b-2 border-black pb-2 mb-4">
                  TIMELINE
                </h3>
                <div className="space-y-4">
                  {tactic.actions.map((action) => (
                    <div
                      key={action.id}
                      className="flex gap-4 border-b border-neutral-300 pb-4 break-inside-avoid"
                    >
                      <div className="font-bold w-16 shrink-0">
                        {action.time}
                      </div>
                      <div className="flex-1 text-sm whitespace-pre-wrap">
                        {action.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

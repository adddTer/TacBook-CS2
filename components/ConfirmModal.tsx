
import React, { useState, useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  validationString?: string; // If provided, user must type this to confirm
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "确定",
  cancelText = "取消",
  isDangerous = false,
  validationString,
  onConfirm,
  onCancel
}) => {
  const [inputValue, setInputValue] = useState('');

  // Reset input when opening
  useEffect(() => {
    if (isOpen) setInputValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmDisabled = validationString ? inputValue !== validationString : false;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      ></div>
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-neutral-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 scale-100 animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
        
        {validationString && (
            <div className="mb-6">
                <label className="block text-xs font-bold text-neutral-500 mb-2">
                    请输入 <span className="text-red-500 font-mono select-all">{validationString}</span> 以确认：
                </label>
                <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={validationString}
                    className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none dark:text-white font-bold"
                    autoFocus
                />
            </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={`
              px-4 py-2 text-sm font-bold text-white rounded-xl shadow-lg transition-transform active:scale-95
              ${isConfirmDisabled 
                ? 'bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed opacity-70' 
                : isDangerous 
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}
            `}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

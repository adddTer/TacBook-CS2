
import React, { useState, useEffect } from 'react';

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: 'success' | 'error' | 'info';
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
  type = 'info'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-neutral-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 scale-100 animate-in zoom-in-95 duration-200">
        <h3 className={`text-lg font-bold mb-2 ${
            type === 'error' ? 'text-red-600 dark:text-red-400' : 
            type === 'success' ? 'text-green-600 dark:text-green-400' : 
            'text-neutral-900 dark:text-white'
        }`}>
          {title}
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-white bg-neutral-900 dark:bg-neutral-700 hover:bg-neutral-800 dark:hover:bg-neutral-600 rounded-xl shadow-lg transition-transform active:scale-95"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

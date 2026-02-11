
import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  subMessage?: string;
  progress?: number; // 0 to 100. If undefined, shows indeterminate spinner
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isVisible, 
  message = "Loading...", 
  subMessage,
  progress 
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-white/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl p-8 max-w-sm w-full flex flex-col items-center text-center">
        
        {/* Icon / Spinner */}
        {progress === undefined ? (
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        ) : (
           <div className="w-full mb-4">
               <div className="flex justify-between text-xs font-bold text-neutral-500 mb-1">
                   <span>进度</span>
                   <span>{Math.round(progress)}%</span>
               </div>
               <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2.5 overflow-hidden">
                   <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                        style={{ width: `${progress}%` }}
                   ></div>
               </div>
           </div>
        )}

        {/* Text */}
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
            {message}
        </h3>
        
        {subMessage && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-mono truncate w-full">
                {subMessage}
            </p>
        )}
      </div>
    </div>
  );
};

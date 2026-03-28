import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-950 text-white p-8 flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full bg-neutral-900 border border-red-900/50 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h1 className="text-2xl font-bold">应用发生崩溃</h1>
            </div>
            <p className="text-neutral-400 mb-6">
              这可能是由于某些特定设备尺寸或数据状态导致的渲染错误。请截图此页面并反馈。
            </p>
            
            <div className="bg-black/50 rounded-xl p-4 overflow-auto max-h-[400px] font-mono text-sm">
              <div className="text-red-400 font-bold mb-2">{this.state.error?.toString()}</div>
              <div className="text-neutral-500 whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors text-sm font-bold"
              >
                清除本地数据并重载
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white text-black hover:bg-neutral-200 rounded-lg transition-colors text-sm font-bold"
              >
                重新加载页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

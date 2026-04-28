"use client";

import { Component, ReactNode } from "react";
import { FaExclamationTriangle, FaRedo } from "react-icons/fa";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full flex flex-col items-center justify-center py-20 px-6 text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
            <FaExclamationTriangle size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">
              {this.props.fallbackTitle || "Something went wrong"}
            </h3>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 max-w-sm">
              This section ran into an unexpected error. Your data is safe — try reloading it.
            </p>
            {this.state.error && (
              <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 mt-2 max-w-sm break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="px-6 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#042d1f] dark:hover:bg-emerald-500 transition-all active:scale-95 shadow-md flex items-center gap-2"
          >
            <FaRedo size={10} /> Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
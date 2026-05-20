import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-[#0d1929] flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-[#162236] rounded-3xl p-8 text-center space-y-4">
          <img src="/logo.jpg" alt="SkillSpark" className="h-20 w-auto mx-auto" />
          <h2 className="text-white font-black text-xl">Something went wrong</h2>
          <p className="text-slate-400 text-sm font-mono break-all">
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full rounded-2xl bg-[#FF6321] py-3 font-black text-white"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}

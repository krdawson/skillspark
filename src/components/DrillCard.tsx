import { Flame, CheckCircle2 } from 'lucide-react';
import { Drill } from '../types';
import { cn } from '../lib/cn';

interface Props {
  drill: Drill;
  isDone: boolean;
  onToggle: () => void;
}

export default function DrillCard({ drill, isDone, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-5 text-left shadow-sm transition-all hover:shadow-md w-full',
        isDone && 'opacity-60 bg-slate-50 dark:bg-slate-800'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className={cn(
            'rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
            drill.type === 'sport-specific' ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' :
            drill.type === 'conditioning'   ? 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400' :
                                              'bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400'
          )}>
            {drill.type}
          </span>
          <h4 className={cn('text-lg font-bold dark:text-slate-100', isDone && 'line-through opacity-50')}>{drill.title}</h4>
          <p className="text-sm text-[#9E9E9E] dark:text-slate-400">{drill.description}</p>
        </div>
        <div className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300',
          isDone ? 'bg-green-500 scale-110 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600'
        )}>
          <CheckCircle2 size={28} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-slate-50 dark:border-slate-800 pt-3">
        <div className="flex items-center gap-1.5 text-[#FF6321]">
          <Flame size={16} />
          <span className="text-sm font-bold">{drill.reps}</span>
        </div>
      </div>
    </button>
  );
}

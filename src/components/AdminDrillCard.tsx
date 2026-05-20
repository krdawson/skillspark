import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Flame, Trash2, Edit3 } from 'lucide-react';
import { Drill } from '../types';
import { cn } from '../lib/cn';

export default function AdminDrillCard({ drill, onDelete, onEdit }: { drill: Drill; onDelete?: (id: string) => void; onEdit?: (drill: Drill) => void; key?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this drill?')) {
      onDelete?.(drill.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(drill);
  };

  return (
    <div 
      className="group rounded-2xl bg-white dark:bg-slate-900 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-1.5 w-1.5 rounded-full",
            drill.type === 'sport-specific' ? "bg-blue-500" :
            drill.type === 'conditioning' ? "bg-green-500" : "bg-purple-500"
          )} />
          <p className="font-bold text-sm dark:text-slate-100">{drill.title}</p>
        </div>
        <div className="flex items-center gap-3">
          {onEdit && (
            <button 
              onClick={handleEdit}
              className="text-slate-300 hover:text-blue-500 transition-colors"
            >
              <Edit3 size={14} />
            </button>
          )}
          {onDelete && (
            <button 
              onClick={handleDelete}
              className="text-slate-300 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          <motion.div
             animate={{ rotate: isExpanded ? 180 : 0 }}
             className="text-slate-300 group-hover:text-slate-400 dark:text-slate-600 dark:group-hover:text-slate-500"
          >
            <ChevronDown size={14} />
          </motion.div>
        </div>
      </div>
      
      {!isExpanded && (
        <div className="mt-2 flex items-center justify-between">
           <p className="text-[10px] font-bold text-[#FF6321] opacity-80">{drill.reps}</p>
           <div className="flex gap-1">
              {drill.sports.map(s => (
                <span key={s} className="text-[8px] font-black uppercase text-slate-300 dark:text-slate-500">
                  {s}
                </span>
              ))}
           </div>
        </div>
      )}

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-3 border-t border-slate-50 dark:border-slate-800 mt-3">
              <div className="flex gap-1 flex-wrap">
                <span className="text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded px-1.5 py-0.5">
                  {drill.type}
                </span>
                {drill.sports.map(s => (
                  <span key={s} className="text-[9px] font-black uppercase bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded px-1.5 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{drill.description}</p>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-[#FF6321] bg-orange-50 dark:bg-orange-950/30 w-fit px-2.5 py-1 rounded-lg">
                <Flame size={12} />
                <span>{drill.reps}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

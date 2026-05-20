import { motion } from 'motion/react';

interface Props {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export default function RadialProgress({ progress, size = 80, strokeWidth = 8, color = 'text-[#FF6321]' }: Props) {
  const safe = isNaN(progress) || !isFinite(progress) ? 0 : progress;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (safe / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-100" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="currentColor"
          strokeWidth={strokeWidth} strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={color}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-black">{Math.round(safe)}%</span>
      </div>
    </div>
  );
}

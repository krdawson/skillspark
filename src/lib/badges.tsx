import type { ReactNode } from 'react';
import { CheckCircle2, Flame, Crown, Trophy, Medal } from 'lucide-react';

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: ReactNode;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'rookie',      title: 'Rookie',       description: 'First drill ever!',        icon: <CheckCircle2 size={16} />, color: 'bg-green-100 text-green-700' },
  { id: 'week-streak', title: 'Week Warrior',  description: '7-day practice streak',   icon: <Flame size={16} />,        color: 'bg-orange-100 text-orange-700' },
  { id: 'month-streak',title: 'Consistent',    description: '30-day practice streak',  icon: <Crown size={16} />,        color: 'bg-purple-100 text-purple-700' },
  { id: 'century',     title: '100 Club',      description: '100 drills total',        icon: <Trophy size={16} />,       color: 'bg-yellow-100 text-yellow-700' },
  { id: 'quest-master',title: 'Quest Master',  description: 'Finished a full quest',   icon: <Medal size={16} />,        color: 'bg-blue-100 text-blue-700' },
];

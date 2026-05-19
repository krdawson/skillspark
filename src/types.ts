export type Sport = 'soccer' | 'lacrosse' | 'both' | 'none';
export type DrillType = 'sport-specific' | 'conditioning' | 'strength';

export interface Profile {
  id: string;
  name: string;
  role: 'kid' | 'admin';
  sport: Sport;
  drillsPerDay: number;
  pin?: string;
  streak?: number;
  xp?: number;
  level?: number;
  badges?: string[];
}

export interface Drill {
  id: string;
  title: string;
  description: string;
  sports: Sport[];
  type: DrillType;
  reps: string;
}

export interface Milestone {
  id: string;
  target: number;
  reward: string;
  isAchieved: boolean;
}

export type GoalType = 'total_drills' | 'streak';

export interface Goal {
  id: string;
  profileId: string;
  title: string;
  type: GoalType;
  milestones: Milestone[];
  currentValue: number;
  isTeam?: boolean;
}

export interface DailyLog {
  id: string;
  profileId: string;
  date: string;
  drillIds: string[];
  completedDrillIds: string[];
  isDone: boolean;
}

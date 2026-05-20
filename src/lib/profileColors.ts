export const PROFILE_COLORS = [
  { id: 'blue',   hex: '#3B82F6', label: 'Blue'   },
  { id: 'purple', hex: '#8B5CF6', label: 'Purple' },
  { id: 'green',  hex: '#10B981', label: 'Green'  },
  { id: 'orange', hex: '#F97316', label: 'Orange' },
  { id: 'pink',   hex: '#EC4899', label: 'Pink'   },
  { id: 'teal',   hex: '#14B8A6', label: 'Teal'   },
  { id: 'red',    hex: '#EF4444', label: 'Red'    },
  { id: 'amber',  hex: '#F59E0B', label: 'Amber'  },
];

export function getProfileColor(colorId?: string): string {
  return PROFILE_COLORS.find(c => c.id === colorId)?.hex ?? '#3B82F6';
}

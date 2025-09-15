// Re-export types from local schema for consistency
export type { ExpenseItem, Mission, InsertMission, Employee, Bank } from "./schema";

// Additional frontend-specific types

import type { Mission } from "./schema";

export interface MissionsCollection {
  missions: Mission[];
  activeMissionId: string | null;
}

export const expenseTypes = {
  'transportation': 'انتقالات',
  'fees': 'رسوم',
  'tips': 'إكراميات',
  'office-supplies': 'أدوات مكتبية',
  'hospitality': 'ضيافة'
} as const;

export type ExpenseType = keyof typeof expenseTypes;

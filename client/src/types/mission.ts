export interface ExpenseItem {
  id: string;
  type: string;
  amount: number;
  banks: string[];
}

export interface MissionData {
  employee: {
    code: number;
    name: string;
    branch: string;
  } | null;
  missionDate: string;
  statement: string;
  expenses: ExpenseItem[];
  timestamp: string;
}

export const expenseTypes = {
  'transportation': 'انتقالات',
  'fees': 'رسوم',
  'tips': 'إكراميات',
  'office-supplies': 'أدوات مكتبية',
  'hospitality': 'ضيافة'
} as const;

export type ExpenseType = keyof typeof expenseTypes;

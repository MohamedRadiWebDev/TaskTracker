import { z } from 'zod';

// Employee Types
export interface Employee {
  id: string;
  code: number;
  name: string;
  branch: string;
}

export const insertEmployeeSchema = z.object({
  code: z.number(),
  name: z.string(),
  branch: z.string(),
});

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

// Bank Types
export interface Bank {
  id: string;
  name: string;
}

export const insertBankSchema = z.object({
  name: z.string(),
});

export type InsertBank = z.infer<typeof insertBankSchema>;

// Expense Item Type
export interface ExpenseItem {
  id: string;
  type: string;
  amount: number;
  banks: string[];
}

export const expenseItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  amount: z.number(),
  banks: z.array(z.string())
});

// Mission Types
export interface Mission {
  id: string;
  employeeCode: number;
  employeeName: string;
  employeeBranch: string;
  missionDate: string;
  bank?: string | null;
  statement?: string | null;
  expenses: ExpenseItem[];
  totalAmount: string;
  createdAt?: Date;
}

export const insertMissionSchema = z.object({
  employeeCode: z.number(),
  employeeName: z.string(),
  employeeBranch: z.string(),
  missionDate: z.string(),
  bank: z.string().optional().nullable(),
  statement: z.string().optional().nullable(),
  expenses: expenseItemSchema.array(),
  totalAmount: z.string(),
});

export type InsertMission = z.infer<typeof insertMissionSchema>;
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: integer("code").notNull().unique(),
  name: text("name").notNull(),
  branch: text("branch").notNull(),
});

export const banks = pgTable("banks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
});

export const missions = pgTable("missions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeCode: integer("employee_code").notNull(),
  employeeName: text("employee_name").notNull(),
  employeeBranch: text("employee_branch").notNull(),
  missionDate: text("mission_date").notNull(),
  bank: text("bank"),
  statement: text("statement"),
  expenses: json("expenses").$type<ExpenseItem[]>().notNull().default([]),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export interface ExpenseItem {
  id: string;
  type: string;
  amount: number;
  banks: string[];
}

export const insertEmployeeSchema = createInsertSchema(employees).pick({
  code: true,
  name: true,
  branch: true,
});

export const insertBankSchema = createInsertSchema(banks).pick({
  name: true,
});

// Define explicit Zod schema for ExpenseItem
const expenseItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  amount: z.number(),
  banks: z.array(z.string())
});

export const insertMissionSchema = createInsertSchema(missions).pick({
  employeeCode: true,
  employeeName: true,
  employeeBranch: true,
  missionDate: true,
  bank: true,
  statement: true,
  expenses: true,
  totalAmount: true,
}).extend({
  expenses: expenseItemSchema.array()
});

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertBank = z.infer<typeof insertBankSchema>;
export type Bank = typeof banks.$inferSelect;
export type InsertMission = z.infer<typeof insertMissionSchema>;
export type Mission = typeof missions.$inferSelect;

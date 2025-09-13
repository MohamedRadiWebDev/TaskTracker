import { type Employee, type Bank, type Mission, type InsertMission } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getEmployees(): Promise<Employee[]>;
  getEmployeeByCode(code: number): Promise<Employee | undefined>;
  getBanks(): Promise<Bank[]>;
  getMissions(): Promise<Mission[]>;
  createMission(mission: InsertMission): Promise<Mission>;
  updateMission(id: string, mission: Partial<InsertMission>): Promise<Mission | undefined>;
  deleteMission(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private employees: Map<number, Employee>;
  private banks: Map<string, Bank>;
  private missions: Map<string, Mission>;

  constructor() {
    this.employees = new Map();
    this.banks = new Map();
    this.missions = new Map();
    this.initializeData();
  }

  private initializeData() {
    // Initialize employees from JSON data
    const employeesData = [
      { code: 62, name: "محمد مجدى السيد عبد الدايم", branch: "20أ القاهرة" },
      { code: 129, name: "نانسى يوسف عزيز يوسف", branch: "المنصورة" },
      { code: 20, name: "عبد العزيز صلاح عبد العزيز على حسن", branch: "20أ القاهرة" },
      { code: 675, name: "كريم خالد محمد محمود", branch: "20أ القاهرة" },
      { code: 545, name: "محمد الظافر محمد رفعت احمد إبراهيم", branch: "20أ القاهرة" },
      { code: 493, name: "محمود محمد محمود محمد", branch: "20أ القاهرة" },
      { code: 577, name: "عزيزه عبدالكريم حسين غنيم", branch: "20أ القاهرة" },
      { code: 507, name: "محمد حسن علي عباس", branch: "المنصورة" },
      { code: 544, name: "احمد منصور سليم منصور سليم", branch: "20أ القاهرة" },
      { code: 674, name: "احمد مختار عاشور", branch: "20أ القاهرة" },
      { code: 492, name: "اسامه محمد احمد عبد الحميد", branch: "20أ القاهرة" },
      { code: 612, name: "احمد محمد حسنى", branch: "20أ القاهرة" },
      { code: 503, name: "اسلام احمد محمود علي", branch: "المنصورة" },
      { code: 738, name: "محمد حسن تقى دشناوى", branch: "20أ القاهرة" },
      { code: 740, name: "حاتم احمد", branch: "0" },
      { code: 655, name: "احمد عبدالعزيز إبراهيم", branch: "0" },
      { code: 744, name: "الهام حسن عبدالمولي", branch: "20أ القاهرة" }
    ];

    employeesData.forEach(emp => {
      const employee: Employee = {
        id: randomUUID(),
        code: emp.code,
        name: emp.name,
        branch: emp.branch
      };
      this.employees.set(emp.code, employee);
    });

    // Initialize banks from JSON data
    const banksData = [
      "كريدى", "مانى فيللوز", "اسكندرية", "اى اس", "فورى", "امان", "راية", 
      "فاليو", "حالا", "وسيلة", "سهولة", "لا يوجد مامورية", "خدمات الشركة", 
      "سفن", "نكست", "تنمية", "البركة", "EFS", "ميد تقسيط", "ميد بنك"
    ];

    banksData.forEach(bankName => {
      const bank: Bank = {
        id: randomUUID(),
        name: bankName
      };
      this.banks.set(bankName, bank);
    });
  }

  async getEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async getEmployeeByCode(code: number): Promise<Employee | undefined> {
    return this.employees.get(code);
  }

  async getBanks(): Promise<Bank[]> {
    return Array.from(this.banks.values());
  }

  async getMissions(): Promise<Mission[]> {
    return Array.from(this.missions.values());
  }

  async createMission(insertMission: InsertMission): Promise<Mission> {
    const id = randomUUID();
    const mission: Mission = {
      id,
      employeeCode: insertMission.employeeCode,
      employeeName: insertMission.employeeName,
      employeeBranch: insertMission.employeeBranch,
      missionDate: insertMission.missionDate,
      bank: insertMission.bank || null,
      statement: insertMission.statement || null,
      expenses: insertMission.expenses || [],
      totalAmount: insertMission.totalAmount || "0",
      createdAt: new Date()
    };
    this.missions.set(id, mission);
    return mission;
  }

  async updateMission(id: string, updates: Partial<InsertMission>): Promise<Mission | undefined> {
    const mission = this.missions.get(id);
    if (!mission) return undefined;

    const updatedMission: Mission = {
      ...mission,
      ...updates,
      expenses: updates.expenses || mission.expenses,
      totalAmount: updates.totalAmount || mission.totalAmount,
      bank: updates.bank !== undefined ? updates.bank : mission.bank,
      statement: updates.statement !== undefined ? updates.statement : mission.statement
    };
    this.missions.set(id, updatedMission);
    return updatedMission;
  }

  async deleteMission(id: string): Promise<boolean> {
    return this.missions.delete(id);
  }
}

export const storage = new MemStorage();

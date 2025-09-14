import { type Employee, type Bank, type Mission, type InsertMission, type ExpenseItem } from "@shared/schema";
import { randomUUID } from "crypto";
import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

export interface IStorage {
  getEmployees(): Promise<Employee[]>;
  getEmployeeByCode(code: number): Promise<Employee | undefined>;
  getBanks(): Promise<Bank[]>;
  getMissions(): Promise<Mission[]>;
  createMission(mission: InsertMission): Promise<Mission>;
  updateMission(id: string, mission: Partial<InsertMission>): Promise<Mission | undefined>;
  deleteMission(id: string): Promise<boolean>;
  exportToExcel(): Promise<string>;
  importFromExcel(filePath: string): Promise<void>;
}

export class ExcelStorage implements IStorage {
  private employees: Map<number, Employee>;
  private banks: Map<string, Bank>;
  private missions: Map<string, Mission>;
  private dataDir: string;
  private missionsFile: string;

  constructor() {
    this.employees = new Map();
    this.banks = new Map();
    this.missions = new Map();
    this.dataDir = path.join(process.cwd(), 'data');
    this.missionsFile = path.join(this.dataDir, 'missions.xlsx');
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    this.initializeData();
    this.loadMissionsFromExcel();
  }

  private parseExpenseDetails(expenseDetails: string): ExpenseItem[] {
    if (!expenseDetails) return [];
    
    try {
      // Parse expense details in format: "type: amount (bank1, bank2); type2: amount2 (bank3)"
      const expenses: ExpenseItem[] = [];
      const items = expenseDetails.split(';').map(item => item.trim()).filter(item => item);
      
      items.forEach((item, index) => {
        const match = item.match(/^([^:]+):\s*(\d+(?:\.\d+)?)\s*\(([^)]*)\)$/);
        if (match) {
          const [, type, amountStr, banksStr] = match;
          const amount = parseFloat(amountStr) || 0;
          const banks = banksStr === 'لا يوجد بنك' || banksStr === 'no bank' ? [] : 
                      banksStr.split(',').map(bank => bank.trim()).filter(bank => bank);
          
          expenses.push({
            id: `expense-${index + 1}`,
            type: type.trim(),
            amount,
            banks
          });
        }
      });
      
      return expenses;
    } catch (error) {
      console.error('Error parsing expense details:', error);
      return [];
    }
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

  private loadMissionsFromExcel() {
    try {
      if (fs.existsSync(this.missionsFile)) {
        const workbook = XLSX.readFile(this.missionsFile);
        const worksheet = workbook.Sheets['Missions'];
        
        if (worksheet) {
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          jsonData.forEach((row: any) => {
            try {
              const mission: Mission = {
                id: row.id || randomUUID(),
                employeeCode: parseInt(row.employeeCode),
                employeeName: row.employeeName,
                employeeBranch: row.employeeBranch,
                missionDate: row.missionDate,
                bank: row.bank || null,
                statement: row.statement || null,
                expenses: row.expenses ? JSON.parse(row.expenses) : [],
                totalAmount: row.totalAmount || "0",
                createdAt: row.createdAt ? new Date(row.createdAt) : new Date()
              };
              this.missions.set(mission.id, mission);
            } catch (error) {
              console.error('Error parsing mission row:', error);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading missions from Excel:', error);
    }
  }

  private saveMissionsToExcel() {
    try {
      const missions = Array.from(this.missions.values());
      const worksheetData = missions.map(mission => ({
        id: mission.id,
        employeeCode: mission.employeeCode,
        employeeName: mission.employeeName,
        employeeBranch: mission.employeeBranch,
        missionDate: mission.missionDate,
        bank: mission.bank,
        statement: mission.statement,
        expenses: JSON.stringify(mission.expenses),
        totalAmount: mission.totalAmount,
        createdAt: mission.createdAt?.toISOString()
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Missions');
      
      // Add some styling and formatting
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      worksheet['!cols'] = [
        { width: 20 }, // id
        { width: 15 }, // employeeCode
        { width: 30 }, // employeeName
        { width: 20 }, // employeeBranch
        { width: 15 }, // missionDate
        { width: 20 }, // bank
        { width: 40 }, // statement
        { width: 50 }, // expenses
        { width: 15 }, // totalAmount
        { width: 20 }  // createdAt
      ];

      XLSX.writeFile(workbook, this.missionsFile);
      console.log(`Missions saved to ${this.missionsFile}`);
    } catch (error) {
      console.error('Error saving missions to Excel:', error);
    }
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
      expenses: (insertMission.expenses as ExpenseItem[]) || [],
      totalAmount: insertMission.totalAmount || "0",
      createdAt: new Date()
    };
    this.missions.set(id, mission);
    // Disabled automatic Excel saving for better performance - only save on explicit export
    // this.saveMissionsToExcel();
    return mission;
  }

  async updateMission(id: string, updates: Partial<InsertMission>): Promise<Mission | undefined> {
    const mission = this.missions.get(id);
    if (!mission) return undefined;

    const updatedMission: Mission = {
      ...mission,
      ...updates,
      expenses: (updates.expenses as ExpenseItem[]) || mission.expenses,
      totalAmount: updates.totalAmount || mission.totalAmount,
      bank: updates.bank !== undefined ? updates.bank : mission.bank,
      statement: updates.statement !== undefined ? updates.statement : mission.statement
    };
    this.missions.set(id, updatedMission);
    // Disabled automatic Excel saving for better performance - only save on explicit export
    // this.saveMissionsToExcel();
    return updatedMission;
  }

  async deleteMission(id: string): Promise<boolean> {
    const deleted = this.missions.delete(id);
    if (deleted) {
      // Disabled automatic Excel saving for better performance - only save on explicit export
      // this.saveMissionsToExcel();
    }
    return deleted;
  }

  async exportToExcel(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportFile = path.join(this.dataDir, `missions-export-${timestamp}.xlsx`);
    
    const missions = Array.from(this.missions.values());
    const employees = Array.from(this.employees.values());
    const banks = Array.from(this.banks.values());

    // Create detailed missions sheet
    const missionsData = missions.map(mission => {
      const expenses = mission.expenses || [];
      const expenseDetails = expenses.map((exp: ExpenseItem) => 
        `${exp.type}: ${exp.amount} (${exp.banks && exp.banks.length > 0 ? exp.banks.join(', ') : 'لا يوجد بنك'})`
      ).join('; ');

      return {
        'رقم المأمورية': mission.id,
        'كود الموظف': mission.employeeCode,
        'اسم الموظف': mission.employeeName,
        'الفرع': mission.employeeBranch,
        'تاريخ المأمورية': mission.missionDate,
        'البنك الرئيسي': mission.bank || 'غير محدد',
        'البيان': mission.statement || '',
        'تفاصيل المصروفات': expenseDetails,
        'إجمالي المبلغ': mission.totalAmount,
        'تاريخ الإنشاء': mission.createdAt?.toLocaleDateString('ar-EG') || ''
      };
    });

    const workbook = XLSX.utils.book_new();
    
    // Add missions sheet
    const missionsSheet = XLSX.utils.json_to_sheet(missionsData);
    XLSX.utils.book_append_sheet(workbook, missionsSheet, 'المأموريات');
    
    // Add employees sheet
    const employeesData = employees.map(emp => ({
      'الكود': emp.code,
      'الاسم': emp.name,
      'الفرع': emp.branch
    }));
    const employeesSheet = XLSX.utils.json_to_sheet(employeesData);
    XLSX.utils.book_append_sheet(workbook, employeesSheet, 'الموظفين');
    
    // Add banks sheet
    const banksData = banks.map(bank => ({
      'اسم البنك': bank.name
    }));
    const banksSheet = XLSX.utils.json_to_sheet(banksData);
    XLSX.utils.book_append_sheet(workbook, banksSheet, 'البنوك');

    // Set column widths for better readability
    missionsSheet['!cols'] = [
      { width: 25 }, { width: 15 }, { width: 30 }, { width: 20 },
      { width: 15 }, { width: 20 }, { width: 40 }, { width: 50 },
      { width: 15 }, { width: 20 }
    ];

    XLSX.writeFile(workbook, exportFile);
    return exportFile;
  }

  async importFromExcel(filePath: string): Promise<void> {
    try {
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets['المأموريات'] || workbook.Sheets['Missions'];
      
      if (worksheet) {
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Clear existing missions
        this.missions.clear();
        
        jsonData.forEach((row: any) => {
          try {
            const mission: Mission = {
              id: row['رقم المأمورية'] || row.id || randomUUID(),
              employeeCode: parseInt(row['كود الموظف'] || row.employeeCode),
              employeeName: row['اسم الموظف'] || row.employeeName,
              employeeBranch: row['الفرع'] || row.employeeBranch,
              missionDate: row['تاريخ المأمورية'] || row.missionDate,
              bank: row['البنك الرئيسي'] || row.bank || null,
              statement: row['البيان'] || row.statement || null,
              expenses: this.parseExpenseDetails(row['تفاصيل المصروفات'] || row.expenseDetails || ''),
              totalAmount: (row['إجمالي المبلغ'] || row.totalAmount || "0").toString(),
              createdAt: new Date()
            };
            this.missions.set(mission.id, mission);
          } catch (error) {
            console.error('Error parsing imported mission row:', error);
          }
        });
        
        this.saveMissionsToExcel();
      }
    } catch (error) {
      console.error('Error importing from Excel:', error);
      throw error;
    }
  }
}
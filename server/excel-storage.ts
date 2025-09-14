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
    
    // Group missions by employee code and sort by date
    const missionsByEmployee = new Map<number, Mission[]>();
    missions.forEach(mission => {
      const employeeCode = mission.employeeCode;
      if (!missionsByEmployee.has(employeeCode)) {
        missionsByEmployee.set(employeeCode, []);
      }
      missionsByEmployee.get(employeeCode)!.push(mission);
    });
    
    // Sort missions by date for each employee (most recent first)
    missionsByEmployee.forEach((employeeMissions, employeeCode) => {
      employeeMissions.sort((a, b) => {
        const dateA = new Date(a.missionDate || '1970-01-01').getTime();
        const dateB = new Date(b.missionDate || '1970-01-01').getTime();
        return dateB - dateA; // Sort descending (newest first)
      });
    });

    // Translation mapping from English to Arabic expense types
    const expenseTypeMapping: { [key: string]: string } = {
      'transportation': 'انتقالات',
      'fees': 'رسوم',
      'tips': 'اكراميات',
      'office-supplies': 'أدوات مكتبية',
      'hospitality': 'ضيافة',
      // Add common variations
      'transport': 'انتقالات',
      'tip': 'اكراميات'
    };

    // Helper function to get total expense amount by Arabic type (sum all expenses of same type)
    const getExpenseAmount = (expenses: ExpenseItem[], arabicExpenseType: string): number => {
      // Find the English equivalent
      const englishType = Object.keys(expenseTypeMapping).find(englishKey => 
        expenseTypeMapping[englishKey] === arabicExpenseType
      );
      
      if (!englishType) return 0;
      
      return expenses
        .filter(exp => exp.type === englishType)
        .reduce((sum, exp) => {
          const amount = parseFloat(String(exp.amount || 0));
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
    };

    // Helper function to get banks for a specific expense type
    const getBanksForExpenseType = (expenses: ExpenseItem[], arabicExpenseType: string): string[] => {
      const englishType = Object.keys(expenseTypeMapping).find(englishKey => 
        expenseTypeMapping[englishKey] === arabicExpenseType
      );
      
      if (!englishType) return [];
      
      const banksSet = new Set<string>();
      expenses
        .filter(exp => exp.type === englishType)
        .forEach(exp => {
          if (exp.banks && exp.banks.length > 0) {
            exp.banks.forEach(bank => banksSet.add(bank));
          }
        });
      
      return Array.from(banksSet);
    };

    // Helper function to get primary bank for a mission (most frequent bank)
    const getPrimaryBank = (expenses: ExpenseItem[]): string => {
      const bankCounts = new Map<string, number>();
      
      expenses.forEach(exp => {
        if (exp.banks && exp.banks.length > 0) {
          exp.banks.forEach(bank => {
            bankCounts.set(bank, (bankCounts.get(bank) || 0) + 1);
          });
        }
      });
      
      if (bankCounts.size === 0) return '';
      
      // Return the bank with highest frequency
      let maxCount = 0;
      let primaryBank = '';
      bankCounts.forEach((count, bank) => {
        if (count > maxCount) {
          maxCount = count;
          primaryBank = bank;
        }
      });
      
      return primaryBank;
    };

    // Helper function to get day name in Arabic
    const getDayName = (dateString: string): string => {
      const date = new Date(dateString);
      const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      return dayNames[date.getDay()] || '';
    };

    // Create the main export data matching the exact format
    const exportData: any[] = [];
    
    // Process all employees
    employees.forEach(employee => {
      const employeeMissions = missionsByEmployee.get(employee.code) || [];
      
      // Create a row for this employee
      const row: any = {
        'اسم الموظف': employee.name,
        'الكود': employee.code,
        'فرع': employee.branch,
        'التاريخ': '',
        'اليوم': '',
        'بيـــــــــــــــــــــــان': ''
      };
      
      // If employee has missions, use data from first mission for date/day/statement
      if (employeeMissions.length > 0) {
        const firstMission = employeeMissions[0];
        row['التاريخ'] = firstMission.missionDate || '';
        row['اليوم'] = firstMission.missionDate ? getDayName(firstMission.missionDate) : '';
        row['بيـــــــــــــــــــــــان'] = employeeMissions.map(m => m.statement || '').filter(s => s).join(' + ') || '';
      }
      
      let grandTotal = 0;
      
      // Process up to 4 missions for this employee
      for (let i = 1; i <= 4; i++) {
        const mission = employeeMissions[i - 1];
        
        if (mission && mission.expenses && mission.expenses.length > 0) {
          const expenses = mission.expenses;
          
          // Get primary bank for this mission
          const primaryBank = getPrimaryBank(expenses);
          
          // Calculate amounts for each expense type
          const transportationAmount = getExpenseAmount(expenses, 'انتقالات');
          const feesAmount = getExpenseAmount(expenses, 'رسوم');
          const tipsAmount = getExpenseAmount(expenses, 'اكراميات');
          const officeSuppliesAmount = getExpenseAmount(expenses, 'أدوات مكتبية');
          const hospitalityAmount = getExpenseAmount(expenses, 'ضيافة');
          
          // Calculate mission total from actual expense amounts
          const missionTotal = transportationAmount + feesAmount + tipsAmount + officeSuppliesAmount + hospitalityAmount;
          
          row[`بنك / شركة ( مامورية${i})`] = primaryBank || 'غير محدد';
          row[`انتقالات${i}`] = transportationAmount;
          row[`رسوم${i}`] = feesAmount;
          row[`اكراميات${i}`] = tipsAmount;
          row[`أدوات مكتبية${i}`] = officeSuppliesAmount;
          row[`ضيافة${i}`] = hospitalityAmount;
          row[`الاجمالى${i}`] = missionTotal;
          
          grandTotal += missionTotal;
        } else {
          // Empty mission - show "لا يوجد مامورية" for bank and 0 for all amounts
          row[`بنك / شركة ( مامورية${i})`] = 'لا يوجد مامورية';
          row[`انتقالات${i}`] = 0;
          row[`رسوم${i}`] = 0;
          row[`اكراميات${i}`] = 0;
          row[`أدوات مكتبية${i}`] = 0;
          row[`ضيافة${i}`] = 0;
          row[`الاجمالى${i}`] = 0;
        }
      }
      
      row['الاجمالى'] = grandTotal;
      exportData.push(row);
    });
    
    // Also process missions from employees not in the employees list
    missionsByEmployee.forEach((employeeMissions, employeeCode) => {
      // Check if this employee is already processed
      const existingEmployee = employees.find(emp => emp.code === employeeCode);
      if (!existingEmployee && employeeMissions.length > 0) {
        const firstMission = employeeMissions[0];
        const row: any = {
          'اسم الموظف': firstMission.employeeName,
          'الكود': employeeCode,
          'فرع': firstMission.employeeBranch,
          'التاريخ': firstMission.missionDate || '',
          'اليوم': firstMission.missionDate ? getDayName(firstMission.missionDate) : '',
          'بيـــــــــــــــــــــــان': employeeMissions.map(m => m.statement || '').filter(s => s).join(' + ') || ''
        };
        
        let grandTotal = 0;
        
        for (let i = 1; i <= 4; i++) {
          const mission = employeeMissions[i - 1];
          
          if (mission && mission.expenses && mission.expenses.length > 0) {
            const expenses = mission.expenses;
            const primaryBank = getPrimaryBank(expenses);
            
            const transportationAmount = getExpenseAmount(expenses, 'انتقالات');
            const feesAmount = getExpenseAmount(expenses, 'رسوم');
            const tipsAmount = getExpenseAmount(expenses, 'اكراميات');
            const officeSuppliesAmount = getExpenseAmount(expenses, 'أدوات مكتبية');
            const hospitalityAmount = getExpenseAmount(expenses, 'ضيافة');
            
            const missionTotal = transportationAmount + feesAmount + tipsAmount + officeSuppliesAmount + hospitalityAmount;
            
            row[`بنك / شركة ( مامورية${i})`] = primaryBank || 'غير محدد';
            row[`انتقالات${i}`] = transportationAmount;
            row[`رسوم${i}`] = feesAmount;
            row[`اكراميات${i}`] = tipsAmount;
            row[`أدوات مكتبية${i}`] = officeSuppliesAmount;
            row[`ضيافة${i}`] = hospitalityAmount;
            row[`الاجمالى${i}`] = missionTotal;
            
            grandTotal += missionTotal;
          } else {
            row[`بنك / شركة ( مامورية${i})`] = 'لا يوجد مامورية';
            row[`انتقالات${i}`] = 0;
            row[`رسوم${i}`] = 0;
            row[`اكراميات${i}`] = 0;
            row[`أدوات مكتبية${i}`] = 0;
            row[`ضيافة${i}`] = 0;
            row[`الاجمالى${i}`] = 0;
          }
        }
        
        row['الاجمالى'] = grandTotal;
        exportData.push(row);
      }
    });

    const workbook = XLSX.utils.book_new();
    
    // Create and add the main sheet
    const mainSheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, mainSheet, 'تقرير المأموريات');
    
    // Set column widths for better readability
    const colWidths: any[] = [
      { width: 20 }, // اسم الموظف
      { width: 10 }, // الكود
      { width: 15 }, // فرع
      { width: 12 }, // التاريخ
      { width: 10 }, // اليوم
      { width: 30 }, // بيان
    ];
    
    // Add column widths for 4 missions (each mission has 7 columns)
    for (let i = 0; i < 4; i++) {
      colWidths.push(
        { width: 20 }, // بنك / شركة
        { width: 10 }, // انتقالات
        { width: 10 }, // رسوم
        { width: 10 }, // اكراميات
        { width: 12 }, // أدوات مكتبية
        { width: 10 }, // ضيافة
        { width: 12 }  // الاجمالى
      );
    }
    colWidths.push({ width: 15 }); // الاجمالى النهائي
    
    mainSheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, exportFile);
    return exportFile;
  }

  async importFromExcel(filePath: string): Promise<void> {
    try {
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets['تقرير المأموريات'] || workbook.Sheets['المأموريات'] || workbook.Sheets['Missions'];
      
      if (worksheet) {
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Clear existing missions
        this.missions.clear();
        
        jsonData.forEach((row: any) => {
          try {
            const employeeCode = parseInt(row['الكود'] || row.employeeCode);
            const employeeName = row['اسم الموظف'] || row.employeeName;
            const employeeBranch = row['فرع'] || row.employeeBranch;
            const missionDate = row['التاريخ'] || row.missionDate;
            const statement = row['بيـــــــــــــــــــــــان'] || row.statement || '';
            
            // Import up to 4 missions per employee
            for (let i = 1; i <= 4; i++) {
              const bankKey = `بنك / شركة ( مامورية${i})`;
              const bank = row[bankKey];
              
              // Check if this mission has any data
              const hasData = bank || 
                row[`انتقالات${i}`] || 
                row[`رسوم${i}`] || 
                row[`اكراميات${i}`] || 
                row[`أدوات مكتبية${i}`] || 
                row[`ضيافة${i}`] ||
                row[`الاجمالى${i}`];
              
              if (hasData) {
                const expenses: ExpenseItem[] = [];
                
                // Add expenses if they have values
                if (row[`انتقالات${i}`]) {
                  expenses.push({
                    id: randomUUID(),
                    type: 'انتقالات',
                    amount: parseFloat(row[`انتقالات${i}`]) || 0,
                    banks: bank ? [bank] : []
                  });
                }
                if (row[`رسوم${i}`]) {
                  expenses.push({
                    id: randomUUID(),
                    type: 'رسوم',
                    amount: parseFloat(row[`رسوم${i}`]) || 0,
                    banks: bank ? [bank] : []
                  });
                }
                if (row[`اكراميات${i}`]) {
                  expenses.push({
                    id: randomUUID(),
                    type: 'اكراميات',
                    amount: parseFloat(row[`اكراميات${i}`]) || 0,
                    banks: bank ? [bank] : []
                  });
                }
                if (row[`أدوات مكتبية${i}`]) {
                  expenses.push({
                    id: randomUUID(),
                    type: 'أدوات مكتبية',
                    amount: parseFloat(row[`أدوات مكتبية${i}`]) || 0,
                    banks: bank ? [bank] : []
                  });
                }
                if (row[`ضيافة${i}`]) {
                  expenses.push({
                    id: randomUUID(),
                    type: 'ضيافة',
                    amount: parseFloat(row[`ضيافة${i}`]) || 0,
                    banks: bank ? [bank] : []
                  });
                }
                
                const mission: Mission = {
                  id: randomUUID(),
                  employeeCode,
                  employeeName,
                  employeeBranch,
                  missionDate,
                  bank: bank || null,
                  statement,
                  expenses,
                  totalAmount: (row[`الاجمالى${i}`] || "0").toString(),
                  createdAt: new Date()
                };
                this.missions.set(mission.id, mission);
              }
            }
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
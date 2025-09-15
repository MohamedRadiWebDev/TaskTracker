import * as XLSX from 'xlsx';
import { Mission, ExpenseItem } from '@shared/schema';
import { getMissions, setMissions } from './localStorage';

export interface ExcelImportResult {
  success: boolean;
  message: string;
  missions?: Mission[];
}

// Function to sanitize values to prevent formula injection
function sanitizeForExcel(value: any): any {
  if (typeof value === 'string') {
    // Prevent formula injection by escaping values that start with =, +, -, @
    if (value.match(/^[=+\-@]/)) {
      return `'${value}`; // Prefix with single quote to treat as text
    }
  }
  return value;
}

export function exportMissionsToExcel(missions: Mission[]): void {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Group missions by employee and date
    const employeeGroups = new Map<string, { employee: { name: string; code: number; branch: string; }, missions: Mission[] }>();
    
    missions.forEach(mission => {
      const key = `${mission.employeeCode}-${mission.missionDate}`;
      if (!employeeGroups.has(key)) {
        employeeGroups.set(key, {
          employee: {
            name: mission.employeeName,
            code: mission.employeeCode,
            branch: mission.employeeBranch
          },
          missions: []
        });
      }
      employeeGroups.get(key)!.missions.push(mission);
    });

    // Helper to get Arabic day name
    const getArabicDayName = (dateString: string): string => {
      const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const date = new Date(dateString);
      return days[date.getDay()];
    };


    // Helper to get expense amount by type from mission
    const getExpenseByType = (mission: Mission, expenseType: string): number => {
      if (!mission.expenses) return 0;
      return mission.expenses
        .filter(expense => expense.type === expenseType)
        .reduce((sum, expense) => sum + expense.amount, 0);
    };

    // Helper to get primary bank for a mission
    const getMissionBank = (mission: Mission): string => {
      // Prefer mission.bank if set
      if (mission.bank && mission.bank.trim() !== '') {
        return mission.bank.trim();
      }
      
      // Otherwise get first unique bank from expenses
      if (!mission.expenses) return 'لا يوجد بنك';
      const allBanks = mission.expenses.flatMap(expense => expense.banks);
      const uniqueBanks = Array.from(new Set(allBanks)).filter(bank => bank && bank.trim() !== '');
      
      if (uniqueBanks.length > 0) {
        // If multiple banks, join them with ' | '
        return uniqueBanks.length > 1 ? uniqueBanks.join(' | ') : uniqueBanks[0];
      }
      
      return 'لا يوجد بنك';
    };

    // Helper to get mission total
    const getMissionTotal = (mission: Mission): number => {
      if (!mission.expenses) return 0;
      return mission.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    };

    // Prepare export data in the required format
    const exportRows: any[] = [];
    
    employeeGroups.forEach((group, key) => {
      const { employee, missions: employeeMissions } = group;
      const firstMission = employeeMissions[0];
      
      // Sort missions by bank to get consistent ordering
      const sortedMissions = employeeMissions.sort((a, b) => {
        const bankA = getMissionBank(a);
        const bankB = getMissionBank(b);
        return bankA.localeCompare(bankB);
      });

      // Create row with basic employee info
      const row: any = {
        'اسم الموظف': sanitizeForExcel(employee.name),
        'الكود': employee.code,
        'الفرع': sanitizeForExcel(employee.branch),
        'التاريخ': firstMission.missionDate,
        'اليوم': getArabicDayName(firstMission.missionDate),
        'بيان': sanitizeForExcel(firstMission.statement || '')
      };

      // Add up to 4 missions
      let grandTotal = 0;
      for (let i = 0; i < 4; i++) {
        const mission = sortedMissions[i];
        const missionNum = i + 1;
        
        if (mission) {
          const bankName = getMissionBank(mission);
          
          const transportation = getExpenseByType(mission, 'transportation');
          const fees = getExpenseByType(mission, 'fees');
          const tips = getExpenseByType(mission, 'tips');
          const officeSupplies = getExpenseByType(mission, 'office-supplies');
          const hospitality = getExpenseByType(mission, 'hospitality');
          const missionTotal = getMissionTotal(mission);
          
          row[`بنك / شركة ( مامورية${missionNum})`] = sanitizeForExcel(bankName);
          row[`انتقالات${missionNum}`] = transportation;
          row[`رسوم${missionNum}`] = fees;
          row[`اكراميات${missionNum}`] = tips;
          row[`أدوات مكتبية${missionNum}`] = officeSupplies;
          row[`ضيافة${missionNum}`] = hospitality;
          row[`الاجمالى${missionNum}`] = missionTotal;
          
          grandTotal += missionTotal;
        } else {
          // Empty mission slot
          row[`بنك / شركة ( مامورية${missionNum})`] = 'لا يوجد مامورية';
          row[`انتقالات${missionNum}`] = 0;
          row[`رسوم${missionNum}`] = 0;
          row[`اكراميات${missionNum}`] = 0;
          row[`أدوات مكتبية${missionNum}`] = 0;
          row[`ضيافة${missionNum}`] = 0;
          row[`الاجمالى${missionNum}`] = 0;
        }
      }
      
      // Add grand total
      row['الاجمالى'] = grandTotal;
      
      exportRows.push(row);
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    
    // Set column widths for better readability
    const columnWidths = [
      { wch: 25 }, // اسم الموظف
      { wch: 8 },  // الكود
      { wch: 15 }, // فرع
      { wch: 12 }, // التاريخ
      { wch: 10 }, // اليوم
      { wch: 20 }, // بيان
    ];
    
    // Add widths for mission columns (4 missions × 7 columns each)
    for (let i = 0; i < 4; i++) {
      columnWidths.push(
        { wch: 20 }, // بنك / شركة
        { wch: 10 }, // انتقالات
        { wch: 8 },  // رسوم
        { wch: 10 }, // اكراميات
        { wch: 12 }, // أدوات مكتبية
        { wch: 8 },  // ضيافة
        { wch: 10 }  // الاجمالى
      );
    }
    columnWidths.push({ wch: 12 }); // الاجمالى النهائي
    
    worksheet['!cols'] = columnWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير المأموريات');

    // Generate Excel file and download
    const today = new Date().toISOString().split('T')[0];
    const filename = `missions-detailed-export-${today}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('فشل في تصدير البيانات إلى Excel');
  }
}

export async function importMissionsFromExcel(file: File): Promise<ExcelImportResult> {
  try {
    // Validate file
    const validationResult = validateExcelFile(file);
    if (!validationResult.isValid) {
      return {
        success: false,
        message: validationResult.message
      };
    }

    // Read the file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Check if missions sheet exists
    const missionSheetName = workbook.SheetNames.find(name => 
      name.includes('مأمور') || name.toLowerCase().includes('mission')
    );
    
    if (!missionSheetName) {
      return {
        success: false,
        message: 'لم يتم العثور على ورقة المأموريات في الملف'
      };
    }

    const missionSheet = workbook.Sheets[missionSheetName];
    const missionData = XLSX.utils.sheet_to_json(missionSheet);

    if (!missionData || missionData.length === 0) {
      return {
        success: false,
        message: 'لا توجد بيانات مأموريات في الملف'
      };
    }

    // Parse missions data
    const importedMissions: Mission[] = [];
    const currentMissions = getMissions();
    // Map to track original Excel ID -> new mission ID for expense matching
    const originalToNewIdMap: Record<string, string> = {};

    for (const row of missionData) {
      try {
        const originalId = (row as any)['رقم المأمورية']; // Store original ID from Excel
        const newId = generateMissionId(); // Generate new ID
        
        const mission: Mission = {
          id: newId,
          employeeName: String((row as any)['اسم الموظف'] || '').trim(),
          employeeCode: parseInt((row as any)['كود الموظف']) || 0,
          employeeBranch: String((row as any)['الفرع'] || '').trim(),
          missionDate: (row as any)['تاريخ المأمورية'] || new Date().toISOString().split('T')[0],
          bank: (row as any)['البنك'] ? String((row as any)['البنك']).trim() : null,
          statement: (row as any)['البيان'] ? String((row as any)['البيان']).trim() : null,
          totalAmount: (parseFloat((row as any)['إجمالي المصروفات']) || 0).toString(),
          expenses: [],
          createdAt: new Date()
        };

        // Map original Excel ID to new mission ID
        if (originalId) {
          originalToNewIdMap[String(originalId)] = newId;
        }

        importedMissions.push(mission);
      } catch (error) {
        console.warn('Error parsing mission row:', row, error);
      }
    }

    // Check if expenses sheet exists
    const expenseSheetName = workbook.SheetNames.find(name => 
      name.includes('مصروف') || name.toLowerCase().includes('expense')
    );

    if (expenseSheetName) {
      const expenseSheet = workbook.Sheets[expenseSheetName];
      const expenseData = XLSX.utils.sheet_to_json(expenseSheet);

      // Group expenses by mission ID and add to missions
      const expensesByMission: Record<string, ExpenseItem[]> = {};
      
      for (const row of expenseData) {
        try {
          const missionId = (row as any)['رقم المأمورية'];
          if (!missionId) continue;

          const expense: ExpenseItem = {
            id: generateExpenseId(),
            type: (row as any)['نوع المصروف'] || 'transportation',
            amount: parseFloat((row as any)['المبلغ']) || 0,
            banks: String((row as any)['البنوك'] || '').split(',').map((bank: string) => bank.trim()).filter((bank: string) => bank)
          };

          if (!expensesByMission[missionId]) {
            expensesByMission[missionId] = [];
          }
          expensesByMission[missionId].push(expense);
        } catch (error) {
          console.warn('Error parsing expense row:', row, error);
        }
      }

      // Add expenses to corresponding missions using the ID mapping
      importedMissions.forEach(mission => {
        // Find expenses using the reverse lookup: find original ID that maps to this mission ID
        const originalId = Object.keys(originalToNewIdMap).find(origId => originalToNewIdMap[origId] === mission.id);
        if (originalId && expensesByMission[originalId]) {
          mission.expenses = expensesByMission[originalId];
          mission.totalAmount = mission.expenses.reduce((sum, exp) => sum + exp.amount, 0).toString();
        }
      });
    }

    // Save imported missions to localStorage
    const allMissions = [...currentMissions, ...importedMissions];
    setMissions(allMissions);

    return {
      success: true,
      message: `تم استيراد ${importedMissions.length} مأمورية بنجاح`,
      missions: importedMissions
    };

  } catch (error) {
    console.error('Error importing from Excel:', error);
    return {
      success: false,
      message: 'فشل في استيراد البيانات من Excel'
    };
  }
}

function generateMissionId(): string {
  return `mission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateExpenseId(): string {
  return `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// File validation function
function validateExcelFile(file: File): { isValid: boolean; message: string } {
  // Check file type
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/xlsx',
    'application/xls'
  ];
  
  const isValidType = allowedTypes.includes(file.type) || 
                     file.name.toLowerCase().endsWith('.xlsx') || 
                     file.name.toLowerCase().endsWith('.xls');
  
  if (!isValidType) {
    return {
      isValid: false,
      message: 'نوع الملف غير مدعوم. يرجى رفع ملف Excel (.xlsx أو .xls)'
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    return {
      isValid: false,
      message: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت'
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      isValid: false,
      message: 'الملف فارغ'
    };
  }

  return { isValid: true, message: '' };
}
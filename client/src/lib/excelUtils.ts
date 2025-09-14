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
    
    // Prepare missions data for export
    const missionRows = missions.map(mission => ({
      'رقم المأمورية': sanitizeForExcel(mission.id),
      'اسم الموظف': sanitizeForExcel(mission.employeeName),
      'كود الموظف': mission.employeeCode,
      'الفرع': sanitizeForExcel(mission.employeeBranch),
      'تاريخ المأمورية': mission.missionDate,
      'البنك': sanitizeForExcel(mission.bank || ''),
      'البيان': sanitizeForExcel(mission.statement || ''),
      'إجمالي المصروفات': mission.totalAmount,
      'عدد البنود': mission.expenses?.length || 0,
      'تاريخ الإنشاء': mission.createdAt ? new Date(mission.createdAt).toLocaleDateString('ar-EG') : ''
    }));

    // Create missions worksheet
    const missionsWs = XLSX.utils.json_to_sheet(missionRows);
    XLSX.utils.book_append_sheet(workbook, missionsWs, 'المأموريات');

    // Prepare expenses data
    const expenseRows: any[] = [];
    missions.forEach(mission => {
      if (mission.expenses && mission.expenses.length > 0) {
        mission.expenses.forEach((expense: ExpenseItem) => {
          expenseRows.push({
            'رقم المأمورية': sanitizeForExcel(mission.id),
            'اسم الموظف': sanitizeForExcel(mission.employeeName),
            'نوع المصروف': sanitizeForExcel(expense.type),
            'المبلغ': expense.amount,
            'البنوك': sanitizeForExcel(expense.banks.join(', '))
          });
        });
      }
    });

    // Create expenses worksheet if there are expenses
    if (expenseRows.length > 0) {
      const expensesWs = XLSX.utils.json_to_sheet(expenseRows);
      XLSX.utils.book_append_sheet(workbook, expensesWs, 'المصروفات');
    }

    // Generate Excel file and download
    const today = new Date().toISOString().split('T')[0];
    const filename = `missions-export-${today}.xlsx`;
    
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
import * as XLSX from 'xlsx';
import { Mission, ExpenseItem } from '../types/schema';
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

// Expense type mapping for normalization
const expenseTypeMapping: Record<string, string> = {
  // English to normalized
  'transportation': 'transportation',
  'transport': 'transportation', 
  'fees': 'fees',
  'tips': 'tips',
  'tip': 'tips',
  'office-supplies': 'office-supplies',
  'hospitality': 'hospitality',
  // Arabic to normalized
  'انتقالات': 'transportation',
  'رسوم': 'fees',
  'اكراميات': 'tips',
  'إكراميات': 'tips',
  'أدوات مكتبية': 'office-supplies',
  'ضيافة': 'hospitality'
};

// Function to normalize expense type
function normalizeExpenseType(type: string): string {
  return expenseTypeMapping[type] || type;
}

// Detection helper for detailed export format
function isDetailedExportRow(row: any): boolean {
  // Check for bank slot columns like "بنك / شركة ( مامورية1)"
  for (let i = 1; i <= 4; i++) {
    if (row[`بنك / شركة ( مامورية${i})`]) {
      return true;
    }
  }
  // Check for expense type columns with numbers
  const typeColumns = ['انتقالات', 'رسوم', 'اكراميات', 'إكراميات', 'أدوات مكتبية', 'ضيافة'];
  for (const type of typeColumns) {
    for (let i = 1; i <= 4; i++) {
      if (row[`${type}${i}`] !== undefined) {
        return true;
      }
    }
  }
  return false;
}

// Helper to parse numbers from Excel cells
function parseNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Remove commas and parse
    const cleaned = val.replace(/[,،]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Expense type label mapping for detailed export
const detailedExportTypeMapping: Record<string, string> = {
  'انتقالات': 'transportation',
  'رسوم': 'fees', 
  'اكراميات': 'tips',
  'إكراميات': 'tips',
  'أدوات مكتبية': 'office-supplies',
  'ضيافة': 'hospitality'
};

// Helper to get Arabic day name
const getArabicDayName = (dateString: string): string => {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const date = new Date(dateString);
  return days[date.getDay()];
};

export function exportMissionsToExcel(missions: Mission[]): void {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Process each mission individually - one row per mission
    const exportRows: any[] = [];
    
    missions.forEach(mission => {
      // Get all unique banks from mission expenses
      const allBanks = new Set<string>();
      
      if (mission.expenses && mission.expenses.length > 0) {
        mission.expenses.forEach(expense => {
          if (expense.banks && expense.banks.length > 0) {
            expense.banks.forEach(bank => {
              if (bank && bank.trim() !== '') {
                allBanks.add(bank.trim());
              }
            });
          } else {
            // If expense has no banks, use mission bank or default
            const fallbackBank = mission.bank && mission.bank.trim() !== '' ? mission.bank.trim() : 'غير محدد';
            allBanks.add(fallbackBank);
          }
        });
      } else {
        // If mission has no expenses but has a bank, still include it
        if (mission.bank && mission.bank.trim() !== '') {
          allBanks.add(mission.bank.trim());
        } else {
          allBanks.add('غير محدد');
        }
      }
      
      // Create bank missions for each bank with calculated amounts
      const bankMissions: any[] = [];
      
      Array.from(allBanks).forEach(bankName => {
        const bankMission = {
          bankName,
          transportation: 0,
          fees: 0,
          tips: 0,
          officeSupplies: 0,
          hospitality: 0,
          total: 0
        };
        
        // Calculate distributed amounts for this bank
        if (mission.expenses) {
          mission.expenses.forEach(expense => {
            let shouldIncludeExpense = false;
            let distributionFactor = 1;
            
            if (expense.banks && expense.banks.length > 0) {
              if (expense.banks.includes(bankName)) {
                shouldIncludeExpense = true;
                distributionFactor = expense.banks.length;
              }
            } else {
              // If expense has no banks, assign it to the mission bank or 'غير محدد'
              const fallbackBank = mission.bank && mission.bank.trim() !== '' ? mission.bank.trim() : 'غير محدد';
              if (bankName === fallbackBank) {
                shouldIncludeExpense = true;
                distributionFactor = 1;
              }
            }
            
            if (shouldIncludeExpense) {
              // Use bankAllocations if available, otherwise distribute equally
              const distributedAmount = expense.bankAllocations && expense.bankAllocations[bankName] 
                ? expense.bankAllocations[bankName]
                : expense.amount / distributionFactor;
              const normalizedType = normalizeExpenseType(expense.type);
              
              switch (normalizedType) {
                case 'transportation':
                  bankMission.transportation += distributedAmount;
                  break;
                case 'fees':
                  bankMission.fees += distributedAmount;
                  break;
                case 'tips':
                  bankMission.tips += distributedAmount;
                  break;
                case 'office-supplies':
                  bankMission.officeSupplies += distributedAmount;
                  break;
                case 'hospitality':
                  bankMission.hospitality += distributedAmount;
                  break;
              }
            }
          });
        }
        
        // Calculate total for this bank mission
        bankMission.total = bankMission.transportation + bankMission.fees + bankMission.tips + bankMission.officeSupplies + bankMission.hospitality;
        
        bankMissions.push(bankMission);
      });

      // Sort bank missions by bank name for consistent ordering
      const sortedBankMissions = bankMissions.sort((a, b) => a.bankName.localeCompare(b.bankName));

      // Create row with basic employee info
      const row: any = {
        'اسم الموظف': sanitizeForExcel(mission.employeeName),
        'الكود': mission.employeeCode,
        'فرع': sanitizeForExcel(mission.employeeBranch),
        'التاريخ': mission.missionDate,
        'اليوم': getArabicDayName(mission.missionDate),
        'بيـــــــــــــــــــــــان': sanitizeForExcel(mission.statement || '')
      };

      // Calculate grand total from ALL bank missions
      let grandTotal = sortedBankMissions.reduce((sum, bankMission) => sum + bankMission.total, 0);
      
      // Add up to 4 bank missions to display columns - distribute banks across the sheet
      for (let i = 0; i < 4; i++) {
        const bankMission = sortedBankMissions[i];
        const missionNum = i + 1;
        
        if (bankMission) {
          row[`بنك / شركة ( مامورية${missionNum})`] = sanitizeForExcel(bankMission.bankName);
          row[`انتقالات${missionNum}`] = Math.round(bankMission.transportation * 100) / 100;
          row[`رسوم${missionNum}`] = Math.round(bankMission.fees * 100) / 100;
          row[`اكراميات${missionNum}`] = Math.round(bankMission.tips * 100) / 100;
          row[`أدوات مكتبية${missionNum}`] = Math.round(bankMission.officeSupplies * 100) / 100;
          row[`ضيافة${missionNum}`] = Math.round(bankMission.hospitality * 100) / 100;
          row[`الاجمالى${missionNum}`] = Math.round(bankMission.total * 100) / 100;
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
      
      // Add grand total (rounded)
      row['الاجمالى'] = Math.round(grandTotal * 100) / 100;
      
      exportRows.push(row);
    });

    // Define fixed column headers to ensure consistent ordering
    const headers = [
      'اسم الموظف', 'الكود', 'فرع', 'التاريخ', 'اليوم', 'بيـــــــــــــــــــــــان'
    ];
    
    // Add headers for 4 missions
    for (let i = 1; i <= 4; i++) {
      headers.push(
        `بنك / شركة ( مامورية${i})`,
        `انتقالات${i}`,
        `رسوم${i}`,
        `اكراميات${i}`,
        `أدوات مكتبية${i}`,
        `ضيافة${i}`,
        `الاجمالى${i}`
      );
    }
    headers.push('الاجمالى');
    
    // Create worksheet with fixed headers
    const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: headers });
    
    // Set column widths for better readability
    const columnWidths = [
      { wch: 30 }, // اسم الموظف
      { wch: 8 },  // الكود
      { wch: 15 }, // فرع
      { wch: 12 }, // التاريخ
      { wch: 10 }, // اليوم
      { wch: 25 }, // بيان
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
    
    console.log('Starting to parse mission data...', missionData.length, 'rows found');
    console.log('First mission row sample:', missionData[0]);

    for (const row of missionData) {
      try {
        const newId = generateMissionId();
        
        // Check if this is a detailed export format
        if (isDetailedExportRow(row)) {
          // Parse detailed export format with numbered bank columns
          console.log('Detected detailed export format row');
          
          // Support multiple column name variations for basic info
          const employeeName = String((row as any)['اسم الموظف'] || (row as any)['الموظف'] || '').trim();
          const employeeCode = parseInt((row as any)['كود الموظف'] || (row as any)['الكود']) || 0;
          const employeeBranch = String((row as any)['الفرع'] || (row as any)['فرع'] || '').trim();
          const missionDate = (row as any)['تاريخ المأمورية'] || (row as any)['التاريخ'] || new Date().toISOString().split('T')[0];
          const statement = String((row as any)['بيـــــــــــــــــــــــان'] || (row as any)['البيان'] || (row as any)['وصف'] || '').trim();
          
          const expensesByType: Record<string, { amount: number; banks: string[]; bankAllocations: Record<string, number> }> = {};
          const uniqueBanks = new Set<string>();
          
          // Process up to 4 bank missions and collect by type with bank allocations
          for (let i = 1; i <= 4; i++) {
            const bankName = String((row as any)[`بنك / شركة ( مامورية${i})`] || '').trim();
            
            // Skip if bank name is empty or placeholder
            if (!bankName || bankName === 'لا يوجد مامورية' || bankName === '') continue;
            
            uniqueBanks.add(bankName);
            
            // Process each expense type for this bank
            for (const [label, type] of Object.entries(detailedExportTypeMapping)) {
              const amount = parseNumber((row as any)[`${label}${i}`]);
              
              if (amount > 0) {
                if (!expensesByType[type]) {
                  expensesByType[type] = { amount: 0, banks: [], bankAllocations: {} };
                }
                expensesByType[type].amount += amount;
                expensesByType[type].banks.push(bankName);
                
                // Build bank allocations inline
                if (!expensesByType[type].bankAllocations[bankName]) {
                  expensesByType[type].bankAllocations[bankName] = 0;
                }
                expensesByType[type].bankAllocations[bankName] += amount;
              }
            }
          }
          
          // Convert consolidated expenses to ExpenseItem array
          const expenses: ExpenseItem[] = Object.entries(expensesByType).map(([type, data]) => ({
            id: generateExpenseId(),
            type,
            amount: data.amount,
            banks: Array.from(new Set(data.banks)), // Remove duplicate banks
            bankAllocations: data.bankAllocations
          }));
          
          // Calculate total from expenses
          const calculatedTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
          const sheetTotal = parseNumber((row as any)['الاجمالى']);
          
          const mission: Mission = {
            id: newId,
            employeeName,
            employeeCode,
            employeeBranch,
            missionDate,
            bank: uniqueBanks.size === 1 ? Array.from(uniqueBanks)[0] : null,
            statement: statement || null,
            totalAmount: calculatedTotal.toString(),
            expenses,
            createdAt: new Date()
          };
          
          if (Math.abs(calculatedTotal - sheetTotal) > 0.01) {
            console.warn(`Total mismatch for ${employeeName}: calculated=${calculatedTotal}, sheet=${sheetTotal}`);
          }
          
          importedMissions.push(mission);
          
        } else {
          // Original simple format parsing
          const originalId = (row as any)['رقم المأمورية'] || (row as any)['كود المأمورية'] || 
                            (row as any)['رقم'] || (row as any)['ID'] || (row as any)['Mission ID'] ||
                            (row as any)['كود'] || (row as any)['المرجع'];
          
          // Support multiple column name variations
          const employeeName = String((row as any)['اسم الموظف'] || (row as any)['الموظف'] || '').trim();
          const employeeCode = parseInt((row as any)['كود الموظف'] || (row as any)['الكود']) || 0;
          const employeeBranch = String((row as any)['الفرع'] || (row as any)['فرع'] || '').trim();
          const missionDate = (row as any)['تاريخ المأمورية'] || (row as any)['التاريخ'] || new Date().toISOString().split('T')[0];
          const bank = (row as any)['البنك'] || (row as any)['بنك'] || null;
          const statement = (row as any)['البيان'] || (row as any)['وصف'] || null;
          const totalAmount = parseFloat((row as any)['إجمالي المصروفات'] || (row as any)['الإجمالي'] || '0') || 0;

          const mission: Mission = {
            id: newId,
            employeeName,
            employeeCode,
            employeeBranch,
            missionDate,
            bank: bank ? String(bank).trim() : null,
            statement: statement ? String(statement).trim() : null,
            totalAmount: totalAmount.toString(),
            expenses: [],
            createdAt: new Date()
          };

          // Map original Excel ID to new mission ID for expense sheet linking
          if (originalId) {
            originalToNewIdMap[String(originalId)] = newId;
          }

          importedMissions.push(mission);
        }
        
        if (importedMissions.length < 3) {
          console.log(`Sample mission ${importedMissions.length}: ${importedMissions[importedMissions.length - 1].employeeName}`);
        }
        
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
      
      console.log('Processing expense data...', expenseData.length, 'rows');
      if (expenseData.length > 0) {
        console.log('Sample expense row:', expenseData[0]);
      }
      
      for (const row of expenseData) {
        try {
          // Support multiple ID column variations for expenses too
          const missionId = (row as any)['رقم المأمورية'] || (row as any)['كود المأمورية'] || 
                          (row as any)['رقم'] || (row as any)['ID'] || (row as any)['Mission ID'] ||
                          (row as any)['كود'] || (row as any)['المرجع'];
          
          if (!missionId) {
            console.log('Skipping expense row - no mission ID found in any expected column');
            continue;
          }

          const expenseType = (row as any)['نوع المصروف'] || (row as any)['النوع'] || 'transportation';
          const expenseAmount = parseFloat((row as any)['المبلغ']) || parseFloat((row as any)['القيمة']) || 0;
          const banksStr = (row as any)['البنوك'] || (row as any)['البنك'] || '';

          const expense: ExpenseItem = {
            id: generateExpenseId(),
            type: normalizeExpenseType(expenseType),
            amount: expenseAmount,
            banks: String(banksStr).split(/[,،;\n]/).map((bank: string) => bank.trim()).filter((bank: string) => bank)
          };

          if (!expensesByMission[missionId]) {
            expensesByMission[missionId] = [];
          }
          expensesByMission[missionId].push(expense);
        } catch (error) {
          console.warn('Error parsing expense row:', row, error);
        }
      }
      
      console.log('Grouped expenses by mission:', expensesByMission);

      // Add expenses to corresponding missions using the ID mapping
      console.log('Linking expenses to missions...');
      console.log('ID mappings:', originalToNewIdMap);
      console.log('Expenses by mission:', Object.keys(expensesByMission));
      
      let linkedCount = 0;
      importedMissions.forEach(mission => {
        // Find expenses using the reverse lookup: find original ID that maps to this mission ID
        const originalId = Object.keys(originalToNewIdMap).find(origId => originalToNewIdMap[origId] === mission.id);
        
        if (originalId && expensesByMission[originalId]) {
          mission.expenses = expensesByMission[originalId];
          // Recalculate total from actual expenses
          mission.totalAmount = mission.expenses.reduce((sum, exp) => sum + exp.amount, 0).toString();
          linkedCount++;
          
          if (linkedCount <= 3) {
            console.log(`Linked ${mission.expenses.length} expenses to mission: ${mission.employeeName}`);
          }
        }
      });
      
      console.log(`Successfully linked expenses for ${linkedCount} out of ${importedMissions.length} missions`);
    }

    // Save imported missions to localStorage
    console.log(`Saving ${importedMissions.length} imported missions...`);
    console.log('Final imported missions:', importedMissions);
    
    const allMissions = [...currentMissions, ...importedMissions];
    setMissions(allMissions);
    
    console.log(`Total missions after import: ${allMissions.length}`);

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
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Download, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMissions } from '@/hooks/use-missions';
import * as XLSX from 'xlsx';

export default function PeriodReport() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { missions } = useMissions();

  const handleExport = async () => {
    if (!fromDate || !toDate) {
      toast({
        title: "خطأ في البيانات",
        description: "يجب تحديد تاريخ البداية والنهاية",
        variant: "destructive"
      });
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      toast({
        title: "خطأ في التواريخ",
        description: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      // Filter missions by date range
      const filteredMissions = missions.filter(mission => {
        const missionDate = new Date(mission.missionDate);
        const from = new Date(fromDate);
        const to = new Date(toDate);
        return missionDate >= from && missionDate <= to;
      });

      if (filteredMissions.length === 0) {
        toast({
          title: "لا توجد بيانات",
          description: "لا توجد مأموريات في الفترة المحددة",
          variant: "destructive"
        });
        return;
      }

      // Generate Excel report
      const workbook = XLSX.utils.book_new();
      
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
      const normalizeExpenseType = (type: string): string => {
        return expenseTypeMapping[type] || type;
      };
      
      // Create employee-bank combinations
      const employeeBankData: Record<string, {
        employeeName: string;
        employeeCode: number;
        employeeBranch: string;
        bankName: string;
        transportation: number;
        fees: number;
        tips: number;
        officeSupplies: number;
        hospitality: number;
      }> = {};

      filteredMissions.forEach(mission => {
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
        
        // Process each bank for this mission
        Array.from(allBanks).forEach(bankName => {
          const key = `${mission.employeeCode}-${bankName}`;
          
          if (!employeeBankData[key]) {
            employeeBankData[key] = {
              employeeName: mission.employeeName,
              employeeCode: mission.employeeCode,
              employeeBranch: mission.employeeBranch,
              bankName: bankName,
              transportation: 0,
              fees: 0,
              tips: 0,
              officeSupplies: 0,
              hospitality: 0
            };
          }
          
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
                const distributedAmount = expense.amount / distributionFactor;
                const normalizedType = normalizeExpenseType(expense.type);
                
                switch (normalizedType) {
                  case 'transportation':
                    employeeBankData[key].transportation += distributedAmount;
                    break;
                  case 'fees':
                    employeeBankData[key].fees += distributedAmount;
                    break;
                  case 'tips':
                    employeeBankData[key].tips += distributedAmount;
                    break;
                  case 'office-supplies':
                    employeeBankData[key].officeSupplies += distributedAmount;
                    break;
                  case 'hospitality':
                    employeeBankData[key].hospitality += distributedAmount;
                    break;
                }
              }
            });
          }
        });
      });

      // Convert to array format for Excel
      const reportData = Object.values(employeeBankData).map(data => ({
        'اسم الموظف': data.employeeName,
        'الكود': data.employeeCode,
        'فرع': data.employeeBranch,
        'بنك / الشركة': data.bankName,
        'انتقالات': Math.round(data.transportation * 100) / 100,
        'رسوم': Math.round(data.fees * 100) / 100,
        'اكراميات': Math.round(data.tips * 100) / 100,
        'أدوات مكتبية': Math.round(data.officeSupplies * 100) / 100,
        'ضيافة': Math.round(data.hospitality * 100) / 100
      }));

      // Create main sheet
      const mainSheet = XLSX.utils.json_to_sheet(reportData);
      
      // Set column widths for better readability
      const columnWidths = [
        { wch: 30 }, // اسم الموظف
        { wch: 8 },  // الكود
        { wch: 15 }, // فرع
        { wch: 20 }, // بنك / الشركة
        { wch: 10 }, // انتقالات
        { wch: 8 },  // رسوم
        { wch: 10 }, // اكراميات
        { wch: 12 }, // أدوات مكتبية
        { wch: 8 }   // ضيافة
      ];
      
      mainSheet['!cols'] = columnWidths;
      
      XLSX.utils.book_append_sheet(workbook, mainSheet, 'تقرير الفترة');

      // Export file
      const filename = `period-report-${fromDate}-to-${toDate}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast({
        title: "تم تصدير التقرير بنجاح",
        description: `تم تصدير تقرير الفترة من ${fromDate} إلى ${toDate}`,
      });
    } catch (error) {
      console.error('Period report export error:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير تقرير الفترة",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
          <FileText className="w-8 h-8 text-primary ml-3" />
          تقرير المأموريات بالفترة
        </h1>
        <p className="text-muted-foreground">
          قم بتحديد فترة زمنية لتصدير تقرير إجمالي مصروفات الموظفين لكل بنك وبند مصروف
        </p>
      </div>

      <Card className="p-8 bg-background border shadow-sm">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="from-date" className="text-right flex items-center">
                <Calendar className="w-4 h-4 ml-2" />
                من تاريخ
              </Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-right"
                data-testid="input-from-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="to-date" className="text-right flex items-center">
                <Calendar className="w-4 h-4 ml-2" />
                إلى تاريخ
              </Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-right"
                data-testid="input-to-date"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleExport}
              disabled={isExporting || !fromDate || !toDate}
              className="px-8 py-3 text-lg"
              data-testid="button-export-period"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  جاري التصدير...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 ml-2" />
                  تصدير تقرير الفترة
                </>
              )}
            </Button>
          </div>

          {fromDate && toDate && (
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                معاينة التقرير:
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                سيتم تصدير إجمالي مصروفات جميع الموظفين من <strong>{fromDate}</strong> إلى <strong>{toDate}</strong>
                <br />
                التقرير سيحتوي على: اسم الموظف، الكود، الفرع، البنك/الشركة، وإجمالي كل بند مصروف
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
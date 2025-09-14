import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Download, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PeriodReport() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

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
      const response = await fetch(`/api/missions/period-export?from=${fromDate}&to=${toDate}`);
      if (!response.ok) {
        throw new Error('فشل في تصدير التقرير');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `period-report-${fromDate}-to-${toDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "تم تصدير التقرير بنجاح",
        description: `تم تصدير تقرير الفترة من ${fromDate} إلى ${toDate}`,
      });
    } catch (error) {
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
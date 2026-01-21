import React, { useState } from 'react';
import { Button } from './ui/button';
import { FileText, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Mission } from '../types/schema';

interface ExportDisbursementRequestsProps {
  missions: Mission[];
}

export default function ExportDisbursementRequests({ missions }: ExportDisbursementRequestsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!missions || missions.length === 0) {
      alert('لا توجد مهام لتصديرها');
      return;
    }

    setIsExporting(true);
    try {
      // قراءة ملف التمبليت
      const templatePath = '1768970513085_طلب صرف.xlsx';
      const templateData = await window.fs.readFile(templatePath);
      
      // إنشاء ملف منفصل لكل مأمورية
      for (const mission of missions) {
        // تحويل البيانات إلى workbook
        const workbook = XLSX.read(templateData, { type: 'array' });
        
        // الحصول على أول sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // استخراج تاريخ اليوم والشهر من تاريخ المأمورية
        const missionDate = new Date(mission.missionDate);
        const dayDate = missionDate.toLocaleDateString('ar-EG', { 
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const monthDate = missionDate.toLocaleDateString('ar-EG', { 
          month: 'long',
          year: 'numeric'
        });

        // ملء البيانات في الخلايا المحددة
        // E2: تاريخ اليوم
        worksheet['E2'] = { t: 's', v: dayDate };
        
        // H2: تاريخ الشهر
        worksheet['H2'] = { t: 's', v: monthDate };
        
        // C4: البيان (من statement أو من أول expense description)
        const statement = mission.statement || 
                         mission.expenses.find(e => e.description)?.description || 
                         'مأمورية';
        worksheet['C4'] = { t: 's', v: statement };
        
        // R4: اسم المحامي
        worksheet['R4'] = { t: 's', v: mission.employeeName };
        
        // Z4: كود المحامي
        worksheet['Z4'] = { t: 'n', v: mission.employeeCode };
        
        // B43: إجمالي المصروفات
        const totalAmount = parseFloat(mission.totalAmount) || 0;
        worksheet['B43'] = { t: 'n', v: totalAmount };

        // تحديث نطاق الـ sheet
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        // التأكد من تضمين جميع الخلايا المعدلة في النطاق
        ['E2', 'H2', 'C4', 'R4', 'Z4', 'B43'].forEach(cell => {
          const decoded = XLSX.utils.decode_cell(cell);
          if (decoded.r > range.e.r) range.e.r = decoded.r;
          if (decoded.c > range.e.c) range.e.c = decoded.c;
        });
        
        worksheet['!ref'] = XLSX.utils.encode_range(range);

        // تصدير الملف
        const fileName = `طلب_صرف_${mission.employeeName}_${dayDate.replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
      }

      alert(`تم استخراج ${missions.length} طلب صرف بنجاح`);
      console.log('تم تصدير طلبات الصرف بنجاح');
    } catch (error) {
      console.error('خطأ في تصدير طلبات الصرف:', error);
      alert('حدث خطأ أثناء استخراج طلبات الصرف. تأكد من وجود ملف التمبليت في مجلد المشروع.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting || !missions || missions.length === 0}
      variant="outline"
      className="flex items-center border-2 border-green-500/20 hover:border-green-500 hover:bg-green-500/10 transition-all"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
          جاري الاستخراج...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4 ml-2" />
          استخراج طلبات الصرف
        </>
      )}
    </Button>
  );
}

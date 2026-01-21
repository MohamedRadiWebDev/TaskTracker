import { useLocation } from "wouter";
import { useMissions, useDeleteAllMissions } from "../hooks/use-missions";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  Plus,
  Search,
  FileDown,
  FileUp,
  Trash2,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import ExportDisbursementRequests from "../components/export-disbursement-requests";

export default function MissionsPage() {
  const [, setLocation] = useLocation();
  const { missions, isLoading } = useMissions();
  const deleteAllMutation = useDeleteAllMissions();

  const handleDeleteAll = async () => {
    if (window.confirm("هل أنت متأكد من حذف جميع المهام؟ لا يمكن التراجع عن هذا الإجراء.")) {
      try {
        await deleteAllMutation.mutateAsync();
      } catch (error) {
        console.error("Error deleting all missions:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header with Actions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">المهام</h1>
          <Button
            onClick={() => setLocation("/missions/new")}
            className="flex items-center"
          >
            <Plus className="w-5 h-5 ml-2" />
            مأمورية جديدة
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setLocation("/period-report")}
            className="flex items-center"
          >
            <Calendar className="w-4 h-4 ml-2" />
            تقرير الفترة
          </Button>

          <Button
            variant="outline"
            onClick={() => setLocation("/missions/search")}
            className="flex items-center"
          >
            <Search className="w-4 h-4 ml-2" />
            البحث عن المهام
          </Button>

          <Button
            variant="outline"
            onClick={() => setLocation("/export-excel")}
            className="flex items-center"
          >
            <FileDown className="w-4 h-4 ml-2" />
            تصدير Excel
          </Button>

          <Button
            variant="outline"
            onClick={() => setLocation("/import-excel")}
            className="flex items-center"
          >
            <FileUp className="w-4 h-4 ml-2" />
            استيراد Excel
          </Button>

          {/* زر استخراج طلبات الصرف */}
          <ExportDisbursementRequests missions={missions || []} />

          <Button
            variant="destructive"
            onClick={handleDeleteAll}
            disabled={!missions || missions.length === 0}
            className="flex items-center"
          >
            <Trash2 className="w-4 h-4 ml-2" />
            حذف الكل
          </Button>
        </div>
      </div>

      {/* Missions List */}
      {!missions || missions.length === 0 ? (
        <Card className="p-12 text-center">
          <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">لا توجد مهام</h3>
          <p className="text-muted-foreground mb-4">
            ابدأ بإضافة مأمورية جديدة
          </p>
          <Button onClick={() => setLocation("/missions/new")}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة مأمورية
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {missions.map((mission) => (
            <Card
              key={mission.id}
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setLocation(`/missions/${mission.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{mission.employeeName}</h3>
                  <p className="text-sm text-muted-foreground">
                    كود: {mission.employeeCode}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(mission.missionDate), 'dd/MM/yyyy', { locale: ar })}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">الفرع:</span>
                  <span className="text-sm font-medium">{mission.employeeBranch}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">عدد المصروفات:</span>
                  <span className="text-sm font-medium">{mission.expenses.length}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-semibold">الإجمالي:</span>
                  <span className="text-lg font-bold text-primary">
                    {mission.totalAmount} ج
                  </span>
                </div>
              </div>

              {mission.statement && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-1">البيان:</p>
                  <p className="text-sm line-clamp-2">{mission.statement}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {missions && missions.length > 0 && (
        <Card className="p-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">إجمالي المهام</p>
              <p className="text-2xl font-bold">{missions.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">إجمالي المصروفات</p>
              <p className="text-2xl font-bold">
                {missions.reduce((sum, m) => sum + m.expenses.length, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">إجمالي المبالغ</p>
              <p className="text-2xl font-bold text-primary">
                {missions.reduce((sum, m) => sum + parseFloat(m.totalAmount), 0).toFixed(2)} ج
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

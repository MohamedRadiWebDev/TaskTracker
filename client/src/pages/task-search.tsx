import { useMemo, useState } from "react";
import { useMissions } from "../hooks/use-missions";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { CalendarRange, ClipboardList, Filter, RefreshCw, Search } from "lucide-react";

export default function TaskSearch() {
  const { missions, isLoading } = useMissions();
  const [codeQuery, setCodeQuery] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  const uniqueDates = useMemo(() => {
    const dates = Array.from(new Set(missions.map((mission) => mission.missionDate)));
    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [missions]);

  const filteredMissions = useMemo(() => {
    const normalizedQuery = codeQuery.trim();
    return missions.filter((mission) => {
      const matchesCode =
        normalizedQuery === "" || mission.employeeCode.toString().includes(normalizedQuery);
      const matchesDate = selectedDates.length === 0 || selectedDates.includes(mission.missionDate);
      return matchesCode && matchesDate;
    });
  }, [missions, codeQuery, selectedDates]);

  const toggleDate = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const clearFilters = () => {
    setCodeQuery("");
    setSelectedDates([]);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground rounded-lg p-3">
            <ClipboardList className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">البحث عن المهام</h1>
            <p className="text-muted-foreground mt-1">
              استعرض جميع المهام وابحث برقم الكود مع إمكانية تصفية التواريخ المتعددة
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            إعادة تعيين البحث
          </Button>
        </div>
      </div>

      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="code-search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              البحث برقم الكود
            </Label>
            <Input
              id="code-search"
              placeholder="أدخل رقم الكود للموظف"
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value)}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4" />
              تصفية حسب التاريخ (يمكن اختيار أكثر من تاريخ)
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {uniqueDates.map((date) => (
                <label
                  key={date}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={selectedDates.includes(date)}
                    onCheckedChange={() => toggleDate(date)}
                    aria-label={`اختر تاريخ ${date}`}
                  />
                  <span className="text-sm font-medium">{date}</span>
                </label>
              ))}
              {uniqueDates.length === 0 && (
                <div className="col-span-2 text-sm text-muted-foreground">
                  لا توجد تواريخ متاحة حاليًا
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          {codeQuery || selectedDates.length > 0 ? (
            <span>
              يتم العرض حسب {codeQuery ? `الكود: ${codeQuery}` : "كل الأكواد"} و {""}
              {selectedDates.length > 0 ? `${selectedDates.length} تاريخ/تواريخ` : "جميع التواريخ"}
            </span>
          ) : (
            <span>يتم عرض جميع المهام بدون فلاتر</span>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          <Card className="p-6 text-center text-muted-foreground">جاري تحميل المهام...</Card>
        ) : filteredMissions.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            لا توجد مهام مطابقة لخيارات البحث الحالية
          </Card>
        ) : (
          filteredMissions.map((mission) => (
            <Card key={mission.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{mission.missionDate}</Badge>
                    {mission.bank && mission.bank.trim() !== "" && (
                      <Badge variant="outline">{mission.bank}</Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {mission.employeeName} (كود: {mission.employeeCode})
                  </h3>
                  <p className="text-sm text-muted-foreground">الفرع: {mission.employeeBranch}</p>
                  {mission.statement && (
                    <p className="text-sm text-muted-foreground">سبب المأمورية: {mission.statement}</p>
                  )}
                </div>

                <div className="text-left md:text-right space-y-1">
                  <div className="text-sm text-muted-foreground">عدد المصروفات: {mission.expenses?.length || 0}</div>
                  <div className="text-sm font-semibold text-foreground">
                    إجمالي المبلغ: {mission.totalAmount} جنيه
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

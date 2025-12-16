import { useEffect, useMemo, useState } from "react";
import { useMissions } from "../hooks/use-missions";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import {
  CalendarRange,
  Check,
  ChevronDown,
  ClipboardList,
  Filter,
  RefreshCw,
  Search
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "../components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem
} from "../components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "../components/ui/dialog";
import type { Mission } from "../types/schema";

export default function TaskSearch() {
  const { missions, isLoading } = useMissions();
  const [codeQuery, setCodeQuery] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [dateSearch, setDateSearch] = useState("");

  const availableDates = useMemo(() => {
    const normalizedQuery = codeQuery.trim();
    const relevantMissions =
      normalizedQuery === ""
        ? missions
        : missions.filter((mission) => mission.employeeCode.toString().includes(normalizedQuery));

    const dates = Array.from(new Set(relevantMissions.map((mission) => mission.missionDate)));
    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [missions, codeQuery]);

  const groupedDates = useMemo(() => {
    const groups: Record<string, { label: string; dates: string[]; sortValue: number }> = {};

    availableDates.forEach((date) => {
      const dateObj = new Date(date);
      const monthKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
      const sortValue = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).getTime();
      const label = dateObj.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
      if (!groups[monthKey]) {
        groups[monthKey] = { label, dates: [], sortValue };
      }
      groups[monthKey].dates.push(date);
    });

    return Object.entries(groups)
      .sort((a, b) => b[1].sortValue - a[1].sortValue)
      .map(([monthKey, { label, dates, sortValue }]) => ({
        monthKey,
        label,
        sortValue,
        dates: dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()),
      }));
  }, [availableDates]);

  const hasVisibleDates = useMemo(() => {
    const query = dateSearch.trim();
    return groupedDates.some(({ label, dates }) =>
      dates.some((date) => (query === "" ? true : date.includes(query) || label.includes(query)))
    );
  }, [groupedDates, dateSearch]);

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

  useEffect(() => {
    setSelectedDates((prev) => prev.filter((date) => availableDates.includes(date)));
  }, [availableDates]);

  useEffect(() => {
    if (dateSearch.trim() !== "") {
      const allMonths = groupedDates.map((group) => group.monthKey);
      setExpandedMonths(new Set(allMonths));
    } else {
      setExpandedMonths(new Set());
    }
  }, [dateSearch, groupedDates]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  const openMissionDetails = (mission: Mission) => {
    setActiveMission(mission);
    setIsDetailsOpen(true);
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
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isDatePickerOpen}
                  className="w-full justify-between"
                >
                  <div className="flex flex-wrap gap-2 text-right">
                    {selectedDates.length > 0 ? (
                      selectedDates.map((date) => (
                        <Badge key={date} variant="secondary" className="text-xs">
                          {date}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">اختر التواريخ المطلوبة</span>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="ابحث عن تاريخ..."
                    className="text-right"
                    value={dateSearch}
                    onValueChange={setDateSearch}
                  />
                  <CommandEmpty>لا توجد تواريخ مطابقة</CommandEmpty>
                  <div className="max-h-80 overflow-y-auto py-1">
                    {!hasVisibleDates && (
                      <p className="px-3 py-4 text-sm text-muted-foreground">
                        لا توجد تواريخ مطابقة للبحث الحالي
                      </p>
                    )}

                    {groupedDates.map(({ monthKey, label, dates }) => {
                      const filteredDates = dates.filter((date) =>
                        dateSearch.trim() === ""
                          ? true
                          : date.includes(dateSearch.trim()) || label.includes(dateSearch.trim())
                      );

                      if (filteredDates.length === 0) return null;

                      const isExpanded = expandedMonths.has(monthKey) || dateSearch.trim() !== "";

                      return (
                        <CommandGroup key={monthKey} className="px-2">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-right text-sm font-medium hover:bg-muted"
                            onClick={() => toggleMonth(monthKey)}
                          >
                            <span>{label}</span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                isExpanded ? "rotate-180" : "rotate-0"
                              }`}
                            />
                          </button>

                          {isExpanded && (
                            <div className="space-y-1">
                              {filteredDates.map((date) => {
                                const isSelected = selectedDates.includes(date);
                                return (
                                  <CommandItem
                                    key={date}
                                    value={date}
                                    onSelect={() => toggleDate(date)}
                                    className="flex items-center justify-between rounded-md"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleDate(date)}
                                        aria-label={`اختر تاريخ ${date}`}
                                      />
                                      <span className="text-sm font-medium">{date}</span>
                                    </div>
                                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                                  </CommandItem>
                                );
                              })}
                            </div>
                          )}
                        </CommandGroup>
                      );
                    })}
                  </div>
                </Command>
              </PopoverContent>
            </Popover>
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
            <Card
              key={mission.id}
              className="p-4 cursor-pointer transition hover:border-primary/50"
              role="button"
              tabIndex={0}
              onClick={() => openMissionDetails(mission)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openMissionDetails(mission);
                }
              }}
            >
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

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>تفاصيل المأمورية</DialogTitle>
            <DialogDescription>
              استعرض بيانات المأمورية والمصروفات المرتبطة بها
            </DialogDescription>
          </DialogHeader>

          {activeMission && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm text-muted-foreground">الموظف</p>
                  <p className="font-semibold text-foreground">
                    {activeMission.employeeName} (كود: {activeMission.employeeCode})
                  </p>
                  <p className="text-sm text-muted-foreground">الفرع: {activeMission.employeeBranch}</p>
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4" />
                    <p className="text-sm text-muted-foreground">تاريخ المأمورية</p>
                  </div>
                  <p className="font-semibold text-foreground">{activeMission.missionDate}</p>
                  {activeMission.bank && (
                    <p className="text-sm text-muted-foreground">البنك: {activeMission.bank}</p>
                  )}
                </div>
              </div>

              {activeMission.statement && (
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground mb-1">سبب المأمورية</p>
                  <p className="text-foreground">{activeMission.statement}</p>
                </div>
              )}

              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">المصروفات</p>
                  <p className="text-sm text-muted-foreground">
                    إجمالي المبلغ: {activeMission.totalAmount} جنيه
                  </p>
                </div>

                {activeMission.expenses && activeMission.expenses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="py-2 px-1">البند</th>
                          <th className="py-2 px-1">المبلغ</th>
                          <th className="py-2 px-1">البنوك</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMission.expenses.map((expense) => (
                          <tr key={expense.id} className="border-t">
                            <td className="py-2 px-1 text-foreground">{expense.type}</td>
                            <td className="py-2 px-1">{expense.amount} جنيه</td>
                            <td className="py-2 px-1">
                              <div className="flex flex-wrap gap-1">
                                {expense.banks.map((bank) => (
                                  <Badge key={bank} variant="outline">
                                    {bank}
                                    {expense.bankAllocations?.[bank]
                                      ? ` - ${expense.bankAllocations[bank]}`
                                      : ""}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    لا توجد مصروفات مسجلة لهذه المأمورية
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

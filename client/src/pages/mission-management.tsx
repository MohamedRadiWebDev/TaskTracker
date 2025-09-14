import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import EmployeeLookup from "@/components/employee-lookup";
import MissionDetails from "@/components/mission-details";
import ExpenseManagement from "@/components/expense-management";
import BankDistribution from "@/components/bank-distribution";
import type { Mission, ExpenseItem, InsertMission, Employee } from "@/types/mission";

interface Totals {
  totalAmount: number;
  itemCount: number;
  bankCount: number;
  bankTotals: Record<string, number>;
}
import { Briefcase, Save, Trash2, Plus, Edit2, Download, Upload, Loader2 } from "lucide-react";

export default function MissionManagement() {
  const { toast } = useToast();
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [expenseCounter, setExpenseCounter] = useState(1);

  // Fetch all missions from server
  const { data: missions = [], isLoading, error } = useQuery<Mission[], Error>({
    queryKey: ['/api/missions'],
    retry: false,
  });

  // Get current active mission
  const activeMission = missions.find((m: Mission) => m.id === activeMissionId) || missions[0];

  // Set first mission as active if none selected
  useEffect(() => {
    if (!activeMissionId && missions.length > 0) {
      setActiveMissionId(missions[0].id);
    }
  }, [activeMissionId, missions]);

  // Initialize expense counter based on active mission
  useEffect(() => {
    if (activeMission && activeMission.expenses) {
      const maxId = Math.max(
        0,
        ...activeMission.expenses
          .map(expense => parseInt(expense.id.replace('expense-', '')))
          .filter(num => !isNaN(num))
      );
      setExpenseCounter(maxId + 1);
    }
  }, [activeMission]);

  // Create mission mutation
  const createMissionMutation = useMutation({
    mutationFn: async (missionData: InsertMission) => {
      const response = await apiRequest('POST', '/api/missions', missionData);
      return response.json();
    },
    onSuccess: (newMission: Mission) => {
      queryClient.invalidateQueries({ queryKey: ['/api/missions'] });
      setActiveMissionId(newMission.id);
      toast({
        title: "تم إنشاء مأمورية جديدة",
        description: "تم حفظ المأمورية في النظام بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في إنشاء المأمورية",
        description: "حدث خطأ أثناء إنشاء المأمورية الجديدة",
        variant: "destructive"
      });
    }
  });

  // Update mission mutation
  const updateMissionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertMission> }) => {
      const response = await apiRequest('PUT', `/api/missions/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/missions'] });
      toast({
        title: "تم حفظ التغييرات",
        description: "تم حفظ تحديثات المأمورية بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive"
      });
    }
  });

  // Delete mission mutation
  const deleteMissionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/missions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/missions'] });
      toast({
        title: "تم حذف المأمورية",
        description: "تم حذف المأمورية بنجاح",
        variant: "destructive"
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف المأمورية",
        variant: "destructive"
      });
    }
  });

  // Mission management functions
  const createNewMissionAction = () => {
    const newMissionData: InsertMission = {
      employeeCode: 0,
      employeeName: '',
      employeeBranch: '',
      missionDate: new Date().toISOString().split('T')[0],
      statement: '',
      expenses: [],
      totalAmount: '0'
    };

    createMissionMutation.mutate(newMissionData);
  };

  const updateActiveMission = (updates: Partial<InsertMission>) => {
    if (!activeMission) return;

    // Calculate total amount from expenses
    const totalAmount = (updates.expenses || activeMission.expenses || [])
      .reduce((sum, expense) => sum + expense.amount, 0)
      .toString();

    const updatedData = {
      ...updates,
      totalAmount
    };

    updateMissionMutation.mutate({
      id: activeMission.id,
      updates: updatedData
    });
  };

  const selectMission = (missionId: string) => {
    setActiveMissionId(missionId);
  };

  const deleteMission = (missionId: string) => {
    if (missions.length <= 1) {
      toast({
        title: "لا يمكن الحذف",
        description: "يجب أن تبقى مأمورية واحدة على الأقل",
        variant: "destructive"
      });
      return;
    }

    if (window.confirm('هل أنت متأكد من حذف هذه المأمورية؟')) {
      deleteMissionMutation.mutate(missionId);
      
      // Set new active mission if deleting current one
      if (activeMissionId === missionId) {
        const remainingMissions = missions.filter((m: Mission) => m.id !== missionId);
        if (remainingMissions.length > 0) {
          setActiveMissionId(remainingMissions[0].id);
        }
      }
    }
  };

  // Employee change handler
  const handleEmployeeChange = (employee: { code: number; name: string; branch: string } | null) => {
    if (employee) {
      updateActiveMission({
        employeeCode: employee.code,
        employeeName: employee.name,
        employeeBranch: employee.branch
      });
    } else {
      updateActiveMission({
        employeeCode: 0,
        employeeName: '',
        employeeBranch: ''
      });
    }
  };

  // Mission details change handlers
  const handleMissionDateChange = (date: string) => {
    updateActiveMission({ missionDate: date });
  };

  const handleStatementChange = (statement: string) => {
    updateActiveMission({ statement });
  };

  // Expense management functions
  const addExpenseItem = (type: string) => {
    const newExpense: ExpenseItem = {
      id: `expense-${expenseCounter}`,
      type,
      amount: 0,
      banks: []
    };

    const currentExpenses = activeMission?.expenses || [];
    updateActiveMission({
      expenses: [...currentExpenses, newExpense]
    });

    setExpenseCounter(prev => prev + 1);
  };

  const updateExpenseItem = (id: string, updates: Partial<ExpenseItem>) => {
    const currentExpenses = activeMission?.expenses || [];
    const updatedExpenses = currentExpenses.map(expense =>
      expense.id === id ? { ...expense, ...updates } : expense
    );
    updateActiveMission({ expenses: updatedExpenses });
  };

  const removeExpenseItem = (id: string) => {
    const currentExpenses = activeMission?.expenses || [];
    const updatedExpenses = currentExpenses.filter(expense => expense.id !== id);
    updateActiveMission({ expenses: updatedExpenses });
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      const response = await fetch('/api/missions/export');
      if (!response.ok) {
        throw new Error('فشل في تصدير البيانات');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `missions-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "تم تصدير البيانات بنجاح",
        description: "تم تصدير جميع المأموريات إلى ملف Excel",
      });
    } catch (error) {
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير البيانات إلى Excel",
        variant: "destructive"
      });
    }
  };

  // Import from Excel
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    fetch('/api/missions/import', {
      method: 'POST',
      body: formData,
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('فشل في استيراد البيانات');
        }
        return response.json();
      })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/missions'] });
        toast({
          title: "تم استيراد البيانات بنجاح",
          description: "تم استيراد المأموريات من ملف Excel",
        });
      })
      .catch(error => {
        toast({
          title: "خطأ في الاستيراد",
          description: "حدث خطأ أثناء استيراد البيانات من Excel",
          variant: "destructive"
        });
      });

    // Reset the file input
    event.target.value = '';
  };

  // Calculate totals
  const calculateTotals = (): Totals => {
    if (!activeMission) {
      return {
        totalAmount: 0,
        itemCount: 0,
        bankCount: 0,
        bankTotals: {}
      };
    }

    const expenses: ExpenseItem[] = activeMission.expenses || [];
    const totalAmount = expenses.reduce((sum: number, expense: ExpenseItem) => sum + expense.amount, 0);
    const bankTotals: Record<string, number> = {};

    expenses.forEach((expense: ExpenseItem) => {
      if (expense.banks && expense.banks.length > 0 && expense.amount > 0) {
        const amountPerBank = expense.amount / expense.banks.length;
        expense.banks.forEach((bankName: string) => {
          bankTotals[bankName] = (bankTotals[bankName] || 0) + amountPerBank;
        });
      }
    });

    const uniqueBanks = new Set<string>();
    expenses.forEach((expense: ExpenseItem) => {
      if (expense.banks) {
        expense.banks.forEach((bank: string) => uniqueBanks.add(bank));
      }
    });

    return {
      totalAmount,
      itemCount: expenses.length,
      bankCount: uniqueBanks.size,
      bankTotals
    };
  };

  const totals = calculateTotals();

  // Convert Mission to employee format for EmployeeLookup
  const currentEmployee = activeMission ? {
    code: activeMission.employeeCode,
    name: activeMission.employeeName,
    branch: activeMission.employeeBranch
  } : null;

  // Don't show employee if code is 0 (empty mission)
  const employeeForLookup = currentEmployee?.code ? currentEmployee : null;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-lg">جاري تحميل المأموريات...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-destructive text-lg mb-4">خطأ في تحميل البيانات</div>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/missions'] })}>
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground rounded-lg p-3">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              إدارة المأموريات
            </h1>
            <p className="text-muted-foreground mt-1">
              نظام إدارة مأموريات الموظفين والمصروفات
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={exportToExcel}
            variant="outline"
            className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
            data-testid="button-export"
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير Excel
          </Button>

          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              data-testid="input-import"
            />
            <Button
              variant="outline"
              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            >
              <Upload className="w-4 h-4 ml-2" />
              استيراد Excel
            </Button>
          </div>

          <Button
            onClick={createNewMissionAction}
            disabled={createMissionMutation.isPending}
            data-testid="button-new-mission"
          >
            {createMissionMutation.isPending ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 ml-2" />
            )}
            مأمورية جديدة
          </Button>
        </div>
      </div>

      {/* Missions tabs */}
      {missions.length > 1 && (
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {missions.map((mission: Mission, index: number) => (
              <Button
                key={mission.id}
                variant={activeMissionId === mission.id ? "default" : "outline"}
                size="sm"
                onClick={() => selectMission(mission.id)}
                className="shrink-0"
                data-testid={`tab-mission-${mission.id}`}
              >
                <span className="ml-2">مأمورية {index + 1}</span>
                {mission.employeeName && (
                  <span className="text-xs opacity-75">({mission.employeeName})</span>
                )}
                {missions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMission(mission.id);
                    }}
                    className="mr-2 h-4 w-4 p-0 hover:bg-destructive/20"
                    disabled={deleteMissionMutation.isPending}
                    data-testid={`button-delete-${mission.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {activeMission && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Forms */}
          <div className="lg:col-span-2 space-y-8">
            {/* Employee Lookup */}
            <Card className="p-6 bg-background border shadow-sm">
              <EmployeeLookup
                employee={employeeForLookup}
                onEmployeeChange={handleEmployeeChange}
              />
            </Card>

            {/* Mission Details */}
            <Card className="p-6 bg-background border shadow-sm">
              <MissionDetails
                missionDate={activeMission.missionDate}
                statement={activeMission.statement || ''}
                onMissionDateChange={handleMissionDateChange}
                onStatementChange={handleStatementChange}
              />
            </Card>

            {/* Expense Management */}
            <Card className="p-6 bg-background border shadow-sm">
              <ExpenseManagement
                expenses={activeMission.expenses || []}
                totals={totals}
                onAddExpense={addExpenseItem}
                onUpdateExpense={updateExpenseItem}
                onRemoveExpense={removeExpenseItem}
              />
            </Card>
          </div>

          {/* Right column - Summary */}
          <div className="space-y-6">
            <BankDistribution
              bankTotals={totals.bankTotals}
              totalAmount={totals.totalAmount}
            />

            {/* Save Actions */}
            <Card className="p-6 bg-background border shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Save className="w-5 h-5 text-primary ml-3" />
                حفظ البيانات
              </h3>

              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  يتم حفظ التغييرات تلقائياً في النظام
                </div>

                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                    {totals.itemCount} عنصر مصروف
                  </span>
                  <span className="px-2 py-1 bg-secondary/10 text-secondary-foreground rounded">
                    {totals.bankCount} بنك
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                    {totals.totalAmount.toFixed(2)} جنيه
                  </span>
                </div>

                {(updateMissionMutation.isPending || deleteMissionMutation.isPending) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الحفظ...
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
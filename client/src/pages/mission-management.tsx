import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { useToast } from "../hooks/use-toast";
import EmployeeLookup from "../components/employee-lookup";
import MissionDetails from "../components/mission-details";
import ExpenseManagement from "../components/expense-management";
import BankDistribution from "../components/bank-distribution";
import { useMissions } from "../hooks/use-missions";
import type { Mission, ExpenseItem, InsertMission, Employee } from "../types/schema";

interface Totals {
  totalAmount: number;
  itemCount: number;
  bankCount: number;
  bankTotals: Record<string, number>;
}
import { Briefcase, Save, Trash2, Plus, Edit2, Download, Upload, Loader2, FileText, AlertTriangle, Undo2 } from "lucide-react";

export default function MissionManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [expenseCounter, setExpenseCounter] = useState(1);
  const [localStatement, setLocalStatement] = useState<string>("");
  const [localMissionDate, setLocalMissionDate] = useState<string>("");
  const [localExpenses, setLocalExpenses] = useState<ExpenseItem[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Use localStorage missions instead of API
  const { missions, isLoading, error, createNewMission, updateMissionById, deleteMissionById, clearAllMissions, undoClear, canUndo, refreshMissions } = useMissions();

  // Get current active mission
  const activeMission = missions.find((m: Mission) => m.id === activeMissionId) || missions[0];

  // Set first mission as active if none selected
  useEffect(() => {
    if (!activeMissionId && missions.length > 0) {
      setActiveMissionId(missions[0].id);
    }
  }, [activeMissionId, missions]);

  // Update local state when active mission changes
  useEffect(() => {
    if (activeMission) {
      setLocalStatement(activeMission.statement || "");
      setLocalMissionDate(activeMission.missionDate || "");
      setLocalExpenses(activeMission.expenses || []);
      setHasUnsavedChanges(false);
    }
  }, [activeMission?.id]);

  // Initialize expense counter based on local expenses
  useEffect(() => {
    if (localExpenses && localExpenses.length > 0) {
      const maxId = Math.max(
        0,
        ...localExpenses
          .map(expense => parseInt(expense.id.replace('expense-', '')))
          .filter(num => !isNaN(num))
      );
      setExpenseCounter(maxId + 1);
    }
  }, [localExpenses]);

  // Loading states for async operations
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Mission management functions
  const createNewMissionAction = async () => {
    setCreateLoading(true);
    try {
      const newMissionData: InsertMission = {
        employeeCode: 0,
        employeeName: '',
        employeeBranch: '',
        missionDate: new Date().toISOString().split('T')[0],
        statement: '',
        expenses: [],
        totalAmount: '0'
      };

      const newMission = await createNewMission(newMissionData);
      setActiveMissionId(newMission.id);
    } catch (error) {
      console.error('Error creating mission:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const updateActiveMission = useCallback(async (updates: Partial<InsertMission>) => {
    if (!activeMission) return;

    // Calculate total amount from expenses
    const expenses = (updates.expenses || activeMission.expenses || []) as ExpenseItem[];
    const totalAmount = expenses
      .reduce((sum: number, expense: ExpenseItem) => sum + expense.amount, 0)
      .toString();

    const updatedData = {
      ...updates,
      totalAmount
    };

    // Equality guard to prevent redundant updates
    const hasChanges = Object.keys(updatedData).some(key => {
      const newValue = updatedData[key as keyof typeof updatedData];
      const currentValue = activeMission[key as keyof Mission];
      if (key === 'expenses') {
        return JSON.stringify(newValue) !== JSON.stringify(currentValue);
      }
      return newValue !== currentValue;
    });

    if (!hasChanges) return;

    setUpdateLoading(true);
    try {
      await updateMissionById(activeMission.id, updatedData);
    } catch (error) {
      console.error('Error updating mission:', error);
    } finally {
      setUpdateLoading(false);
    }
  }, [activeMission, updateMissionById]);

  const selectMission = (missionId: string) => {
    setActiveMissionId(missionId);
  };

  const deleteMission = async (missionId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المأمورية؟')) {
      setDeleteLoading(true);
      try {
        await deleteMissionById(missionId);
        
        // Set new active mission if deleting current one
        if (activeMissionId === missionId) {
          const remainingMissions = missions.filter((m: Mission) => m.id !== missionId);
          if (remainingMissions.length > 0) {
            setActiveMissionId(remainingMissions[0].id);
          }
        }
      } catch (error) {
        console.error('Error deleting mission:', error);
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  // Bulk delete all missions with confirmation
  const handleDeleteAll = async () => {
    if (deleteConfirmText !== 'حذف الكل') {
      toast({
        title: "نص التأكيد غير صحيح",
        description: "يرجى كتابة 'حذف الكل' للتأكيد",
        variant: "destructive"
      });
      return;
    }

    setClearLoading(true);
    try {
      const success = await clearAllMissions();
      if (success) {
        setActiveMissionId(null);
        setShowDeleteDialog(false);
        setDeleteConfirmText('');
      }
    } catch (error) {
      console.error('Error clearing all missions:', error);
    } finally {
      setClearLoading(false);
    }
  };

  // Handle undo action
  const handleUndo = async () => {
    try {
      const success = await undoClear();
      if (success && missions.length > 0) {
        setActiveMissionId(missions[0].id);
      }
    } catch (error) {
      console.error('Error undoing clear:', error);
    }
  };

  // Employee change handler
  const handleEmployeeChange = useCallback((employee: { code: number; name: string; branch: string } | null) => {
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
  }, [updateActiveMission]);

  // Manual save function for all changes
  const saveChanges = useCallback(() => {
    if (!activeMission || !hasUnsavedChanges) return;
    
    const updates: Partial<InsertMission> = {
      statement: localStatement,
      missionDate: localMissionDate,
      expenses: localExpenses
    };
    
    updateActiveMission(updates);
    setHasUnsavedChanges(false);
  }, [activeMission, hasUnsavedChanges, localStatement, localMissionDate, localExpenses, updateActiveMission]);

  // Mission details change handlers (local only)
  const handleMissionDateChange = useCallback((date: string) => {
    setLocalMissionDate(date);
    setHasUnsavedChanges(true);
  }, []);

  const handleStatementChange = useCallback((statement: string) => {
    setLocalStatement(statement);
    setHasUnsavedChanges(true);
  }, []);


  // Expense management functions (local only)
  const addExpenseItem = useCallback((type: string) => {
    // Get banks from the first expense item if exists
    const firstExpenseBanks = localExpenses.length > 0 && localExpenses[0].banks 
      ? [...localExpenses[0].banks] 
      : [];

    const newExpense: ExpenseItem = {
      id: `expense-${expenseCounter}`,
      type,
      amount: 0,
      banks: firstExpenseBanks
    };

    setLocalExpenses(prev => [...prev, newExpense]);
    setHasUnsavedChanges(true);
    setExpenseCounter(prev => prev + 1);
  }, [expenseCounter, localExpenses]);

  const updateExpenseItem = useCallback((id: string, updates: Partial<ExpenseItem>) => {
    setLocalExpenses(prev => prev.map((expense: ExpenseItem) =>
      expense.id === id ? { ...expense, ...updates } : expense
    ));
    setHasUnsavedChanges(true);
  }, []);

  const removeExpenseItem = useCallback((id: string) => {
    setLocalExpenses(prev => prev.filter((expense: ExpenseItem) => expense.id !== id));
    setHasUnsavedChanges(true);
  }, []);

  // Export to Excel
  const exportToExcel = async () => {
    try {
      const { exportMissionsToExcel } = await import('../lib/excelUtils');
      exportMissionsToExcel(missions);
      
      toast({
        title: "تم تصدير البيانات بنجاح",
        description: "تم تصدير جميع المأموريات إلى ملف Excel",
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير البيانات إلى Excel",
        variant: "destructive"
      });
    }
  };

  // Import from Excel
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { importMissionsFromExcel } = await import('../lib/excelUtils');
      const result = await importMissionsFromExcel(file);
      
      if (result.success) {
        refreshMissions();
        toast({
          title: "تم استيراد البيانات بنجاح",
          description: result.message,
        });
      } else {
        toast({
          title: "خطأ في الاستيراد",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Excel import error:', error);
      toast({
        title: "خطأ في الاستيراد",
        description: "حدث خطأ أثناء استيراد البيانات من Excel",
        variant: "destructive"
      });
    }

    // Reset the file input
    event.target.value = '';
  };

  // Calculate totals
  const calculateTotals = (): Totals => {
    const expenses: ExpenseItem[] = localExpenses || [];
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
            <Button onClick={() => refreshMissions()}>
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
            onClick={() => setLocation("/period-report")}
            variant="outline"
            className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
            data-testid="button-period-report"
          >
            <FileText className="w-4 h-4 ml-2" />
            تقرير الفترة
          </Button>

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

          {canUndo() && (
            <Button
              onClick={handleUndo}
              variant="outline"
              className="bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700"
              data-testid="button-undo-clear"
            >
              <Undo2 className="w-4 h-4 ml-2" />
              تراجع
            </Button>
          )}

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                disabled={missions.length === 0}
                data-testid="button-delete-all"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                حذف الكل
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  تأكيد حذف جميع المأموريات
                </AlertDialogTitle>
                <AlertDialogDescription className="text-right">
                  سيتم حذف جميع المأموريات ({missions.length}) بشكل نهائي. 
                  <br /><br />
                  <strong>ننصح بتصدير البيانات إلى Excel قبل الحذف للنسخ الاحتياطي.</strong>
                  <br /><br />
                  اكتب <code className="bg-gray-100 px-1 rounded">حذف الكل</code> للتأكيد:
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="اكتب: حذف الكل"
                  className="text-center"
                  data-testid="input-confirm-delete-all"
                />
              </div>
              <AlertDialogFooter className="flex gap-2">
                <AlertDialogCancel
                  onClick={() => {
                    setDeleteConfirmText('');
                    setShowDeleteDialog(false);
                  }}
                >
                  إلغاء
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAll}
                  disabled={deleteConfirmText !== 'حذف الكل' || clearLoading}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="button-confirm-delete-all"
                >
                  {clearLoading ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 ml-2" />
                  )}
                  تأكيد الحذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={createNewMissionAction}
            disabled={createLoading}
            data-testid="button-new-mission"
          >
            {createLoading ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 ml-2" />
            )}
            مأمورية جديدة
          </Button>
        </div>
      </div>

      {/* Missions tabs */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {missions.map((mission: Mission, index: number) => (
            <div key={mission.id} className="flex items-center gap-1">
              {missions.length > 1 && (
                <Button
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
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMission(mission.id)}
                className="h-8 w-8 p-0 hover:bg-destructive/20"
                disabled={deleteLoading}
                data-testid={`button-delete-${mission.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {activeMission && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Forms */}
          <div className="lg:col-span-2 space-y-8">
            {/* Employee Lookup */}
            <Card className="p-6 bg-background border shadow-sm">
              <EmployeeLookup
                key={activeMission.id}
                employee={employeeForLookup}
                onEmployeeChange={handleEmployeeChange}
              />
            </Card>

            {/* Mission Details */}
            <Card className="p-6 bg-background border shadow-sm">
              <MissionDetails
                missionDate={localMissionDate}
                statement={localStatement}
                onMissionDateChange={handleMissionDateChange}
                onStatementChange={handleStatementChange}
              />
            </Card>

            {/* Expense Management */}
            <Card className="p-6 bg-background border shadow-sm">
              <ExpenseManagement
                expenses={localExpenses}
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

              <div className="space-y-4">
                {hasUnsavedChanges ? (
                  <div className="space-y-3">
                    <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      ⚠️ لديك تغييرات غير محفوظة
                    </div>
                    <Button 
                      onClick={saveChanges}
                      variant="default"
                      className="w-full flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                      disabled={updateLoading}
                    >
                      <Save className="w-4 h-4" />
                      {updateLoading ? 'جاري الحفظ...' : 'حفظ جميع التغييرات'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    جميع التغييرات محفوظة
                  </div>
                )}

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
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import EmployeeLookup from "@/components/employee-lookup";
import MissionDetails from "@/components/mission-details";
import ExpenseManagement from "@/components/expense-management";
import BankDistribution from "@/components/bank-distribution";
import type { MissionData, ExpenseItem } from "@/types/mission";
import { Briefcase, Save, Trash2 } from "lucide-react";

const initialMissionData: MissionData = {
  employee: null,
  missionDate: new Date().toISOString().split('T')[0],
  statement: '',
  expenses: [],
  timestamp: ''
};

export default function MissionManagement() {
  const { toast } = useToast();
  const [missionData, setMissionData] = useLocalStorage<MissionData>('missionData', initialMissionData);
  
  // Migration function to convert old data structure to new one
  const migrateMissionData = (data: any): MissionData => {
    if (!data) return initialMissionData;
    
    const migratedExpenses = data.expenses?.map((expense: any) => ({
      ...expense,
      banks: expense.banks || (expense.bank ? [expense.bank] : [])
    })) || [];
    
    // Remove bank field from mission data
    const { bank, ...restData } = data;
    
    return {
      ...initialMissionData,
      ...restData,
      expenses: migratedExpenses
    };
  };
  
  // Apply migration if needed
  useEffect(() => {
    const needsMigration = missionData.expenses.some((expense: any) => 
      expense.bank !== undefined || expense.banks === undefined
    );
    
    if (needsMigration) {
      const migratedData = migrateMissionData(missionData);
      setMissionData(migratedData);
    }
  }, []);
  
  // Initialize counter based on existing expenses to avoid duplicate IDs
  const getInitialCounter = () => {
    if (missionData.expenses.length === 0) return 1;
    const maxId = Math.max(
      ...missionData.expenses
        .map(expense => parseInt(expense.id.replace('expense-', '')))
        .filter(num => !isNaN(num))
    );
    return maxId + 1;
  };
  
  const [expenseCounter, setExpenseCounter] = useState(getInitialCounter());

  const updateMissionData = (updates: Partial<MissionData>) => {
    setMissionData(prev => ({ ...prev, ...updates }));
  };

  const addExpenseItem = (type: string) => {
    const newExpense: ExpenseItem = {
      id: `expense-${expenseCounter}`,
      type,
      amount: 0,
      banks: []
    };
    
    updateMissionData({
      expenses: [...missionData.expenses, newExpense]
    });
    
    setExpenseCounter(prev => prev + 1);
  };

  const updateExpenseItem = (id: string, updates: Partial<ExpenseItem>) => {
    const updatedExpenses = missionData.expenses.map(expense =>
      expense.id === id ? { ...expense, ...updates } : expense
    );
    updateMissionData({ expenses: updatedExpenses });
  };

  const removeExpenseItem = (id: string) => {
    const updatedExpenses = missionData.expenses.filter(expense => expense.id !== id);
    updateMissionData({ expenses: updatedExpenses });
  };

  const saveData = () => {
    const dataToSave = {
      ...missionData,
      timestamp: new Date().toISOString()
    };
    setMissionData(dataToSave);
    
    toast({
      title: "تم حفظ البيانات بنجاح",
      description: "تم حفظ جميع بيانات المأمورية في التخزين المحلي",
    });
  };

  const clearAllData = () => {
    if (window.confirm('هل أنت متأكد من حذف جميع البيانات؟')) {
      setMissionData(initialMissionData);
      setExpenseCounter(1);
      
      toast({
        title: "تم مسح البيانات",
        description: "تم حذف جميع البيانات المحفوظة",
        variant: "destructive"
      });
    }
  };

  const calculateTotals = () => {
    const totalAmount = missionData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const bankTotals: Record<string, number> = {};
    
    missionData.expenses.forEach(expense => {
      if (expense.banks && expense.banks.length > 0 && expense.amount > 0) {
        // Divide the expense amount equally among selected banks
        const amountPerBank = expense.amount / expense.banks.length;
        expense.banks.forEach(bank => {
          bankTotals[bank] = (bankTotals[bank] || 0) + amountPerBank;
        });
      }
    });

    return {
      totalAmount,
      itemCount: missionData.expenses.length,
      bankCount: Object.keys(bankTotals).length,
      bankTotals
    };
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary text-primary-foreground rounded-lg p-3">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">نظام إدارة المأموريات</h1>
                <p className="text-muted-foreground">إدارة مصروفات ومأموريات الموظفين</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="destructive" 
                onClick={clearAllData}
                data-testid="button-clear-all"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                مسح الكل
              </Button>
              <Button 
                onClick={saveData}
                data-testid="button-save"
              >
                <Save className="w-4 h-4 ml-2" />
                حفظ البيانات
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Employee Information */}
        <Card className="p-6 mb-8">
          <EmployeeLookup 
            employee={missionData.employee}
            onEmployeeChange={(employee: { code: number; name: string; branch: string } | null) => updateMissionData({ employee })}
          />
        </Card>

        {/* Mission Details */}
        <Card className="p-6 mb-8">
          <MissionDetails 
            missionDate={missionData.missionDate}
            statement={missionData.statement}
            onMissionDateChange={(missionDate: string) => updateMissionData({ missionDate })}
            onStatementChange={(statement: string) => updateMissionData({ statement })}
          />
        </Card>

        {/* Expense Management */}
        <Card className="p-6 mb-8">
          <ExpenseManagement 
            expenses={missionData.expenses}
            totals={totals}
            onAddExpense={addExpenseItem}
            onUpdateExpense={updateExpenseItem}
            onRemoveExpense={removeExpenseItem}
          />
        </Card>

        {/* Bank Distribution */}
        <Card className="p-6">
          <BankDistribution 
            bankTotals={totals.bankTotals}
            totalAmount={totals.totalAmount}
          />
        </Card>
      </main>
    </div>
  );
}

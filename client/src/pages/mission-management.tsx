import { useState } from "react";
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
  bank: '',
  statement: '',
  expenses: [],
  timestamp: ''
};

export default function MissionManagement() {
  const { toast } = useToast();
  const [missionData, setMissionData] = useLocalStorage<MissionData>('missionData', initialMissionData);
  const [expenseCounter, setExpenseCounter] = useState(1);

  const updateMissionData = (updates: Partial<MissionData>) => {
    setMissionData(prev => ({ ...prev, ...updates }));
  };

  const addExpenseItem = (type: string) => {
    const newExpense: ExpenseItem = {
      id: `expense-${expenseCounter}`,
      type,
      amount: 0,
      bank: ''
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
      if (expense.bank && expense.amount > 0) {
        bankTotals[expense.bank] = (bankTotals[expense.bank] || 0) + expense.amount;
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
            bank={missionData.bank}
            statement={missionData.statement}
            onMissionDateChange={(missionDate: string) => updateMissionData({ missionDate })}
            onBankChange={(bank: string) => updateMissionData({ bank })}
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

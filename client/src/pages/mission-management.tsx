import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import EmployeeLookup from "@/components/employee-lookup";
import MissionDetails from "@/components/mission-details";
import ExpenseManagement from "@/components/expense-management";
import BankDistribution from "@/components/bank-distribution";
import type { MissionData, ExpenseItem, MissionsCollection } from "@/types/mission";
import { Briefcase, Save, Trash2, Plus, Edit2 } from "lucide-react";

const createNewMission = (): MissionData => ({
  id: `mission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  title: `مأمورية ${new Date().toLocaleDateString('ar-EG')}`,
  employee: null,
  missionDate: new Date().toISOString().split('T')[0],
  statement: '',
  expenses: [],
  timestamp: '',
  createdAt: new Date().toISOString()
});

const initialMissionsCollection: MissionsCollection = {
  missions: [createNewMission()],
  activeMissionId: null
};

export default function MissionManagement() {
  const { toast } = useToast();
  
  // Initialize missions collection with migration from old data
  const initializeMissionsCollection = (): MissionsCollection => {
    const oldMissionData = localStorage.getItem('missionData');
    if (oldMissionData) {
      try {
        const parsed = JSON.parse(oldMissionData);
        // Migrate old single mission to new format
        const migratedMission: MissionData = {
          id: `mission-${Date.now()}`,
          title: `مأمورية مُرحلة`,
          ...parsed,
          createdAt: parsed.timestamp || new Date().toISOString()
        };
        
        // Migrate expense structure if needed
        if (migratedMission.expenses) {
          migratedMission.expenses = migratedMission.expenses.map((expense: any) => ({
            ...expense,
            banks: expense.banks || (expense.bank ? [expense.bank] : [])
          }));
        }
        
        const collection: MissionsCollection = {
          missions: [migratedMission],
          activeMissionId: migratedMission.id
        };
        
        // Clear old data
        localStorage.removeItem('missionData');
        return collection;
      } catch (error) {
        console.error('Migration failed:', error);
      }
    }
    
    // Create new collection
    const newMission = createNewMission();
    return {
      missions: [newMission],
      activeMissionId: newMission.id
    };
  };
  
  const [missionsCollection, setMissionsCollection] = useLocalStorage<MissionsCollection>(
    'missionsCollection', 
    initializeMissionsCollection()
  );
  
  // Get current active mission
  const activeMission = missionsCollection.missions.find(m => m.id === missionsCollection.activeMissionId) || missionsCollection.missions[0];
  
  // Set first mission as active if none selected
  useEffect(() => {
    if (!missionsCollection.activeMissionId && missionsCollection.missions.length > 0) {
      setMissionsCollection(prev => ({
        ...prev,
        activeMissionId: prev.missions[0].id
      }));
    }
  }, [missionsCollection.activeMissionId, missionsCollection.missions.length, setMissionsCollection]);
  
  // Mission management functions
  const updateActiveMission = (updates: Partial<MissionData>) => {
    setMissionsCollection(prev => ({
      ...prev,
      missions: prev.missions.map(mission =>
        mission.id === prev.activeMissionId 
          ? { ...mission, ...updates, timestamp: new Date().toISOString() }
          : mission
      )
    }));
  };
  
  const createNewMissionAction = () => {
    const newMission = createNewMission();
    setMissionsCollection(prev => ({
      missions: [...prev.missions, newMission],
      activeMissionId: newMission.id
    }));
    
    toast({
      title: "تم إنشاء مأمورية جديدة",
      description: "يمكنك الآن إدخال بيانات المأمورية الجديدة",
    });
  };
  
  const selectMission = (missionId: string) => {
    setMissionsCollection(prev => ({
      ...prev,
      activeMissionId: missionId
    }));
  };
  
  const deleteMission = (missionId: string) => {
    if (missionsCollection.missions.length <= 1) {
      toast({
        title: "لا يمكن الحذف",
        description: "يجب أن تبقى مأمورية واحدة على الأقل",
        variant: "destructive"
      });
      return;
    }
    
    if (window.confirm('هل أنت متأكد من حذف هذه المأمورية؟')) {
      setMissionsCollection(prev => {
        const filteredMissions = prev.missions.filter(m => m.id !== missionId);
        const newActiveMissionId = prev.activeMissionId === missionId 
          ? filteredMissions[0]?.id || null
          : prev.activeMissionId;
        
        return {
          missions: filteredMissions,
          activeMissionId: newActiveMissionId
        };
      });
      
      toast({
        title: "تم حذف المأمورية",
        description: "تم حذف المأمورية بنجاح",
        variant: "destructive"
      });
    }
  };
  
  const updateMissionTitle = (missionId: string, title: string) => {
    setMissionsCollection(prev => ({
      ...prev,
      missions: prev.missions.map(mission =>
        mission.id === missionId ? { ...mission, title } : mission
      )
    }));
  };
  
  // Initialize counter based on existing expenses to avoid duplicate IDs
  const getInitialCounter = () => {
    if (!activeMission || activeMission.expenses.length === 0) return 1;
    const maxId = Math.max(
      ...activeMission.expenses
        .map(expense => parseInt(expense.id.replace('expense-', '')))
        .filter(num => !isNaN(num))
    );
    return maxId + 1;
  };
  
  const [expenseCounter, setExpenseCounter] = useState(getInitialCounter());

  const addExpenseItem = (type: string) => {
    const newExpense: ExpenseItem = {
      id: `expense-${expenseCounter}`,
      type,
      amount: 0,
      banks: []
    };
    
    updateActiveMission({
      expenses: [...(activeMission?.expenses || []), newExpense]
    });
    
    setExpenseCounter(prev => prev + 1);
  };

  const updateExpenseItem = (id: string, updates: Partial<ExpenseItem>) => {
    const updatedExpenses = (activeMission?.expenses || []).map(expense =>
      expense.id === id ? { ...expense, ...updates } : expense
    );
    updateActiveMission({ expenses: updatedExpenses });
  };

  const removeExpenseItem = (id: string) => {
    const updatedExpenses = (activeMission?.expenses || []).filter(expense => expense.id !== id);
    updateActiveMission({ expenses: updatedExpenses });
  };

  const saveAllMissions = () => {
    updateActiveMission({ timestamp: new Date().toISOString() });
    
    toast({
      title: "تم حفظ البيانات بنجاح",
      description: "تم حفظ جميع بيانات المأموريات في التخزين المحلي",
    });
  };

  const clearAllData = () => {
    if (window.confirm('هل أنت متأكد من حذف جميع المأموريات؟')) {
      const newMission = createNewMission();
      setMissionsCollection({
        missions: [newMission],
        activeMissionId: newMission.id
      });
      setExpenseCounter(1);
      
      toast({
        title: "تم مسح البيانات",
        description: "تم حذف جميع المأموريات وإنشاء مأمورية جديدة",
        variant: "destructive"
      });
    }
  };

  const calculateTotals = () => {
    if (!activeMission) {
      return {
        totalAmount: 0,
        itemCount: 0,
        bankCount: 0,
        bankTotals: {}
      };
    }
    
    const totalAmount = activeMission.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const bankTotals: Record<string, number> = {};
    
    activeMission.expenses.forEach(expense => {
      if (expense.banks && expense.banks.length > 0 && expense.amount > 0) {
        // Divide the expense amount equally among selected banks within this expense item
        const amountPerBank = expense.amount / expense.banks.length;
        expense.banks.forEach(bankName => {
          bankTotals[bankName] = (bankTotals[bankName] || 0) + amountPerBank;
        });
      }
    });

    const uniqueBanks = new Set<string>();
    activeMission.expenses.forEach(expense => {
      if (expense.banks) {
        expense.banks.forEach(bank => uniqueBanks.add(bank));
      }
    });

    return {
      totalAmount,
      itemCount: activeMission.expenses.length,
      bankCount: uniqueBanks.size,
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
                onClick={createNewMissionAction}
                variant="outline"
                data-testid="button-new-mission"
              >
                <Plus className="w-4 h-4 ml-2" />
                مأمورية جديدة
              </Button>
              <Button 
                variant="destructive" 
                onClick={clearAllData}
                data-testid="button-clear-all"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                مسح الكل
              </Button>
              <Button 
                onClick={saveAllMissions}
                data-testid="button-save"
              >
                <Save className="w-4 h-4 ml-2" />
                حفظ البيانات
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Missions Tabs */}
      {missionsCollection.missions.length > 1 && (
        <div className="bg-muted/30 border-b border-border">
          <div className="container mx-auto px-4 py-4 max-w-6xl">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap ml-4">المأموريات:</span>
              {missionsCollection.missions.map((mission) => (
                <div key={mission.id} className="flex items-center gap-1">
                  <Button
                    variant={mission.id === missionsCollection.activeMissionId ? "default" : "outline"}
                    size="sm"
                    onClick={() => selectMission(mission.id)}
                    className="whitespace-nowrap"
                    data-testid={`tab-mission-${mission.id}`}
                  >
                    <Edit2 className="w-3 h-3 ml-1" />
                    {mission.title}
                  </Button>
                  {missionsCollection.missions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMission(mission.id)}
                      className="text-destructive hover:text-destructive w-6 h-6 p-0"
                      data-testid={`delete-mission-${mission.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Employee Information */}
        <Card className="p-6 mb-8">
          <EmployeeLookup 
            employee={activeMission?.employee || null}
            onEmployeeChange={(employee: { code: number; name: string; branch: string } | null) => updateActiveMission({ employee })}
          />
        </Card>

        {/* Mission Details */}
        <Card className="p-6 mb-8">
          <MissionDetails 
            missionDate={activeMission?.missionDate || ''}
            statement={activeMission?.statement || ''}
            onMissionDateChange={(missionDate: string) => updateActiveMission({ missionDate })}
            onStatementChange={(statement: string) => updateActiveMission({ statement })}
          />
        </Card>

        {/* Expense Management */}
        <Card className="p-6 mb-8">
          <ExpenseManagement 
            expenses={activeMission?.expenses || []}
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

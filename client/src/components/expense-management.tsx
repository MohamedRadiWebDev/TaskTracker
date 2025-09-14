import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Car, 
  Receipt, 
  DollarSign, 
  Paperclip, 
  Coffee, 
  Plus, 
  Trash2,
  Banknote
} from "lucide-react";
import { useBanks } from "@/hooks/use-missions";
import type { ExpenseItem } from "@shared/schema";
import type { Bank } from "@shared/schema";

// Define expense types locally since we're removing the types file
const expenseTypes = {
  'transportation': 'مواصلات',
  'fees': 'رسوم',
  'tips': 'إكراميات',  
  'office-supplies': 'أدوات مكتبية',
  'hospitality': 'ضيافة'
};

interface ExpenseManagementProps {
  expenses: ExpenseItem[];
  totals: {
    totalAmount: number;
    itemCount: number;
    bankCount: number;
    bankTotals: Record<string, number>;
  };
  onAddExpense: (type: string) => void;
  onUpdateExpense: (id: string, updates: Partial<ExpenseItem>) => void;
  onRemoveExpense: (id: string) => void;
}

const expenseTypeIcons = {
  'transportation': Car,
  'fees': Receipt,
  'tips': DollarSign,
  'office-supplies': Paperclip,
  'hospitality': Coffee
};

export default function ExpenseManagement({
  expenses,
  totals,
  onAddExpense,
  onUpdateExpense,
  onRemoveExpense
}: ExpenseManagementProps) {
  const { banks } = useBanks();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <Banknote className="w-6 h-6 text-primary ml-3" />
          إدارة المصروفات
        </h2>
        <Button 
          onClick={() => onAddExpense('transportation')}
          className="flex items-center"
          data-testid="button-add-expense"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة بند
        </Button>
      </div>

      {/* Expense Type Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {Object.entries(expenseTypes).map(([type, label]) => {
          const IconComponent = expenseTypeIcons[type as keyof typeof expenseTypeIcons];
          return (
            <Button
              key={type}
              variant="outline"
              className="p-4 h-auto border-2 hover:border-primary hover:bg-primary/5 transition-all"
              onClick={() => onAddExpense(type)}
              data-testid={`button-add-${type}`}
            >
              <div className="text-center">
                <IconComponent className="w-6 h-6 text-primary mb-2 mx-auto" />
                <div className="text-sm font-medium">{label}</div>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Expense Items */}
      <div className="space-y-4 mb-8">
        {expenses.map((expense, index) => (
          <Card 
            key={expense.id} 
            className="expense-item p-4 bg-muted border fade-in"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <h4 className="font-semibold">{expenseTypes[expense.type as keyof typeof expenseTypes]}</h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveExpense(expense.id)}
                className="text-destructive hover:bg-destructive/10"
                data-testid={`button-remove-${expense.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="block text-sm font-medium text-foreground mb-2">
                  نوع المصروف
                </Label>
                <Select 
                  value={expense.type} 
                  onValueChange={(value) => onUpdateExpense(expense.id, { type: value })}
                >
                  <SelectTrigger data-testid={`select-type-${expense.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(expenseTypes).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-foreground mb-2">
                  المبلغ (جنيه)
                </Label>
                <Input
                  type="number"
                  value={expense.amount || ''}
                  onChange={(e) => onUpdateExpense(expense.id, { amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  data-testid={`input-amount-${expense.id}`}
                />
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-foreground mb-2">
                  البنوك المحددة
                </Label>
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                  {banks.map((bank) => {
                    const isChecked = expense.banks ? expense.banks.includes(bank.name) : false;
                    return (
                      <div key={bank.id} className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Checkbox
                          id={`bank-${expense.id}-${bank.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const currentBanks = expense.banks || [];
                            const updatedBanks = checked
                              ? [...currentBanks, bank.name]
                              : currentBanks.filter(b => b !== bank.name);
                            onUpdateExpense(expense.id, { banks: updatedBanks });
                          }}
                          data-testid={`checkbox-bank-${expense.id}-${bank.id}`}
                        />
                        <Label 
                          htmlFor={`bank-${expense.id}-${bank.id}`} 
                          className="text-sm font-normal cursor-pointer"
                        >
                          {bank.name}
                        </Label>
                      </div>
                    );
                  })}
                  {banks.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      لا توجد بنوك متاحة
                    </div>
                  )}
                </div>
                {expense.banks && expense.banks.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {expense.banks.length} بنك محدد: {expense.banks.join('، ')}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Totals Display */}
      <div className="p-6 bg-muted rounded-lg">
        <h3 className="text-lg font-semibold mb-4">ملخص المبالغ</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">إجمالي المصروفات</div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-total-amount">
              {totals.totalAmount.toFixed(2)} جنيه
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">عدد البنود</div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-item-count">
              {totals.itemCount}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">البنوك المحددة</div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-bank-count">
              {totals.bankCount}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

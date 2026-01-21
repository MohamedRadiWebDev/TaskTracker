import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { 
  Car, 
  Receipt, 
  DollarSign, 
  Paperclip, 
  Coffee, 
  Plus, 
  Trash2,
  Banknote,
  FileText
} from "lucide-react";
import { useBanks } from "../hooks/use-missions";
import type { ExpenseItem, Bank } from "../types/schema";

// Define expense types locally
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

// Function to safely evaluate mathematical expressions
function evaluateFormula(formula: string): number | null {
  try {
    // Remove leading = or + signs
    let expression = formula.replace(/^[=+]/, '').trim();
    
    // Only allow safe mathematical operations and numbers
    const safeExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
    
    // Prevent empty or invalid expressions
    if (!safeExpression || safeExpression.length === 0) {
      return null;
    }
    
    // Use Function constructor for safe evaluation (better than eval)
    const result = new Function('return (' + safeExpression + ')')();
    
    // Check if result is a valid number
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return Math.round(result * 100) / 100; // Round to 2 decimal places
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export default function ExpenseManagement({
  expenses,
  totals,
  onAddExpense,
  onUpdateExpense,
  onRemoveExpense
}: ExpenseManagementProps) {
  const [, setLocation] = useLocation();
  const { banks } = useBanks();

  // Keep banks selected in the first expense at the top of the list
  const primarySelectedBanks = expenses[0]?.banks || [];
  const sortedBanks = useMemo(() => {
    const selectedSet = new Set(primarySelectedBanks);
    return [...banks].sort((a, b) => {
      const aSelected = selectedSet.has(a.name);
      const bSelected = selectedSet.has(b.name);

      if (aSelected === bSelected) return 0;
      return aSelected ? -1 : 1;
    });
  }, [banks, primarySelectedBanks]);

  // Preserve scroll position for each bank list when selections reorder the list
  const bankListRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingScrollPositions = useRef<Record<string, number>>({});

  // Quick filters per expense to make bank selection easier
  const [bankSearchTerms, setBankSearchTerms] = useState<Record<string, string>>({});

  useLayoutEffect(() => {
    Object.entries(pendingScrollPositions.current).forEach(([expenseId, scrollTop]) => {
      const container = bankListRefs.current[expenseId];
      if (container) {
        container.scrollTop = scrollTop;
      }
    });
    pendingScrollPositions.current = {};
  }, [expenses, sortedBanks]);

  // Track display values for formula inputs
  const [displayValues, setDisplayValues] = useState<Record<string, string>>({});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <Banknote className="w-6 h-6 text-primary ml-3" />
          إدارة المصروفات
        </h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setLocation("/receipt-distribution")}
            variant="outline"
            className="flex items-center"
          >
            <Receipt className="w-4 h-4 ml-2" />
            توزيع الإيصالات
          </Button>
          <Button
            onClick={() => onAddExpense('transportation')}
            className="flex items-center"
            data-testid="button-add-expense"
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة بند
          </Button>
        </div>
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
        {expenses.map((expense, index) => {
          const searchTerm = (bankSearchTerms[expense.id] || '').toLowerCase();
          const filteredBanks = sortedBanks.filter(bank => bank.name.toLowerCase().includes(searchTerm));

          return (
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
            
            <div className="space-y-4 mb-4">
              {/* القسم الأول: نوع المصروف، المبلغ، البنوك المحددة والبحث */}
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      type="text"
                      value={displayValues[expense.id] !== undefined ? displayValues[expense.id] : (expense.amount || '')}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        
                        // Update display value immediately
                        setDisplayValues(prev => ({
                          ...prev,
                          [expense.id]: inputValue
                        }));
                        
                        // Check if input is a formula (starts with = or +)
                        if (inputValue.startsWith('=') || inputValue.startsWith('+')) {
                          const calculatedValue = evaluateFormula(inputValue);
                          if (calculatedValue !== null) {
                            // Update the actual amount with calculated value
                            onUpdateExpense(expense.id, { 
                              amount: calculatedValue,
                              bankAllocations: undefined
                            });
                          }
                        } else {
                          // Regular number input
                          const numericValue = parseFloat(inputValue) || 0;
                          onUpdateExpense(expense.id, { 
                            amount: numericValue,
                            bankAllocations: undefined
                          });
                        }
                      }}
                      onBlur={(e) => {
                        const inputValue = e.target.value;
                        
                        // If it was a formula and calculated successfully, show the result
                        if (inputValue.startsWith('=') || inputValue.startsWith('+')) {
                          const calculatedValue = evaluateFormula(inputValue);
                          if (calculatedValue !== null) {
                            setDisplayValues(prev => ({
                              ...prev,
                              [expense.id]: calculatedValue.toString()
                            }));
                          }
                        }
                      }}
                      onFocus={(e) => {
                        // Clear display value to show stored amount when focused
                        setDisplayValues(prev => {
                          const newValues = { ...prev };
                          delete newValues[expense.id];
                          return newValues;
                        });
                      }}
                      placeholder="0.00 أو =2+2+2"
                      data-testid={`input-amount-${expense.id}`}
                    />
                  </div>
                </div>

                <div>
                  <Label className="block text-sm font-medium text-foreground mb-2">
                    البنوك المحددة
                  </Label>
                  <Input
                    type="text"
                    placeholder="ابحث عن بنك أو شركة"
                    value={bankSearchTerms[expense.id] || ''}
                    onChange={(e) => {
                      setBankSearchTerms(prev => ({
                        ...prev,
                        [expense.id]: e.target.value
                      }));
                    }}
                  />
                </div>
              </div>

              {/* القسم الثاني: بيان المصروف وقائمة البنوك */}
              <div className="grid grid-cols-1 gap-4">
                {/* حقل البيان */}
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    بيان المصروف (اختياري)
                  </Label>
                  <Textarea
                    value={expense.description || ''}
                    onChange={(e) => onUpdateExpense(expense.id, { description: e.target.value })}
                    placeholder="أدخل وصف أو تفاصيل عن المصروف..."
                    className="resize-none"
                    rows={2}
                    data-testid={`input-description-${expense.id}`}
                  />
                </div>

                {/* قائمة البنوك */}
                <div>
                  <div className="flex gap-2 mb-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const container = bankListRefs.current[expense.id];
                        if (container) {
                          pendingScrollPositions.current[expense.id] = container.scrollTop;
                        }

                        const filteredBanks = sortedBanks
                          .filter(bank => bank.name.toLowerCase().includes((bankSearchTerms[expense.id] || '').toLowerCase()));
                        const currentBanks = new Set(expense.banks || []);
                        filteredBanks.forEach(bank => currentBanks.add(bank.name));
                        onUpdateExpense(expense.id, {
                          banks: Array.from(currentBanks),
                          bankAllocations: undefined
                        });
                      }}
                    >
                      تحديد الكل
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const container = bankListRefs.current[expense.id];
                        if (container) {
                          pendingScrollPositions.current[expense.id] = container.scrollTop;
                        }

                        const filteredNames = new Set(
                          sortedBanks
                            .filter(bank => bank.name.toLowerCase().includes((bankSearchTerms[expense.id] || '').toLowerCase()))
                            .map(bank => bank.name)
                        );

                        const remainingBanks = (expense.banks || []).filter(name => !filteredNames.has(name));
                        onUpdateExpense(expense.id, {
                          banks: remainingBanks,
                          bankAllocations: undefined
                        });
                      }}
                    >
                      مسح التحديد
                    </Button>
                  </div>
                  <div
                    ref={(el) => { bankListRefs.current[expense.id] = el; }}
                    className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-3"
                  >
                    {filteredBanks
                      .map((bank) => {
                      const isChecked = expense.banks ? expense.banks.includes(bank.name) : false;
                      return (
                        <div key={bank.id} className="flex items-center space-x-2 rtl:space-x-reverse">
                          <Checkbox
                            id={`bank-${expense.id}-${bank.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const container = bankListRefs.current[expense.id];
                              if (container) {
                                pendingScrollPositions.current[expense.id] = container.scrollTop;
                              }

                              const currentBanks = expense.banks || [];
                              const updatedBanks = checked
                                ? [...currentBanks, bank.name]
                                : currentBanks.filter(b => b !== bank.name);
                              onUpdateExpense(expense.id, {
                                banks: updatedBanks,
                                bankAllocations: undefined
                              });
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
                    {filteredBanks.length === 0 && (
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
            </div>
          </Card>
          );
        })}
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

import { Card } from "@/components/ui/card";
import { PieChart, Info } from "lucide-react";

interface BankDistributionProps {
  bankTotals: Record<string, number>;
  totalAmount: number;
}

export default function BankDistribution({ bankTotals, totalAmount }: BankDistributionProps) {
  const banks = Object.entries(bankTotals);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <PieChart className="w-6 h-6 text-primary ml-3" />
        توزيع المبالغ على البنوك
      </h2>
      
      <div className="space-y-4">
        {banks.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p>أضف بنود المصروفات لرؤية توزيع المبالغ على البنوك</p>
          </div>
        ) : (
          banks.map(([bank, amount]) => {
            const percentage = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0';
            return (
              <Card 
                key={bank} 
                className="bank-badge p-4 bg-accent border"
                data-testid={`bank-distribution-${bank}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-foreground">{bank}</h4>
                    <p className="text-sm text-muted-foreground">{percentage}% من الإجمالي</p>
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-primary">
                      {amount.toFixed(2)} جنيه
                    </div>
                  </div>
                </div>
                <div className="mt-3 bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";
import type { Bank } from "@shared/schema";

interface MissionDetailsProps {
  missionDate: string;
  bank: string;
  statement: string;
  onMissionDateChange: (date: string) => void;
  onBankChange: (bank: string) => void;
  onStatementChange: (statement: string) => void;
}

export default function MissionDetails({
  missionDate,
  bank,
  statement,
  onMissionDateChange,
  onBankChange,
  onStatementChange
}: MissionDetailsProps) {
  const { data: banks = [] } = useQuery<Bank[]>({
    queryKey: ['/api/banks'],
  });

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <Calendar className="w-6 h-6 text-primary ml-3" />
        تفاصيل المأمورية
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="missionDate" className="block text-sm font-medium text-foreground mb-2">
            تاريخ المأمورية
          </Label>
          <Input
            id="missionDate"
            type="date"
            value={missionDate}
            onChange={(e) => onMissionDateChange(e.target.value)}
            className="w-full"
            data-testid="input-mission-date"
          />
        </div>
        
        <div>
          <Label htmlFor="bankSelect" className="block text-sm font-medium text-foreground mb-2">
            البنك/الشركة
          </Label>
          <Select value={bank} onValueChange={onBankChange}>
            <SelectTrigger className="w-full" data-testid="select-bank">
              <SelectValue placeholder="اختر البنك أو الشركة" />
            </SelectTrigger>
            <SelectContent>
              {banks.map((bankItem) => (
                <SelectItem key={bankItem.id} value={bankItem.name}>
                  {bankItem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="mt-6">
        <Label htmlFor="missionStatement" className="block text-sm font-medium text-foreground mb-2">
          البيان
        </Label>
        <Textarea
          id="missionStatement"
          value={statement}
          onChange={(e) => onStatementChange(e.target.value)}
          rows={4}
          placeholder="أدخل بيان المأمورية..."
          className="w-full resize-none"
          data-testid="input-mission-statement"
        />
      </div>
    </div>
  );
}

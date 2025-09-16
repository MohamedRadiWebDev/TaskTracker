import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "lucide-react";

interface MissionDetailsProps {
  missionDate: string;
  statement: string;
  onMissionDateChange: (date: string) => void;
  onStatementChange: (statement: string) => void;
}

export default function MissionDetails({
  missionDate,
  statement,
  onMissionDateChange,
  onStatementChange
}: MissionDetailsProps) {

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <Calendar className="w-6 h-6 text-primary ml-3" />
        تفاصيل المأمورية
      </h2>
      
      <div className="mb-6">
        <Label htmlFor="missionDate" className="block text-sm font-medium text-foreground mb-2">
          تاريخ المأمورية
        </Label>
        <Input
          id="missionDate"
          type="date"
          value={missionDate}
          onChange={(e) => onMissionDateChange(e.target.value)}
          className="w-full max-w-md"
          tabIndex={2}
          data-testid="input-mission-date"
        />
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
          tabIndex={3}
          data-testid="input-mission-statement"
        />
      </div>
    </div>
  );
}

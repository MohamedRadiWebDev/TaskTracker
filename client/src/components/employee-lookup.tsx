import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCircle, AlertCircle, Loader2 } from "lucide-react";
import type { Employee } from "@shared/schema";

interface EmployeeLookupProps {
  employee: Pick<Employee, 'code' | 'name' | 'branch'> | null;
  onEmployeeChange: (employee: Pick<Employee, 'code' | 'name' | 'branch'> | null) => void;
}

export default function EmployeeLookup({ employee, onEmployeeChange }: EmployeeLookupProps) {
  const [employeeCode, setEmployeeCode] = useState(employee?.code?.toString() || '');
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data: fetchedEmployee, isLoading, error } = useQuery({
    queryKey: ['/api/employees', employeeCode],
    enabled: shouldFetch && !!employeeCode && !isNaN(parseInt(employeeCode)),
    retry: false,
  });

  const handleCodeChange = (value: string) => {
    setEmployeeCode(value);
    
    if (!value) {
      onEmployeeChange(null);
      setShouldFetch(false);
      return;
    }

    const code = parseInt(value);
    if (!isNaN(code)) {
      setShouldFetch(true);
    }
  };

  // Update parent when employee is fetched - moved to handleCodeChange to avoid infinite loops
  useEffect(() => {
    if (fetchedEmployee && !error) {
      const emp = fetchedEmployee as Employee;
      const employeeData = {
        code: emp.code,
        name: emp.name,
        branch: emp.branch
      };
      
      if (!employee || employee.code !== employeeData.code) {
        onEmployeeChange(employeeData);
      }
    } else if (error && employee) {
      onEmployeeChange(null);
    }
  }, [fetchedEmployee, error]); // Removed onEmployeeChange and employee from deps to prevent infinite loop

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <UserCircle className="w-6 h-6 text-primary ml-3" />
        معلومات الموظف
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="employeeCode" className="block text-sm font-medium text-foreground mb-2">
            كود الموظف
          </Label>
          <div className="relative">
            <Input
              id="employeeCode"
              type="number"
              value={employeeCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="أدخل كود الموظف"
              className="w-full"
              data-testid="input-employee-code"
            />
            {isLoading && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            )}
          </div>
        </div>
        
        <div>
          <Label htmlFor="employeeName" className="block text-sm font-medium text-foreground mb-2">
            اسم الموظف
          </Label>
          <Input
            id="employeeName"
            type="text"
            value={employee?.name || ''}
            placeholder="سيتم استرجاع الاسم تلقائياً"
            readOnly
            className="bg-muted text-muted-foreground"
            data-testid="text-employee-name"
          />
        </div>
        
        <div>
          <Label htmlFor="employeeBranch" className="block text-sm font-medium text-foreground mb-2">
            الفرع
          </Label>
          <Input
            id="employeeBranch"
            type="text"
            value={employee?.branch || ''}
            placeholder="سيتم استرجاع الفرع تلقائياً"
            readOnly
            className="bg-muted text-muted-foreground"
            data-testid="text-employee-branch"
          />
        </div>
      </div>

      {error && employeeCode && (
        <Alert className="mt-4 border-destructive/20 bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            لم يتم العثور على موظف بهذا الكود
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

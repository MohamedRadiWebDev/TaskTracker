import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  getMissions, 
  createMission, 
  updateMission, 
  deleteMission,
  getEmployees,
  getBanks,
  getEmployeeByCode
} from '@/lib/localStorage';
import type { Mission, InsertMission, Employee, Bank } from '@shared/schema';

export function useMissions() {
  const { toast } = useToast();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load missions from localStorage
  const loadMissions = () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedMissions = getMissions();
      setMissions(loadedMissions);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading missions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadMissions();
  }, []);

  // Create mission function
  const createNewMission = async (missionData: InsertMission) => {
    try {
      const newMission = createMission(missionData);
      setMissions(prev => [...prev, newMission]);
      
      toast({
        title: "تم إنشاء مأمورية جديدة",
        description: "تم حفظ المأمورية في النظام بنجاح",
      });
      
      return newMission;
    } catch (err) {
      toast({
        title: "خطأ في إنشاء المأمورية",
        description: "حدث خطأ أثناء إنشاء المأمورية الجديدة",
        variant: "destructive"
      });
      throw err;
    }
  };

  // Update mission function
  const updateMissionById = async (id: string, updates: Partial<InsertMission>) => {
    try {
      const updatedMission = updateMission(id, updates);
      if (!updatedMission) {
        throw new Error('Mission not found');
      }
      
      setMissions(prev => prev.map(m => m.id === id ? updatedMission : m));
      return updatedMission;
    } catch (err) {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive"
      });
      throw err;
    }
  };

  // Delete mission function
  const deleteMissionById = async (id: string) => {
    if (missions.length <= 1) {
      toast({
        title: "لا يمكن الحذف",
        description: "يجب أن تبقى مأمورية واحدة على الأقل",
        variant: "destructive"
      });
      return false;
    }

    try {
      const success = deleteMission(id);
      if (success) {
        setMissions(prev => prev.filter(m => m.id !== id));
        toast({
          title: "تم حذف المأمورية",
          description: "تم حذف المأمورية بنجاح",
          variant: "destructive"
        });
        return true;
      }
      return false;
    } catch (err) {
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف المأمورية",
        variant: "destructive"
      });
      throw err;
    }
  };

  // Refresh missions (for import functionality)
  const refreshMissions = () => {
    loadMissions();
  };

  return {
    missions,
    isLoading,
    error,
    createNewMission,
    updateMissionById,
    deleteMissionById,
    refreshMissions
  };
}

// Hook for employees
export function useEmployees() {
  const [employees] = useState<Employee[]>(() => getEmployees());
  const [isLoading] = useState(false);
  
  const findEmployeeByCode = (code: number): Employee | undefined => {
    return getEmployeeByCode(code);
  };

  return {
    employees,
    isLoading,
    findEmployeeByCode
  };
}

// Hook for banks
export function useBanks() {
  const [banks] = useState<Bank[]>(() => getBanks());
  const [isLoading] = useState(false);

  return {
    banks,
    isLoading
  };
}
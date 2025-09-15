import type { Mission, InsertMission, ExpenseItem, Employee, Bank } from '../types/schema';
import employeesData from '../data/employees.json';
import banksData from '../data/banks.json';

// Browser-compatible UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Storage key
const MISSIONS_KEY = 'missions';

// Utility functions for localStorage operations
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
  }
}

// Generate stable IDs based on content
function generateStableId(prefix: string, value: string | number): string {
  return `${prefix}-${value}`;
}

// Static data functions - convert to Mission format with stable IDs
export function getEmployees(): Employee[] {
  return employeesData.map(emp => ({
    id: generateStableId('emp', emp.code),
    code: emp.code,
    name: emp.name,
    branch: emp.branch
  }));
}

export function getEmployeeByCode(code: number): Employee | undefined {
  const emp = employeesData.find(e => e.code === code);
  if (!emp) return undefined;
  
  return {
    id: generateStableId('emp', emp.code),
    code: emp.code,
    name: emp.name,
    branch: emp.branch
  };
}

export function getBanks(): Bank[] {
  return banksData.map((bank, index) => ({
    id: generateStableId('bank', index),
    name: bank.name
  }));
}

// Missions localStorage operations
export function getMissions(): Mission[] {
  try {
    const missions = getFromStorage<any[]>(MISSIONS_KEY, []);
    // Ensure createdAt is properly converted back to Date from string
    return missions.map(mission => ({
      ...mission,
      createdAt: mission.createdAt ? new Date(mission.createdAt) : new Date(),
      expenses: Array.isArray(mission.expenses) ? mission.expenses : []
    }));
  } catch (error) {
    console.error('Error loading missions from localStorage:', error);
    return [];
  }
}

export function createMission(missionData: InsertMission): Mission {
  const missions = getMissions();
  const newMission: Mission = {
    id: generateUUID(),
    employeeCode: missionData.employeeCode,
    employeeName: missionData.employeeName,
    employeeBranch: missionData.employeeBranch,
    missionDate: missionData.missionDate,
    bank: missionData.bank || null,
    statement: missionData.statement || null,
    expenses: missionData.expenses || [],
    totalAmount: missionData.totalAmount || '0',
    createdAt: new Date()
  };
  
  missions.push(newMission);
  setToStorage(MISSIONS_KEY, missions);
  
  return newMission;
}

export function updateMission(id: string, updates: Partial<InsertMission>): Mission | undefined {
  const missions = getMissions();
  const missionIndex = missions.findIndex(mission => mission.id === id);
  
  if (missionIndex === -1) return undefined;
  
  const updatedMission: Mission = {
    ...missions[missionIndex],
    employeeCode: updates.employeeCode ?? missions[missionIndex].employeeCode,
    employeeName: updates.employeeName ?? missions[missionIndex].employeeName,
    employeeBranch: updates.employeeBranch ?? missions[missionIndex].employeeBranch,
    missionDate: updates.missionDate ?? missions[missionIndex].missionDate,
    bank: updates.bank !== undefined ? updates.bank : missions[missionIndex].bank,
    statement: updates.statement !== undefined ? updates.statement : missions[missionIndex].statement,
    expenses: updates.expenses ?? missions[missionIndex].expenses,
    totalAmount: updates.totalAmount ?? missions[missionIndex].totalAmount
  };
  
  missions[missionIndex] = updatedMission;
  setToStorage(MISSIONS_KEY, missions);
  
  return updatedMission;
}

export function deleteMission(id: string): boolean {
  const missions = getMissions();
  const filteredMissions = missions.filter(mission => mission.id !== id);
  
  if (filteredMissions.length === missions.length) return false;
  
  setToStorage(MISSIONS_KEY, filteredMissions);
  return true;
}

// Clear all missions (for import functionality)
export function clearMissions(): void {
  setToStorage(MISSIONS_KEY, []);
}

// Set missions (for import functionality)
export function setMissions(missions: Mission[]): void {
  // Ensure proper serialization by converting dates to strings before storage
  const serializedMissions = missions.map(mission => ({
    ...mission,
    createdAt: mission.createdAt instanceof Date ? mission.createdAt.toISOString() : mission.createdAt
  }));
  setToStorage(MISSIONS_KEY, serializedMissions);
}
import { ExcelStorage } from "./excel-storage";

export { type IStorage } from "./excel-storage";

// Export Excel storage instance as the main storage
export const storage = new ExcelStorage();
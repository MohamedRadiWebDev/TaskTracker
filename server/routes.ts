import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMissionSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all employees
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  // Get employee by code
  app.get("/api/employees/:code", async (req, res) => {
    try {
      const code = parseInt(req.params.code);
      if (isNaN(code)) {
        return res.status(400).json({ error: "Invalid employee code" });
      }

      const employee = await storage.getEmployeeByCode(code);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  // Get all banks
  app.get("/api/banks", async (req, res) => {
    try {
      const banks = await storage.getBanks();
      res.json(banks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch banks" });
    }
  });

  // Get all missions
  app.get("/api/missions", async (req, res) => {
    try {
      const missions = await storage.getMissions();
      res.json(missions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch missions" });
    }
  });

  // Create a new mission
  app.post("/api/missions", async (req, res) => {
    try {
      const validatedData = insertMissionSchema.parse(req.body);
      const mission = await storage.createMission(validatedData);
      res.status(201).json(mission);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create mission" });
      }
    }
  });

  // Update a mission
  app.put("/api/missions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertMissionSchema.partial().parse(req.body);
      const mission = await storage.updateMission(id, validatedData);
      
      if (!mission) {
        return res.status(404).json({ error: "Mission not found" });
      }

      res.json(mission);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update mission" });
      }
    }
  });

  // Delete a mission
  app.delete("/api/missions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMission(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Mission not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete mission" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

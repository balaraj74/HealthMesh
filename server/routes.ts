import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerRoutes as registerAzureRoutes } from "./azure-routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register Azure-powered API routes
  // These handle patients, cases, labs, chat, dashboard, and audit logs
  await registerAzureRoutes(httpServer, app);

  // Legacy storage reference (for migration)
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  return httpServer;
}

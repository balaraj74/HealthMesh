import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { configureSecurity, sanitizeInput } from "./security";
import { validateEnvironment } from "./env-validation";

// ============================================================================
// ENVIRONMENT VALIDATION - Check configuration before starting
// ============================================================================
const envValidation = validateEnvironment();
if (!envValidation.valid) {
  console.error("\n❌ CRITICAL: Environment validation failed!");
  console.error("Cannot start server with invalid configuration.");
  console.error("Please fix the errors listed above and restart.\n");
  process.exit(1);
}

// ============================================================================
// ENVIRONMENT VERIFICATION - Log Entra ID configuration at startup
// ============================================================================
console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║ 🔐 Entra ID Configuration Check                            ║");
console.log("╠════════════════════════════════════════════════════════════╣");
console.log(`║ BACKEND TENANT: ${process.env.AZURE_AD_TENANT_ID || "❌ NOT SET"}`);
console.log(`║ BACKEND CLIENT: ${process.env.AZURE_AD_CLIENT_ID || "❌ NOT SET"}`);
console.log("╚════════════════════════════════════════════════════════════╝");

if (!process.env.AZURE_AD_TENANT_ID || !process.env.AZURE_AD_CLIENT_ID) {
  console.error("❌ CRITICAL: Azure AD configuration missing in .env!");
  console.error("   Please set AZURE_AD_TENANT_ID and AZURE_AD_CLIENT_ID");
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ============================================================================
// SECURITY MIDDLEWARE - Apply first for maximum protection
// ============================================================================
configureSecurity(app);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Input sanitization to prevent XSS and injection attacks
sanitizeInput(app);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();

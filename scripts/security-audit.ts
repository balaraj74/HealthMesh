#!/usr/bin/env node

/**
 * Security Audit Script
 * Run this script to check for common security issues
 * 
 * Usage: npm run security-audit
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║ 🔒 HealthMesh Security Audit                               ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

let hasIssues = false;

// ============================================================================
// 1. NPM Audit
// ============================================================================
console.log("📦 Running npm audit...");
try {
    execSync("npm audit --audit-level=moderate", { stdio: "inherit" });
    console.log("✅ No vulnerabilities found\n");
} catch (error) {
    console.error("❌ Vulnerabilities detected - run 'npm audit fix'\n");
    hasIssues = true;
}

// ============================================================================
// 2. Check for exposed secrets
// ============================================================================
console.log("🔍 Checking for exposed secrets...");
const secretPatterns = [
    /api[_-]?key\s*=\s*["'][^"']+["']/gi,
    /password\s*=\s*["'][^"']+["']/gi,
    /secret\s*=\s*["'][^"']+["']/gi,
    /token\s*=\s*["'][^"']+["']/gi,
];

const checkFile = (filePath: string) => {
    const content = fs.readFileSync(filePath, "utf-8");
    let foundSecrets = false;

    secretPatterns.forEach(pattern => {
        if (pattern.test(content)) {
            console.warn(`⚠️  Potential secret in: ${filePath}`);
            foundSecrets = true;
        }
    });

    return foundSecrets;
};

const checkDirectory = (dir: string, exclude: string[] = []) => {
    const files = fs.readdirSync(dir);
    let foundSecrets = false;

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (exclude.some(ex => filePath.includes(ex))) return;

        if (stat.isDirectory()) {
            if (checkDirectory(filePath, exclude)) {
                foundSecrets = true;
            }
        } else if (file.match(/\.(ts|tsx|js|jsx|json)$/)) {
            if (checkFile(filePath)) {
                foundSecrets = true;
            }
        }
    });

    return foundSecrets;
};

const foundSecrets = checkDirectory(".", ["node_modules", "dist", ".git", "security-audit.ts"]);
if (foundSecrets) {
    console.warn("⚠️  Potential secrets found in code - please review\n");
    hasIssues = true;
} else {
    console.log("✅ No exposed secrets detected\n");
}

// ============================================================================
// 3. Check .env is in .gitignore
// ============================================================================
console.log("📝 Checking .gitignore...");
const gitignore = fs.readFileSync(".gitignore", "utf-8");
const requiredEntries = [".env", ".env.local", "*.db", "node_modules"];
const missing = requiredEntries.filter(entry => !gitignore.includes(entry));

if (missing.length > 0) {
    console.error(`❌ Missing in .gitignore: ${missing.join(", ")}\n`);
    hasIssues = true;
} else {
    console.log("✅ .gitignore configured correctly\n");
}

// ============================================================================
// 4. Check TypeScript compilation
// ============================================================================
console.log("🔨 Checking TypeScript compilation...");
try {
    execSync("npx tsc --noEmit", { stdio: "inherit" });
    console.log("✅ TypeScript compilation successful\n");
} catch (error) {
    console.error("❌ TypeScript errors detected\n");
    hasIssues = true;
}

// ============================================================================
// 5. Check for common security misconfigurations
// ============================================================================
console.log("⚙️  Checking security configurations...");

// Check for helmet
const indexTs = fs.readFileSync("server/index.ts", "utf-8");
if (!indexTs.includes("helmet") && !indexTs.includes("configureSecurity")) {
    console.warn("⚠️  Helmet/security middleware not detected");
    hasIssues = true;
} else {
    console.log("✅ Security middleware configured");
}

// Check for rate limiting
if (!indexTs.includes("rate") && !indexTs.includes("configureSecurity")) {
    console.warn("⚠️  Rate limiting not detected");
    hasIssues = true;
} else {
    console.log("✅ Rate limiting configured");
}

console.log("");

// ============================================================================
// Summary
// ============================================================================
console.log("╔════════════════════════════════════════════════════════════╗");
if (hasIssues) {
    console.log("║ ⚠️  Security audit completed with issues                  ║");
    console.log("║    Please review and fix the warnings above               ║");
} else {
    console.log("║ ✅ Security audit passed                                   ║");
    console.log("║    No critical issues detected                            ║");
}
console.log("╚════════════════════════════════════════════════════════════╝\n");

process.exit(hasIssues ? 1 : 0);

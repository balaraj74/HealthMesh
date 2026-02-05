# ==========================================
# Multi-Stage Docker Build for HealthMesh
# ==========================================

# Stage 1: Builder - Install dependencies and build
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (use npm install for Docker compatibility)
# npm ci can have issues with workspaces in Docker
RUN npm install --legacy-peer-deps && \
    npm cache clean --force

# Copy source code
COPY . .

# Verify source files exist before build
RUN ls -la && \
    echo "Checking for tsconfig.json..." && \
    cat tsconfig.json && \
    echo "Running build..." && \
    npm run build && \
    echo "Build complete! Checking dist folder..." && \
    ls -la dist/ && \
    echo "Dist folder contents:" && \
    find dist/ -type f | head -20

# ==========================================
# Stage 2: Production - Lightweight runtime
# ==========================================

FROM node:22-alpine

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Create app user (security best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --production --legacy-peer-deps --ignore-scripts && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist/ ./dist/

# Environment variables
ENV NODE_ENV=production \
    PORT=8080

# Expose port (Azure App Service expects 8080 by default)
EXPOSE 8080

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
    CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start application with dumb-init (proper signal handling)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# ─── Build Stage ──────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ─── Production Stage ────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built output
COPY --from=builder /app/dist ./dist

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3002/api/health/live').then(r => process.exit(r.ok ? 0 : 1))"

# Run as non-root
RUN addgroup -g 1001 -S pulse && \
    adduser -S pulse -u 1001

USER pulse

# Default: run the all-in-one server (API + Scheduler + Consumer)
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]

# Can also run individual components:
# CMD ["node", "dist/scheduler/index.js"]
# CMD ["node", "dist/consumer/index.js"]

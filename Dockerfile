# ============================================
# Dilling E-Commerce — Production Dockerfile
# Multi-stage build for minimal image size
# ============================================

# Stage 1: Install dependencies
FROM node:22-slim AS deps
WORKDIR /app

COPY package.json ./
RUN npm install

# Stage 2: Build the application
FROM node:22-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production runner
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema and generated client for db push at startup
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE ${PORT:-4000}
ENV PORT=${PORT:-4000}
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "DATABASE_URL=${DIRECT_DATABASE_URL:-$DATABASE_URL} npx prisma db push --accept-data-loss 2>&1 || true; exec node server.js"]

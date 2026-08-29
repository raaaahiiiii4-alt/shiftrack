# ShiftTrack - Multi-stage Docker build for production
FROM node:20-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Production dependencies only
FROM base AS deps
RUN npm install --only=production

# Development dependencies (for build if needed)
FROM base AS dev-deps
RUN npm install

# Copy application code
FROM base AS source
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Copy production dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY --from=source /app/server.js ./server.js
COPY --from=source /app/index.html ./index.html
COPY --from=source /app/app.js ./app.js
COPY --from=source /app/styles.css ./styles.css
COPY --from=source /app/package.json ./package.json

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => {process.exit(res.statusCode === 200 ? 0 : 1)})"

# Start with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
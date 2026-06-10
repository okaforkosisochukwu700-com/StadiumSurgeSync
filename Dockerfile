# Use a secure, lightweight Node.js runtime environment based on Alpine Linux
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first to leverage Docker's layer caching
COPY package*.json ./

# Install both dependencies and devDependencies (such as esbuild and typescript)
# which are required for the compilation step.
RUN npm ci

# Copy the entire project code base
COPY . .

# Compile full-stack production build artifacts:
# 1. Frontend bundle via Vite (emitted into /dist)
# 2. Server compilation via Esbuild (emitted to dist/server.cjs)
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy application manifests
COPY package*.json ./

# Install only production-safe dependencies to keep the image slim and responsive
RUN npm ci --only=production

# Copy compiled build resources from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the standard backend port
EXPOSE 3000

# Execute server-side cluster environment
CMD ["npm", "start"]

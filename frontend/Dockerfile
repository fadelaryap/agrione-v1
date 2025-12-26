FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables (build-time only)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the application
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from standalone build
# Next.js standalone output structure:
# - .next/standalone/ contains the server (server.js is in .next/standalone/server.js)
# - .next/static/ contains static assets (needs to be at .next/static relative to server.js)
# - public/ contains public assets (needs to be at public/ relative to server.js)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start production server
# Standalone output: server.js is in .next/standalone/server.js
# But we copied standalone to root, so server.js is now at ./server.js
CMD ["node", "server.js"]


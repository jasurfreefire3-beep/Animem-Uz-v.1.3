# Node.js 22 LTS Alpine base image
FROM node:22-alpine

WORKDIR /app

# Install ffmpeg for media and video streaming transcoding
RUN apk add --no-cache ffmpeg python3 make g++

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies required for compilation)
RUN npm install --include=dev

# Copy application source code (including prebuilt dist/ if available)
COPY . .

# Increase memory limit for compilation in container
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Build both frontend (Vite -> dist/) and backend (esbuild -> dist/server.cjs)
RUN npm run build

# Reset runtime memory limit to keep container lightweight on Northflank & free cloud hosts (avoids high RAM usage and OOM)
ENV NODE_OPTIONS="--max-old-space-size=384"

# Ensure Hugging Face Spaces user (UID 1000) owns the app, uploads, and data directory
RUN mkdir -p /app/data /app/uploads && chown -R 1000:1000 /app

USER 1000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose server ports (Northflank uses 3000, Hugging Face uses 7860)
EXPOSE 3000 7860

# Start compiled production server with lean heap management
CMD ["node", "--max-old-space-size=384", "dist/server.cjs"]

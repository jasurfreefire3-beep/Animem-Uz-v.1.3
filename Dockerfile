# Node.js 22 LTS Alpine base image
FROM node:22-alpine

WORKDIR /app

# Install ffmpeg for media and video streaming transcoding
RUN apk add --no-cache ffmpeg

# Copy package descriptors
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy application source code
COPY . .

# Build both frontend (Vite -> dist/) and backend (esbuild -> dist/server.cjs)
RUN npm run build

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose server port
EXPOSE 3000

# Start compiled production server (serves dist/ and API endpoints)
CMD ["node", "dist/server.cjs"]

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

# Ensure Hugging Face Spaces user (UID 1000) owns the app and data directory
RUN mkdir -p /app/data && chown -R 1000:1000 /app

USER 1000

# Set environment
ENV NODE_ENV=production
ENV PORT=7860

# Expose server port (Hugging Face Spaces default is 7860)
EXPOSE 7860

# Start compiled production server (serves dist/ and API endpoints)
CMD ["node", "dist/server.cjs"]

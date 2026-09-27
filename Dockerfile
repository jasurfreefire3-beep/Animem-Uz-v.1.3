# Node.js 22 LTS Alpine base image
FROM node:22-alpine

WORKDIR /app

# Install ffmpeg for media and video streaming transcoding
RUN apk add --no-cache ffmpeg

# Copy package descriptors
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose server port
EXPOSE 3000

# Start Express / Socket.io server
CMD ["npx", "tsx", "server.ts"]

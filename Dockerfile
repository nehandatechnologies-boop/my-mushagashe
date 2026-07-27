# Use Node.js 18 Alpine
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm install

# Copy backend files
COPY backend/ ./

# Copy frontend files (force cache bust)
ARG CACHEBUST=1
COPY frontend/ ./frontend

# Create necessary directories
RUN mkdir -p database uploads

# Expose port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

# Start the application
CMD ["npm", "start"]

# Use Node.js 18 Alpine
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend files
COPY . .

# Copy frontend files
COPY ../frontend ./../frontend

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

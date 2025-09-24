# Dockerfile for Backend (Local Development)
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY swagger/ ./swagger/

# Create uploads directory
RUN mkdir -p uploads/avatars

# Expose port
EXPOSE 3001

# Start the backend server
CMD ["npm", "start"]

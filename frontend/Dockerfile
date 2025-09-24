# Dockerfile for Frontend (Production)
FROM node:22-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Copy environment file
COPY env.production .env

# Accept build arguments
ARG VITE_API_URL
ARG VITE_LIFF_ID

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_LIFF_ID=${VITE_LIFF_ID}

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create nginx user and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

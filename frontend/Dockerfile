# Multi-stage Dockerfile for Frontend (Development & Production)
FROM node:20-alpine as build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Accept build arguments
ARG NODE_ENV=production
ARG VITE_API_URL
ARG VITE_LIFF_ID

# Set environment variables for build
ENV NODE_ENV=${NODE_ENV}
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_LIFF_ID=${VITE_LIFF_ID}

# Copy appropriate environment file based on NODE_ENV (if it exists)
RUN if [ -f ".env.${NODE_ENV}" ]; then \
        cp .env.${NODE_ENV} .env; \
    else \
        echo "# Environment file for ${NODE_ENV}" > .env; \
        echo "VITE_API_URL=${VITE_API_URL:-/api}" >> .env; \
        echo "VITE_LIFF_ID=${VITE_LIFF_ID:-your-liff-id-here}" >> .env; \
        echo "VITE_ENVIRONMENT=${NODE_ENV}" >> .env; \
    fi

# Build the application with appropriate mode
RUN if [ "$NODE_ENV" = "development" ]; then \
        npm run build:dev; \
    else \
        npm run build:prod; \
    fi

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy appropriate nginx configuration based on NODE_ENV
ARG NODE_ENV=production
COPY nginx.conf /etc/nginx/nginx.conf

# Create nginx user and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html

# Expose port 3000 (not 80, since nginx container will proxy to this)
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]

# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Define build arguments for Supabase environment variables
# These will be passed during the `docker build` command (e.g., in EasyPanel's build environment)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Build the React application
# Vite will pick up these ARGs as environment variables during the build process.
# We explicitly pass them to the pnpm build command to ensure they are available.
RUN VITE_SUPABASE_URL=$VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY pnpm build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 8080 as defined in vite.config.ts
EXPOSE 8080

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
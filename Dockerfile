# Use official Node.js 20 Alpine image as base
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install dependencies (choose npm or pnpm)
RUN npm install

# Copy all project files
COPY . .

# Build the Next.js application
ARG MONGODB_URI 
ENV MONGODB_URI=$MONGODB_URI
# 注入假的 Secret 防止不能构建
ENV NEXTAUTH_SECRET="build_secret_placeholder"
ENV BETTER_AUTH_SECRET="build_secret_placeholder"

RUN npm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Start the Next.js production server
CMD ["npm", "start"]

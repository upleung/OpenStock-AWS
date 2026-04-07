# Use official Node.js 20 Alpine image as base
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./
# Uncomment the next line if you use pnpm and have pnpm-lock.yaml
# COPY pnpm-lock.yaml ./

# Install dependencies (choose npm or pnpm)
RUN npm install
# If using pnpm, replace with:
# RUN npm install -g pnpm && pnpm install

# Copy all project files
COPY . .

# Build the Next.js application
# --- 删除之前的 ENV 行，替换为下面这两行 ---
# 接收构建参数
ARG MONGODB_URI 
# 将参数设置为环境变量，供 build 过程使用
ENV MONGODB_URI=$MONGODB_URI

# 为了防止 NextAuth 报错，我们再加个假的 Secret（这个可以是假的）
ENV NEXTAUTH_SECRET="build_secret_placeholder"
RUN npm run build
# Or if using pnpm:
# RUN pnpm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Start the Next.js production server
CMD ["npm", "start"]
# Or if using pnpm:
# CMD ["pnpm", "start"]

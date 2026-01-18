FROM node:24-alpine

# Set working directory
WORKDIR /app

# Install global Nest CLI
RUN npm install -g @nestjs/cli

# Copy package files first
COPY package*.json ./

# Install all dependencies including devDependencies
RUN npm install

# Copy all source code
COPY . .

# Expose port
EXPOSE 3000

# Default command: development mode with hot reload
CMD ["npm", "run", "start:dev"]

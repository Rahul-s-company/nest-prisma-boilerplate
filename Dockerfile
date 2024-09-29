# Production stage
# Use the official Node.js image for production (lightweight version)
FROM public.ecr.aws/docker/library/node:18-alpine

# Set working directory
WORKDIR /app
 
# Copy only the necessary files for production
COPY package*.json ./
 
# Install production dependencies (skip development dependencies)
RUN npm install
# Copy the whole application to the container
COPY . .

# generate prisma client
RUN npx prisma generate

# Start the NestJS server in dev mode
CMD ["npm", "run", "start:dev"]

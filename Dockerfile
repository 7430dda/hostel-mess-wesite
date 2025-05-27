# Use Node.js base image
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy package files first
COPY package*.json ./

# Install dependencies inside Docker (native to Linux)
RUN npm install

# Copy the rest of your project
COPY . .

# Expose the port (adjust if needed)
EXPOSE 5000

# Start the app
CMD ["npm", "start"]

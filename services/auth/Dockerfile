FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install only production dependencies for clean container size
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]

# Obraz produkcyjny dla Railway (używany automatycznie zamiast Railpack)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
RUN mkdir -p /data/uploads
EXPOSE 3000
CMD ["node", "server.js"]

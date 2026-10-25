# Obraz produkcyjny dla Railway
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
# CSS budowany z aktualnych szablonów przy każdym wdrożeniu (zawsze zgodny z HTML)
RUN npm run build:css && npm prune --omit=dev
ENV NODE_ENV=production
RUN mkdir -p /data/uploads
EXPOSE 3000
CMD ["node", "server.js"]

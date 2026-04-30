FROM node:20-alpine

WORKDIR /app/agent

COPY agent/package.json agent/package-lock.json ./
RUN npm install --omit=dev

COPY agent/dist/ ./dist/

EXPOSE 3001

CMD ["node", "dist/index.js"]

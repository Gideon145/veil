FROM node:20-alpine

WORKDIR /app

# Copy entire agent folder (package.json, tsconfig.json, src/)
COPY agent/ ./agent/

# Install dependencies and build
RUN cd agent && npm install --omit=dev && npx tsc

EXPOSE 3001

CMD ["node", "agent/dist/index.js"]

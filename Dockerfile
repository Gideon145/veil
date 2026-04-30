FROM node:20-alpine

WORKDIR /app

# Install agent dependencies
COPY agent/package.json agent/package-lock.json* ./agent/
RUN cd agent && npm install --omit=dev

# Copy agent source and tsconfig
COPY agent/tsconfig.json ./agent/
COPY agent/src ./agent/src/

# Build TypeScript
RUN cd agent && npx tsc

EXPOSE 3001

CMD ["node", "agent/dist/index.js"]

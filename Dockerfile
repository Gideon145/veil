FROM node:20-alpine

WORKDIR /app

# Copy entire agent folder (package.json, tsconfig.json, src/)
COPY agent/ ./agent/

# Install ALL deps (including typescript devDep), compile, then prune
RUN cd agent && npm install && ./node_modules/.bin/tsc && npm prune --omit=dev

EXPOSE 3001

CMD ["node", "agent/dist/index.js"]

FROM node:20-alpine

WORKDIR /app/agent

COPY agent/ .

RUN npm install

EXPOSE 3001

CMD ["node", "-r", "ts-node/register/transpile-only", "src/index.ts"]

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY fixtures.json ./
COPY src ./src
RUN npm run build

COPY web/package.json web/package-lock.json ./web/
RUN npm ci --prefix web
COPY web/index.html web/tsconfig.json web/vite.config.ts ./web/
COPY web/src ./web/src
RUN npm run build --prefix web

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["sh", "-c", "node dist/db/seed.js && node dist/server.js"]

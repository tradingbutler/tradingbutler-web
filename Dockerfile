# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY --from=builder /app/dist/web ./dist/web
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/web/server/server.mjs"]

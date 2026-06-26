FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist/web ./dist/web
COPY --from=build /app/node_modules ./node_modules
ENV PORT=4000
EXPOSE 4000
CMD ["node", "dist/web/server/server.mjs"]

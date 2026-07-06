# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache gzip
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build
# Pre-compress the static build output so nginx's gzip_static can serve the
# .gz sidecar directly instead of gzipping these on every request.
RUN find dist/web/browser -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' \) \
    -exec gzip -9 -k -f {} \;

FROM nginx:alpine AS runtime
RUN apk add --no-cache curl
COPY --from=builder /app/dist/web/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080

# syntax=docker/dockerfile:1
#
# Multi-stage build for the Angular SSR app with Bun.
#
# The Angular application builder inlines express, http-proxy-middleware and
# every other npm dependency into dist/web/server/server.mjs, so the runtime
# stage needs no node_modules at all — only the dist/ output and a Node
# binary to run it. That lets the runner be distroless (no shell, non-root).
#
# Runtime base. Override with :debug-nonroot (adds a busybox shell) for
# `make docker-build-debug`. Must be declared before the first FROM to be global.
ARG RUNNER_IMAGE=gcr.io/distroless/nodejs26-debian13:nonroot

# Build base: Bun as the package manager, Node as the JS runtime.
#
# The Angular CLI hard-checks process.versions.node and refuses anything below
# v26.0.0 / v24.15.0, and oven/bun's Node compat layer reports v24.3.0 — so the
# build stages need a real Node with the bun binary dropped in next to it.
# node:26-slim is Debian/glibc, matching both oven/bun and the distroless runner.
FROM node:26-slim AS base
COPY --from=oven/bun:1-slim /usr/local/bin/bun /usr/local/bin/bun

# Stage 1: Dependencies
FROM base AS deps
WORKDIR /app

COPY package.json bun.lock ./

# Install dependencies (includes devDependencies needed for the Angular build)
RUN bun install --frozen-lockfile

# Stage 2: Builder
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

# Stage 3: Runner (distroless, no shell, non-root)
FROM ${RUNNER_IMAGE} AS runner
WORKDIR /app

COPY --from=builder --chown=65532:65532 /app/dist/web ./dist/web

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

USER 65532

# ENTRYPOINT is /nodejs/bin/node
CMD ["dist/web/server/server.mjs"]

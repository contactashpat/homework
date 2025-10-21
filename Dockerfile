# syntax=docker/dockerfile:1

FROM oven/bun:1.2 AS bun-base
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 build-essential ca-certificates xz-utils curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://nodejs.org/dist/v20.17.0/node-v20.17.0-linux-x64.tar.xz \
        | tar -xJf - --strip-components=1 -C /usr/local

ENV npm_config_nodedir=/usr/local

FROM bun-base AS deps
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile

FROM bun-base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM bun-base AS prod-deps
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile --production

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY package.json ./
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]

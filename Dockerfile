# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS base
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
  && apt-get upgrade -y \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server ./
RUN npx prisma generate && npm run build

FROM base AS runner
WORKDIR /app/server
ENV NODE_ENV=production
ENV PORT=8080
COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
RUN npm ci --omit=dev --omit=optional \
  && npm cache clean --force \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=builder /app/server/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/server/dist ./dist
WORKDIR /app
COPY app ./app
COPY THIRD_PARTY_NOTICES.md ./THIRD_PARTY_NOTICES.md
COPY USER_GUIDE.html ./USER_GUIDE.html
COPY USER_GUIDE_BG.html ./USER_GUIDE_BG.html
COPY USER_GUIDE_EN.html ./USER_GUIDE_EN.html
COPY docker-entrypoint.sh /usr/local/bin/procal-entrypoint
RUN chmod 0755 /usr/local/bin/procal-entrypoint \
  && mkdir -p /app/config /app/backups
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/procal-entrypoint"]
CMD ["node", "/app/server/dist/index.js"]


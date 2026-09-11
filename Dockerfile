# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
RUN apk upgrade --no-cache \
  && apk add --no-cache ca-certificates openssl su-exec

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
COPY --chown=node:node server/package.json server/package-lock.json ./
COPY --chown=node:node server/prisma ./prisma
RUN npm ci --omit=dev --omit=optional \
  && npm cache clean --force \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --chown=node:node --from=builder /app/server/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node --from=builder /app/server/dist ./dist
WORKDIR /app
COPY --chown=node:node app ./app
COPY --chown=node:node THIRD_PARTY_NOTICES.md ./THIRD_PARTY_NOTICES.md
COPY --chown=node:node USER_GUIDE.html ./USER_GUIDE.html
COPY --chown=node:node USER_GUIDE_BG.html ./USER_GUIDE_BG.html
COPY --chown=node:node USER_GUIDE_EN.html ./USER_GUIDE_EN.html
COPY docker-entrypoint.sh /usr/local/bin/procal-entrypoint
RUN chmod 0755 /usr/local/bin/procal-entrypoint \
  && mkdir -p /app/config /app/backups
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/procal-entrypoint"]
CMD ["node", "/app/server/dist/index.js"]


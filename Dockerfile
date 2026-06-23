# syntax=docker/dockerfile:1
FROM node:20-bullseye-slim AS builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server ./
RUN npx prisma generate && npm run build

FROM node:20-bullseye-slim AS runner
WORKDIR /app/server
ENV NODE_ENV=production
ENV PORT=8080
COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
RUN npm ci --omit=dev --omit=optional && npm cache clean --force
COPY --from=builder /app/server/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/server/dist ./dist
WORKDIR /app
COPY app ./app
COPY THIRD_PARTY_NOTICES.md ./THIRD_PARTY_NOTICES.md
COPY USER_GUIDE.html ./USER_GUIDE.html
COPY USER_GUIDE_BG.html ./USER_GUIDE_BG.html
COPY USER_GUIDE_EN.html ./USER_GUIDE_EN.html
RUN mkdir -p /app/config
EXPOSE 8080
CMD ["node", "/app/server/dist/index.js"]


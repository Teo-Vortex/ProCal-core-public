FROM node:24-alpine

RUN apk upgrade --no-cache \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-v* \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/bin/pnpm /usr/local/bin/pnpx

WORKDIR /updater
COPY package.json ./
COPY src ./src

ENV NODE_ENV=production \
    PORT=7070 \
    PROCAL_UPDATER_STATE_PATH=/data/state.json

EXPOSE 7070
CMD ["node", "src/server.js"]

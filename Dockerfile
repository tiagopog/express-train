FROM node:24-alpine AS build

RUN apk update && apk add curl libcurl

RUN mkdir -p /home/node/app/node_modules
WORKDIR /home/node/app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npx tsc

FROM node:24-alpine

ENV NODE_ENV="production"

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

USER node

COPY --chown=node:node package*.json ./
RUN npm install --only=production --quiet

COPY --from=build --chown=node:node /home/node/app/build .

COPY --from=build --chown=node:node /home/node/app/node_modules/.prisma ./node_modules/
COPY --from=build --chown=node:node /home/node/app/src/models/migrations ./src/models/migrations
COPY --from=build --chown=node:node /home/node/app/src/models/schema.prisma ./src/models/schema.prisma

ARG DATABASE_URL
RUN npx prisma generate

EXPOSE 3000
CMD [ "node", "src/web/index.js"]

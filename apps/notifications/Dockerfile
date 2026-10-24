# syntax=docker/dockerfile:1
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/auth/package.json apps/auth/
COPY apps/notifications/package.json apps/notifications/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/notifications

FROM deps AS build
COPY apps/notifications apps/notifications
WORKDIR /repo/apps/notifications
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS prod-deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/auth/package.json apps/auth/
COPY apps/notifications/package.json apps/notifications/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/notifications --omit=dev

FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=build /repo/apps/notifications/dist ./apps/notifications/dist
COPY apps/notifications/package.json ./apps/notifications/
USER node
WORKDIR /repo/apps/notifications
CMD ["node", "dist/index.js"]
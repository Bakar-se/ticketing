# syntax=docker/dockerfile:1
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/auth/package.json apps/auth/
COPY apps/notifications/package.json apps/notifications/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm npm ci -w apps/api

FROM deps AS build
COPY apps/api apps/api
WORKDIR /repo/apps/api
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate
RUN npm run build

FROM build AS migrate
CMD ["../../node_modules/.bin/prisma", "migrate", "deploy"]

FROM node:${NODE_VERSION}-alpine AS prod-deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/auth/package.json apps/auth/
COPY apps/notifications/package.json apps/notifications/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm npm ci -w apps/api --omit=dev

FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY apps/api/package.json ./apps/api/
USER node
WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
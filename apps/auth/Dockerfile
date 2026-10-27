# syntax=docker/dockerfile:1
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/auth/package.json apps/auth/
COPY apps/notifications/package.json apps/notifications/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm npm ci -w apps/auth

FROM deps AS build
COPY apps/auth apps/auth
WORKDIR /repo/apps/auth
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate
RUN npm run build

# One-shot job image: applies pending migrations, then exits. Never serves traffic.
FROM build AS migrate
CMD ["../../node_modules/.bin/prisma", "migrate", "deploy"]

FROM node:${NODE_VERSION}-alpine AS prod-deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/auth/package.json apps/auth/
COPY apps/notifications/package.json apps/notifications/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm npm ci -w apps/auth --omit=dev

# Last stage = default build target
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=build /repo/apps/auth/dist ./apps/auth/dist
COPY apps/auth/package.json ./apps/auth/
USER node
WORKDIR /repo/apps/auth
EXPOSE 4001
CMD ["node", "dist/index.js"]
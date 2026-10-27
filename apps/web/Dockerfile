# syntax=docker/dockerfile:1
ARG NODE_VERSION=24

# Debian-based ("slim"), not Alpine: Tailwind v4 and Next ship native binaries, and a lockfile
# created on glibc (your WSL Ubuntu) often lacks the musl variants Alpine would need.
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/auth/package.json apps/auth/
COPY apps/notifications/package.json apps/notifications/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm npm ci -w apps/web

FROM deps AS build
# NEXT_PUBLIC_* values are baked into the browser JavaScript at BUILD time, so they are build args
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY apps/web apps/web
WORKDIR /repo/apps/web
RUN mkdir -p public && npm run build

FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
# HOSTNAME matters: Docker sets it to the container id, which would make Next listen on the wrong address
WORKDIR /repo
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
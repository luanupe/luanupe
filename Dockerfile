# Builder
FROM node:22-alpine AS deps

WORKDIR /app

COPY app/package*.json ./
RUN npm ci --ignore-scripts

FROM deps AS build

COPY app/tsconfig.json ./tsconfig.json
COPY app/src ./src
RUN npm run build


# Local development (docker compose): hot-reload on :3000, no nginx
FROM deps AS development

COPY app/newrelic.cjs ./newrelic.cjs

RUN apk add --no-cache github-cli \
    && chown -R node:node /app

USER node

ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "dev"]


# Runner (non-root: USER node; supervisord + nginx + supercronic)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

ARG SUPERCRONIC_VERSION=0.2.33
ARG TARGETARCH=amd64

RUN apk add --no-cache \
    github-cli \
    nginx \
    supervisor \
    wget \
    && mkdir -p \
    /app/cron \
    /var/log/nginx \
    /var/lib/nginx/tmp \
    /tmp/nginx-client-body \
    /tmp/nginx-proxy \
    && wget -qO /usr/local/bin/supercronic \
    "https://github.com/aptible/supercronic/releases/download/v${SUPERCRONIC_VERSION}/supercronic-linux-${TARGETARCH}" \
    && chmod +x /usr/local/bin/supercronic \
    && chown -R node:node /var/log/nginx /var/lib/nginx /tmp/nginx-client-body /tmp/nginx-proxy

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY supervisor/supervisord.conf /app/supervisord.conf
COPY cron/warmup-crontab /app/cron/warmup-crontab

COPY app/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY app/package.json ./package.json
COPY app/newrelic.cjs ./newrelic.cjs
COPY --from=build /app/dist ./dist

RUN chown -R node:node /app \
    && chmod 600 /app/cron/warmup-crontab

USER node

EXPOSE 8080

CMD ["/usr/bin/supervisord", "-c", "/app/supervisord.conf"]

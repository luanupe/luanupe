# Builder
FROM node:22-alpine AS deps

WORKDIR /app

COPY app/package*.json ./
RUN npm ci --ignore-scripts

FROM deps AS build

COPY app/tsconfig.json ./tsconfig.json
COPY app/src ./src
RUN npm run build


# Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache \
    busybox-suid \
    github-cli \
    nginx \
    supervisor \
    wget \
    && mkdir -p /etc/crontabs /var/log/nginx

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY supervisor/supervisord.conf /etc/supervisord.conf
COPY cron/warmup-crontab /etc/crontabs/root
RUN chmod 600 /etc/crontabs/root

COPY app/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY app/package.json ./package.json
COPY app/newrelic.cjs ./newrelic.cjs
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]

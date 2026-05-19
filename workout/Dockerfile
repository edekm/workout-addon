ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM ${BUILD_FROM}

ENV LANG=C.UTF-8 \
    NODE_ENV=production \
    PORT=3000

RUN apk add --no-cache nodejs npm

WORKDIR /app

COPY app/package.json app/package-lock.json* ./
RUN npm install --include=dev

COPY app/ ./
RUN npm run build && npm prune --omit=dev

COPY run.sh /run.sh
RUN chmod a+x /run.sh

EXPOSE 3000
CMD ["/run.sh"]

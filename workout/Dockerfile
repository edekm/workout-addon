ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM ${BUILD_FROM}

ENV LANG=C.UTF-8 \
    NODE_ENV=production \
    PORT=3000

# Runtime + build-time tooling. python3/make/g++ wymagane przez node-gyp
# do kompilacji better-sqlite3 (native moduł). Usuwane po buildzie.
RUN apk add --no-cache nodejs npm \
    && apk add --no-cache --virtual .build-deps python3 make g++

WORKDIR /app

COPY app/package.json app/package-lock.json* ./
RUN npm install --include=dev

COPY app/ ./
RUN npm run build \
    && npm prune --omit=dev \
    && apk del .build-deps

COPY run.sh /run.sh
RUN chmod a+x /run.sh

EXPOSE 3000
CMD ["/run.sh"]

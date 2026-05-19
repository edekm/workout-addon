ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG=C.UTF-8 \
    NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY app/package.json app/package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY app/ ./
RUN npm run build

COPY run.sh /run.sh
RUN chmod a+x /run.sh

EXPOSE 3000
CMD ["/run.sh"]

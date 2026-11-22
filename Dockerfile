FROM node:22-bookworm-slim AS web
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-bookworm-slim AS app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && install -d -o node -g node /app/data
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/prisma/ ./prisma/
RUN npm run db:generate
COPY backend/src/ ./src/
COPY docs/openapi.json /app/docs/openapi.json
COPY --from=web /app/frontend/dist /app/public
ENV NODE_ENV=production PORT=3333 DATABASE_URL=file:/app/data/treasury.db FRONTEND_DIST=/app/public
USER node
EXPOSE 3333
CMD ["sh", "-c", "npm run db:deploy && exec node src/server.js"]

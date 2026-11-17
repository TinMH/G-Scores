# Build context: repository root (needed so the seeder stage can include dataset/).

FROM node:22-alpine AS build
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# --- API runtime image ---
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]

# --- Migrate + seed job image (runtime + 43MB CSV) ---
FROM runtime AS seeder
ENV DATASET_PATH=/app/dataset/diem_thi_thpt_2024.csv
COPY --chown=node dataset/diem_thi_thpt_2024.csv ./dataset/
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/database/seed.js"]

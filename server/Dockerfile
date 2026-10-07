FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

COPY src ./src

EXPOSE 3001

# La URL con host `db` sale de server/.env (DOCKER_DATABASE_URL), no del compose (research R8).
CMD ["sh", "-c", "export DATABASE_URL=\"${DOCKER_DATABASE_URL:-$DATABASE_URL}\" && npx prisma migrate deploy && node src/index.js"]

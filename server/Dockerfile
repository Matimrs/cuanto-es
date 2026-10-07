# Contexto de build: la raíz del repo (docker-compose.yml), para incluir el dominio del cliente
# (src/classes, src/utils), que el servidor reutiliza para calcular las liquidaciones (research R10).
FROM node:24-alpine

WORKDIR /repo/server

COPY server/package*.json ./
COPY server/prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

COPY server/src ./src
COPY src/classes /repo/src/classes
COPY src/utils /repo/src/utils

# src/classes/Peer.js importa `uuid`: Node lo busca subiendo desde /repo/src, así que se enlaza
# el node_modules del servidor en la raíz del layout.
RUN ln -s /repo/server/node_modules /repo/node_modules

EXPOSE 3001

# La URL con host `db` sale de server/.env (DOCKER_DATABASE_URL), no del compose (research R8).
CMD ["sh", "-c", "export DATABASE_URL=\"${DOCKER_DATABASE_URL:-$DATABASE_URL}\" && npx prisma migrate deploy && node src/index.js"]

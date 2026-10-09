# Contexto de build: la raíz del repo (docker-compose.yml), para incluir el dominio del cliente
# (client/src/classes, client/src/utils), que el servidor reutiliza para calcular las liquidaciones
# (specs/002 research R10; layout de client/ en specs/003 research R3).
FROM node:24-alpine

WORKDIR /repo/server

COPY server/package*.json ./
COPY server/prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

COPY server/src ./src
COPY client/src/classes /repo/client/src/classes
COPY client/src/utils /repo/client/src/utils

# client/src/classes/Peer.js importa `uuid`: Node lo busca subiendo desde /repo/client/src, así
# que se enlaza el node_modules del servidor como el del cliente.
RUN ln -s /repo/server/node_modules /repo/client/node_modules

EXPOSE 3001

# La URL con host `db` sale de server/.env (DOCKER_DATABASE_URL), no del compose (research R8).
CMD ["sh", "-c", "export DATABASE_URL=\"${DOCKER_DATABASE_URL:-$DATABASE_URL}\" && npx prisma migrate deploy && node src/index.js"]

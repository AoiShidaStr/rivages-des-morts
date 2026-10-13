# Rivages des Morts : le jeu et son serveur dans un seul conteneur (voir docker-compose.yml).

# 1. Construire le jeu. VITE_RESEAU=serveur : la coop passe par le serveur du conteneur, pas par le WebRTC.
FROM node:22-slim AS build
WORKDIR /jeu
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN VITE_RESEAU=serveur npm run build

# 2. L'image finale : Node, le serveur, le jeu construit, et la seule dépendance du serveur (ws).
FROM node:22-slim
WORKDIR /jeu
ENV NODE_ENV=production PORT=8080
COPY --from=build /jeu/node_modules/ws ./node_modules/ws
COPY --from=build /jeu/dist ./dist
COPY server/serveur.ts ./server/serveur.ts
COPY package.json ./
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://localhost:' + process.env.PORT + '/sante').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "server/serveur.ts"]

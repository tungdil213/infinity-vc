# Étape 1 : Base Node.js
FROM node:lts-bookworm-slim AS base
WORKDIR /app
RUN apt update && apt install -y curl wget fontconfig && rm -rf /var/lib/apt/lists/*

# Étape 2 : Installation des dépendances
FROM base AS deps
WORKDIR /app

# Copier uniquement les fichiers nécessaires pour l'installation des dépendances
COPY package.json yarn.lock ./
COPY apps/infinity/package.json ./apps/infinity/
COPY packages/ui/package.json ./packages/ui/
COPY packages/events/package.json ./packages/events/
COPY packages/game-engine/package.json ./packages/game-engine/
COPY packages/transcript/package.json ./packages/transcript/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Installer toutes les dépendances pour le monorepo
RUN yarn install --frozen-lockfile
# Étape 3 : Build des packages et de l'application
FROM deps AS build
WORKDIR /app
COPY . .

# 🔥 Build des packages partagés puis de l’application principale infinity
RUN yarn workspace @infinity.dev/ui build \
  && yarn workspace @infinity.dev/events build \
  && yarn workspace @infinity.dev/game-engine build \
  && yarn workspace @infinity.dev/transcript build \
  && yarn workspace @infinity/app build

# Étape 4 : Image finale pour l'exécution
FROM base AS runner
WORKDIR /app

# Copier les fichiers essentiels
COPY package.json yarn.lock ./
COPY apps/infinity/package.json ./apps/infinity/
COPY packages/ui/package.json ./packages/ui/
COPY packages/events/package.json ./packages/events/
COPY packages/game-engine/package.json ./packages/game-engine/
COPY packages/transcript/package.json ./packages/transcript/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Copier les artefacts nécessaires des packages workspaces
COPY --from=build /app/packages/ui/dist ./packages/ui/dist
COPY --from=build /app/packages/events/dist ./packages/events/dist
COPY --from=build /app/packages/game-engine/dist ./packages/game-engine/dist
COPY --from=build /app/packages/transcript/dist ./packages/transcript/dist

# Copier le build et les assets
COPY --from=build /app/apps/infinity/build ./apps/infinity/build
COPY --from=build /app/apps/infinity/public/assets ./apps/infinity/public/assets

# Installation des dépendances en mode production pour l'application infinity
RUN yarn install --frozen-lockfile --production=true

# Vérification que les assets sont bien présents
RUN ls -l /app/apps/infinity/public/assets || echo "Assets NOT FOUND"

# Lancer le serveur infinity
WORKDIR /app/apps/infinity
EXPOSE 3333
CMD ["node", "build/bin/server.js"]

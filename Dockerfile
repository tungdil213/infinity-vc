# Étape 1 : Base Node.js
FROM node:lts-bookworm-slim AS base
WORKDIR /app
RUN apt update && apt install -y curl wget fontconfig && rm -rf /var/lib/apt/lists/*

# Étape 2 : Installation de PNPM et des dépendances
FROM base AS deps
WORKDIR /app
RUN npm install -g pnpm

# Copier uniquement les fichiers nécessaires pour l'installation des dépendances
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/infinity/package.json ./apps/infinity/
COPY packages/ui/package.json ./packages/ui/
COPY packages/events/package.json ./packages/events/
COPY packages/game-engine/package.json ./packages/game-engine/
COPY packages/transcript/package.json ./packages/transcript/

# Installer toutes les dépendances pour le monorepo
RUN pnpm install --frozen-lockfile --strict-peer-dependencies=false
# Étape 3 : Build des packages et de l'application
FROM deps AS build
WORKDIR /app
COPY . .

# 🔥 Build des packages partagés puis de l’application principale infinity
RUN pnpm --filter @infinity.dev/ui run build \
  && pnpm --filter @infinity.dev/events run build \
  && pnpm --filter @infinity.dev/game-engine run build \
  && pnpm --filter @infinity.dev/transcript run build

# 🔥 Générer le build de l'application infinity (AdonisJS + Vite)
WORKDIR /app/apps/infinity
RUN pnpm run build

# Étape 4 : Image finale pour l'exécution
FROM base AS runner
WORKDIR /app

# Installer PNPM
RUN npm install -g pnpm

# Copier les fichiers essentiels
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/infinity/package.json ./apps/infinity/

# Copier le build et les assets
COPY --from=build /app/apps/infinity/build ./apps/infinity/build
COPY --from=build /app/apps/infinity/public/assets ./apps/infinity/public/assets

# Installation des dépendances en mode production pour l'application infinity
WORKDIR /app/apps/infinity
RUN pnpm install --prod --no-optional --no-frozen-lockfile --filter @infinity/app

# Vérification que les assets sont bien présents
RUN ls -l /app/apps/infinity/public/assets || echo "Assets NOT FOUND"

# Lancer le serveur infinity
EXPOSE 3333
CMD ["node", "build/bin/server.js"]

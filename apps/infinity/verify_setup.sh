#!/bin/bash

echo "🔍 Vérification de l'architecture Event-Driven..."
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0

# Vérifier que les fichiers existent
echo "📁 Vérification des fichiers..."

files=(
  "app/domain/events/base/domain_event.ts"
  "app/domain/events/base/event_handler.ts"
  "app/domain/events/base/index.ts"
  "app/domain/events/lobby/lobby_domain_events.ts"
  "app/domain/shared/result.ts"
  "app/application/events/event_bus.ts"
  "app/application/events/in_memory_event_bus.ts"
  "app/application/repositories/lobby_repository.ts"
  "app/infrastructure/events/lobby_event_handlers.ts"
  "app/infrastructure/events/event_system_factory.ts"
  "app/infrastructure/events/event_bus_singleton.ts"
  "app/infrastructure/events/transmit_event_bridge.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅${NC} $file"
  else
    echo -e "${RED}❌${NC} $file (MANQUANT)"
    ((errors++))
  fi
done

echo ""
echo "🔍 Vérification des mauvais imports..."

# Vérifier qu'il n'y a pas de mauvais imports
bad_imports=$(grep -r "from '@adonisjs/core/health'" app/ 2>/dev/null || true)
if [ -n "$bad_imports" ]; then
  echo -e "${RED}❌${NC} Imports incorrects trouvés : Result from '@adonisjs/core/health'"
  echo "$bad_imports"
  ((errors++))
else
  echo -e "${GREEN}✅${NC} Aucun import Result depuis '@adonisjs/core/health'"
fi

bad_domain_imports=$(grep -r "#domain/events/domain_event" app/ 2>/dev/null || true)
if [ -n "$bad_domain_imports" ]; then
  echo -e "${RED}❌${NC} Imports incorrects trouvés : #domain/events/domain_event"
  echo "$bad_domain_imports"
  ((errors++))
else
  echo -e "${GREEN}✅${NC} Aucun import depuis '#domain/events/domain_event'"
fi

echo ""
echo "🔍 Vérification que l'ancien fichier a été supprimé..."

if [ -f "app/domain/events/lobby/lobby_event_handlers.ts" ]; then
  echo -e "${YELLOW}⚠️${NC}  Ancien fichier encore présent : app/domain/events/lobby/lobby_event_handlers.ts"
  echo "   Supprimez-le avec : rm app/domain/events/lobby/lobby_event_handlers.ts"
  ((warnings++))
else
  echo -e "${GREEN}✅${NC} Ancien fichier supprimé"
fi

echo ""
echo "🔍 Vérification des exports dans domain_event.ts..."

if grep -q "export interface DomainEvent" app/domain/events/base/domain_event.ts; then
  echo -e "${GREEN}✅${NC} DomainEvent est exporté"
else
  echo -e "${RED}❌${NC} DomainEvent n'est pas exporté"
  ((errors++))
fi

if grep -q "export interface EventHandlingResult" app/domain/events/base/domain_event.ts; then
  echo -e "${GREEN}✅${NC} EventHandlingResult est exporté"
else
  echo -e "${RED}❌${NC} EventHandlingResult n'est pas exporté"
  ((errors++))
fi

echo ""
echo "🔍 Vérification du barrel export..."

if grep -q "export \* from './domain_event.js'" app/domain/events/base/index.ts; then
  echo -e "${GREEN}✅${NC} Barrel export configuré pour domain_event"
else
  echo -e "${YELLOW}⚠️${NC}  Barrel export manquant pour domain_event"
  ((warnings++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
  echo -e "${GREEN}✅ TOUT EST OK ! Vous pouvez lancer 'pnpm run dev'${NC}"
  exit 0
elif [ $errors -eq 0 ]; then
  echo -e "${YELLOW}⚠️  $warnings avertissement(s) détecté(s)${NC}"
  echo "Vous pouvez probablement lancer le serveur, mais vérifiez les warnings"
  exit 1
else
  echo -e "${RED}❌ $errors erreur(s) détectée(s)${NC}"
  echo "Corrigez les erreurs avant de lancer le serveur"
  exit 2
fi

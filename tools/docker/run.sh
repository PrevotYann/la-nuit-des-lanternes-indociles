#!/bin/sh
# Lance une commande dans l'image de build, dépôt monté en /work et système hogwarts-system installé en /hp.
# Usage : sh tools/docker/run.sh "npm run build"
REPO="$(cd "$(dirname "$0")/../.." && pwd -W 2>/dev/null || pwd)"
HP="${HP_SYSTEM_HOST:-C:/docker-data/foundry/Data/systems/hogwarts-system}"
MSYS_NO_PATHCONV=1 docker run --rm -v "$REPO:/work" -v "$HP:/hp:ro" -w /work lanternes-build sh -c "$1"

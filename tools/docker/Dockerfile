# Image de build : Node 24 (comme Foundry 14), ffmpeg pour les ambiances, polices pour le texte des images.
FROM node:24-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core fonts-liberation2 fonts-ebgaramond zip \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /work

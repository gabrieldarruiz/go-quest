FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=https://go-quest-api.astrasolution.com.br/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM caddy:2.9-alpine
COPY --from=builder /app/dist /usr/share/caddy

EXPOSE 80

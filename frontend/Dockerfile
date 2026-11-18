# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Horário de Brasília: o servidor grava "hora de saída" e "data de hoje" com o
# relógio local do processo. Sem isso o container roda em UTC e a saída sai 3 h
# adiantada (ex.: 12:57 para uma saída às 09:57) e, depois das 21h, o "hoje"
# vira o dia seguinte.
RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/src ./src

EXPOSE 3003
CMD ["npm", "run", "start"]

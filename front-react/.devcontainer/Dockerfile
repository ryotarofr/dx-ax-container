
FROM node:18.17.0-slim

ENV TZ Asia/Tokyo

RUN apt-get update \
  && apt-get install -y

WORKDIR /app

COPY ../package.json ../pnpm-lock.yaml ./

RUN npm cache clean --force

RUN npm install -g pnpm
RUN pnpm install

COPY ../ ./

CMD ["pnpm", "dev"]

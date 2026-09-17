FROM node:22-alpine

ENV NODE_ENV=production
EXPOSE 8080/tcp

LABEL maintainer="Kin"
LABEL summary="Kin Bonfire Gateway"
LABEL description="Kin browser gateway powered by the Bonfire proxy engine"

WORKDIR /app

COPY package.json package-lock.json ./
RUN apk add --upgrade --no-cache python3 make g++
RUN npm ci --omit=dev

COPY . .

ENTRYPOINT [ "node" ]
CMD ["src/index.js"]

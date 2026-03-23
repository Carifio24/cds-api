FROM public.ecr.aws/docker/library/node:22-alpine

WORKDIR /app

COPY .eslintrc.json package*.json tsconfig.json ./
COPY src ./src
COPY tests ./tests

RUN npm ci
RUN npm run build

ARG port=8081
EXPOSE $port
ENV PORT="$port"

CMD ["node", "dist/src/main.js"]

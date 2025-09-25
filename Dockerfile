FROM node:20-alpine

ARG PORT=9000

WORKDIR /app

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=.npm \
    npm ci --omit=dev

COPY . .

RUN npm run build

ENV PORT=$PORT
EXPOSE $PORT

CMD npm start

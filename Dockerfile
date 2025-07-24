FROM node:18

WORKDIR /app
COPY . .

ENV NODE_ENV=production

RUN npm install

# backend
WORKDIR /app/backend
RUN npm install

# frontend
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps && npm run build

# chat-server
WORKDIR /app/chat-server
RUN npm install

# 루트로 다시 이동
WORKDIR /app

CMD ["npm", "run", "dev"]
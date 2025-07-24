FROM node:18

WORKDIR /app
COPY . .

ENV NODE_ENV=production

# 루트 패키지 설치 (concurrently 포함)
RUN npm install

# frontend 빌드
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps && npm run build

# backend 설치
WORKDIR /app/backend
RUN npm install

# chat-server 설치
WORKDIR /app/chat-server
RUN npm install

# 루트로 다시 이동
WORKDIR /app

# 3개 서버를 concurrently로 실행
CMD ["npm", "start"]
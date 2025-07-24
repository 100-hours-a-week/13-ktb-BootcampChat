FROM node:18

WORKDIR /app
COPY . .

ENV NODE_ENV=development

# backend
WORKDIR /app/backend
RUN npm install

# frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# chat-server
WORKDIR /app/chat-server
RUN npm install

# start.sh 복사
WORKDIR /app
COPY start.sh .
RUN chmod +x start.sh

CMD ["./start.sh"]
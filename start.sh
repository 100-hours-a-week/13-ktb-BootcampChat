#!/bin/bash

export NODE_ENV=development

cd /app/backend && npm start &

cd /app/chat-server && npm start &

cd /app/frontend && npm start
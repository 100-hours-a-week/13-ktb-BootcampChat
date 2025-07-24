#!/bin/bash

cd /app/backend && npm start &

cd /app/chat-server && npm start &

cd /app/frontend && npm start
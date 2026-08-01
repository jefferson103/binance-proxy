FROM node:18-slim
WORKDIR /app
COPY package.json server.js ./
EXPOSE 10000
CMD ["node", "server.js"]

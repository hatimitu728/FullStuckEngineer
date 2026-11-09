FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY public ./public
COPY fixtures ./fixtures
EXPOSE 8080
USER node
CMD ["node", "server/index.js"]

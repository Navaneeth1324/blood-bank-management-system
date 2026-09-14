FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Seed initial data
RUN npm run seed

EXPOSE 3000

CMD ["npm", "start"]

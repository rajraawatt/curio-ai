FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm install
COPY frontend frontend
RUN npm run build -w curio-frontend

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm install --omit=dev
COPY backend backend
COPY --from=build /app/frontend/dist frontend/dist
ENV PORT=8080
EXPOSE 8080
CMD ["npm", "run", "start", "-w", "curio-backend"]

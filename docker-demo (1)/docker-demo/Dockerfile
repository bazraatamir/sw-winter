# 1. Суурь image — Node version энд ТОГТСОН
FROM node:24-alpine

# 2. Container доторх ажлын хавтас
WORKDIR /app

# 3. Эхлээд зөвхөн package файлуудыг хуулна (cache-ийн ашиг тус)
COPY package*.json ./

# 4. Dependency-уудыг суулгана
RUN npm install --omit=dev

# 5. Бусад бүх кодоо хуулна
COPY . .

# 6. Аль порт нээлттэй байхыг зарлана
EXPOSE 3000

# 7. Container асахад ажиллах команд
CMD ["npm", "start"]

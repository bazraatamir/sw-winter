# Docker — Онол, Суулгалт, Ашиглалтын Бүрэн Гарын Авлага

---

## НЭГДҮГЭЭР ХЭСЭГ: DOCKER ГЭЖ ЮУ ВЭ?

---

## 1. Docker гэж юу вэ?

Docker бол 2013 онд Solomon Hykes үүсгэсэн, Go хэлээр бичигдсэн нээлттэй эхийн платформ юм. Аппликейшнийг контейнер хэлбэрт оруулж, өөр өөр тооцооллын орчинд тогтвортой ажиллуулах боломж олгодог.

Товчоор хэлбэл: Docker бол аппликейшнийг **орчин хамт нь хайрцаглаж**, хаа ч ижил байдлаар ажиллуулах хэрэгсэл юм.

Зүйрлэл: Хоолны жор гэж бодоорой. Тогооч нэг жорыг бичнэ — тухайн жорын дагуу хаана ч ижил хоол болгож болно. Dockerfile нь яг ийм "жор" — тухайн заавраар хаа ч ижил орчин үүсгэнэ.

### Docker байхгүй бол:
```
Хөгжүүлэгч А:    Хөгжүүлэгч Б:    Сервер:
Node.js 18        Node.js 20        Node.js 16
MySQL 8.0         MySQL 8.0         MySQL 5.7
Windows           Mac               Ubuntu
→ "Миний компьютерт ажиллана, чинийхэд ажиллахгүй" 😤
```

### Docker байвал:
```
Dockerfile → Image → Container
                         ↓
              Windows, Mac, Linux — хаа ч ижил ажиллана ✓
```

---

## 2. Docker-ийн Гол Бүрдэл Хэсгүүд

### Docker Engine
Docker-ийн үндсэн цөм — контейнер үүсгэж, ажиллуулдаг. Linux дээр шууд, Windows/Mac дээр давхарга дамжуулан ажилладаг.

### Docker Image (Дүрс)
Аппликейшний "загвар" буюу зааврын ном. Өөрчлөгддөггүй — нэг Image-аас олон Container үүсгэж болно.

```
Image = Код + Runtime + Хамаарлууд + Тохиргоо
```

### Docker Container (Контейнер)
Image-аас үүсгэсэн, ажиллаж байгаа тусгаарлагдсан нэгж. VM-аас хөнгөн, хурдан.

```
Image  →  Container 1
       →  Container 2   (нэг Image-аас олон)
       →  Container 3
```

### Dockerfile
Image-г хэрхэн үүсгэхийг тодорхойлдог зааврын файл.

### Docker Hub
Image хадгалж хуваалцдаг нийтийн сан. https://hub.docker.com

### Docker Compose
Олон контейнерийг нэг файлаар тодорхойлж удирддаг хэрэгсэл.

---

## 3. Docker-ийн Дотоод Ажиллагаа

Docker нь Linux kernel-ийн хоёр технологид тулгуурладаг:

**Namespaces** — тусгаарлалт. Контейнер бүр өөрийн process, сүлжээ, файлын систем харна — хостынхыг харахгүй.

**cgroups** — нөөц хязгаарлалт. Container бүрт CPU, RAM-ийн хязгаар тавьдаг.

```
Host OS
  └─ Docker Engine
       ├─ Container 1: [process тусгаарлалт] [CPU 2 цөм, RAM 512MB]
       ├─ Container 2: [process тусгаарлалт] [CPU 1 цөм, RAM 256MB]
       └─ Container 3: [process тусгаарлалт] [CPU 1 цөм, RAM 512MB]
```

---

## ХОЁРДУГААР ХЭСЭГ: СУУЛГАЛТ

---

## 4. Windows дээр Docker Desktop Суулгах

### Системийн Шаардлага

Docker Desktop нь Windows 11-ийн бүх хувилбарыг — Home, Pro, Enterprise, Education — дэмждэг. WSL 2 идэвхтэй байх болон BIOS-д hardware virtualization асаалттай байх шаардлагатай.

```
✓ Windows 10 (64-bit, 1903 хувилбар ба дээш) / Windows 11
✓ RAM: дор хаяж 4GB (8GB санал болгодог)
✓ CPU: virtualization дэмждэг байх
✓ BIOS-д virtualization идэвхтэй байх
```

### CPU Virtualization Шалгах

`Ctrl + Shift + Esc` → Task Manager → Performance → CPU → **Virtualization: Enabled** байх ёстой.

Хэрэв "Disabled" бол BIOS-д орж идэвхжүүлэх шаардлагатай. (Intel → "Intel Virtualization Technology", AMD → "SVM Mode")

### 1-р Алхам: WSL 2 Суулгах

WSL 2 нь Docker Desktop-ийн файл хуваалцалт болон эхлүүлэлтийн хурдыг сайжруулдаг. Docker Desktop нь WSL 2-ийн динамик санах ойн хуваарилалтыг ашиглан нөөцийн зарцуулалтыг оновчтой болгодог.

PowerShell-г **Administrator** эрхтэйгээр нээнэ:

```powershell
# WSL болон Ubuntu нэгэн зэрэг суулгах
wsl --install

# Дахин эхлүүлнэ
```

Дахин эхлүүлсний дараа Ubuntu-ийн username болон нууц үг тохируулна.

WSL хувилбар шалгах:
```powershell
wsl --list --verbose
# VERSION 2 байх ёстой
```

Хэрэв VERSION 1 байвал:
```powershell
wsl --set-default-version 2
```

### 2-р Алхам: Docker Desktop Татаж Суулгах

**Татах хаяг:** https://www.docker.com/products/docker-desktop/

Docker Desktop нь Microsoft Store-оос татаж суулгах боломжтой болсон. Мөн EXE суулгагч хэлбэрээр ч татаж болно.

1. `Docker Desktop Installer.exe` татна
2. **Administrator** эрхтэйгээр ажиллуулна
3. "Use WSL 2 instead of Hyper-V" сонголтыг тэмдэглэнэ ✓
4. "Add shortcut to desktop" тэмдэглэнэ ✓
5. "Ok" дарж суулгана
6. Суулгалт дуусмагц **дахин эхлүүлнэ**

### 3-р Алхам: Ажиллаж байгааг Шалгах

Docker Desktop-г нээнэ (taskbar дотор whale дүрс харагдана).

Command Prompt эсвэл PowerShell-д:
```cmd
docker --version
docker compose version
```

```
Docker version 29.x.x
Docker Compose version v2.x.x
```

Туршилт:
```cmd
docker run hello-world
```

```
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

---

## 5. Mac дээр Docker Desktop Суулгах

**Татах хаяг:** https://www.docker.com/products/docker-desktop/

Chip-ийн төрлөөс хамаарч татна:
- Apple Silicon (M1/M2/M3/M4) → "Apple Silicon" хувилбар
- Intel → "Intel Chip" хувилбар

Mac-д QEMU виртуализаци 2025 оны 7-р сарын 14-д дэмжлэгт байхгүй болно. Apple Virtualization Framework нь Apple Silicon архитектуртай нягт нийцдэг, гүйцэтгэл болон тогтвортой байдлыг сайжруулдаг.

```bash
# Суулгасны дараа шалгах
docker --version
docker run hello-world
```

---

## ГУРАВДУГААР ХЭСЭГ: DOCKERFILE БИЧИХ

---

## 6. Dockerfile-ийн Бүтэц ба Заавар

Dockerfile нь дарааллан гүйцэтгэгдэх заавруудын жагсаалт юм. Мөр бүр **давхарга (layer)** үүсгэдэг.

### Үндсэн заавруудын тайлбар

```dockerfile
# FROM — суурь дүрс сонгох
# Энэ нь бусад бүх зүйлийн эх суурь
FROM node:20-alpine

# WORKDIR — контейнер доторх ажлын хавтас тогтоох
# Цаашдын бүх заавар энэ хавтасаас ажиллана
WORKDIR /app

# COPY — файл хуулах
# COPY <хостын файл> <контейнерийн зам>
COPY package*.json ./

# RUN — командыг Image үүсгэх үед ажиллуулах
# Үр дүн нь Image-д хадгалагдана
RUN npm install

# COPY — код хуулах (хамаарлуудыг суулгасны дараа)
COPY . .

# ENV — орчны хувьсагч тохируулах
ENV NODE_ENV=production

# EXPOSE — контейнерийн ашиглах порт зарлах
# Зөвхөн баримтлалын зорилгоор — porter нээхгүй
EXPOSE 3000

# CMD — контейнер эхлэхэд ажиллуулах команд
# Dockerfile-д зөвхөн нэг CMD байж болно
CMD ["node", "app.js"]
```

### Давхарга ба Cache

Docker Dockerfile-ийн мөр бүрийн үр дүнг **cache** хийдэг. Ингэснээр зөвхөн өөрчлөгдсөн давхаргаас л дахин build хийдэг.

```dockerfile
FROM node:20-alpine          # Давхарга 1 — татсан дүрс (cache)
WORKDIR /app                 # Давхарга 2 (cache)
COPY package*.json ./        # Давхарга 3 — package.json өөрчлөгдвөл дахин
RUN npm install              # Давхарга 4 — deps өөрчлөгдвөл дахин
COPY . .                     # Давхарга 5 — код өөрчлөгдвөл дахин
CMD ["node", "app.js"]       # Давхарга 6
```

**Яагаад `COPY package*.json` эхэнд байна вэ?**

Код байнга өөрчлөгдөж байдаг. Хэрэв `COPY . .` эхэнд байвал код өөрчлөгдөх бүрт `npm install` дахин ажиллана — удаан. Package.json өөрчлөгдсөн үед л `npm install` дахин ажиллахын тулд тусдаа `COPY` хийдэг.

### Node.js Task Service-ийн Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 1. Хамаарлуудыг суулгах (cache давхарга)
COPY package*.json ./
RUN npm install --production

# 2. Prisma client үүсгэх
COPY prisma ./prisma
RUN npx prisma generate

# 3. Код хуулах
COPY shared ./shared
COPY src    ./src
COPY app.js .

EXPOSE 3002

CMD ["node", "app.js"]
```

### .dockerignore файл

```
node_modules    ← том, дотор нь дахин суулгана
.env            ← нууц мэдээлэл хуулахгүй
logs/           ← лог файлууд
.git            ← git түүх
*.md            ← баримт бичгүүд
```

---

## ДӨРӨВДҮГЭЭР ХЭСЭГ: DOCKER КОМАНДУУД

---

## 7. Image-тай Ажиллах

```bash
# ── Image үүсгэх ───────────────────────────────────────
# -t нэр:хувилбар (tag)
# .  Dockerfile байгаа хавтас (current directory)
docker build -t task-service:1.0 .

# Cache ашиглахгүйгээр дахин үүсгэх
docker build --no-cache -t task-service:1.0 .

# ── Image жагсаалт ─────────────────────────────────────
docker images

# ── Image устгах ───────────────────────────────────────
docker rmi task-service:1.0

# ── Docker Hub-аас татах ───────────────────────────────
docker pull node:20-alpine
docker pull mysql:8.0
docker pull rabbitmq:3-management

# ── Image-ийн дэлгэрэнгүй мэдээлэл ────────────────────
docker inspect task-service:1.0

# ── Image-ийн давхаргуудыг харах ───────────────────────
docker history task-service:1.0
```

---

## 8. Container-тай Ажиллах

```bash
# ── Container ажиллуулах ────────────────────────────────
docker run \
  -d \                          # Дэвсгэрт (detached mode)
  -p 3002:3002 \                # Хостын 3002 → контейнерийн 3002
  --name task-service \         # Контейнерт нэр өгнэ
  --env-file .env \             # .env файлаас тохиргоо уншина
  task-service:1.0              # Ямар image-аас

# ── Энгийн ажиллуулалт ─────────────────────────────────
docker run -p 3000:3000 my-app

# ── Орчны хувьсагч шууд дамжуулах ─────────────────────
docker run -e NODE_ENV=production -e PORT=3002 my-app

# ── Container жагсаалт ─────────────────────────────────
docker ps           # Ажиллаж байгаа
docker ps -a        # Бүгд (зогссон ч)

# ── Container лог ──────────────────────────────────────
docker logs task-service
docker logs -f task-service       # Шууд урсгалаар (follow)
docker logs --tail 50 task-service # Сүүлийн 50 мөр

# ── Container-т нэвтрэх ────────────────────────────────
docker exec -it task-service sh   # Shell нээнэ
docker exec task-service ls /app  # Нэг команд ажиллуулна

# ── Container зогсоох, устгах ──────────────────────────
docker stop task-service          # Аюулгүй зогсооно
docker kill task-service          # Шууд зогсооно (яаралтай)
docker rm task-service            # Зогссон container устгана
docker rm -f task-service         # Ажиллаж байгааг ч устгана

# ── Зогссон бүх container устгах ──────────────────────
docker container prune

# ── Container-ийн байдал харах ─────────────────────────
docker stats task-service         # CPU, RAM бодит цагаар
docker inspect task-service       # Дэлгэрэнгүй мэдээлэл
```

---

## 9. Volume — Өгөгдөл Хадгалах

Container устгагдахад доторх бүх өгөгдөл алдагддаг. Volume нь өгөгдлийг контейнерийн гадна хадгалах механизм.

```bash
# ── Volume үүсгэх ──────────────────────────────────────
docker volume create mysql_data

# ── Volume жагсаалт ────────────────────────────────────
docker volume ls

# ── Volume ашиглан container ажиллуулах ────────────────
docker run -v mysql_data:/var/lib/mysql mysql:8.0
#              ↑               ↑
#          Volume нэр   Container доторх зам

# ── Хостын хавтас холбох (bind mount) ─────────────────
docker run -v ./logs:/app/logs my-app
#              ↑         ↑
#          Хостын хавтас  Container доторх зам

# ── Volume устгах ──────────────────────────────────────
docker volume rm mysql_data
docker volume prune    # Ашиглагдахгүй байгаа бүгд
```

---

## 10. Network — Контейнерүүд Хэрхэн Харилцах

```bash
# ── Network үүсгэх ─────────────────────────────────────
docker network create my-network

# ── Network-тэй container ажиллуулах ───────────────────
docker run --network my-network --name mysql mysql:8.0
docker run --network my-network --name app my-app
# Нэг network дотор "mysql" нэрээр хандаж болно

# ── Network жагсаалт ───────────────────────────────────
docker network ls

# ── Container-г network-д нэмэх ────────────────────────
docker network connect my-network task-service
```

---

## ТАВДУГААР ХЭСЭГ: DOCKER COMPOSE

---

## 11. Docker Compose — Олон Container Удирдах

`docker-compose.yml` файлд бүх сервисийг тодорхойлж, нэг командаар ажиллуулна.

### Суурь docker-compose.yml бүтэц

```yaml
version: '3.8'

services:

  # ── MySQL ─────────────────────────────────────────────
  mysql:
    image: mysql:8.0              # Docker Hub-аас image татна
    container_name: app_mysql
    restart: unless-stopped       # Унавал автоматаар дахин эхлэнэ
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE:      mydb
    ports:
      - "3306:3306"               # хост:container
    volumes:
      - mysql_data:/var/lib/mysql # Өгөгдлийг хадгалах
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout:  5s
      retries:  10

  # ── App ───────────────────────────────────────────────
  app:
    build: .                      # Dockerfile-аас үүсгэнэ
    container_name: my_app
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: mysql://root:rootpass@mysql:3306/mydb
      NODE_ENV:     production
    depends_on:
      mysql:
        condition: service_healthy  # MySQL бэлэн болсны дараа
    volumes:
      - ./logs:/app/logs          # Лог файлуудыг хадгалах

volumes:
  mysql_data:                     # Persistent volume
```

### Docker Compose Командууд

```bash
# ── Эхлүүлэх ───────────────────────────────────────────
docker compose up           # Өмнөд ажиллуулна (лог харагдана)
docker compose up -d        # Дэвсгэрт ажиллуулна
docker compose up -d --build # Image дахин үүсгэж ажиллуулна

# ── Нэг сервис дахин build хийх ────────────────────────
docker compose up -d --build app

# ── Зогсоох ────────────────────────────────────────────
docker compose down          # Зогсооно (volume хэвээр)
docker compose down -v       # Зогсооно + volume устгана

# ── Лог харах ──────────────────────────────────────────
docker compose logs -f           # Бүх сервис
docker compose logs -f app       # Нэг сервис
docker compose logs --tail 50 app

# ── Container жагсаалт ─────────────────────────────────
docker compose ps

# ── Командыг container-т ажиллуулах ────────────────────
docker compose exec app sh
docker compose exec app npx prisma migrate dev

# ── Дахин эхлүүлэх ─────────────────────────────────────
docker compose restart app

# ── Instance тоо нэмэх ─────────────────────────────────
docker compose up -d --scale app=3
```

---

## ЗУРГААДУГААР ХЭСЭГ: ПРАКТИК ЖИШЭЭ

---

## 12. Task Manager Microservice-г Docker-ээр Ажиллуулах

```yaml
# docker-compose.yml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE:      task_manager_db
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test:     ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      retries:  10

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin123
    healthcheck:
      test:     ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      retries:  10

  task-service:
    build: ./task-service
    ports:
      - "3002:3002"
    environment:
      DATABASE_URL: mysql://root:rootpass@mysql:3306/task_manager_db
      RABBITMQ_URL: amqp://admin:admin123@rabbitmq:5672
    depends_on:
      mysql:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  notification-service:
    build: ./notification-service
    environment:
      RABBITMQ_URL: amqp://admin:admin123@rabbitmq:5672
    depends_on:
      rabbitmq:
        condition: service_healthy

volumes:
  mysql_data:
```

### Ажиллуулах алхамууд

```bash
# 1. Бүгдийг эхлүүлэх
docker compose up -d --build

# 2. MySQL бэлэн болсны дараа Prisma migration
docker compose exec task-service npx prisma migrate dev --name init

# 3. Лог шалгах
docker compose logs -f task-service

# 4. Туршиж үзэх
curl -X POST http://localhost:3002/api/workspaces/1/tasks \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1" \
  -d '{"title":"Docker дотор ажиллаж байна!"}'

# 5. RabbitMQ UI
# http://localhost:15672  (admin / admin123)
```

---

## 13. Нийтлэг Алдаа ба Шийдэл

**`Cannot connect to the Docker daemon`**
```bash
# Docker Desktop нээлттэй эсэхийг шалгана
# Windows taskbar-д whale дүрс харагдаж байх ёстой
```

**`Port is already allocated`**
```bash
# 3306 port ашиглагдаж байна
# Windows
netstat -ano | findstr :3306
# docker-compose.yml дотор port өөрчлөх
ports:
  - "3307:3306"   # 3307 ашиглана
```

**`Table doesn't exist`**
```bash
# Migration ажиллаагүй
docker compose exec task-service npx prisma migrate dev --name init
```

**Код өөрчлөгдсөний дараа шинэчлэх**
```bash
docker compose up -d --build task-service
```

**Бүгдийг цэвэрлэж дахин эхлэх**
```bash
docker compose down -v          # Зогсоож, volume устгана
docker compose up -d --build    # Дахин үүсгэж эхлүүлнэ
```

---

## 14. Хэрэгтэй Нэмэлт Командууд

```bash
# ── Ерөнхий цэвэрлэгээ ─────────────────────────────────
# Ашиглагдахгүй image, container, volume, network бүгд
docker system prune

# Volume ч устгах
docker system prune -a --volumes

# ── Хэчнээн зай эзлэж байна ────────────────────────────
docker system df

# ── Бүх container зогсоох ──────────────────────────────
docker stop $(docker ps -q)

# ── Image-г Docker Hub-д байршуулах ────────────────────
docker login
docker tag task-service:1.0 username/task-service:1.0
docker push username/task-service:1.0

# ── Image-г файл болгон хадгалах/ачаалах ───────────────
docker save task-service:1.0 > task-service.tar
docker load < task-service.tar
```

---

## Товч Дүгнэлт

Docker бол орчин үеийн хөгжүүлэлтийн **зайлшгүй хэрэгсэл** болсон. Санах ойд байлгах зүйл:

- **Image** → өөрчлөгддөггүй загвар (Dockerfile-аас үүснэ)
- **Container** → Image-аас ажиллаж байгаа instance
- **Dockerfile** → Image үүсгэх зааврын файл
- **Volume** → container устгасан ч өгөгдөл хэвээр
- **docker compose up -d --build** → хамгийн их ашиглагдах команд
- **depends_on + healthcheck** → сервис бэлэн болсны дараа нөгөөг нь эхлүүлнэ
- **.dockerignore** → `node_modules`, `.env` хуулахгүй байх
- **Cache давхарга** → `package.json` эхлээд хуулж `npm install` ажиллуулах

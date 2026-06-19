# Контейнер Технологи — Дэлгэрэнгүй Онолын Гарын Авлага

---

## 1. Асуудал: "Миний компьютерт ажиллаж байна, чинийхэд ажиллахгүй байна"

Хөгжүүлэгч бүрийн компьютер өөр өөр байдаг:

```
Хөгжүүлэгч А:          Хөгжүүлэгч Б:          Сервер:
Windows 11              Mac M2                  Ubuntu 22.04
Node.js 18             Node.js 20              Node.js 16
MySQL 8.0              MySQL 8.0               MySQL 5.7
npm 9.x                npm 10.x                npm 8.x
```

Нэг хөгжүүлэгчийн компьютерт ажиллаж байсан апп нөгөөгийнх дээр ажиллахгүй болдог. Учир нь орчин (environment) өөр байна.

**Шийдэл:** Аппликейшнийг орчин хамт нь "хайрцагласан" байдлаар дамжуулах.

---

## 2. Контейнер гэж юу вэ?

Контейнер бол аппликейшнийг **орчин хамт нь хайрцагласан** тусгаарлагдсан нэгж юм. Аппликейшний код, хамаарлууд (dependencies), тохиргоо, runtime бүгд нэг контейнерт багтдаг.

Зүйрлэл: Далайн тээврийн **стандарт контейнер** гэж бодоорой. Доторх ачааг ямар онгоц, ямар машин тээж байгаагаас үл хамааран контейнер хаа ч очсон ижил хэлбэртэй байдаг. Аппликейшний контейнер яг ийм — ямар компьютер, ямар сервер дээр ажиллуулсан ч дотор нь орчин ижил байна.

```
Контейнер:
┌─────────────────────────────┐
│  Миний апп                  │
│  Node.js 20                 │  ← Орчин хамт нь
│  MySQL 8.0                  │    хайрцагласан
│  npm dependencies           │
│  Тохиргоо                   │
└─────────────────────────────┘
         ↓
Windows дээр ч, Mac дээр ч, Linux сервер дээр ч
яг ижил ажиллана
```

---

## 3. Контейнер vs Виртуал Машин

Контейнерийг ойлгохын тулд **Виртуал Машин (VM)**-тэй харьцуулах нь хамгийн тохиромжтой.

### Виртуал Машин

VM нь бүтэн компьютерыг дуурайдаг. Өөрийн OS, kernel, hardware driver-тай байдаг.

```
┌──────────────────────────────────────────┐
│              Physical Server             │
├──────────────────────────────────────────┤
│              Hypervisor                  │
├────────────┬────────────┬────────────────┤
│   VM 1     │   VM 2     │   VM 3         │
│ ┌────────┐ │ ┌────────┐ │ ┌────────────┐ │
│ │  App   │ │ │  App   │ │ │    App     │ │
│ │ Ubuntu │ │ │ Windows│ │ │   CentOS   │ │
│ │ Kernel │ │ │ Kernel │ │ │   Kernel   │ │
│ └────────┘ │ └────────┘ │ └────────────┘ │
└────────────┴────────────┴────────────────┘
```

Сервер бүр бүтэн OS агуулдаг тул **хэдэн GB** зай эзэлнэ, эхлүүлэхэд **хэдэн минут** шаардагдана.

### Контейнер

Контейнер нь OS kernel-г **хуваалцдаг** — зөвхөн аппликейшн болон хамаарлуудыг тусгаарладаг.

```
┌──────────────────────────────────────────┐
│              Physical Server             │
├──────────────────────────────────────────┤
│         Linux Kernel (нэг л)             │
├──────────────────────────────────────────┤
│       Container Runtime (Docker)         │
├────────────┬────────────┬────────────────┤
│ Container1 │ Container2 │ Container 3    │
│ ┌────────┐ │ ┌────────┐ │ ┌────────────┐ │
│ │  App   │ │ │  App   │ │ │    App     │ │
│ │Node 20 │ │ │Node 18 │ │ │  Python 3  │ │
│ │  deps  │ │ │  deps  │ │ │    deps    │ │
│ └────────┘ │ └────────┘ │ └────────────┘ │
└────────────┴────────────┴────────────────┘
```

Kernel хуваалцдаг тул контейнер **хэдэн MB** л зай эзэлнэ, эхлүүлэхэд **секундын дотор** дуусдаг.

### Харьцуулалт

| | Виртуал Машин | Контейнер |
|---|---|---|
| **Хэмжээ** | GB (бүтэн OS) | MB (апп + deps) |
| **Эхлүүлэх** | Хэдэн минут | Секундын дотор |
| **Тусгаарлалт** | Бүрэн (hardware түвшин) | Процессын түвшин |
| **Нөөц** | Их зарцуулна | Бага зарцуулна |
| **OS** | Тус бүрийн OS | Kernel хуваалцна |
| **Аюулгүй байдал** | Илүү найдвартай | Арай бага |

---

## 4. Контейнерийн Дотоод Механизм

Контейнер нь Linux kernel-ийн хоёр технологид тулгуурладаг.

### Namespaces — Тусгаарлалт

Namespace нь контейнерт **өөрийн гэсэн орчин** байгаа мэт харагдуулдаг. Контейнер өөрийн process жагсаалт, сүлжээний интерфейс, файлын систем харна — хост системийнхийг харахгүй.

```
Хост систем:                  Контейнер А:
Process 1 (nginx)             Process 1 (node app)  ← хостын 1345
Process 2 (mysql)             Process 2 (npm)       ← хостын 1346
Process 3 (docker)
Process 1345 (node app)       Контейнер Б:
Process 1346 (npm)            Process 1 (python)    ← хостын 2100
Process 2100 (python)
```

Контейнер А болон Б хоёулаа "Process 1"-т байгаа мэт харагдна — бие биенийхийг харахгүй.

### cgroups — Нөөц Хязгаарлалт

cgroups нь контейнер бүрт CPU, RAM, сүлжээний нөөцийн **хязгаар тавидаг**. Нэг контейнер бусдын нөөцийг барьж чадахгүй.

```
Контейнер А: CPU 2 цөм, RAM 512MB хязгаартай
Контейнер Б: CPU 1 цөм, RAM 256MB хязгаартай

А-д санах ой дүүрсэн ч Б-д нөлөөлөхгүй
```

---

## 5. Docker гэж юу вэ?

Docker бол контейнерийг **үүсгэх, ажиллуулах, хуваалцах** хамгийн өргөн ашиглагддаг платформ юм. 2013 онд гарч контейнер технологийг үйлдвэрлэлийн стандарт болгосон.

Docker-ийн гол бүрдэл хэсгүүд:

**Docker Image (Дүрс):** Аппликейшний "зааврын ном" — яг ямар орчин, яг ямар файл агуулахыг тодорхойлдог. Image нь өөрчлөгддөггүй (immutable).

**Docker Container (Контейнер):** Image-аас үүсгэсэн ажиллаж байгаа instance. Нэг Image-аас олон Container үүсгэж болно.

**Dockerfile:** Image-г хэрхэн үүсгэхийг тодорхойлдог зааврын файл.

**Docker Hub / Registry:** Image хадгалж хуваалцдаг сан.

```
Dockerfile → docker build → Image → docker run → Container
  (заавар)     (үүсгэх)    (дүрс)   (ажиллуулах)  (ажиллаж байгаа)
```

---

## 6. Dockerfile — Image Үүсгэх Заавар

Dockerfile бол Image-г хэрхэн үүсгэхийг **алхам алхмаар** тодорхойлдог текст файл.

### Task Service-ийн Dockerfile

```dockerfile
# ── Суурь дүрс ────────────────────────────────────────
# Node.js 20-ийн Alpine Linux хувилбар
# Alpine нь маш жижиг (~5MB) Linux хувилбар
FROM node:20-alpine

# ── Ажлын хавтас ──────────────────────────────────────
# Контейнер дотор ажлын хавтас тогтооно
WORKDIR /app

# ── Хамаарлуудыг суулгах ──────────────────────────────
# Эхлээд package.json л хуулна (кэш ашиглахын тулд)
# package.json өөрчлөгдөөгүй бол npm install дахин ажиллахгүй
COPY package*.json ./
RUN npm install --production

# ── Prisma client үүсгэх ──────────────────────────────
COPY prisma ./prisma
RUN npx prisma generate

# ── Бусад файлуудыг хуулна ────────────────────────────
COPY . .

# ── Port зарлах ───────────────────────────────────────
# Контейнер 3002 портыг ашиглана гэдгийг зарлана
EXPOSE 3002

# ── Контейнер эхлэхэд ажиллуулах команд ──────────────
CMD ["node", "app.js"]
```

### Dockerfile-ийн Давхарга (Layer) Систем

Dockerfile-ийн мөр бүр **давхарга** үүсгэдэг. Docker давхарга бүрийг cache хийдэг тул зөвхөн өөрчлөгдсөн давхаргаас доош нь дахин үүсгэдэг.

```
FROM node:20-alpine    → Давхарга 1 (cache)
WORKDIR /app           → Давхарга 2 (cache)
COPY package*.json ./  → Давхарга 3 (package.json өөрчлөгдвөл дахин)
RUN npm install        → Давхарга 4 (зөвхөн deps өөрчлөгдвөл дахин)
COPY prisma ./prisma   → Давхарга 5
RUN npx prisma generate→ Давхарга 6
COPY . .               → Давхарга 7 (код өөрчлөгдвөл дахин)
CMD ["node", "app.js"] → Давхарга 8
```

Зөвхөн код өөрчлөгдвөл давхарга 7-аас л дахин үүсгэнэ — давхарга 1-6 cache-аас авна. Ингэснээр build хурдан болно.

### .dockerignore файл

```
# .dockerignore
node_modules    ← контейнерт хуулахгүй (том, дотор дахин суулгана)
.env            ← нууц мэдээлэл хуулахгүй
logs/           ← лог файлууд хуулахгүй
*.md            ← баримт бичгүүд хуулахгүй
.git            ← git түүх хуулахгүй
```

---

## 7. Docker-ийн Үндсэн Командууд

### Image-тай ажиллах

```bash
# Image үүсгэх
# -t → tag (нэр:хувилбар)
# .  → Dockerfile байгаа хавтас
docker build -t task-service:1.0 .

# Байгаа Image-уудыг харах
docker images

# Image устгах
docker rmi task-service:1.0

# Docker Hub-аас татах
docker pull node:20-alpine
```

### Container-тай ажиллах

```bash
# Container ажиллуулах
# -d         → дэвсгэрт ажиллуулна
# -p 3002:3002 → хостын 3002 портыг контейнерийн 3002-т холбоно
# --name     → контейнерт нэр өгнө
# --env-file → .env файлаас тохиргоо уншина
docker run -d \
  -p 3002:3002 \
  --name task-service \
  --env-file .env \
  task-service:1.0

# Ажиллаж байгаа контейнерүүдийг харах
docker ps

# Бүх контейнерүүдийг харах (зогссон ч)
docker ps -a

# Контейнерийн лог харах
docker logs task-service
docker logs -f task-service  # Шууд урсгалаар

# Контейнерт нэвтрэх
docker exec -it task-service sh

# Контейнер зогсоох, устгах
docker stop task-service
docker rm task-service
```

---

## 8. Docker Compose — Олон Контейнер Удирдах

Microservice архитектурт олон сервис нэгэн зэрэг ажиллах шаардлагатай. Тус бүрд `docker run` ажиллуулах нь хүнд. **Docker Compose** нь олон контейнерийг нэг файлаар тодорхойлж нэг командаар ажиллуулах боломж олгодог.

### Task Manager-ийн docker-compose.yml

```yaml
version: '3.8'

services:

  # MySQL — Task Service-ийн өгөгдлийн сан
  mysql:
    image: mysql:8.0
    container_name: task_manager_mysql
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE:      task_manager_db
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql    # Өгөгдлийг хадгалах
    healthcheck:
      test: mysqladmin ping -h localhost
      interval: 10s
      timeout:  5s
      retries:  5

  # RabbitMQ — Message Broker
  rabbitmq:
    image: rabbitmq:3-management
    container_name: task_manager_rabbitmq
    ports:
      - "5672:5672"     # AMQP protocol
      - "15672:15672"   # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin123
    healthcheck:
      test: rabbitmq-diagnostics -q ping
      interval: 10s
      retries:  5

  # Task Service
  task-service:
    build: ./task-service          # Dockerfile-аас үүсгэнэ
    container_name: task_service
    ports:
      - "3002:3002"
    environment:
      PORT:          3002
      DATABASE_URL:  mysql://root:rootpass@mysql:3306/task_manager_db
      RABBITMQ_URL:  amqp://admin:admin123@rabbitmq:5672
      NODE_ENV:      development
      SERVICE_NAME:  task-service
    depends_on:
      mysql:
        condition: service_healthy    # MySQL бэлэн болсны дараа
      rabbitmq:
        condition: service_healthy    # RabbitMQ бэлэн болсны дараа

  # Notification Service
  notification-service:
    build: ./notification-service
    container_name: notification_service
    environment:
      RABBITMQ_URL: amqp://admin:admin123@rabbitmq:5672
      NODE_ENV:     development
      SERVICE_NAME: notification-service
    depends_on:
      rabbitmq:
        condition: service_healthy

# Persistent volume — контейнер устгасан ч өгөгдөл хэвээр
volumes:
  mysql_data:
```

### Docker Compose командууд

```bash
# Бүх сервис эхлүүлэх (дэвсгэрт)
docker-compose up -d

# Бүх сервисийн лог харах
docker-compose logs -f

# Нэг сервисийн лог харах
docker-compose logs -f task-service

# Бүх сервис зогсоох
docker-compose down

# Сервис дахин үүсгэж эхлүүлэх
docker-compose up -d --build task-service

# Сервисийн тоо нэмэх (3 instance)
docker-compose up -d --scale task-service=3
```

---

## 9. Container Network — Контейнерүүд Хэрхэн Харилцах вэ?

Docker Compose дотор сервисүүд **нэрээрээ** харилцдаг — IP хаяг хэрэггүй.

```yaml
# docker-compose.yml дахь нэр
services:
  mysql:          # ← энэ нэрээр хандана
  rabbitmq:       # ← энэ нэрээр хандана
  task-service:   # ← энэ нэрээр хандана
```

```javascript
// task-service дотор:
DATABASE_URL = "mysql://root:pass@mysql:3306/db"
//                              ↑
//                    "mysql" гэсэн нэрээр хандана
//                    IP хаяг биш

RABBITMQ_URL = "amqp://admin:pass@rabbitmq:5672"
//                                ↑
//                       "rabbitmq" нэрээр хандана
```

Docker Compose дотоод DNS-ийг автоматаар тохируулдаг тул сервис нэр нь хаяг болж ажилладаг.

---

## 10. Volume — Өгөгдөл Хадгалах

Контейнер устгагдахад дотор байсан бүх өгөгдөл алдагддаг. **Volume** нь өгөгдлийг контейнерийн гадна хадгалах механизм юм.

```
Контейнер устгана       Volume хэвээр
┌──────────────┐        ┌─────────────┐
│   MySQL      │        │  mysql_data │
│   /var/lib   │──────→ │  (disk-д)   │
│   /mysql     │        │             │
└──────────────┘        └─────────────┘
   устгагдана             хэвээр байна

Шинэ контейнер үүсгэнэ
┌──────────────┐
│   MySQL      │──────→ mysql_data-г ашиглана
│   /var/lib   │          (өгөгдөл хэвээр)
│   /mysql     │
└──────────────┘
```

---

## 11. Контейнерийн Давуу болон Сул Талууд

### Давуу талууд

**Орчны тогтвортой байдал.** "Миний компьютерт ажилладаг" асуудал арилна — бүх газар нэг орчин.

**Хурдан deploy.** Секундын дотор контейнер эхлэх, зогсоох боломжтой.

**Тусгаарлалт.** Нэг контейнерийн асуудал бусадт нөлөөлөхгүй.

**Масштаблах хялбар.** Нэг командаар instance тоог нэмэх боломжтой.

**Нөөц хэмнэлттэй.** VM-тэй харьцуулахад CPU, RAM бага зарцуулна.

### Сул талууд

**Суралцах хугацаа.** Docker, networking, volume гэх мэт шинэ ойлголтууд олон.

**Linux-д суурилсан.** Бүх контейнер Linux kernel дээр ажилладаг — Windows-д Docker Desktop дамжуулагч давхарга шаардана.

**Storage нарийн.** Persistent storage тохируулах нь VM-тэй харьцуулахад нарийн.

---

## 12. Контейнер Технологийн Экосистем

Контейнер дэлхийд ширгэсний хамт технологийн экосистем хөгжсөн:

**Docker** — контейнер үүсгэх, ажиллуулах стандарт хэрэгсэл.

**Kubernetes (K8s)** — олон сервер дээр олон контейнерийг удирдах систем. Автомат масштаблалт, rolling update, self-healing боломжтой. Том системд стандарт болсон.

**Docker Swarm** — Docker-ийн дагалдах контейнер удирдлагын систем. Kubernetes-ээс хялбар боловч бага хүчтэй.

**Container Registry** — Image хадгалах сан:
- Docker Hub (олон нийтийн)
- GitHub Container Registry
- AWS ECR, Google Artifact Registry (үүлэн)

---

## Товч Дүгнэлт

Контейнер технологи бол орчин үеийн апп хөгжүүлэлтийн **суурь технологи** болсон. Санах ойд байлгах зүйл:

- **Контейнер** → апп + орчин хамт нь хайрцагласан тусгаарлагдсан нэгж
- **VM-тэй ялгаа** → kernel хуваалцдаг, тул хөнгөн, хурдан
- **Dockerfile** → image үүсгэх зааврын файл
- **Image** → өөрчлөгддөггүй загвар
- **Container** → Image-аас ажиллаж байгаа instance
- **Docker Compose** → олон контейнерийг нэг файлаар удирдана
- **Volume** → контейнер устгасан ч өгөгдөл хэвээр байна
- **Network** → Docker Compose дотор сервис нэрээрээ харилцана
- **Kubernetes** → олон сервер дээр олон контейнер удирдах дараагийн алхам

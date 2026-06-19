# Docker Compose Бичих Арга — Дэлгэрэнгүй Гарын Авлага

---

## 1. Docker Compose гэж юу вэ?

Docker Compose бол олон контейнерийг **нэг YAML файлд** тодорхойлж, нэг командаар удирддаг хэрэгсэл юм.

```bash
# Compose байхгүй бол — тус бүрд нь команд ажиллуулна
docker run -d --name mysql ...
docker run -d --name rabbitmq ...
docker run -d --name task-service ...
docker run -d --name notification-service ...

# Compose-тэй — нэг команд
docker compose up -d
```

Compose файлыг **`docker-compose.yml`** нэрээр хадгалдаг.

---

## 2. YAML Форматын Үндэс

Docker Compose нь YAML хэлбэрийг ашигладаг. YAML бол хүнд уншихад хялбар өгөгдлийн формат.

### Гол дүрмүүд

**Зай (indent) — Tab биш, space ашиглана:**
```yaml
services:        # ← 0 зай
  mysql:         # ← 2 зай
    image: mysql # ← 4 зай
```

**Жагсаалт — `-` тэмдгээр эхэлнэ:**
```yaml
ports:
  - "3306:3306"
  - "33060:33060"
```

**Key-Value — `:` тэмдгээр тусгаарлана:**
```yaml
image: mysql:8.0
container_name: my_mysql
restart: unless-stopped
```

**Олон мөрт утга:**
```yaml
environment:
  DATABASE_URL: mysql://root:pass@mysql:3306/db
  NODE_ENV: development
```

---

## 3. docker-compose.yml-ийн Бүтэц

```yaml
version: '3.8'        # Compose форматын хувилбар

services:             # Контейнерүүдийн тодорхойлолт
  сервис_нэр:
    # ... тохиргоо

volumes:              # Persistent storage
  volume_нэр:

networks:             # Дотоод сүлжээ
  network_нэр:
```

---

## 4. `services` — Контейнер Тодорхойлох

### 4.1 `image` — Бэлэн Image Ашиглах

Docker Hub эсвэл бусад registry-ийн image-г татаж ашиглана.

```yaml
services:
  mysql:
    image: mysql:8.0          # нэр:хувилбар
  
  rabbitmq:
    image: rabbitmq:3-management

  redis:
    image: redis:7-alpine
```

### 4.2 `build` — Dockerfile-аас Image Үүсгэх

```yaml
services:
  task-service:
    build: ./task-service     # Энгийн — Dockerfile байгаа хавтас

  notification-service:
    build:
      context:    ./notification-service   # Хавтас
      dockerfile: Dockerfile               # Файлын нэр (өгөгдмөл: Dockerfile)
```

`image` болон `build` — нэгийг л сонгоно:
- **`image`** → Docker Hub-аас татна (MySQL, RabbitMQ гэх мэт)
- **`build`** → Dockerfile-аас өөрөө үүсгэнэ (өөрийн апп)

### 4.3 `container_name` — Контейнерт Нэр Өгөх

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: task_mysql    # docker ps-д харагдах нэр
```

Зааагүй бол Docker автоматаар нэр үүсгэнэ (`project_service_1` хэлбэрт).

### 4.4 `restart` — Автомат Дахин Эхлүүлэлт

```yaml
services:
  task-service:
    restart: unless-stopped   # Гараар зогсооноос бусад тохиолдолд дахин эхэлнэ
```

| Утга | Тайлбар |
|---|---|
| `no` | Дахин эхлүүлэхгүй (өгөгдмөл) |
| `always` | Үргэлж дахин эхэлнэ |
| `on-failure` | Зөвхөн алдаатай зогссон үед |
| `unless-stopped` | Гараар зогсооноос бусад тохиолдолд |

### 4.5 `environment` — Орчны Хувьсагч

```yaml
services:
  task-service:
    environment:
      PORT:         3002
      NODE_ENV:     development
      DATABASE_URL: mysql://root:rootpass@mysql:3306/task_manager_db
      RABBITMQ_URL: amqp://admin:admin123@rabbitmq:5672

  # Эсвэл .env файлаас уншина
  task-service-prod:
    env_file:
      - .env
      - .env.production    # Олон файл — дараачийнх нь өмнөхийг дарна
```

**Чухал:** `DATABASE_URL` дотор `mysql` гэсэн нэр нь Container-ийн нэр — IP хаяг биш. Docker Compose дотоод DNS автоматаар шийдэнэ.

### 4.6 `ports` — Port Нээх

```yaml
services:
  mysql:
    ports:
      - "3306:3306"     # "хостын_порт:контейнерийн_порт"
      - "3307:3306"     # Хостын 3307 → Container-ийн 3306

  task-service:
    ports:
      - "3002:3002"
      - "127.0.0.1:3002:3002"   # Зөвхөн localhost-аас хандах
```

**`ports` ба `expose` ялгаа:**
```yaml
ports:
  - "3002:3002"    # Хостоос хандаж болно (гаднаас)

expose:
  - "3002"         # Зөвхөн Compose дотор хандаж болно (гаднаас үгүй)
```

### 4.7 `volumes` — Өгөгдөл Хадгалах

```yaml
services:
  mysql:
    volumes:
      # Named volume — Container устгасан ч өгөгдөл хэвээр
      - mysql_data:/var/lib/mysql

      # Bind mount — хостын хавтасыг Container-т холбоно
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

      # Зөвхөн уншигдах bind mount
      - ./config:/app/config:ro

  task-service:
    volumes:
      - ./logs:/app/logs        # Лог файлуудыг хостод хадгалах

# Named volume-уудыг доор зарлана
volumes:
  mysql_data:
  rabbitmq_data:
```

### 4.8 `depends_on` — Дараалал Тогтоох

```yaml
services:
  task-service:
    depends_on:
      # Энгийн — зөвхөн MySQL эхэлсэн эсэхийг шалгана (бэлэн биш)
      - mysql

      # Дэлгэрэнгүй — MySQL-ийн healthcheck амжилттай болтол хүлээнэ
      mysql:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
```

| Нөхцөл | Тайлбар |
|---|---|
| `service_started` | Container эхэлсэн (бэлэн биш байж болно) |
| `service_healthy` | Healthcheck амжилттай (бэлэн болсон) |
| `service_completed_successfully` | Процесс амжилттай дуусгасан |

**Яагаад `service_healthy` чухал вэ?** MySQL Container эхэлснээс хойш дотор нь бэлэн болоход 20-30 секунд хэрэгтэй. `service_started` ашиглавал Task Service MySQL бэлэн болоогүй байхад холбогдохыг оролдож алдаа гарна.

### 4.9 `healthcheck` — Сервисийн Эрүүл Мэндийг Шалгах

```yaml
services:
  mysql:
    healthcheck:
      test:         ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval:     10s       # 10 секундэд нэг удаа шалгана
      timeout:      5s        # 5 секундэд хариугүй бол алдаа
      retries:      10        # 10 удаа алдаатай бол unhealthy
      start_period: 30s       # Эхний 30 секунд алдааг тоолохгүй

  rabbitmq:
    healthcheck:
      test:     ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout:  5s
      retries:  10
      start_period: 30s

  task-service:
    healthcheck:
      test:     ["CMD", "wget", "-qO-", "http://localhost:3002/health"]
      interval: 15s
      timeout:  5s
      retries:  3
```

`test` командын хэлбэр:
```yaml
# CMD хэлбэр — shell дамжихгүй, аюулгүй (санал болгоно)
test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]

# CMD-SHELL хэлбэр — shell дамжина
test: ["CMD-SHELL", "mysqladmin ping -h localhost"]
```

---

## 5. `networks` — Сүлжээ Тохируулах

Docker Compose автоматаар нэг дотоод сүлжээ үүсгэдэг. Гэхдээ тусдаа сүлжээ тодорхойлох нь сервисүүдийг илүү сайн тусгаарладаг.

```yaml
services:
  mysql:
    networks:
      - backend         # Зөвхөн backend сүлжээнд

  task-service:
    networks:
      - backend         # MySQL-тэй харилцана
      - frontend        # Хэрэглэгчийн хүсэлт хүлээнэ

  notification-service:
    networks:
      - backend         # Зөвхөн RabbitMQ-тэй харилцана

networks:
  backend:              # Дотоод сервисүүдийн сүлжээ
  frontend:             # Гаднаас хандах сервисүүдийн сүлжээ
```

Сүлжээ тусгаарлалтын ашиг: `notification-service` нь `frontend` сүлжээнд байхгүй тул гаднаас шууд хандаж болохгүй — аюулгүй байдал нэмэгдэнэ.

---

## 6. Бүрэн Task Manager docker-compose.yml

```yaml
version: '3.8'

services:

  # ══════════════════════════════════════════════════════
  # MySQL — өгөгдлийн сан
  # ══════════════════════════════════════════════════════
  mysql:
    image: mysql:8.0
    container_name: task_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE:      task_manager_db
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - backend
    healthcheck:
      test:         ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval:     10s
      timeout:      5s
      retries:      10
      start_period: 30s

  # ══════════════════════════════════════════════════════
  # RabbitMQ — message broker
  # ══════════════════════════════════════════════════════
  rabbitmq:
    image: rabbitmq:3-management
    container_name: task_rabbitmq
    restart: unless-stopped
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin123
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - backend
    healthcheck:
      test:         ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval:     10s
      timeout:      5s
      retries:      10
      start_period: 30s

  # ══════════════════════════════════════════════════════
  # Task Service — REST API
  # ══════════════════════════════════════════════════════
  task-service:
    build:
      context:    ./task-service
      dockerfile: Dockerfile
    container_name: task_service
    restart: unless-stopped
    ports:
      - "3002:3002"
    environment:
      PORT:         3002
      DATABASE_URL: mysql://root:rootpass@mysql:3306/task_manager_db
      RABBITMQ_URL: amqp://admin:admin123@rabbitmq:5672
      NODE_ENV:     development
      SERVICE_NAME: task-service
    depends_on:
      mysql:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    volumes:
      - ./logs/task-service:/app/logs
    networks:
      - backend
      - frontend
    healthcheck:
      test:     ["CMD", "wget", "-qO-", "http://localhost:3002/health"]
      interval: 15s
      timeout:  5s
      retries:  3

  # ══════════════════════════════════════════════════════
  # Notification Service — event сонсогч
  # ══════════════════════════════════════════════════════
  notification-service:
    build:
      context:    ./notification-service
      dockerfile: Dockerfile
    container_name: notification_service
    restart: unless-stopped
    environment:
      RABBITMQ_URL: amqp://admin:admin123@rabbitmq:5672
      NODE_ENV:     development
      SERVICE_NAME: notification-service
    depends_on:
      rabbitmq:
        condition: service_healthy
    volumes:
      - ./logs/notification-service:/app/logs
    networks:
      - backend

# ══════════════════════════════════════════════════════
# Volumes
# ══════════════════════════════════════════════════════
volumes:
  mysql_data:
  rabbitmq_data:

# ══════════════════════════════════════════════════════
# Networks
# ══════════════════════════════════════════════════════
networks:
  backend:    # Дотоод сервисүүд
  frontend:   # Гаднаас хандах
```

---

## 7. Нийтлэг Командууд

```bash
# ── Эхлүүлэх ───────────────────────────────────────────
docker compose up -d               # Дэвсгэрт эхлүүлэх
docker compose up -d --build       # Image дахин үүсгэж эхлүүлэх
docker compose up -d --build mysql # Нэг сервисийг дахин build

# ── Зогсоох ────────────────────────────────────────────
docker compose down                # Зогсоох (volume хэвээр)
docker compose down -v             # Зогсоох + volume устгах (анхааралтай!)

# ── Байдал шалгах ──────────────────────────────────────
docker compose ps                  # Контейнерүүдийн жагсаалт
docker compose top                 # Container бүрийн процессууд

# ── Лог ────────────────────────────────────────────────
docker compose logs -f             # Бүх сервис
docker compose logs -f task-service

# ── Нэг сервистэй ажиллах ──────────────────────────────
docker compose restart task-service
docker compose stop task-service
docker compose start task-service

# ── Container-т нэвтрэх ────────────────────────────────
docker compose exec task-service sh
docker compose exec mysql mysql -u root -prootpass

# ── Instance тоо нэмэх ─────────────────────────────────
docker compose up -d --scale task-service=3

# ── Дотоод config харах ────────────────────────────────
docker compose config              # Боловсруулсан compose файл
```

---

## 8. Compose файлыг Орчноор Ялгах

Нэг compose файл Development болон Production орчинд өөр тохиргоотой байдаг. `override` файлаар давхарлана.

```
docker-compose.yml          ← Суурь тохиргоо (хоёр орчинд нийтлэг)
docker-compose.dev.yml      ← Development-д нэмэх тохиргоо
docker-compose.prod.yml     ← Production-д нэмэх тохиргоо
```

```yaml
# docker-compose.yml — суурь
services:
  task-service:
    build: ./task-service
    environment:
      SERVICE_NAME: task-service
```

```yaml
# docker-compose.dev.yml — development нэмэлт
services:
  task-service:
    environment:
      NODE_ENV: development
    volumes:
      - ./task-service/src:/app/src   # Код шинэчлэгдэхэд дахин build хийхгүй
    ports:
      - "9229:9229"                   # Node.js debugger порт
```

```yaml
# docker-compose.prod.yml — production нэмэлт
services:
  task-service:
    environment:
      NODE_ENV: production
    restart: always
    deploy:
      replicas: 3
```

```bash
# Development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 9. Нийтлэг Алдаа ба Шийдэл

### Port давхцах

```yaml
# Алдаа: "port is already allocated"
ports:
  - "3306:3306"   # 3306 port ашиглагдаж байна

# Шийдэл: хостын port өөрчлөх
ports:
  - "3307:3306"   # хостын 3307 → container-ийн 3306
```

### Сервис дарааллын алдаа

```yaml
# Алдаа: task-service MySQL бэлэн болохоос өмнө эхэлнэ
depends_on:
  - mysql          # ← зөвхөн "эхэлсэн" эсэхийг шалгана

# Шийдэл: healthcheck ашиглах
depends_on:
  mysql:
    condition: service_healthy   # ← "бэлэн болсон" эсэхийг шалгана
```

### Volume-ийн эрхийн алдаа

```yaml
# Алдаа: Permission denied
volumes:
  - ./logs:/app/logs

# Шийдэл: хавтас урьдчилан үүсгэх
# docker-compose.yml-д нэмэлт тохиргоо хийх эсвэл
# эхлүүлэхээс өмнө mkdir logs хийх
```

---

## Товч Дүгнэлт

Docker Compose файл бичихэд санах ойд байлгах зүйл:

- **`image`** → бэлэн image, **`build`** → Dockerfile-аас өөрөө үүсгэх
- **`environment`** → орчны хувьсагч, Container нэрийг хаяг болгон ашиглана
- **`ports`** → `"хост:container"` хэлбэрт, гаднаас хандах
- **`expose`** → зөвхөн Compose дотроос хандах
- **`volumes`** → named volume (өгөгдөл хадгалах), bind mount (хостын файл)
- **`depends_on + service_healthy`** → healthcheck амжилттай болтол хүлээнэ
- **`restart: unless-stopped`** → production-д зайлшгүй
- **`networks`** → сервисүүдийг логикоор тусгаарлана

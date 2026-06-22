# Docker Demo — Container технологийн хэрэгжүүлэлт

Node.js апп + MariaDB-г container дотор ажиллуулах энгийн жишээ.

## 0. Урьдчилсан нөхцөл: Docker суулгах

- **Mac / Windows:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) татаж суулга
- **Linux (Ubuntu):**
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```

Шалгах:
```bash
docker --version
docker compose version
```

## 1. Зөвхөн аппыг container-аар ажиллуулах

```bash
# Image бүтээх
docker build -t docker-demo .

# Container асаах
docker run --rm -p 3000:3000 docker-demo
```

Шалгах: http://localhost:3000

## 2. Апп + Database-ийг хамт ажиллуулах (гол хэрэглээ)

```bash
docker compose up
```

Энэ нэг команд:
- MariaDB-г асаана
- Node аппыг бүтээж асаана
- Хоёрыг нь автоматаар холбоно

Шалгах:
- http://localhost:3000      → апп
- http://localhost:3000/db   → database холболт

Зогсоох:
```bash
docker compose down
```

## Хэрэгтэй командууд

| Команд | Тайлбар |
|--------|---------|
| `docker ps` | Ажиллаж байгаа container-ууд |
| `docker compose logs -f app` | Аппын log харах |
| `docker compose up --build` | Дахин бүтээгээд асаах |
| `docker compose up -d` | Арын дэвсгэрт асаах |
| `docker compose down -v` | Бүгдийг зогсоох + өгөгдөл устгах |

## Файлуудын үүрэг

| Файл | Үүрэг |
|------|-------|
| `Dockerfile` | Аппыг хэрхэн image болгох заавар |
| `.dockerignore` | Image-д хуулахгүй файлууд |
| `compose.yaml` | Олон сервисийг (апп + DB) хамт удирдах |
| `src/server.js` | Express апп |

## 3. Version зөрүүний demo (асуудал → засвар)

Нэг компьютер дээр өөр өөр Node-г дуурайлгаж, container-ийн давуу талыг харуулна.

Бэлэн скриптээр:
```bash
sh demo.sh
```

Эсвэл гараар:
```bash
# 🔴 Хуучин Node 16 → АЛДАА (findLast байхгүй)
docker run --rm -v "$PWD":/app -w /app node:16-alpine node src/check.js

# 🟢 Шинэ Node 24 → АЖИЛЛАНА
docker run --rm -v "$PWD":/app -w /app node:24-alpine node src/check.js
```

Кодыг хүрэлгүйгээр зөвхөн Node version солиход үр дүн өөр гарна.
Container яг ижил орчныг баталгаажуулдаг учраас бүх оюутанд ижил үр дүн.

## 4. 2 өөр орчныг ЗЭРЭГ ажиллуулах

Node 16 болон Node 24-ийг нэгэн зэрэг асааж, хажуу хажуугаар нь харьцуулна.

```bash
docker compose -f compose.versions.yaml up
```

Дараа нь browser дээр:
- http://localhost:3016  →  {"node": "v16.x.x"}
- http://localhost:3024  →  {"node": "v24.x.x"}

Хоёр өөр Node орчин нэг компьютер дээр зэрэг, тусгаарлагдан ажиллаж байна.

Зогсоох:
```bash
docker compose -f compose.versions.yaml down
```

### Өөр арга: build-arg ашиглан нэрлэсэн image хийх

Dockerfile-ийн эхэнд `ARG NODE_VERSION=24` нэмбэл:
```bash
docker build --build-arg NODE_VERSION=16 -t myapp:node16 .
docker build --build-arg NODE_VERSION=24 -t myapp:node24 .
docker images          # хоёр өөр орчин жагсаалтад харагдана
```

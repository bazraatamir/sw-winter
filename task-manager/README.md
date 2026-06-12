# Task Manager — Modulith → Microservice Лабораторийн Ажил

## Зорилго
Энэ лабораторийн ажил **хоёр үе шаттай**:
- **1-р үе:** Modulith архитектур — нэг процессд, модулиар хуваасан
- **2-р үе:** Microservice архитектур — модуль бүрийг тусдаа сервис болгох

---

## 1-р үе: Modulith

### Бүтэц
```
task-manager/
├── modules/
│   ├── auth/
│   │   ├── auth.model.js
│   │   ├── auth.controller.js
│   │   └── auth.routes.js
│   ├── workspaces/
│   │   ├── workspace.model.js
│   │   ├── workspace.controller.js
│   │   └── workspace.routes.js
│   └── tasks/
│       ├── task.model.js
│       ├── task.controller.js
│       └── task.routes.js
├── shared/
│   ├── config/db.js
│   ├── utils/AppError.js
│   ├── utils/catchAsync.js
│   └── middleware/auth.js
├── schema.sql
└── app.js
```

### Суурилуулалт
```bash
# 1. DB үүсгэх
mysql -u root -p < schema.sql

# 2. .env файл үүсгэх
cp .env.example .env
# .env файлд DB мэдээлэл оруулна

# 3. Ажиллуулах
node app.js
```

### API Endpoints
```
POST /api/auth/register
POST /api/auth/login
GET  /api/workspaces
POST /api/workspaces
POST /api/workspaces/:id/members
GET  /api/workspaces/:id/tasks
POST /api/workspaces/:id/tasks
PATCH /api/workspaces/:id/tasks/:taskId/status
DELETE /api/workspaces/:id/tasks/:taskId
```

---

## 2-р үе: Microservice рүү шилжих

### Архитектурын өөрчлөлт

Modulith дахь модуль бүр **тусдаа сервис** болно:

```
MODULITH (1 процесс):          MICROSERVICE (3 процесс):
┌─────────────────────┐        ┌─────────┐ ┌─────────┐ ┌─────────┐
│ auth module         │        │  Auth   │ │  Task   │ │  Work   │
│ task module    →→→  │   →    │ Service │ │ Service │ │ Service │
│ workspace module    │        │  :3001  │ │  :3002  │ │  :3003  │
└─────────────────────┘        └─────────┘ └─────────┘ └─────────┘
       1 DB                      DB:3001    DB:3002    DB:3003
```

### Шилжихэд хийх зүйлс

**1. Модуль бүр тусдаа folder болно:**
```
services/
├── auth-service/
│   ├── package.json    ← тусдаа dependencies
│   ├── app.js
│   └── ...
├── task-service/
│   ├── package.json
│   ├── app.js
│   └── ...
└── workspace-service/
    ├── package.json
    ├── app.js
    └── ...
```

**2. Shared код хуулах биш, npm package болгох:**
```
shared/ → @task-manager/shared package болно
```

**3. Сервис хоорондын харилцаа HTTP болно:**
```javascript
// task-service дотор workspace гишүүн эсэхийг шалгах
// Шууд DB query биш → HTTP хүсэлт
const res = await fetch(`http://workspace-service:3003/internal/members/${workspaceId}/${userId}`);
```

**4. API Gateway нэмэх:**
```
Клиент → [API Gateway :3000] → Auth / Task / Workspace сервис
```

### Шилжих урьдчилсан нөхцөл
- Docker суулгасан байх
- docker-compose мэдэх
- HTTP хүсэлтийн алдаа зохицуулалт сайн байх

---

## Ажиллуулан туршиж үзэх (Modulith)

### 1. Бүртгүүлэх
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Батболд","email":"bat@test.com","password":"pass1234","role":"admin"}'
```

### 2. Нэвтрэх
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bat@test.com","password":"pass1234"}'
# → token авна
```

### 3. Workspace үүсгэх
```bash
curl -X POST http://localhost:3000/api/workspaces \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Миний Workspace"}'
```

### 4. Task үүсгэх
```bash
curl -X POST http://localhost:3000/api/workspaces/1/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Эхний даалгавар","description":"Тайлбар"}'
```

### 5. Task-ийн статус өөрчлөх
```bash
curl -X PATCH http://localhost:3000/api/workspaces/1/tasks/1/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'
```

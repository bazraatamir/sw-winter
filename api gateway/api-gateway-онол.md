# API Gateway — Дэлгэрэнгүй Онолын Гарын Авлага

---

## 1. Асуудал: Клиент олон сервистэй шууд харилцах

Орчин үеийн апп нь ихэвчлэн олон сервисээс бүрддэг. Жишээлбэл Task Manager-ийн архитектур дараах байдалтай байж болно:

```
Auth Service      → хэрэглэгч нэвтрэх
Task Service      → task удирдах
Workspace Service → workspace удирдах
Notification Service → мэдэгдэл илгээх
File Service      → файл хадгалах
```

API Gateway байхгүй бол клиент (веб, мобайл апп) эдгээр сервис бүртэй **шууд харилцах** ёстой болно:

```
              ┌─── Auth Service      :3001
              ├─── Task Service      :3002
Клиент ───────┼─── Workspace Service :3003
              ├─── Notification Service :3004
              └─── File Service      :3005
```

Энэ нь хэд хэдэн асуудал үүсгэнэ:

- Клиент **таван өөр хаяг** мэдэх ёстой
- Сервис бүрт **тус бүрд нь** auth шалгах ёстой
- Нэг хуудас нээхэд **олон сервис рүү** нэгэн зэрэг хүсэлт явна
- Нэг сервисийн хаяг өөрчлөгдвөл **клиентийг өөрчлөх** шаардлагатай

---

## 2. API Gateway гэж юу вэ?

API Gateway бол бүх хүсэлтийн **нэг оруулах цэг (single entry point)** юм. Клиент зөвхөн Gateway-тэй харилцдаг бөгөөд Gateway нь хүсэлтийг зохих сервис рүү **чиглүүлдэг**.

```
                         ┌─── Auth Service
                         ├─── Task Service
Клиент ──→ [API Gateway] ┼─── Workspace Service
                         ├─── Notification Service
                         └─── File Service
```

Зүйрлэл: Том байшингийн **хаалга манаач** гэж бод. Зочин хүн байшинд орохын тулд манаачтай л харилцана. Манаач хэн рүү явахыг мэдэж, зөв газар хүргэнэ, зөвшөөрөлгүй хүнийг оруулахгүй, бичиг баримт шалгана. Гэрийн оршин суугчид (сервисүүд) зочноор шууд харьцах шаардлагагүй.

---

## 3. API Gateway-ийн Үндсэн Функцүүд

### 3.1 Routing — Чиглүүлэлт

Хүсэлтийн URL-г харж зохих сервис рүү дамжуулна.

```
GET  /api/tasks        → Task Service
GET  /api/workspaces   → Workspace Service
POST /api/auth/login   → Auth Service
GET  /api/files/123    → File Service
```

```javascript
// Express-ээр хялбар gateway
const { createProxyMiddleware } = require('http-proxy-middleware');

app.use('/api/tasks',      createProxyMiddleware({ target: 'http://task-service:3002' }));
app.use('/api/workspaces', createProxyMiddleware({ target: 'http://workspace-service:3003' }));
app.use('/api/auth',       createProxyMiddleware({ target: 'http://auth-service:3001' }));
```

### 3.2 Authentication — Нэвтрэлт шалгах

Сервис бүрт auth логик бичихийн оронд Gateway-д **нэг удаа** хэрэгжүүлнэ.

```
Клиент → [Gateway: JWT шалга] → ✓ бол сервис рүү дамжуулна
                               → ✗ бол 401 буцаана
```

```javascript
// Gateway-ийн auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token шаардлагатай' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.headers['x-user-id'] = payload.userId;    // Сервис рүү дамжуулна
    req.headers['x-user-role'] = payload.role;
    next();
  } catch {
    res.status(401).json({ message: 'Token хүчингүй' });
  }
}

// Auth шаардлагагүй route-уудаас бусад бүхэнд ашиглана
app.use('/api/tasks',      authMiddleware, taskProxy);
app.use('/api/workspaces', authMiddleware, workspaceProxy);
app.use('/api/auth',       authProxy);  // Auth route-д шалгахгүй
```

### 3.3 Rate Limiting — Хүсэлтийн хязгаар

Тодорхой хэрэглэгч буюу IP хаягаас хэт олон хүсэлт ирэхээс хамгаална.

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 минут
  max: 100,                   // 100 хүсэлт
  message: { error: 'Хэт олон хүсэлт, түр хүлээнэ үү' }
});

app.use('/api/', limiter);
```

### 3.4 Load Balancing — Ачаалал хуваарилалт

Нэг сервисийн олон instance байвал хүсэлтийг тэнцүү хуваарилна.

```javascript
const targets = [
  'http://task-service-1:3002',
  'http://task-service-2:3002',
  'http://task-service-3:3002',
];
let current = 0;

function getTarget() {
  const target = targets[current];
  current = (current + 1) % targets.length;  // Round-robin
  return target;
}

app.use('/api/tasks', (req, res, next) => {
  createProxyMiddleware({ target: getTarget() })(req, res, next);
});
```

### 3.5 Request/Response Transform — Хүсэлт өөрчлөх

Клиентийн хүсэлтийг сервист тохирох хэлбэрт оруулах, эсвэл сервисийн хариуг клиентэд тохирох хэлбэрт оруулах.

```javascript
// Хуучин клиент шинэ API-тай ажиллахын тулд хүсэлтийг хөрвүүлэх
app.use('/api/tasks', (req, res, next) => {
  // Хуучин: { task_name: '...' }  →  Шинэ: { title: '...' }
  if (req.body.task_name) {
    req.body.title = req.body.task_name;
    delete req.body.task_name;
  }
  next();
}, taskProxy);
```

### 3.6 Logging & Monitoring — Бүртгэл хяналт

Бүх хүсэлтийг нэг газраас бүртгэнэ.

```javascript
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    console.log({
      method:   req.method,
      path:     req.path,
      status:   res.statusCode,
      duration: `${Date.now() - start}мс`,
      userId:   req.headers['x-user-id'] || 'нэвтрээгүй'
    });
  });

  next();
});
```

### 3.7 SSL Termination

HTTPS-ийн шифрлэлтийг Gateway дээр задлан, дотоод сервисүүд руу энгийн HTTP-ээр дамжуулна. Ингэснээр сервис бүрт SSL тохируулах шаардлагагүй болно.

```
Клиент ──HTTPS──→ [Gateway: SSL задлана] ──HTTP──→ Дотоод сервисүүд
```

---

## 4. API Gateway-ийн Дотоод Урсгал

Хүсэлт Gateway-ээр дамжих бүрэн урсгалыг харцгаая:

```
Клиент хүсэлт илгээнэ
        ↓
[1. SSL задлах — HTTPS → HTTP]
        ↓
[2. Rate limit шалгах — хэт олон хүсэлт байна уу?]
        ↓ тийм бол 429 буцаана
[3. Auth шалгах — JWT хүчинтэй эсэх]
        ↓ хүчингүй бол 401 буцаана
[4. Routing — ямар сервис рүү явах вэ?]
        ↓ олдохгүй бол 404 буцаана
[5. Request transform — хэрэгтэй бол өөрчлөх]
        ↓
[6. Сервис рүү дамжуулах]
        ↓
[7. Response transform — хэрэгтэй бол өөрчлөх]
        ↓
[8. Log бичих]
        ↓
Клиентэд хариу буцаана
```

---

## 5. API Composition — Олон Сервисийн Хариуг Нэгтгэх

Нэг хуудас нээхэд олон сервисийн өгөгдөл хэрэгтэй байдаг. Gateway энэ олон хүсэлтийг **нэгтгэн** клиентэд нэг хариу болгон буцааж болно.

```javascript
// Dashboard хуудас нээхэд task + workspace + notification мэдээлэл хэрэгтэй
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  const userId = req.headers['x-user-id'];

  // Гурван сервис рүү зэрэг хүсэлт явуулна
  const [tasks, workspaces, notifications] = await Promise.all([
    fetch(`http://task-service:3002/tasks?userId=${userId}`).then(r => r.json()),
    fetch(`http://workspace-service:3003/workspaces?userId=${userId}`).then(r => r.json()),
    fetch(`http://notification-service:3004/notifications?userId=${userId}`).then(r => r.json()),
  ]);

  // Нэгтгэн клиентэд буцаана
  res.json({ tasks, workspaces, notifications });
});
```

Gateway байхгүй бол клиент өөрөө гурван сервис рүү тус тусад нь хүсэлт явуулах ёстой байсан.

---

## 6. Gateway vs Reverse Proxy vs Load Balancer

Эдгээр гурав төстэй боловч өөр өөр үүрэгтэй:

| | Reverse Proxy | Load Balancer | API Gateway |
|---|---|---|---|
| **Үндсэн үүрэг** | Хүсэлт дамжуулах | Ачаалал хуваарилах | Бизнесийн логик + дамжуулалт |
| **Auth** | Үгүй | Үгүй | Тийм |
| **Rate limiting** | Хязгаарлагдмал | Үгүй | Тийм |
| **Routing** | URL-р | Алгоритмаар | URL + Header + Auth |
| **Transform** | Үгүй | Үгүй | Тийм |
| **Жишээ** | Nginx | AWS ELB | Kong, AWS API Gateway |

Практикт Nginx нь reverse proxy + load balancer үүргийг гүйцэтгэж, API Gateway нь түүний ард ажиллах нь түгээмэл.

---

## 7. Алдаа Зохицуулалт — Circuit Breaker

Нэг сервис удаашрах эсвэл унавал бүх хүсэлт тэр сервисийг хүлээж **Gateway өөрөө удаашрах** эрсдэлтэй. Circuit Breaker энийг шийддэг.

```
Хэвийн:   Хүсэлт → Сервис → Хариу ✓

Сервис удаашрах үед:
  Хүсэлт → Сервис → ...хүлээнэ... → timeout
  Хүсэлт → Сервис → ...хүлээнэ... → timeout   ← олон хүсэлт хуримтлагдана
  Хүсэлт → Сервис → ...

Circuit Breaker нээгдэнэ (OPEN):
  Хүсэлт → Circuit Breaker → шууд алдаа буцаана  ← сервис рүү явахгүй
  → Хурдан алдаа буцаах нь удаан хүлээхээс дээр
```

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 30000) {
    this.failCount = 0;
    this.threshold = threshold;  // 5 удаа алдаа гарвал нээнэ
    this.timeout = timeout;      // 30 секундийн дараа дахин оролдоно
    this.state = 'CLOSED';       // CLOSED | OPEN | HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit OPEN — сервис түр ажиллахгүй байна');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  onSuccess() {
    this.failCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failCount++;
    if (this.failCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}

const taskBreaker = new CircuitBreaker();

app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const data = await taskBreaker.call(() =>
      fetch('http://task-service:3002/tasks').then(r => r.json())
    );
    res.json(data);
  } catch (err) {
    res.status(503).json({ message: 'Task сервис түр ажиллахгүй байна' });
  }
});
```

---

## 8. Бэлэн API Gateway Хэрэгслүүд

Өөрөө бичихийн оронд бэлэн хэрэгсэл ашиглаж болно:

| Хэрэгсэл | Тайлбар | Хэрэглээ |
|---|---|---|
| **Kong** | Нээлттэй эх, plugin-д суурилсан | Том enterprise систем |
| **AWS API Gateway** | AWS-ийн үүлэн үйлчилгээ | AWS дээр байрлуулсан апп |
| **Nginx** | Хурдан, хөнгөн reverse proxy | Энгийн routing, SSL |
| **Traefik** | Docker-т зориулсан, автомат | Container орчин |
| **Express Gateway** | Node.js-д суурилсан | Node.js экосистем |

---

## 9. Task Manager-т Хэрэглэх

Task Manager одоохондоо нэг сервис учраас бүрэн Gateway шаардлагагүй. Гэхдээ Gateway-ийн **зарим функцийг** одоогийн апп дотор хэрэгжүүлж болно:

```javascript
// app.js — Хялбар Gateway загвар
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();

// 1. Rate limiting — бүх хүсэлтэд
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// 2. Logging — бүх хүсэлтэд
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () =>
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now()-start}мс`)
  );
  next();
});

// 3. Auth шаардлагагүй route
app.use('/api/auth', authRouter);

// 4. Auth шаардлагатай route бүхэнд middleware
app.use('/api', (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token шаардлагатай' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Token хүчингүй' });
  }
});

app.use('/api/tasks',      taskRouter);
app.use('/api/workspaces', workspaceRouter);

app.listen(3000);
```

Ирээдүйд сервисүүд тусдаа болоход proxy руу шилжүүлэхэд хялбар болно.

---

## Товч дүгнэлт

API Gateway бол **олон сервисийн нэгдсэн оруулах цэг** юм. Санах ойд байлгах зүйл:

- **Нэг оруулах цэг** → клиент зөвхөн Gateway-тэй харилцана
- **Auth нэг газарт** → сервис бүрт давтахгүй
- **Rate limiting, logging** → дэд бүтцийн логик Gateway дээр
- **Circuit Breaker** → нэг сервис унавал бүх систем унахаас хамгаалах
- **API Composition** → олон сервисийн хариуг нэгтгэх
- **Жижиг аппт** → бүрэн Gateway шаардлагагүй, Express middleware хангалттай

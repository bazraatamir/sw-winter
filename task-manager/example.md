# Node.js Microservice Төсөл

## Архитектур

```
Client
  │
  ▼
┌─────────────────┐
│   API Gateway   │  :3000  — JWT шалгах, routing
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  User Service   │  :3001  — Бүртгэл, нэвтрэлт, профайл
└─────────────────┘
```

## Файлын бүтэц

```
microservices/
├── api-gateway/
│   ├── src/index.js            ← Proxy, rate limiting
│   ├── middleware/auth.js      ← JWT шалгах
│   └── .env
└── user-service/
    ├── src/index.js            ← Express сервер
    ├── src/store.js            ← In-memory өгөгдөл
    ├── src/routes/userRoutes.js
    ├── src/controllers/userController.js
    └── .env
```

---

## Суулгах

```bash
# User Service
cd user-service
npm install

# API Gateway
cd ../api-gateway
npm install
```

## Ажиллуулах

```bash
# Терминал 1
cd user-service && npm start
# ✅ User Service: http://localhost:3001

# Терминал 2
cd api-gateway && npm start
# ✅ API Gateway: http://localhost:3000
```

---

## .env Тохиргоо

**api-gateway/.env**
```
PORT=3000
USER_SERVICE_URL=http://localhost:3001
JWT_SECRET=your_secret_key
```

**user-service/.env**
```
PORT=3001
JWT_SECRET=your_secret_key
```

> `JWT_SECRET` хоёр файлд **адилхан** байх ёстой.

---

## API Endpoints

### POST /api/users/register — Бүртгэл

```http
POST http://localhost:3000/api/users/register
Content-Type: application/json
```

```json
{
  "name": "Батбаяр",
  "email": "bat@example.com",
  "password": "secret123"
}
```

Хариу `201`:
```json
{
  "message": "Бүртгэл амжилттай",
  "user": { "id": 1, "name": "Батбаяр", "email": "bat@example.com" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### POST /api/users/login — Нэвтрэх

```http
POST http://localhost:3000/api/users/login
Content-Type: application/json
```

```json
{
  "email": "bat@example.com",
  "password": "secret123"
}
```

Хариу `200`:
```json
{
  "message": "Нэвтрэлт амжилттай",
  "user": { "id": 1, "name": "Батбаяр", "email": "bat@example.com" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### GET /api/users/profile — Профайл

```http
GET http://localhost:3000/api/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Хариу `200`:
```json
{
  "user": { "id": 1, "name": "Батбаяр", "email": "bat@example.com" }
}
```

---

### GET /api/users — Бүх хэрэглэгч

```http
GET http://localhost:3000/api/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Хариу `200`:
```json
{
  "users": [...],
  "total": 3
}
```

---

### GET /health — Шалгах

```http
GET http://localhost:3000/health
GET http://localhost:3001/health
```

```json
{ "status": "ok", "service": "api-gateway" }
```

---

## Кодын тайлбар

### API Gateway — src/index.js

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');

const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Rate limiting - 1 минутанд 100 хүсэлт
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Хэт олон хүсэлт. Түр хүлээнэ үү.' }
});
app.use(limiter);

// ── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// ── Public routes (JWT шаардлагагүй) ───────────────────────
app.use(
  '/api/users/register',
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/users': '' }
  })
);

app.use(
  '/api/users/login',
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/users': '' }
  })
);

// ── Protected routes (JWT шаардлагатай) ────────────────────
app.use(
  '/api/users',
  authMiddleware,                          // эхлээд token шалгана
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/users': '' },
    on: {
      proxyReq: (proxyReq, req) => {
        // User мэдээллийг User Service-д header-ээр дамжуулна
        if (req.user) {
          proxyReq.setHeader('X-User-Id', req.user.id);
          proxyReq.setHeader('X-User-Email', req.user.email);
        }
      }
    }
  })
);

// ── 404 ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route олдсонгүй' });
});

app.listen(PORT, () => {
  console.log(`✅ API Gateway: http://localhost:${PORT}`);
});
```

---

### API Gateway — middleware/auth.js

JWT токен шалгаад, `req.user`-д хэрэглэгчийн мэдээллийг хадгална.

```js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Header байгаа эсэх шалгана
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token олдсонгүй' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Token-г verify хийнэ
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token хүчингүй' });
  }
}
```

---

### User Service — controllers/userController.js

#### register

```js
async function register(req, res) {
  const { name, email, password } = req.body;

  // Email давхардал шалгана
  if (UserStore.emailExists(email)) {
    return res.status(409).json({ error: 'Email аль хэдийн бүртгэлтэй' });
  }

  // Password-г hash хийнэ (bcrypt)
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = UserStore.create({ name, email, hashedPassword });

  // JWT token үүсгэнэ (7 хоног хүчинтэй)
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({ message: 'Бүртгэл амжилттай', user, token });
}
```

#### login

```js
async function login(req, res) {
  const { email, password } = req.body;

  // Хэрэглэгч хайна
  const user = UserStore.findByEmailWithPassword(email);
  if (!user) {
    return res.status(401).json({ error: 'Email эсвэл нууц үг буруу' });
  }

  // Password шалгана
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Email эсвэл нууц үг буруу' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ message: 'Нэвтрэлт амжилттай', token });
}
```

---

## Алдаа засах

| Алдаа | Шалтгаан | Шийдэл |
|-------|----------|--------|
| `ECONNREFUSED 3001` | User Service ажиллаагүй | Терминал 1-ийг шалгах |
| `401 Token олдсонгүй` | Header дутуу | `Authorization: Bearer <token>` нэмэх |
| `401 Token хүчингүй` | Token буруу/дууссан | Дахин login хийж шинэ token авах |
| `409 Email бүртгэлтэй` | Email давхардаж байна | Өөр email ашиглах |
| `400 Validation алдаа` | Оролт шаардлага хангахгүй | Алдааны мессежийг унших |

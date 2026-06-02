# Auth — Бүртгүүлэх & Нэвтрэх жишээ
### Express.js + mysql2 — Функц хандлага, MVC Архитектур

---

## Хавтасны бүтэц

```
src/
├── models/
│   └── user.model.js
├── repositories/
│   └── user.repository.js
├── services/
│   └── auth.service.js
├── controllers/
│   └── auth.controller.js
├── routes/
│   └── auth.routes.js
├── middlewares/
│   ├── auth.middleware.js
│   └── errorHandler.js
└── utils/
    ├── apiResponse.js
    └── errors.js
```

---

## 1. Database — users хүснэгт

```sql
CREATE TABLE users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('user', 'admin') DEFAULT 'user',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME DEFAULT NULL
);
```

---

## 2. Model

```js
// src/models/user.model.js

// DB-ийн мөрөөс аюулгүй хариуны объект үүсгэнэ — нууц үг оруулахгүй
const toUserDTO = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  createdAt: row.created_at,
});

module.exports = { toUserDTO };
```

---

## 3. Repository

```js
// src/repositories/user.repository.js

const pool = require('../config/db');

const findByEmail = async (email) => {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
    [email]
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return rows[0] || null;
};

const createUser = async ({ name, email, password, role = 'user' }) => {
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, password, role]
  );
  return findById(result.insertId);
};

module.exports = { findByEmail, findById, createUser };
```

---

## 4. Service

```js
// src/services/auth.service.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findByEmail, findById, createUser } = require('../repositories/user.repository');
const { toUserDTO } = require('../models/user.model');
const { ConflictError, UnauthorizedError } = require('../utils/errors');

const register = async ({ name, email, password }) => {
  // Бизнес дүрэм: имэйл давхцах эсэх
  const existing = await findByEmail(email);
  if (existing) throw new ConflictError('Имэйл аль хэдийн бүртгэлтэй байна');

  const hashed = await bcrypt.hash(password, 10);
  const user = await createUser({ name, email, password: hashed });
  return toUserDTO(user);
};

const login = async ({ email, password }) => {
  const user = await findByEmail(email);
  if (!user) throw new UnauthorizedError('Имэйл эсвэл нууц үг буруу байна');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new UnauthorizedError('Имэйл эсвэл нууц үг буруу байна');

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  return { token, user: toUserDTO(user) };
};

const getMe = async (userId) => {
  const user = await findById(userId);
  if (!user) throw new UnauthorizedError('Хэрэглэгч олдсонгүй');
  return toUserDTO(user);
};

module.exports = { register, login, getMe };
```

---

## 5. Controller

```js
// src/controllers/auth.controller.js

const { register, login, getMe } = require('../services/auth.service');
const { success } = require('../utils/apiResponse');

const registerHandler = async (req, res, next) => {
  try {
    const user = await register(req.body);
    res.status(201).json(success(user, 'Бүртгэл амжилттай'));
  } catch (err) {
    next(err);
  }
};

const loginHandler = async (req, res, next) => {
  try {
    const result = await login(req.body);
    res.json(success(result, 'Нэвтрэлт амжилттай'));
  } catch (err) {
    next(err);
  }
};

const meHandler = async (req, res, next) => {
  try {
    const user = await getMe(req.user.id);
    res.json(success(user));
  } catch (err) {
    next(err);
  }
};

module.exports = { registerHandler, loginHandler, meHandler };
```

---

## 6. Routes

```js
// src/routes/auth.routes.js

const router = require('express').Router();
const { registerHandler, loginHandler, meHandler } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/register', registerHandler);
router.post('/login',    loginHandler);
router.get('/me',        authenticate, meHandler);

module.exports = router;
```

---

## 7. Middleware

```js
// src/middlewares/auth.middleware.js

const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');

const authenticate = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Token байхгүй байна'));
  }

  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new UnauthorizedError('Token хүчингүй байна'));
  }
};

module.exports = { authenticate };
```

---

## 8. Utils

```js
// src/utils/errors.js

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const ConflictError = class extends AppError {
  constructor(msg = 'Давхцал') { super(msg, 409); }
};
const UnauthorizedError = class extends AppError {
  constructor(msg = 'Нэвтрэх шаардлагатай') { super(msg, 401); }
};
const NotFoundError = class extends AppError {
  constructor(msg = 'Олдсонгүй') { super(msg, 404); }
};

module.exports = { AppError, ConflictError, UnauthorizedError, NotFoundError };
```

```js
// src/utils/apiResponse.js

const success = (data, message = 'Амжилттай') => ({
  success: true, message, data, errors: null, timestamp: new Date().toISOString(),
});

const error = (message, errors = null) => ({
  success: false, message, data: null, errors, timestamp: new Date().toISOString(),
});

module.exports = { success, error };
```

```js
// src/middlewares/errorHandler.js

const { AppError } = require('../utils/errors');
const { error } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(error(err.message));
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json(error('Давхардсан өгөгдөл'));
  }
  console.error(err);
  res.status(500).json(error('Серверийн алдаа гарлаа'));
};

module.exports = errorHandler;
```

---

## 9. Хүсэлт & Хариуны Жишээ

### POST /api/v1/auth/register
```json
// Хүсэлт
{ "name": "Bat", "email": "bat@mail.com", "password": "pass1234" }

// Хариу 201
{
  "success": true,
  "message": "Бүртгэл амжилттай",
  "data": { "id": 1, "name": "Bat", "email": "bat@mail.com", "role": "user" }
}
```

### POST /api/v1/auth/login
```json
// Хүсэлт
{ "email": "bat@mail.com", "password": "pass1234" }

// Хариу 200
{
  "success": true,
  "message": "Нэвтрэлт амжилттай",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": 1, "name": "Bat", "email": "bat@mail.com", "role": "user" }
  }
}
```

### GET /api/v1/auth/me
```
Authorization: Bearer eyJhbGci...

// Хариу 200
{
  "success": true,
  "data": { "id": 1, "name": "Bat", "email": "bat@mail.com", "role": "user" }
}
```

---

## 10. Урсгалын Товч Тайлбар

**Бүртгүүлэх:**
`POST /register` → registerHandler → register() → findByEmail() шалгах → bcrypt.hash() → createUser() → toUserDTO() → JSON хариу

**Нэвтрэх:**
`POST /login` → loginHandler → login() → findByEmail() → bcrypt.compare() → jwt.sign() → JSON хариу

**Профайл харах:**
`GET /me` → authenticate() токен шалгах → meHandler → getMe() → findById() → toUserDTO() → JSON хариу

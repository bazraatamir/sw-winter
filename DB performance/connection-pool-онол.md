# Connection Pool — Дэлгэрэнгүй Онолын Гарын Авлага

---

## 1. Асуудал: Connection үүсгэх нь үнэтэй

Өгөгдлийн сантай харилцахын тулд эхлээд **холболт (connection) үүсгэх** шаардлагатай. Энэ үйл явц дараах алхмуудаас бүрдэнэ:

```
Програм → TCP холболт нээх → Баталгаажуулалт (auth) → Session тохируулах → Бэлэн
```

Энэ бүх алхам хамтдаа **20–100 миллисекунд** зарцуулдаг. Хэрэглэгч бүрийн хүсэлт дээр шинэ connection үүсгэвэл:

```
Хүсэлт 1: [холболт 50мс] + [query 5мс] = 55мс
Хүсэлт 2: [холболт 50мс] + [query 5мс] = 55мс
Хүсэлт 3: [холболт 50мс] + [query 5мс] = 55мс
...
```

Нэмж хэлэхэд, олон хэрэглэгч нэгэн зэрэг ирвэл **MySQL-ийн connection хязгаарт** хүрч алдаа гарна.

---

## 2. Шийдэл: Connection Pool

Connection Pool бол **урьдчилан үүсгэсэн холболтуудын цөөрөм** юм. Сервер эхлэхэд тодорхой тооны connection үүсгэж, дахин ашиглахаар хадгалдаг.

```
┌─────────────────────────────────────────┐
│           Connection Pool               │
│                                         │
│  [conn 1] [conn 2] [conn 3] [conn 4]   │
│  [conn 5] [conn 6] [conn 7] [conn 8]   │
│                                         │
└─────────────────────────────────────────┘
        ↑ дахин ашиглана        ↑ буцаана
    хүсэлт ирэхэд             дуусмагц
```

Хүсэлт ирэхэд:
1. Pool-с чөлөөт connection **авна**
2. Query ажиллуулна
3. Дуусмагц connection-г **буцааж өгнө** (хаахгүй!)

```
Хүсэлт 1: [query 5мс]  ← холболт аль хэдийн бэлэн байна
Хүсэлт 2: [query 5мс]
Хүсэлт 3: [query 5мс]
```

---

## 3. Pool-ийн Анатоми

Connection Pool нь дотроо дараах төлвүүдийг удирддаг:

```
┌──────────────────────────────────────────────────────┐
│                  Connection Pool                      │
│                                                       │
│  Нийт:       connectionLimit = 10                    │
│  Ашиглаж байгаа: 3                                   │
│  Чөлөөт:     7                                       │
│  Хүлээж байгаа хүсэлт: 0                            │
│                                                       │
│  [busy][busy][busy][free][free][free][free]...       │
└──────────────────────────────────────────────────────┘
```

### Гол параметрүүд

| Параметр | Тайлбар | Ердийн утга |
|---|---|---|
| `connectionLimit` | Хамгийн их connection тоо | 10 |
| `waitForConnections` | Чөлөөгүй үед хүлээх эсэх | true |
| `queueLimit` | Хүлээх хүсэлтийн дээд тоо | 0 (хязгааргүй) |
| `connectTimeout` | Холболт үүсгэх timeout | 10000 мс |
| `idleTimeout` | Ашиглагдаагүй connection устгах хугацаа | 60000 мс |

---

## 4. MySQL2 дахь Pool — Node.js

### Үүсгэх

```javascript
// db/pool.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0
});

module.exports = pool;
```

### Ашиглах

```javascript
const pool = require('../db/pool');

// pool.query() — connection авч, query ажиллуулж, автоматаар буцаана
async function getUsers() {
  const [rows] = await pool.query('SELECT * FROM users');
  return rows;
}

// pool.getConnection() — connection-г гараар удирдах
async function transferMoney(fromId, toId, amount) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromId]);
    await conn.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toId]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release(); // ← заавал буцаах!
  }
}
```

> **Чухал:** `conn.release()` дуусгахгүй бол connection pool-с алга болж, удаан хугацааны дараа pool **дүүрнэ**.

---

## 5. Pool-ийн Дотоод Ажиллагаа

### Хэвийн нөхцөл

```
Хүсэлт → Pool-д чөлөөт connection байна → авна → query → буцаана
```

### Pool дүүрсэн үед

```
Хүсэлт → Бүх connection busy → Дараалалд (queue) орно → 
чөлөөлөгдөхийг хүлээнэ → авна → query → буцаана
```

### queueLimit хязгаарт хүрсэн үед

```
Хүсэлт → Queue дүүрсэн → Алдаа буцаана: "Too many connections in queue"
```

### Алдаатай connection

Pool нь connection-г периодик байдлаар **амьд эсэхийг шалгадаг** (ping). Хариу өгөхгүй бол устгаж, шинийг үүсгэнэ.

```
[conn 3] → ping → хариугүй → устгана → [шинэ conn] үүсгэнэ
```

---

## 6. Transaction ба Pool

Transaction ашиглах үед **нэг connection дээр бүх query ажиллах ёстой**. Тиймээс `pool.query()` биш `pool.getConnection()` ашиглана.

```javascript
// БУРУУ — хоёр query өөр connection дээр ажиллаж болно
await pool.query('UPDATE ... ');
await pool.query('UPDATE ... ');

// ЗӨВ — нэг connection дээр transaction
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  await conn.query('UPDATE ... ');
  await conn.query('UPDATE ... ');
  await conn.commit();
} catch (err) {
  await conn.rollback();
  throw err;
} finally {
  conn.release();
}
```

---

## 7. Pool-ийн Хэмжээг Тохируулах

`connectionLimit`-г хэт бага тавивал хүсэлтүүд удаан хүлээнэ. Хэт их тавивал MySQL сервер ачааллана. Оновчтой тоог олохын тулд дараах зүйлсийг харгалзана:

### MySQL-ийн хязгаар

```sql
-- MySQL-ийн нийт дээд connection тоог харах
SHOW VARIABLES LIKE 'max_connections';
-- Ердийн утга: 151
```

Хэрэв таны Node.js апп нь цорын ганц клиент бол `connectionLimit`-г `max_connections`-аас бага тавина.

### CPU-ийн тоо

Дэлхийн нийтээр хүлээн зөвшөөрсөн томъёо:

```
Оновчтой pool хэмжээ ≈ CPU цөмийн тоо × 2 + дискний тоо
```

Жижиг апп-т **5–10** хангалттай. Том ачааллын үед benchmark хийж тодорхойлно.

### Практик зөвлөмж

```javascript
const pool = mysql.createPool({
  connectionLimit: process.env.NODE_ENV === 'production' ? 20 : 5,
  waitForConnections: true,
  queueLimit: 100,       // 100-аас олон хүлээвэл алдаа
  connectTimeout: 10000, // 10 секундэд холдохгүй бол алдаа
});
```

---

## 8. Pool Monitoring — Хяналт

Pool-ийн төлвийг хянаж байх нь чухал. MySQL2 pool нь дараах event-үүдтэй:

```javascript
pool.on('connection', (conn) => {
  console.log(`Шинэ connection үүслээ: ${conn.threadId}`);
});

pool.on('acquire', (conn) => {
  console.log(`Connection авлаа: ${conn.threadId}`);
});

pool.on('release', (conn) => {
  console.log(`Connection буцлаа: ${conn.threadId}`);
});

pool.on('enqueue', () => {
  console.log('Бүх connection busy — хүлээж байна...');
});
```

`enqueue` event байнга гарч байвал `connectionLimit`-г нэмэх эсвэл query-г оновчлох шаардлагатай.

---

## 9. Connection Pool vs Шууд Connection

| | Шууд Connection | Connection Pool |
|---|---|---|
| Холболт үүсгэх | Хүсэлт бүрт | Нэг удаа (эхлэхэд) |
| Хурд | Удаан | Хурдан |
| Олон хүсэлт | Алдаа гарна | Дараалалд ордог |
| Transaction | Хялбар | `getConnection()` шаардлагатай |
| Нөөц зарцуулалт | Их | Бага |
| Тохиромжтой | Test, script | Бүх production апп |

---

## 10. Redis Connection Pool

Redis-т ч мөн connection pool ашиглаж болно. `ioredis` сан нь суурилагдсан pool-тэй:

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  // ioredis дотроо connection pool удирддаг
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  lazyConnect: true
});
```

`redis` клиент нь дотроо connection-г автоматаар удирддаг тул MySQL-ийн адил гараар менежмент хийх шаардлагагүй.

---

## 11. Task Manager дахь Pool — Бодит код

```javascript
// config/database.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'task_manager',
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0
});

// Pool-ийн холболтыг шалгах
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL Pool холбогдлоо');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL Pool алдаа:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
```

```javascript
// app.js
const { testConnection } = require('./config/database');

async function startServer() {
  await testConnection();
  app.listen(3000, () => console.log('Сервер эхэллээ'));
}

startServer();
```

---

## Товч дүгнэлт

Connection Pool бол backend аппликейшний **гүйцэтгэлийн суурь** юм. Үүнгүйгээр олон хэрэглэгчтэй аппликейшн удаан, тогтворгүй ажиллана. Санах ойд байлгах цөөхөн зүйл:

- **Pool-с connection авсан бол заавал `release()` хий**
- **Transaction-д `getConnection()` ашигла**
- **`connectionLimit`-г хэт их тавихгүй**
- **`enqueue` event гарвал тунгаан бод**

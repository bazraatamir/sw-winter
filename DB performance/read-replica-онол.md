# Read Replica — Дэлгэрэнгүй Онолын Гарын Авлага

---

## 1. Асуудал: Нэг өгөгдлийн сан хүрэлцэхгүй болох

Апп нь өсөн нэмэгдэхийн хэрээр өгөгдлийн санд очих хүсэлтийн тоо нэмэгддэг. Статистикийн хувьд вэб аппликейшний хүсэлтийн **70–90% нь уншилт (SELECT)**, зөвхөн 10–30% нь бичилт (INSERT, UPDATE, DELETE) байдаг.

Гэтэл нэг сервер энэ бүхнийг даах ёстой бол:

```
Бүх хэрэглэгч
      ↓
 [MySQL Server]  ← уншилт + бичилт хольж ирнэ
      ↓
   Ачаалал ихснэ → удаашрал → алдаа
```

Шийдэл нь **уншилт ба бичилтийг тусгаарлах** юм.

---

## 2. Read Replica гэж юу вэ?

Read Replica бол үндсэн (primary) өгөгдлийн сангийн **бодит цагийн хуулбар** юм. Primary дээр гарсан өөрчлөлт бүр автоматаар replica-руу нийлүүлэгддэг.

```
                ┌─────────────────┐
   Бичилт ──>   │  Primary (Master)│
                │   MySQL Server   │
                └────────┬────────┘
                         │ Replication
              ┌──────────┼──────────┐
              ↓          ↓          ↓
        [Replica 1] [Replica 2] [Replica 3]
              ↑          ↑          ↑
         Уншилт     Уншилт     Уншилт
```

**Дүрэм энгийн:**
- `INSERT`, `UPDATE`, `DELETE` → **Primary** руу
- `SELECT` → **Replica** руу

---

## 3. Replication-ийн Дотоод Механизм

Replica хэрхэн Primary-тай синхрончлогддогийг ойлгохын тулд эхлээд нэг энгийн зүйрлэл авч үзье.

Нэг багш хичээл заахдаа самбарт бичдэг. Хажууд нь сурагч тэмдэглэл хөтөлж байна. Багш бичсэн зүйл бүрийг сурагч цааш нь хуулж авдаг. Энэ нь яг replication-ийн үйл явц юм — **Primary (багш) бичдэг, Replica (сурагч) хуулдаг.**

### Binary Log — Өөрчлөлтийн дэвтэр

MySQL-д энэ "тэмдэглэлийн дэвтэр"-ийн үүргийг **Binary Log (binlog)** гүйцэтгэдэг. Primary сервер дээр өгөгдөл өөрчлөгдөх бүрт MySQL тухайн өөрчлөлтийг binlog-д **дарааллаар** бүртгэдэг.

```
Primary-ийн Binary Log:
┌─────────────────────────────────────┐
│ #1  INSERT INTO users (Батболд)     │
│ #2  UPDATE tasks SET status='done'  │
│ #3  DELETE FROM logs WHERE id=5     │
│ #4  INSERT INTO tasks (Шинэ даалгавар) │
│ ...                                 │
└─────────────────────────────────────┘
         ↑ өөрчлөлт бүр нэмэгдэнэ
```

Binlog бол зүгээр нэг **текст лог биш** — бинар (binary) хэлбэрээр хадгалагддаг тул маш хурдан бичигддэг.

### Replica хэрхэн хуулдаг вэ?

Replica сервер дотроо **хоёр тусдаа process** ажиллуулдаг. Эдгээр хоёр process хамтдаа replication-г хангадаг.

**I/O Thread — татагч**

Энэ process нь байнга Primary руу холбогдож, binlog-ийн шинэ бичилтүүдийг **татан авдаг**. Татсан өгөгдлийг өөрийн **Relay Log** гэдэг дотоод файлд хадгалдаг.

```
Replica-ийн I/O Thread:
"Primary дээр шинэ зүйл байна уу?" → байна → татна → Relay Log-д бичнэ
"Primary дээр шинэ зүйл байна уу?" → үгүй → хүлээнэ
"Primary дээр шинэ зүйл байна уу?" → байна → татна → Relay Log-д бичнэ
...
```

**SQL Thread — гүйцэтгэгч**

Энэ process нь Relay Log-с нэг нэгээр нь уншиж, тухайн SQL командыг Replica-ийн өгөгдлийн санд **гүйцэтгэдэг**.

```
Replica-ийн SQL Thread:
Relay Log-с авна: "INSERT INTO users (Батболд)"
     ↓ гүйцэтгэнэ
Replica DB-д Батболд нэмэгдэнэ ✓

Relay Log-с авна: "UPDATE tasks SET status='done'"
     ↓ гүйцэтгэнэ
Replica DB-д tasks шинэчлэгдэнэ ✓
```

### Бүх урсгалыг нэгтгэвэл

```
[PRIMARY]                              [REPLICA]
                                    ┌─────────────────┐
  Хэрэглэгч өгөгдөл өөрчилнө       │   I/O Thread    │
        ↓                            │  (татагч)       │
  MySQL өөрчлөлтийг                 │                 │
  Binary Log-д бүртгэнэ             │  SQL Thread     │
        ↓                            │  (гүйцэтгэгч)  │
  Binary Log ──── сүлжээгээр ──>   Relay Log          │
                                        ↓              │
                                    Replica DB         │
                                    шинэчлэгдэнэ      │
                                    └─────────────────┘
```

Энэ бүх үйл явц **дэвсгэрт автоматаар** явагддаг. Хөгжүүлэгч ямар ч тохиргоо хийхгүйгээр Primary-д бичсэн өгөгдөл Replica-д тусдаг.

### Replication-ийн горимууд

Binlog-д **юуг** бүртгэх вэ гэдэг нь горимоор тодорхойлогддог.

**Statement-based:** SQL командыг бүхэлд нь хадгална. Хялбар боловч `NOW()`, `RAND()` зэрэг функц Primary болон Replica дээр өөр үр дүн гаргаж болно.

```
Binlog-д хадгалагдах зүйл:
"UPDATE users SET last_login = NOW() WHERE id = 5"

Асуудал: Primary-д NOW() = 14:30:00
         Replica-д хожим гүйцэтгэхэд NOW() = 14:30:02  ← зөрүү!
```

**Row-based:** Командыг биш, өөрчлөгдсөн мөрийн **бодит утгыг** хадгална. Найдвартай, гэхдээ их өгөгдөл дамжуулна.

```
Binlog-д хадгалагдах зүйл:
"users мөр id=5: last_login = '2026-06-09 14:30:00'"

Аль ч серверт гүйцэтгэхэд яг ижил утга орно ✓
```

**Mixed:** MySQL өөрөө нөхцөл байдлаас хамааран хоёуланг хослуулдаг. Энэ нь өгөгдмөл горим бөгөөд ихэнх тохиолдолд хамгийн тохиромжтой.

---

## 4. Replication Lag — Хоцрогдол

Read Replica-ийн хамгийн чухал ойлгох зүйл бол **replication lag** буюу хоцрогдол юм.

```
Primary дээр өөрчлөлт гарна
         ↓
    [0мс – Xмс хоцрогдол]
         ↓
Replica дээр өөрчлөлт тусна
```

Энэ хоцрогдол ихэвчлэн **миллисекундэд** хэмжигддэг боловч ачаалал их үед хэдэн секунд хүрч болно.

### Практик нөлөө

```
Хэрэглэгч нэр өөрчилнө (Primary-д бичигдэнэ)
         ↓
Шууд профайл хуудас руу шилжинэ
         ↓
Replica-с уншина → хуучин нэр харагдаж болно!
```

Энэ үзэгдлийг **eventual consistency** буюу "эцэстээ нийцэх" гэж нэрлэдэг.

### Шийдлүүд

**Read-your-own-writes:** Хэрэглэгч өөрийн бичсэн өгөгдлийг уншихдаа Primary-с уншина.

```javascript
// Хэрэглэгч өөрийн профайл харахад → Primary
// Бусад хэрэглэгчийн профайл харахад → Replica
async function getProfile(requesterId, targetId) {
  const db = requesterId === targetId ? primaryPool : replicaPool;
  return db.query('SELECT * FROM users WHERE id = ?', [targetId]);
}
```

**Session consistency:** Хэрэглэгч бичилт хийснээс хойш тодорхой хугацаанд Primary-с уншина.

**Lag хянах:**
```sql
-- Replica дээр ажиллуулна
SHOW SLAVE STATUS\G
-- Seconds_Behind_Master: 0  ← хоцрогдол секундэд
```

---

## 5. Node.js дахь Хэрэгжүүлэлт

### Энгийн хоёр pool

```javascript
// config/database.js
const mysql = require('mysql2/promise');

const primaryPool = mysql.createPool({
  host: process.env.DB_PRIMARY_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10
});

const replicaPool = mysql.createPool({
  host: process.env.DB_REPLICA_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 20  // Уншилт их тул replica pool томоор тавина
});

module.exports = { primaryPool, replicaPool };
```

### Model дээр ашиглах

```javascript
// models/UserModel.js
const { primaryPool, replicaPool } = require('../config/database');

const UserModel = {
  // Уншилт → Replica
  async findAll() {
    const [rows] = await replicaPool.query('SELECT * FROM users');
    return rows;
  },

  async findById(id) {
    const [rows] = await replicaPool.query(
      'SELECT * FROM users WHERE id = ?', [id]
    );
    return rows[0];
  },

  // Бичилт → Primary
  async create(data) {
    const [result] = await primaryPool.query(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [data.name, data.email]
    );
    return result.insertId;
  },

  async update(id, data) {
    await primaryPool.query(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [data.name, data.email, id]
    );
  },

  async delete(id) {
    await primaryPool.query('DELETE FROM users WHERE id = ?', [id]);
  }
};

module.exports = UserModel;
```

### Router helper — код хялбарчлах

```javascript
// utils/dbRouter.js

const { primaryPool, replicaPool } = require('../config/database');

// SQL командоор автоматаар чиглүүлэх
function getPool(sql) {
  const command = sql.trim().toUpperCase().split(' ')[0];
  const readCommands = ['SELECT', 'SHOW', 'DESCRIBE', 'EXPLAIN'];
  return readCommands.includes(command) ? replicaPool : primaryPool;
}

async function query(sql, params) {
  const pool = getPool(sql);
  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = { query };
```

```javascript
// Model дээр хялбархан ашиглах
const db = require('../utils/dbRouter');

const rows = await db.query('SELECT * FROM tasks');         // → Replica
await db.query('INSERT INTO tasks (title) VALUES (?)', ['Шинэ']); // → Primary
```

---

## 6. Олон Replica — Load Balancing

Хэрэв replica олон байвал хүсэлтийг тэнцүү хуваарилна.

```
                [Primary]
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
   [Replica 1]  [Replica 2]  [Replica 3]
        ↑           ↑           ↑
        └─────── Round Robin ───┘
```

```javascript
// utils/replicaBalancer.js
const { replica1Pool, replica2Pool, replica3Pool } = require('../config/database');

const replicas = [replica1Pool, replica2Pool, replica3Pool];
let index = 0;

function getReplicaPool() {
  const pool = replicas[index];
  index = (index + 1) % replicas.length;  // Round-robin
  return pool;
}

module.exports = { getReplicaPool };
```

---

## 7. Failover — Эвдрэлийн үед

Primary сервер унавал replica нь **primary болон өргөмжлөгдөж** үйлчилгээ тасрахгүй байна. Энэ процессыг **failover** гэнэ.

```
Primary унана
     ↓
Replica 1 → шинэ Primary болно
     ↓
Бусад replica Replica 1-ийг дагана
     ↓
Хуучин Primary сэргэхэд → шинэ Replica болно
```

**Автомат failover** хийхэд дараах хэрэгслүүд ашиглагддаг:
- **MySQL Router** — MySQL-ийн албан ёсны хэрэгсэл
- **ProxySQL** — Нэмэлт чиглүүлэгч давхарга
- **Orchestrator** — GitHub-ийн нээлттэй эхийн хэрэгсэл
- **AWS RDS Multi-AZ** — үүлэн орчинд автоматаар хийдэг

---

## 8. Read Replica vs Бусад Аргууд

| Арга | Тайлбар | Тохиромжтой үед |
|---|---|---|
| **Read Replica** | Уншилтыг тусдаа сервер рүү чиглүүлнэ | Уншилт давамгайлах үед |
| **Cache (Redis)** | Өгөгдлийг санах ойд хадгална | Ижил өгөгдлийг олон удаа уншихад |
| **Sharding** | Өгөгдлийг хэд хэдэн серверт хуваана | Өгөгдлийн хэмжээ маш их үед |
| **Vertical Scaling** | Серверийн RAM, CPU нэмэгдүүлнэ | Хурдан шийдэл хэрэгтэй үед |

**Хослуулах нь хамгийн сайн:**
```
Хэрэглэгч → Redis Cache (хамгийн хурдан)
                 ↓ cache miss
           Read Replica (хурдан)
                 ↓ нарийн тооцоо
              Primary
```

---

## 9. Хэзээ Read Replica Хэрэгтэй вэ?

Read Replica нэмэх нь нэмэлт хүндрэл авчирдаг тул **шаардлагатай үед** л ашиглана.

**Хэрэгтэй үед:**
- Уншилтын хүсэлт маш их, Primary ачаалал 70%+ байвал
- Тайлан, аналитик query удаан ажиллаж үндсэн апп-г удаашруулж байвал
- Өндөр availability (uptime) шаардлагатай бол

**Хэрэггүй үед:**
- Хэрэглэгч цөөн, ачаалал бага байвал
- Бичилт давамгайлах тохиолдолд (replica тус болохгүй)
- Eventual consistency хүлцэхгүй өгөгдөлд (санхүүгийн тооцоо гэх мэт)

---

## 10. Task Manager дахь Хэрэглээ

Таны Task Manager-т Read Replica-г дараах байдлаар ашиглаж болно:

```javascript
// Task жагсаалт харах → Replica (олон хэрэглэгч байнга харна)
async function getTasks(workspaceId) {
  const [rows] = await replicaPool.query(
    'SELECT * FROM tasks WHERE workspace_id = ?', [workspaceId]
  );
  return rows;
}

// Task үүсгэх, засах → Primary
async function createTask(data) {
  const [result] = await primaryPool.query(
    'INSERT INTO tasks (title, workspace_id, assigned_to) VALUES (?, ?, ?)',
    [data.title, data.workspaceId, data.assignedTo]
  );
  return result.insertId;
}

// Dashboard тайлан → Replica (удаан боловч Primary-г ачааллахгүй)
async function getDashboardStats(workspaceId) {
  const [rows] = await replicaPool.query(`
    SELECT status, COUNT(*) as count
    FROM tasks
    WHERE workspace_id = ?
    GROUP BY status
  `, [workspaceId]);
  return rows;
}
```

---

## Товч дүгнэлт

Read Replica бол **уншилтын ачааллыг хуваарилах** архитектурын шийдэл юм. Санах ойд байлгах цөөхөн зүйл:

- **Бичилт → Primary, Уншилт → Replica**
- **Replication lag бодит** — eventual consistency-г хүлцэх ёстой
- **Transaction бүхэлдээ Primary дээр** явна
- **Redis + Replica хослуулах** нь хамгийн үр дүнтэй
- **Жижиг аппт шаардлагагүй** — нэмэлт хүндрэл авчирна

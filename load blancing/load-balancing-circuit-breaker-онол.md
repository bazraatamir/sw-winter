# Load Balancing & Circuit Breaker Pattern — Дэлгэрэнгүй Онолын Гарын Авлага

---

## НЭГДҮГЭЭР ХЭСЭГ: Load Balancing

---

## 1. Асуудал: Нэг Сервер Хангалтгүй Болох

Апп нь өсөхийн хэрээр нэг сервер хангалтгүй болдог.

```
1,000 хэрэглэгч нэгэн зэрэг:
────────────────────────────
Бүгд → [Сервер 1]
             │
      CPU 100% → хариу удаашрана
      RAM дүүрэх → crash болно
      Нэг сервер унавал → бүх апп унана
```

Шийдэл нь сервер нэмж, ачааллыг хуваарилах юм. Энэ зарчмыг **Horizontal Scaling** гэнэ.

```
1,000 хэрэглэгч нэгэн зэрэг:
────────────────────────────
               ┌→ [Сервер 1]  333 хэрэглэгч
Бүгд → [LB] ──┼→ [Сервер 2]  333 хэрэглэгч
               └→ [Сервер 3]  334 хэрэглэгч

LB = Load Balancer = Ачаалал хуваарилагч
```

---

## 2. Load Balancing гэж юу вэ?

Load Balancing буюу **ачааллын тэнцвэржүүлэлт** бол ирж буй хүсэлтийг олон серверт тэнцүү хуваарилдаг механизм юм.

Зүйрлэл: Супермаркетын касс гэж бодоорой. Нэг кассанд бүх хэрэглэгч дараалбал урт дараалал үүснэ. Харин кассны менежер хэрэглэгчийг хамгийн богино дараалалтай касс руу чиглүүлэхэд бүгд хурдан үйлчлүүлнэ. Load Balancer яг энэ менежерийн үүрэг гүйцэтгэнэ.

```
Хүсэлт ирэх бүрт Load Balancer шийдвэр гаргана:
"Одоо аль сервер хамгийн чөлөөтэй байна вэ?"
         ↓
Тухайн серверт хүсэлт дамжуулна
```

---

## 3. Load Balancing Алгоритмууд

Load Balancer хүсэлтийг хэрхэн хуваарилах вэ гэдгийг **алгоритм** тодорхойлдог.

### 3.1 Round Robin — Дугуй Эргэлт

Хамгийн энгийн алгоритм. Сервер бүрт дараалан нэг нэгээр хүсэлт явуулна.

```
Хүсэлт 1 → Сервер 1
Хүсэлт 2 → Сервер 2
Хүсэлт 3 → Сервер 3
Хүсэлт 4 → Сервер 1  ← дахин эхнээсээ
Хүсэлт 5 → Сервер 2
...
```

**Давуу тал:** Маш хялбар, тохируулалт шаардахгүй.

**Сул тал:** Сервер бүрийн хүчин чадал адил гэж үзнэ. Зарим хүсэлт хүнд, зарим нь хөнгөн байвал тэгш бус ачаалал үүснэ.

**Хэрэглээ:** Сервер бүр адил хүчин чадалтай, хүсэлтүүд ойролцоо хугацаа зарцуулдаг үед.

### 3.2 Weighted Round Robin — Жинтэй Дугуй Эргэлт

Round Robin-ийн сайжруулсан хувилбар. Хүчирхэг сервер илүү их хүсэлт авдаг.

```
Сервер 1: жин 3  (хүчирхэг)
Сервер 2: жин 2
Сервер 3: жин 1  (сул)

Хуваарилалт:
Хүсэлт 1,2,3 → Сервер 1
Хүсэлт 4,5   → Сервер 2
Хүсэлт 6     → Сервер 3
Хүсэлт 7,8,9 → Сервер 1  ← дахин
...
```

**Хэрэглээ:** Сервер бүр өөр өөр хүчин чадалтай үед.

### 3.3 Least Connections — Хамгийн Бага Холболт

Одоогийн байдлаар хамгийн бага идэвхтэй холболттой серверт хүсэлт явуулна.

```
Одоогийн байдал:
Сервер 1: 45 холболт
Сервер 2: 12 холболт  ← хамгийн бага
Сервер 3: 38 холболт

Шинэ хүсэлт → Сервер 2
```

**Давуу тал:** Хүнд хүсэлтүүд байвал тэнцвэртэй хуваарилна.

**Сул тал:** Холболтын тоо хянах нэмэлт ачаалал.

**Хэрэглээ:** Хүсэлтүүдийн боловсруулалтын хугацаа харилцан адилгүй үед (хурдан болон удаан хүсэлт хольж байх үед).

### 3.4 IP Hash — IP Хаягийн Хэш

Хэрэглэгчийн IP хаягийг hash функцээр тооцоолж, тухайн хэрэглэгчийг үргэлж нэг серверт чиглүүлнэ.

```
Хэрэглэгч A (IP: 192.168.1.10) → hash(192.168.1.10) % 3 = 0 → Сервер 1 (үргэлж)
Хэрэглэгч B (IP: 192.168.1.20) → hash(192.168.1.20) % 3 = 2 → Сервер 3 (үргэлж)
```

**Давуу тал:** Нэг хэрэглэгч үргэлж нэг серверт очдог — **Session Sticky** (наалдамхай session) хэрэгтэй аппт тохиромжтой.

**Сул тал:** Сервер нэмж, устгахад hash дахин тооцоологдож хэрэглэгч өөр сервер рүү шилжинэ.

**Хэрэглээ:** Session in-memory хадгалдаг хуучин апп (Redis session store байхгүй үед).

### 3.5 Least Response Time — Хамгийн Богино Хариу Цаг

Хамгийн хурдан хариулдаг серверт хүсэлт явуулна. Холболтын тоо болон хариу цагийг хоёуланг нь харгалзана.

```
Сервер 1: 12 холболт, дундаж хариу 120мс
Сервер 2:  8 холболт, дундаж хариу  45мс  ← хамгийн сайн
Сервер 3: 20 холболт, дундаж хариу 200мс

Шинэ хүсэлт → Сервер 2
```

**Хэрэглээ:** Хариу цаг критик, сервер бүрийн гүйцэтгэл харилцан адилгүй үед.

---

## 4. Load Balancing-ийн Давхаргууд

Load Balancing нь OSI загварын хоёр өөр давхаргад хийгдэж болно.

### Layer 4 (Transport Layer)

TCP/UDP урсгалыг IP хаяг болон портоор чиглүүлнэ. HTTP хүсэлтийн агуулгыг харахгүй — зөвхөн сүлжээний пакетыг дамжуулна.

```
Хэрэглэгч → [L4 LB] → TCP пакет → Сервер
                  └ зөвхөн IP:PORT харна
                  └ HTTP агуулга харахгүй
```

**Давуу тал:** Маш хурдан, CPU бага зарцуулна.
**Сул тал:** URL, Header-д суурилсан чиглүүлэлт хийх боломжгүй.

### Layer 7 (Application Layer)

HTTP хүсэлтийн URL, Header, Cookie-г харж чиглүүлнэ. Илүү ухаалаг.

```
Хэрэглэгч → [L7 LB]
                 │
                 ├─ /api/tasks/*     → Task Service
                 ├─ /api/workspaces/* → Workspace Service
                 └─ /api/auth/*      → Auth Service
```

**Давуу тал:** URL-д суурилсан чиглүүлэлт, SSL termination, Header өөрчлөлт боломжтой.
**Сул тал:** L4-с удаан, CPU илүү зарцуулна.

---

## 5. Health Check — Унасан Серверийг Тойрох

Load Balancer сервер бүрийн амьд эсэхийг тогтмол шалгадаг. Унасан серверт хүсэлт явуулахгүй.

```
Load Balancer 30 секунд тутам:
    │
    ├→ GET /health → Сервер 1 → 200 OK      ✓ идэвхтэй
    ├→ GET /health → Сервер 2 → timeout     ✗ унасан → жагсаалтаас хасна
    └→ GET /health → Сервер 3 → 200 OK      ✓ идэвхтэй

Шинэ хүсэлт:
Сервер 1, Сервер 3 руу л явна
Сервер 2 сэргэхэд дахин нэмнэ
```

Express дахь Health Check endpoint:

```javascript
// app.js
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // DB холболт шалгана
    res.json({ status: 'ok', service: 'task-service', uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: 'error', message: 'DB холбогдохгүй байна' });
  }
});
```

---

## 6. Node.js дахь Хялбар Load Balancer

### PM2 — Хамгийн Хялбар Арга

PM2 нь Node.js процессыг удирддаг хэрэгсэл бөгөөд **cluster mode** дэмждэг.

```bash
npm install -g pm2

# CPU цөмийн тоогоор instance үүсгэнэ
pm2 start app.js -i max

# Эсвэл тодорхой тоогоор
pm2 start app.js -i 4
```

PM2 cluster mode-д Node.js-ийн дотоод **Cluster module** ашиглана:

```
PM2 Master Process
    │
    ├── Worker 1 (CPU 0)  :3000
    ├── Worker 2 (CPU 1)  :3000
    ├── Worker 3 (CPU 2)  :3000
    └── Worker 4 (CPU 3)  :3000
         ↑ нэг port, Round Robin
```

Энэ нь нэг серверийн дотоод CPU-уудыг бүрэн ашиглах боломж олгоно.

### Nginx — Олон Сервер Хооронд

Nginx нь production-д хамгийн өргөн ашиглагддаг load balancer.

```nginx
# /etc/nginx/nginx.conf

upstream task_service {
    # Round Robin (өгөгдмөл)
    server 192.168.1.10:3002;
    server 192.168.1.11:3002;
    server 192.168.1.12:3002;
}

upstream task_service_weighted {
    # Weighted Round Robin
    server 192.168.1.10:3002 weight=3;
    server 192.168.1.11:3002 weight=2;
    server 192.168.1.12:3002 weight=1;
}

upstream task_service_least_conn {
    least_conn;
    server 192.168.1.10:3002;
    server 192.168.1.11:3002;
    server 192.168.1.12:3002;
}

server {
    listen 80;

    location /api/tasks {
        proxy_pass http://task_service;

        # Health check
        proxy_next_upstream error timeout http_503;
    }
}
```

---

## ХОЁРДУГААР ХЭСЭГ: Circuit Breaker Pattern

---

## 7. Асуудал: Унасан Сервис Бусдад Нөлөөлөх

Microservice архитектурт нэг сервис удаашрах нь **гинжин урвал** үүсгэж болно.

```
Task Service → User Service (удаашрав)
     │
     └ Хариу хүлээнэ... 30 секунд
              │
              └ Шинэ хүсэлт ирнэ, дахин хүлээнэ...
                       │
                       └ Хүсэлт хуримтлагдана
                                │
                                └ Task Service-ийн thread дүүрэнэ
                                         │
                                         └ Task Service ч удаашрана
                                                  │
                                                  └ API Gateway ч удаашрана
                                                           │
                                                           └ Бүх систем унана 😱
```

Нэг сервисийн удаашрал бүх системийг унагах энэ үзэгдлийг **Cascading Failure** буюу гинжин доголдол гэнэ.

---

## 8. Circuit Breaker Pattern гэж юу вэ?

Circuit Breaker буюу **Автомат хэтрүүлэгч** нь цахилгааны хэтрүүлэгчтэй адил зарчмаар ажилладаг.

Гэрийн цахилгааны хэтрүүлэгч: Гүйдэл хэт их болоход хэтрүүлэгч унаж, цахилгааны шугамыг **таслана**. Ингэснээр тоног төхөөрөмж гэмтэхээс сэргийлнэ.

```
Хэвийн: Гүйдэл → Хэтрүүлэгч → Тоног төхөөрөмж
Хэт их: Гүйдэл → Хэтрүүлэгч → ТАСАЛДСАН → Тоног төхөөрөмж хамгаалагдана
```

Circuit Breaker Pattern-д:

```
Хэвийн:   Хүсэлт → [Circuit: CLOSED] → User Service → Хариу
Доголдол:  Хүсэлт → [Circuit: OPEN]   → Шууд алдаа   (User Service рүү явахгүй)
```

Сервис рүү дахин дахин явахын оронд **шууд алдаа буцааж** хүлээлтийг таслана.

---

## 9. Circuit Breaker-ийн Гурван Төлөв

Circuit Breaker нь гурван төлөвт байдаг бөгөөд тэдгээрийн хооронд шилждэг.

```
        Амжилтгүй тоо             Timeout дууссан
          давсан                        │
    ┌─────────────┐               ┌─────────────┐
    │             ▼               ▼             │
 CLOSED ──────────────────────► OPEN           │
    ▲                              │            │
    │          Амжилттай           ▼            │
    └──────────────────────── HALF_OPEN ────────┘
                                   │
                              Амжилтгүй
                                   │
                                   ▼
                                 OPEN
```

### CLOSED — Хэвийн ажиллагаа

Бүх хүсэлт дамжиж, алдааны тоог хянана.

```
Хүсэлт → [CLOSED] → Сервис → Хариу
                         │
                    Алдаа гарвал тоолно
                    3/5 = OPEN болно
```

### OPEN — Тасарсан

Бүх хүсэлтийг шууд буцааж, сервист очихгүй. Тогтмол хугацааны дараа HALF_OPEN руу шилжинэ.

```
Хүсэлт → [OPEN] → Шууд алдаа (0мс)
                    "Сервис түр боломжгүй"
```

### HALF_OPEN — Туршилтын горим

Тодорхой хугацааны дараа **нэг хүсэлт** дамжуулж сервис сэргэсэн эсэхийг шалгана.

```
Хүсэлт → [HALF_OPEN] → Сервис
                            │
                    Амжилттай → CLOSED болно (хэвийн болсон)
                    Алдаа     → OPEN болно  (одоохондоо болохгүй)
```

---

## 10. Circuit Breaker-ийн Дотоод Механизм

Circuit Breaker-г зөв ойлгохын тулд дотоод параметрүүдийг мэдэх хэрэгтэй.

### Failure Threshold — Алдааны Босго

Хэдэн алдааны дараа OPEN болох вэ гэдгийг тодорхойлно.

```
failureThreshold = 5

1-р алдаа: failCount = 1 → CLOSED
2-р алдаа: failCount = 2 → CLOSED
3-р алдаа: failCount = 3 → CLOSED
4-р алдаа: failCount = 4 → CLOSED
5-р алдаа: failCount = 5 → OPEN  ← босго давсан
```

### Recovery Timeout — Сэргэх Хугацаа

OPEN төлөвт хэр удаан байх вэ гэдгийг тодорхойлно. Хугацаа дуусмагц HALF_OPEN руу шилжинэ.

```
recoveryTimeout = 30000мс (30 секунд)

OPEN болсон цаг:  14:00:00
Шинэ хүсэлт ирнэ: 14:00:15 → OPEN хэвээр, шууд алдаа
Шинэ хүсэлт ирнэ: 14:00:31 → HALF_OPEN, нэг хүсэлт дамжуулна
```

### Success Threshold — Амжилтын Босго

HALF_OPEN төлөвт хэдэн амжилттай хариуны дараа CLOSED болох вэ гэдгийг тодорхойлно.

```
successThreshold = 2

HALF_OPEN дахь 1-р амжилт: successCount = 1 → HALF_OPEN хэвээр
HALF_OPEN дахь 2-р амжилт: successCount = 2 → CLOSED  ← сэргэсэн
```

---

## 11. Node.js дахь Circuit Breaker Хэрэгжүүлэлт

### Бүрэн Circuit Breaker класс

```javascript
// utils/CircuitBreaker.js

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout  = options.recoveryTimeout  || 30000;
    this.successThreshold = options.successThreshold || 2;

    this.state        = 'CLOSED';
    this.failCount    = 0;
    this.successCount = 0;
    this.nextAttempt  = Date.now();
    this.name         = options.name || 'unknown';
  }

  async call(fn) {
    // OPEN төлөвт шалгалт
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const waitSec = Math.ceil((this.nextAttempt - Date.now()) / 1000);
        throw new Error(
          `[${this.name}] Circuit OPEN — ${waitSec}с-ийн дараа дахин оролдоно`
        );
      }
      // Timeout дууссан → HALF_OPEN руу шилж
      this._transitionTo('HALF_OPEN');
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    this.failCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this._transitionTo('CLOSED');
      }
    }
  }

  _onFailure() {
    this.successCount = 0;
    this.failCount++;

    if (this.state === 'HALF_OPEN') {
      // HALF_OPEN дахь алдаа → дахин OPEN
      this._transitionTo('OPEN');
      return;
    }

    if (this.failCount >= this.failureThreshold) {
      this._transitionTo('OPEN');
    }
  }

  _transitionTo(newState) {
    const old = this.state;
    this.state = newState;

    if (newState === 'OPEN') {
      this.nextAttempt  = Date.now() + this.recoveryTimeout;
      this.successCount = 0;
      console.error(
        `[${this.name}] Circuit ${old} → OPEN ` +
        `(${this.recoveryTimeout / 1000}с-ийн дараа HALF_OPEN болно)`
      );
    } else if (newState === 'HALF_OPEN') {
      console.warn(`[${this.name}] Circuit OPEN → HALF_OPEN (туршилтын горим)`);
    } else if (newState === 'CLOSED') {
      this.failCount    = 0;
      this.successCount = 0;
      console.log(`[${this.name}] Circuit HALF_OPEN → CLOSED (сэргэлт амжилттай)`);
    }
  }

  getStatus() {
    return {
      name:        this.name,
      state:       this.state,
      failCount:   this.failCount,
      successCount: this.successCount,
      nextAttempt: this.state === 'OPEN'
        ? new Date(this.nextAttempt).toISOString()
        : null,
    };
  }
}

module.exports = CircuitBreaker;
```

### Сервис Client-д хэрэглэх

```javascript
// clients/userClient.js
const CircuitBreaker = require('../utils/CircuitBreaker');

const breaker = new CircuitBreaker({
  name:             'UserService',
  failureThreshold: 5,
  recoveryTimeout:  30000,
  successThreshold: 2,
});

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

async function fetchWithTimeout(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Timeout: ${url}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const UserClient = {
  async findById(userId) {
    return breaker.call(async () => {
      const res = await fetchWithTimeout(
        `${USER_SERVICE_URL}/internal/users/${userId}`
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
  },

  async isMember(userId, workspaceId) {
    return breaker.call(async () => {
      const res = await fetchWithTimeout(
        `${USER_SERVICE_URL}/internal/workspaces/${workspaceId}/members/${userId}`
      );
      return res.ok;
    });
  },

  // Circuit-ийн одоогийн төлвийг авах
  getCircuitStatus() {
    return breaker.getStatus();
  },
};

module.exports = UserClient;
```

### Fallback — Нөөц Хариу

Circuit OPEN үед шууд алдаа буцааны оронд **нөөц хариу** буцаах боломжтой.

```javascript
async function getUserWithFallback(userId) {
  try {
    return await UserClient.findById(userId);
  } catch (err) {
    if (err.message.includes('Circuit OPEN')) {
      // Нөөц хариу — cache-с авах, эсвэл хязгаарлагдмал мэдээлэл буцаах
      const cached = await redis.get(`user:${userId}`);
      if (cached) return JSON.parse(cached);

      // Cache ч байхгүй бол task-г "ямар ч хэрэглэгчгүй" үүсгэнэ
      return null;
    }
    throw err;
  }
}
```

### Circuit Status Monitoring

```javascript
// app.js — Circuit-ийн төлвийг харах endpoint
app.get('/circuit-status', (req, res) => {
  res.json({
    circuits: [
      UserClient.getCircuitStatus(),
      // ... бусад client-ийн status
    ]
  });
});
```

---

## 12. Load Balancing + Circuit Breaker Хослол

Хоёулаа хамтдаа ажиллахад системийн найдвартай байдал хамгийн өндөр болно.

```
Хэрэглэгч
    ↓
[Load Balancer]   ← Ачаалал хуваарилна, унасан серверийг тойрно
    │
    ├── Task Service 1
    │       ↓
    │   [Circuit Breaker]  ← User Service удаашравал таслана
    │       ↓
    │   User Service
    │
    └── Task Service 2
            ↓
        [Circuit Breaker]
            ↓
        User Service
```

**Load Balancer** нь **Task Service** сервисүүдийн хооронд ачаалал хуваарилна.

**Circuit Breaker** нь **Task Service → User Service** дотоод дуудлагыг хамгаална.

Хоёулаа өөр түвшинд өөр асуудлыг шийдэж байна — нэгийг нөгөөгөөр орлох биш.

---

## 13. Load Balancing vs Circuit Breaker — Ялгаа

| | Load Balancing | Circuit Breaker |
|---|---|---|
| **Зорилго** | Ачааллыг тэнцүү хуваарилах | Унасан сервисийг тойрох |
| **Байрлал** | Хүсэлт ирэх үүдэнд | Сервис дуудалтын дотор |
| **Хамгаалах зүйл** | Нэг сервер хэт ачаалагдахаас | Гинжин доголдлоос |
| **Ажиллах цаг** | Байнга | Алдаа гарвал идэвхждэг |
| **Хэрэглэгч мэдэх үү** | Үгүй — нэг л хаяг хардаг | Алдааны мессеж хардаг |

---

## Товч Дүгнэлт

**Load Balancing** — ачааллыг олон серверт хуваарилж гүйцэтгэлийг нэмэгдүүлнэ.

**Circuit Breaker** — нэг сервисийн доголдлоос бусдыг хамгаалж найдвартай байдлыг хангана.

Санах ойд байлгах зүйл:

- **Round Robin** → хамгийн хялбар, адил хүчин чадалтай серверт
- **Least Connections** → хүсэлтийн хугацаа тэгш бус үед
- **IP Hash** → session sticky шаардлагатай үед
- **Circuit Breaker: CLOSED** → хэвийн, алдаа тоолно
- **Circuit Breaker: OPEN** → тасарсан, шууд алдаа буцаана
- **Circuit Breaker: HALF_OPEN** → туршилт, нэг хүсэлт дамжуулна
- **Fallback** → Circuit OPEN үед нөөц хариу буцаах
- **Health Check** → Load Balancer унасан сервер мэдэхийн тулд

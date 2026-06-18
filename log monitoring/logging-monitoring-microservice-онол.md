# Logging & Monitoring — Microservice Орчин дахь Дэлгэрэнгүй Гарын Авлага

---

## 1. Яагаад Microservice-д Logging & Monitoring Хүндрэлтэй Вэ?

Monolith-д нэг лог файл бүгдийг агуулдаг:

```
app.log:
14:30:01 User 42 нэвтэрлээ
14:30:02 Task 1 үүсгэгдлээ
14:30:03 Мэдэгдэл илгээгдлээ
```

Microservice-д лог **тарахад**:

```
task-service.log:          notification-service.log:    auth-service.log:
14:30:02 Task үүсгэв      14:30:03 Мэдэгдэл илгээв    14:30:01 Нэвтэрлээ
14:30:05 Task шинэчлэв    14:30:07 Алдаа гарлаа        14:30:09 Гарлаа
...                        ...                           ...
```

Нэг хэрэглэгчийн хүсэлт 3 сервист хуваагдсан байхад алдааг хаана, хэзээ гарсан болохыг олоход хэцүү болдог.

Нэмж хэлэхэд:
- **Monitoring** байхгүй бол сервис унасныг хэрэглэгч мэдэгдэх хүртэл мэдэхгүй
- **Alerting** байхгүй бол CPU 100% болоход хэн ч хариу арга хэмжээ авахгүй
- **Distributed Tracing** байхгүй бол нэг хүсэлт аль сервисд удаашраж байгааг мэдэхгүй

---

## 2. Logging-ийн Үндсэн Зарчим

### Бүтэцтэй Log (Structured Logging)

Энгийн текст log нь хайхад хэцүү. JSON хэлбэрийн log нь **шүүх, хайх, шинжлэх** боломжтой.

```javascript
// ❌ Муу — энгийн текст
console.log('User 42 created task 101 in workspace 5');

// ✅ Сайн — JSON бүтэц
logger.info('Task үүсгэгдлээ', {
  requestId:   'req-abc123',   // Хүсэлтийг хянах
  userId:      42,             // Хэн үүсгэсэн
  taskId:      101,            // Юу үүсгэсэн
  workspaceId: 5,              // Хаана
  duration:    45,             // Хэр хурдан (мс)
  service:     'task-service', // Аль сервис
});
```

JSON log нь Elasticsearch, Datadog, Grafana Loki зэрэг системд **автоматаар шинжлэгддэг**.

### Log Түвшин

```
FATAL  → Сервис ажиллахаа больсон — шуурхай арга хэмжээ
ERROR  → Алдаа гарсан, хэрэглэгчид нөлөөлсөн
WARN   → Анхааруулга, одоохондоо асуудалгүй
INFO   → Хэвийн үйл ажиллагаа
DEBUG  → Хөгжүүлэх үед дэлгэрэнгүй мэдээлэл
```

Production-д `WARN` ба дээшийг, Development-д `DEBUG` ба дээшийг бүртгэнэ.

---

## 3. Distributed Tracing — Олон Сервист Хүсэлт Хянах

### Асуудал

Нэг хэрэглэгчийн нэг хүсэлт олон сервисийг дамжих үед тухайн хүсэлтийн **бүрэн замыг** харах шаардлагатай.

```
Хэрэглэгч → API Gateway → Task Service → User Service → DB
                                       → Notification Service → RabbitMQ
```

Хаана хэр удаашрав, алдаа хаана гарав?

### Request ID — Хялбар Шийдэл

Хүсэлт бүрт **өвөрмөц ID** оноон, бүх сервисийг дамжуулна. Тухайн ID-р бүх log-г нэг дор харж болно.

```
API Gateway:          requestId = "req-abc123" үүсгэнэ
    ↓
Task Service:         requestId = "req-abc123" header-аас авна, log-д бичнэ
    ↓
User Service:         requestId = "req-abc123" header-аас авна, log-д бичнэ
    ↓
Notification Service: requestId = "req-abc123" header-аас авна, log-д бичнэ
```

Бүх log-г `requestId = "req-abc123"` -аар шүүхэд нэг хүсэлтийн бүрэн зам харагдана:

```
14:30:00.100 [req-abc123] API Gateway: Task үүсгэх хүсэлт ирлээ
14:30:00.110 [req-abc123] Task Service: Task үүсгэж эхэллээ
14:30:00.145 [req-abc123] User Service: userId=42 шалгав → олдсон
14:30:00.155 [req-abc123] Task Service: DB-д хадгаллаа taskId=101
14:30:00.160 [req-abc123] Task Service: RabbitMQ-д event илгээлээ
14:30:00.165 [req-abc123] API Gateway: 201 хариу буцааллаа (65мс)
14:30:00.200 [req-abc123] Notification Service: мэдэгдэл илгээлээ
```

### Node.js дахь Request ID Дамжуулалт

```javascript
// shared/middleware/requestContext.js
const { v4: uuidv4 } = require('uuid');

// AsyncLocalStorage нь request-ийн context-ийг
// async функцүүдэд дамжуулах боломж олгодог
const { AsyncLocalStorage } = require('async_hooks');
const storage = new AsyncLocalStorage();

function requestContext(req, res, next) {
  // API Gateway-с ирсэн requestId ашиглах, эсвэл шинэ үүсгэх
  const requestId = req.headers['x-request-id'] || uuidv4();

  res.setHeader('x-request-id', requestId);

  // Context-ийг storage-д хадгална
  storage.run({ requestId, startTime: Date.now() }, next);
}

function getRequestId() {
  return storage.getStore()?.requestId || 'no-context';
}

function getElapsed() {
  const store = storage.getStore();
  return store ? Date.now() - store.startTime : 0;
}

module.exports = { requestContext, getRequestId, getElapsed };
```

```javascript
// shared/logger.js
const winston = require('winston');
const { getRequestId, getElapsed } = require('./middleware/requestContext');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' }),
  ],
});

// Winston-г requestId автоматаар нэмдэгээр сайжруулна
const enhancedLogger = {
  info:  (msg, meta = {}) => logger.info(msg,  { requestId: getRequestId(), elapsed: getElapsed(), service: process.env.SERVICE_NAME, ...meta }),
  warn:  (msg, meta = {}) => logger.warn(msg,  { requestId: getRequestId(), elapsed: getElapsed(), service: process.env.SERVICE_NAME, ...meta }),
  error: (msg, meta = {}) => logger.error(msg, { requestId: getRequestId(), elapsed: getElapsed(), service: process.env.SERVICE_NAME, ...meta }),
  debug: (msg, meta = {}) => logger.debug(msg, { requestId: getRequestId(), elapsed: getElapsed(), service: process.env.SERVICE_NAME, ...meta }),
};

module.exports = enhancedLogger;
```

```javascript
// app.js
const { requestContext } = require('./shared/middleware/requestContext');
const logger = require('./shared/logger');

app.use(requestContext);

// HTTP хүсэлт бүрийг бүртгэх
app.use((req, res, next) => {
  res.on('finish', () => {
    const level = res.statusCode >= 500 ? 'error'
                : res.statusCode >= 400 ? 'warn'
                : 'info';

    logger[level]('HTTP хүсэлт', {
      method:   req.method,
      path:     req.path,
      status:   res.statusCode,
    });
  });
  next();
});

// Сервис хоорондын хүсэлтэд requestId дамжуулах
async function callService(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-request-id': getRequestId(), // Нөгөө сервис уншина
    },
  });
}
```

---

## 4. Monitoring гэж юу вэ?

Monitoring бол системийн **одоогийн байдлыг бодит цагаар** хянах явдал юм.

```
Logging:    "14:30:07 дээр алдаа гарсан"      ← Болсон зүйл
Monitoring: "Одоо CPU 87%, 450 хүсэлт/минут"  ← Одоогийн байдал
```

Monitoring-д хэмжигддэг үзүүлэлтүүд:

**Системийн үзүүлэлт:**
- CPU, RAM, Disk ашиглалт
- Сүлжээний урсгал

**Аппликейшний үзүүлэлт (RED аргачлал):**
- **R**ate — хүсэлтийн тоо/секунд
- **E**rror — алдааны хувь %
- **D**uration — хариу цаг (мс)

**Бизнесийн үзүүлэлт:**
- Идэвхтэй хэрэглэгчийн тоо
- Үүсгэсэн task-ийн тоо

---

## 5. Prometheus + Grafana — Стандарт Хослол

**Prometheus** нь метрик цуглуулж, хадгалдаг Time Series DB юм.
**Grafana** нь тэдгээрийг визуал дашбоард болгон харуулдаг.

```
Node.js апп ──→ /metrics endpoint ──→ Prometheus ──→ Grafana
  (метрик гаргана)   (15с тутам татна)   (хадгална)    (харуулна)
```

### Prometheus Metric Төрлүүд

**Counter** — зөвхөн нэмэгддэг тоолуур. Дахин эхлэхэд 0 болно.
```
HTTP хүсэлтийн нийт тоо: 15,423
Алдааны нийт тоо: 42
```

**Gauge** — нэмэгдэж, багасаж болдог тоо.
```
Одоогийн идэвхтэй холболт: 87
RAM ашиглалт: 2.3GB
```

**Histogram** — утгуудыг хэрцүүдэд (bucket) хуваарилдаг. Хариу цагийн тархалтыг хэмжихэд ашигладаг.
```
Хариу цаг:
  < 10мс:  1,203 хүсэлт
  < 50мс:  8,451 хүсэлт
  < 100мс: 14,200 хүсэлт
  < 500мс: 15,380 хүсэлт
  < 1000мс: 15,423 хүсэлт
```

### Node.js дахь Prometheus Тохиргоо

```javascript
// monitoring/metrics.js
const promClient = require('prom-client');

// Системийн өгөгдмөл метрик (CPU, RAM, event loop)
promClient.collectDefaultMetrics({
  labels: { service: process.env.SERVICE_NAME }
});

// ── HTTP метрик ────────────────────────────────────────
const httpRequestTotal = new promClient.Counter({
  name:       'http_requests_total',
  help:       'Нийт HTTP хүсэлтийн тоо',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestDuration = new promClient.Histogram({
  name:       'http_request_duration_ms',
  help:       'HTTP хүсэлтийн хариу цаг (мс)',
  labelNames: ['method', 'route', 'status'],
  buckets:    [5, 10, 25, 50, 100, 250, 500, 1000, 2500],
});

// ── Бизнесийн метрик ───────────────────────────────────
const tasksCreatedTotal = new promClient.Counter({
  name: 'tasks_created_total',
  help: 'Нийт үүсгэсэн task-ийн тоо',
  labelNames: ['workspace_id'],
});

const activeConnections = new promClient.Gauge({
  name: 'db_active_connections',
  help: 'Идэвхтэй DB холболтын тоо',
});

// ── Circuit Breaker метрик ─────────────────────────────
const circuitBreakerState = new promClient.Gauge({
  name:       'circuit_breaker_state',
  help:       'Circuit Breaker-ийн төлөв (0=CLOSED, 1=OPEN, 2=HALF_OPEN)',
  labelNames: ['service'],
});

module.exports = {
  promClient,
  httpRequestTotal,
  httpRequestDuration,
  tasksCreatedTotal,
  activeConnections,
  circuitBreakerState,
};
```

```javascript
// monitoring/metricsMiddleware.js
const {
  httpRequestTotal,
  httpRequestDuration,
} = require('./metrics');

function metricsMiddleware(req, res, next) {
  // Route нормализаци: /tasks/123 → /tasks/:id
  // Тэгэхгүй бол метрик label хэт олон болно
  const route = req.route?.path || req.path
    .replace(/\/\d+/g, '/:id')
    .replace(/[a-f0-9-]{36}/gi, ':uuid');

  const end = httpRequestDuration.startTimer({
    method: req.method,
    route,
  });

  res.on('finish', () => {
    const labels = { method: req.method, route, status: res.statusCode };
    httpRequestTotal.inc(labels);
    end({ status: res.statusCode });
  });

  next();
}

module.exports = metricsMiddleware;
```

```javascript
// app.js — метрик endpoint нэмэх
const { promClient }      = require('./monitoring/metrics');
const metricsMiddleware   = require('./monitoring/metricsMiddleware');

app.use(metricsMiddleware);

// Prometheus энэ endpoint-аас метрик татна
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

### Бизнесийн метрик бүртгэх

```javascript
// controllers/taskController.js
const { tasksCreatedTotal } = require('../monitoring/metrics');
const logger = require('../shared/logger');

exports.createTask = catchAsync(async (req, res) => {
  const task = await TaskCommand.create({ ... });

  // Бизнесийн метрик нэмэх
  tasksCreatedTotal.inc({ workspace_id: task.workspaceId });

  logger.info('Task үүсгэгдлээ', {
    taskId:      task.id,
    workspaceId: task.workspaceId,
  });

  res.status(201).json({ taskId: task.id });
});
```

---

## 6. Health Check Endpoint

Load Balancer болон Monitoring системийн сервис **амьд эсэхийг** шалгах endpoint.

```javascript
// routes/healthRoutes.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = require('express').Router();

// Хурдан шалгалт — зөвхөн сервис ажиллаж байна уу
router.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    service: process.env.SERVICE_NAME,
    uptime:  process.uptime(),
  });
});

// Гүнзгий шалгалт — хамаарлуудыг ч шалгана
router.get('/health/ready', async (req, res) => {
  const checks = {};
  let allOk = true;

  // DB шалгах
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (err) {
    checks.database = 'error';
    allOk = false;
  }

  // RabbitMQ шалгах (холбоос байвал)
  try {
    // await rabbitChannel.checkQueue('test');
    checks.rabbitmq = 'ok';
  } catch {
    checks.rabbitmq = 'error';
    allOk = false;
  }

  res.status(allOk ? 200 : 503).json({
    status:  allOk ? 'ok' : 'degraded',
    service: process.env.SERVICE_NAME,
    checks,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
```

---

## 7. Alerting — Автомат Анхааруулга

Monitoring өгөгдлийг харах нь хангалтгүй — асуудал гарахад **автоматаар мэдэгдэх** ёстой.

### Alert-ийн Нөхцөлүүд

```
Error rate > 5% → ⚠️ Warning alert
Error rate > 10% → 🔴 Critical alert
CPU > 80% (5мин) → ⚠️ Warning alert
Memory > 90% → 🔴 Critical alert
P95 хариу цаг > 1000мс → ⚠️ Warning alert
Сервис /health 3 удаа хариугүй → 🔴 Critical alert
Circuit Breaker OPEN болсон → ⚠️ Warning alert
```

### Node.js дахь Хялбар Alert

```javascript
// monitoring/alerting.js
const logger = require('../shared/logger');

// Метриктэй уялдуулсан дагалдагч
class AlertManager {
  constructor() {
    this.errorWindow   = [];  // Сүүлийн 1 минутын алдаануудын цагийн тэмдэг
    this.windowMs      = 60000;
    this.errorThreshold = 0.05; // 5%
    this.totalRequests = 0;
  }

  record(isError) {
    this.totalRequests++;
    const now = Date.now();

    if (isError) this.errorWindow.push(now);

    // 1 минутаас хуучин утгуудыг цэвэрлэ
    this.errorWindow = this.errorWindow.filter(t => now - t < this.windowMs);

    this._checkErrorRate();
  }

  _checkErrorRate() {
    if (this.totalRequests < 10) return; // Хангалттай дээж байхгүй

    const rate = this.errorWindow.length / this.totalRequests;
    if (rate > this.errorThreshold) {
      this._sendAlert({
        level:   'CRITICAL',
        message: `Error rate өндөр: ${(rate * 100).toFixed(1)}%`,
        metric:  'error_rate',
        value:   rate,
      });
    }
  }

  _sendAlert({ level, message, metric, value }) {
    // Бодит системд Slack, PagerDuty, Email илгээнэ
    logger.error(`🚨 ALERT [${level}]: ${message}`, { metric, value });

    // Slack webhook жишээ
    // fetch(process.env.SLACK_WEBHOOK_URL, {
    //   method: 'POST',
    //   body: JSON.stringify({ text: `🚨 ${level}: ${message}` }),
    // });
  }
}

const alertManager = new AlertManager();
module.exports = alertManager;
```

---

## 8. Log Централизаци — Олон Сервисийн Log Нэгтгэх

Microservice бүрийн log тусдаа байвал нэгдсэн дүр зураг гарахгүй. Бүх log-г **нэг газарт** цуглуулах шаардлагатай.

### ELK Stack — Өндөр Хэмжээний Шийдэл

```
Сервис бүр → [Filebeat: лог цуглуулна]
                    ↓
             [Logstash: боловсруулна]
                    ↓
             [Elasticsearch: хадгална]
                    ↓
               [Kibana: харуулна]
```

### Grafana Loki — Хөнгөн Шийдэл

```
Сервис бүр → [Promtail: лог цуглуулна]
                    ↓
              [Loki: хадгална]
                    ↓
              [Grafana: харуулна]
```

Prometheus (метрик) болон Loki (лог) хоёулаа Grafana-д харагддаг тул хялбар.

### Бодит Байдалд Хамгийн Хялбар Арга

Хөгжүүлэх үед консолд JSON лог гаргаж, CI/CD систем тэдгээрийг цуглуулдаг.

```javascript
// Бүх сервист нэг хэлбэрийн лог формат ашиглах
{
  "timestamp": "2026-06-09T14:30:07.123Z",
  "level": "info",
  "service": "task-service",
  "requestId": "req-abc123",
  "message": "Task үүсгэгдлээ",
  "taskId": 101,
  "userId": 42,
  "duration": 45
}
```

---

## 9. Task Manager Microservice-д Бүрэн Тохиргоо

```javascript
// app.js — бүх хэсгийг нэгтгэсэн

require('dotenv').config();
const express           = require('express');
const { requestContext } = require('./shared/middleware/requestContext');
const logger            = require('./shared/logger');
const metricsMiddleware = require('./monitoring/metricsMiddleware');
const { promClient }    = require('./monitoring/metrics');
const healthRoutes      = require('./routes/healthRoutes');
const taskRoutes        = require('./routes/taskRoutes');

const app = express();
app.use(express.json());

// 1. Request ID — хамгийн эхэнд
app.use(requestContext);

// 2. HTTP лог + метрик
app.use(metricsMiddleware);
app.use((req, res, next) => {
  res.on('finish', () => {
    logger.info('HTTP', {
      method: req.method,
      path:   req.path,
      status: res.statusCode,
    });
  });
  next();
});

// 3. Routes
app.use('/', healthRoutes);
app.use('/api/workspaces/:workspaceId/tasks', taskRoutes);

// 4. Prometheus метрик
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// 5. Global error handler — хамгийн сүүлд
app.use((err, req, res, next) => {
  logger.error('Боловсруулаагүй алдаа', {
    message: err.message,
    stack:   err.stack,
    path:    req.path,
  });
  res.status(err.status || 500).json({ message: 'Серверийн алдаа' });
});

// 6. Боловсруулаагүй алдаануудыг барих
process.on('unhandledRejection', (reason) => {
  logger.error('UnhandledRejection', { reason: String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('UncaughtException', { message: err.message, stack: err.stack });
  process.exit(1);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () =>
  logger.info(`Сервис эхэллээ`, { port: PORT, service: process.env.SERVICE_NAME })
);
```

---

## 10. Grafana Дашбоард — Харах Зүйлс

Grafana дашбоардад дараах хэсгүүдийг тохируулна:

**Ерөнхий байдал:**
- Сервис бүрийн хариу цагийн дундаж (P50, P95, P99)
- Хүсэлтийн тоо (req/s)
- Алдааны хувь (%)

**Дэлгэрэнгүй:**
- CPU, Memory ашиглалт сервис бүрт
- DB холболтын тоо
- RabbitMQ Queue-ийн урт
- Circuit Breaker-ийн төлөв

**Бизнесийн үзүүлэлт:**
- Нийт үүсгэсэн task-ийн тоо (цагаар)
- Workspace-ийн идэвхтэй байдал

---

## Товч Дүгнэлт

Microservice орчинд Logging & Monitoring нь монолитоос **хамаагүй чухал** болдог. Санах ойд байлгах зүйл:

- **Request ID** → нэг хүсэлтийн бүрэн зам тайлбарлах, сервис бүрт дамжуулах
- **JSON log** → хайх, шүүх, шинжлэх боломжтой
- **RED аргачлал** → Rate, Error, Duration — аппликейшний эрүүл мэнд
- **Health Check** → `/health` (хурдан), `/health/ready` (гүнзгий)
- **Prometheus** → метрик цуглуулах, Counter/Gauge/Histogram ялгаа
- **Grafana** → метрик болон лог нэг дашбоардад
- **Alerting** → асуудал гарахад хүлээхгүй, автоматаар мэдэгдэх
- **Централизаци** → бүх сервисийн лог нэг газарт цуглуулах

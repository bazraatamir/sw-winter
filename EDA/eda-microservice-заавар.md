# Event-Driven Microservice — Алхам Алхмаар Заавар

> **Стек:** Node.js, Express, Prisma ORM, RabbitMQ, MySQL

---

## Архитектур

```
Хэрэглэгч
    ↓ HTTP хүсэлт
[Task Service :3002]
    ↓ Task үүсгэнэ → DB хадгална
    └──→ "task.created" Event ──→ [RabbitMQ]
                                       ↓
                          [Notification Service]
                          Queue сонсоод мэдэгдэл илгээнэ
```

**Гол зарчим:**
- Task Service Notification Service-г **мэдэхгүй**
- Notification Service Task Service-г **мэдэхгүй**
- Хоёулаа зөвхөн RabbitMQ-ар дамжуулан харилцдаг

---

## Эцсийн Бүтэц

```
eda-microservice/
├── shared/
│   ├── eventTypes.js          ← Event нэрсийн тогтмолууд
│   └── rabbitmq.js            ← publish / subscribe хэрэгсэл
│
├── task-service/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── prismaClient.js
│   │   ├── models/
│   │   │   └── taskModel.js
│   │   ├── events/
│   │   │   └── taskPublisher.js
│   │   ├── controllers/
│   │   │   └── taskController.js
│   │   └── routes/
│   │       └── taskRoutes.js
│   ├── .env
│   └── app.js
│
└── notification-service/
    ├── src/
    │   ├── handlers/
    │   │   └── taskEventHandler.js
    │   └── index.js
    └── .env
```

---

## 1-р Алхам: RabbitMQ Суулгах

### Mac
```bash
brew install rabbitmq
brew services start rabbitmq
```

### Ubuntu / Debian
```bash
sudo apt update
sudo apt install rabbitmq-server
sudo systemctl start rabbitmq-server
sudo systemctl enable rabbitmq-server
```

### Windows
RabbitMQ-ийн албан ёсны сайтаас татаж суулгана:
https://www.rabbitmq.com/install-windows.html

### Ажиллаж байгааг шалгах
```bash
# Management plugin идэвхжүүлэх
rabbitmq-plugins enable rabbitmq_management

# Browser дээр нээнэ: http://localhost:15672
# Нэвтрэх: guest / guest
```

---

## 2-р Алхам: Folder Бүтэц Үүсгэх

```bash
mkdir eda-microservice
cd eda-microservice

mkdir -p shared
mkdir -p task-service/prisma
mkdir -p task-service/src/models
mkdir -p task-service/src/events
mkdir -p task-service/src/controllers
mkdir -p task-service/src/routes
mkdir -p notification-service/src/handlers
```

---

## 3-р Алхам: Shared Хэсэг Бичих

### `shared/eventTypes.js`

Бүх сервис ашиглах Event нэрсийг **нэг газарт** тодорхойлно.
Ингэснээр нэг сервист нэр өөрчлөгдвөл бусад нь автоматаар хамрагдана.

```javascript
// shared/eventTypes.js
const EventTypes = {
  TASK_CREATED:        'task.created',
  TASK_STATUS_UPDATED: 'task.status.updated',
  TASK_ASSIGNED:       'task.assigned',
  TASK_DELETED:        'task.deleted',
};

module.exports = EventTypes;
```

---

### `shared/rabbitmq.js`

RabbitMQ-тай холбогдох, Event илгээх, сонсох хэрэгслүүд.

**Ойлгох зүйл — Exchange гэж юу вэ?**

RabbitMQ-д Publisher шууд Queue-д бичдэггүй — **Exchange** (солилцооны цэг) рүү илгээдэг.
Exchange нь routing key-г үндэслэн мессежийг зохих Queue-д хуваарилдаг.

```
Publisher ──→ Exchange ──→ Queue A (binding: "task.*")
                      ──→ Queue B (binding: "task.created")
```

`topic` Exchange ашиглавал:
- `task.*` → task.created, task.deleted (нэг үгтэй)
- `task.#` → task.created, task.status.updated (олон үгтэй)

```javascript
// shared/rabbitmq.js
const amqp = require('amqplib');

let connection = null;
let channel    = null;

const EXCHANGE_NAME = 'task_manager_events';

// RabbitMQ-тай холбогдох
async function connect() {
  const url  = process.env.RABBITMQ_URL || 'amqp://localhost';
  connection = await amqp.connect(url);
  channel    = await connection.createChannel();

  // topic exchange үүсгэнэ
  // durable: true → RabbitMQ дахин эхлэхэд Exchange хэвээр байна
  await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

  console.log('✅ RabbitMQ холбогдлоо');
  return channel;
}

// Channel авах — холбоогүй бол холбоно
async function getChannel() {
  if (!channel) await connect();
  return channel;
}

// Event илгээх (Publisher)
async function publish(eventType, payload) {
  const ch = await getChannel();

  const message = {
    type:     eventType,
    payload,
    metadata: {
      eventId:   `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      version:   1,
    },
  };

  ch.publish(
    EXCHANGE_NAME,
    eventType,                               // routing key
    Buffer.from(JSON.stringify(message)),
    { persistent: true }                     // disk-д хадгална
  );

  console.log(`📤 Event: ${eventType}`);
}

// Event сонсох (Subscriber)
async function subscribe(routingKey, queueName, handler) {
  const ch = await getChannel();

  // Queue үүсгэнэ
  // durable: true → RabbitMQ дахин эхлэхэд Queue хэвээр байна
  await ch.assertQueue(queueName, { durable: true });

  // Queue-г Exchange-тэй холбоно
  await ch.bindQueue(queueName, EXCHANGE_NAME, routingKey);

  // Нэгэн зэрэг хэдэн мессеж боловсруулах вэ
  ch.prefetch(10);

  ch.consume(queueName, async (msg) => {
    if (!msg) return;
    try {
      const event = JSON.parse(msg.content.toString());
      await handler(event);
      ch.ack(msg);                           // Амжилттай → ACK
    } catch (err) {
      console.error('❌ Handler алдаа:', err.message);
      ch.nack(msg, false, false);            // Алдаа → DLQ
    }
  });

  console.log(`👂 Сонсож байна: [${queueName}] ← ${routingKey}`);
}

module.exports = { connect, publish, subscribe };
```

---

## 4-р Алхам: Task Service Бичих

### Суулгах

```bash
cd task-service
npm init -y
npm install express @prisma/client amqplib dotenv
npm install -D prisma
```

---

### `task-service/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Task {
  id          Int        @id @default(autoincrement())
  title       String
  description String?
  status      TaskStatus @default(PENDING)
  workspaceId Int
  assignedTo  Int?
  createdBy   Int
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@map("tasks")
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  DONE
}
```

```bash
# Migration ажиллуулах
npx prisma migrate dev --name init
```

---

### `task-service/src/prismaClient.js`

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});

module.exports = prisma;
```

---

### `task-service/src/models/taskModel.js`

CQRS зарчмаар Command (бичилт) ба Query (уншилт) тусдаа.

```javascript
const prisma = require('../prismaClient');

// ── Command: бичилт ──────────────────────────────────
const TaskCommand = {
  async create(data) {
    return prisma.task.create({ data });
  },

  async updateStatus(id, status) {
    return prisma.task.update({
      where: { id },
      data:  { status },
    });
  },

  async assign(id, assignedTo) {
    return prisma.task.update({
      where: { id },
      data:  { assignedTo },
    });
  },

  async delete(id) {
    return prisma.task.delete({ where: { id } });
  },
};

// ── Query: уншилт ────────────────────────────────────
const TaskQuery = {
  async findById(id) {
    return prisma.task.findUnique({
      where:  { id },
      select: {
        id: true, title: true, description: true,
        status: true, workspaceId: true,
        assignedTo: true, createdBy: true,
        createdAt: true, updatedAt: true,
      },
    });
  },

  async findByWorkspace(workspaceId) {
    return prisma.task.findMany({
      where:   { workspaceId },
      select:  {
        id: true, title: true, status: true,
        assignedTo: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};

module.exports = { TaskCommand, TaskQuery };
```

---

### `task-service/src/events/taskPublisher.js`

Task Service-ийн Publisher.
**Task Service хэн сонсохыг мэдэхгүй** — зөвхөн "болсон" гэдгийг RabbitMQ-д зарладаг.

```javascript
const { publish } = require('../../shared/rabbitmq');
const EventTypes  = require('../../shared/eventTypes');

const TaskPublisher = {

  async taskCreated(task) {
    await publish(EventTypes.TASK_CREATED, {
      taskId:      task.id,
      title:       task.title,
      workspaceId: task.workspaceId,
      assignedTo:  task.assignedTo,
      createdBy:   task.createdBy,
    });
  },

  async taskStatusUpdated(task, oldStatus) {
    await publish(EventTypes.TASK_STATUS_UPDATED, {
      taskId:    task.id,
      title:     task.title,
      assignedTo: task.assignedTo,
      oldStatus,
      newStatus: task.status,
    });
  },

  async taskAssigned(task, previousAssignee) {
    await publish(EventTypes.TASK_ASSIGNED, {
      taskId:          task.id,
      title:           task.title,
      newAssignee:     task.assignedTo,
      previousAssignee,
    });
  },

  async taskDeleted(taskId, workspaceId) {
    await publish(EventTypes.TASK_DELETED, {
      taskId,
      workspaceId,
    });
  },
};

module.exports = TaskPublisher;
```

---

### `task-service/src/controllers/taskController.js`

```javascript
const { TaskCommand, TaskQuery } = require('../models/taskModel');
const TaskPublisher              = require('../events/taskPublisher');

const catchAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── Query handlers ───────────────────────────────────
exports.getTasks = catchAsync(async (req, res) => {
  const tasks = await TaskQuery.findByWorkspace(
    Number(req.params.workspaceId)
  );
  res.json({ tasks });
});

exports.getTask = catchAsync(async (req, res) => {
  const task = await TaskQuery.findById(Number(req.params.id));
  if (!task) return res.status(404).json({ message: 'Task олдсонгүй' });
  res.json({ task });
});

// ── Command handlers ─────────────────────────────────
exports.createTask = catchAsync(async (req, res) => {
  const { title, description, assignedTo } = req.body;
  if (!title) return res.status(400).json({ message: 'Гарчиг шаардлагатай' });

  // 1. Prisma-р DB-д хадгална
  const task = await TaskCommand.create({
    title,
    description,
    workspaceId: Number(req.params.workspaceId),
    assignedTo:  assignedTo ? Number(assignedTo) : null,
    createdBy:   req.user.id,
    status:      'PENDING',
  });

  // 2. Event зарлана — хэн сонсох нь Task Service-д хамаагүй
  await TaskPublisher.taskCreated(task);

  res.status(201).json({ message: 'Task үүслээ', taskId: task.id });
});

exports.updateStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  const valid = ['PENDING', 'IN_PROGRESS', 'DONE'];
  if (!valid.includes(status))
    return res.status(400).json({ message: `Статус: ${valid.join(', ')}` });

  const existing = await TaskQuery.findById(Number(req.params.id));
  if (!existing) return res.status(404).json({ message: 'Task олдсонгүй' });

  const updated = await TaskCommand.updateStatus(Number(req.params.id), status);
  await TaskPublisher.taskStatusUpdated(updated, existing.status);

  res.json({ message: 'Статус шинэчлэгдлээ' });
});

exports.assignTask = catchAsync(async (req, res) => {
  const { assignedTo } = req.body;

  const existing = await TaskQuery.findById(Number(req.params.id));
  if (!existing) return res.status(404).json({ message: 'Task олдсонгүй' });

  const updated = await TaskCommand.assign(
    Number(req.params.id),
    assignedTo ? Number(assignedTo) : null
  );
  await TaskPublisher.taskAssigned(updated, existing.assignedTo);

  res.json({ message: 'Task оноогдлоо' });
});

exports.deleteTask = catchAsync(async (req, res) => {
  const existing = await TaskQuery.findById(Number(req.params.id));
  if (!existing) return res.status(404).json({ message: 'Task олдсонгүй' });

  await TaskCommand.delete(Number(req.params.id));
  await TaskPublisher.taskDeleted(existing.id, existing.workspaceId);

  res.json({ message: 'Task устгагдлаа' });
});
```

---

### `task-service/src/routes/taskRoutes.js`

```javascript
const router = require('express').Router({ mergeParams: true });
const ctrl   = require('../controllers/taskController');

// Хялбаршуулсан auth middleware
// Бодит системд JWT шалгана — энд API Gateway-с дамжуулсан header ашиглана
const auth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ message: 'Нэвтрэлт шаардлагатай' });
  req.user = { id: Number(userId) };
  next();
};

router.use(auth);

router.get('/',             ctrl.getTasks);
router.get('/:id',          ctrl.getTask);
router.post('/',            ctrl.createTask);
router.patch('/:id/status', ctrl.updateStatus);
router.patch('/:id/assign', ctrl.assignTask);
router.delete('/:id',       ctrl.deleteTask);

module.exports = router;
```

---

### `task-service/app.js`

```javascript
require('dotenv').config();
const express     = require('express');
const taskRoutes  = require('./src/routes/taskRoutes');
const { connect } = require('./shared/rabbitmq');

const app = express();
app.use(express.json());

app.use('/api/workspaces/:workspaceId/tasks', taskRoutes);

app.get('/health', (req, res) =>
  res.json({ service: 'task-service', status: 'ok' })
);

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ message: err.message });
});

async function start() {
  await connect();
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () =>
    console.log(`✅ Task Service :${PORT} дээр ажиллаж байна`)
  );
}

start().catch(console.error);
```

---

### `task-service/.env`

```
PORT=3002
DATABASE_URL="mysql://root:нууцүг@localhost:3306/task_service_db"
RABBITMQ_URL=amqp://localhost
NODE_ENV=development
```

---

## 5-р Алхам: Notification Service Бичих

### Суулгах

```bash
cd notification-service
npm init -y
npm install amqplib dotenv
```

Notification Service нь **HTTP endpoint байхгүй** — зөвхөн RabbitMQ Queue сонсдог.

---

### `notification-service/src/handlers/taskEventHandler.js`

**Notification Service Task Service-г огт мэдэхгүй.**
Зөвхөн RabbitMQ-с "task.created" Event ирэхийг хүлээж, тухайн мэдээллийг ашиглана.

```javascript
const TaskEventHandler = {

  // "task.created" Event ирэхэд дуудагдана
  async onTaskCreated(event) {
    const { taskId, title, assignedTo, workspaceId } = event.payload;

    console.log(`📋 Task үүсгэгдлээ: "${title}" (id:${taskId})`);

    if (!assignedTo) {
      console.log('   → Оноогдсон хүн байхгүй, мэдэгдэл илгээхгүй');
      return;
    }

    await sendNotification({
      userId:  assignedTo,
      type:    'TASK_ASSIGNED',
      message: `"${title}" даалгавар таньд оноогдлоо`,
    });
  },

  // "task.status.updated" Event ирэхэд дуудагдана
  async onTaskStatusUpdated(event) {
    const { taskId, title, assignedTo, oldStatus, newStatus } = event.payload;

    console.log(`🔄 Статус өөрчлөгдлөө: ${oldStatus} → ${newStatus} (id:${taskId})`);

    if (!assignedTo) return;

    if (newStatus === 'DONE') {
      await sendNotification({
        userId:  assignedTo,
        type:    'TASK_COMPLETED',
        message: `"${title}" даалгавар дуусгагдлаа`,
      });
    }
  },

  // "task.assigned" Event ирэхэд дуудагдана
  async onTaskAssigned(event) {
    const { taskId, title, newAssignee, previousAssignee } = event.payload;

    if (newAssignee) {
      await sendNotification({
        userId:  newAssignee,
        type:    'TASK_REASSIGNED',
        message: `"${title}" даалгавар таньд оноогдлоо`,
      });
    }

    if (previousAssignee && previousAssignee !== newAssignee) {
      await sendNotification({
        userId:  previousAssignee,
        type:    'TASK_UNASSIGNED',
        message: `"${title}" даалгаврын оноолт өөрчлөгдлөө`,
      });
    }
  },
};

// Бодит системд: DB-д хадгалах, имэйл/push илгээх
async function sendNotification({ userId, type, message }) {
  console.log(`🔔 Мэдэгдэл → userId:${userId} | ${type}: ${message}`);
  // await prisma.notification.create({ data: { userId, type, message } });
  // await emailService.send(userId, message);
}

module.exports = TaskEventHandler;
```

---

### `notification-service/src/index.js`

```javascript
require('dotenv').config();
const { connect, subscribe } = require('../shared/rabbitmq');
const EventTypes             = require('../shared/eventTypes');
const TaskEventHandler       = require('./handlers/taskEventHandler');

async function startConsumers() {
  await connect();

  // "task.created" Event сонсох
  await subscribe(
    EventTypes.TASK_CREATED,
    'notification.task.created',
    TaskEventHandler.onTaskCreated
  );

  // "task.status.updated" Event сонсох
  await subscribe(
    EventTypes.TASK_STATUS_UPDATED,
    'notification.task.status',
    TaskEventHandler.onTaskStatusUpdated
  );

  // "task.assigned" Event сонсох
  await subscribe(
    EventTypes.TASK_ASSIGNED,
    'notification.task.assigned',
    TaskEventHandler.onTaskAssigned
  );

  console.log('✅ Notification Service сонсож байна...');
}

startConsumers().catch(console.error);
```

---

### `notification-service/.env`

```
RABBITMQ_URL=amqp://localhost
NODE_ENV=development
```

---

## 6-р Алхам: Shared Хавтасыг Хуулах

Сервис бүрт `shared` хавтасны хуулбар хэрэгтэй:

```bash
cp -r shared task-service/shared
cp -r shared notification-service/shared
```

---

## 7-р Алхам: Ажиллуулах

**Терминал 1 — Task Service:**
```bash
cd task-service
npm install
npx prisma migrate dev --name init
node app.js
```

**Терминал 2 — Notification Service:**
```bash
cd notification-service
npm install
node src/index.js
```

---

## 8-р Алхам: Туршиж Үзэх

### Task үүсгэх
```bash
curl -X POST http://localhost:3002/api/workspaces/1/tasks \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1" \
  -d '{"title":"Шинэ даалгавар","assignedTo":2}'
```

**Task Service лог:**
```
📤 Event: task.created
```

**Notification Service лог:**
```
📋 Task үүсгэгдлээ: "Шинэ даалгавар" (id:1)
🔔 Мэдэгдэл → userId:2 | TASK_ASSIGNED: "Шинэ даалгавар" даалгавар таньд оноогдлоо
```

### Статус өөрчлөх
```bash
curl -X PATCH http://localhost:3002/api/workspaces/1/tasks/1/status \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1" \
  -d '{"status":"DONE"}'
```

**Notification Service лог:**
```
🔄 Статус өөрчлөгдлөө: PENDING → DONE (id:1)
🔔 Мэдэгдэл → userId:2 | TASK_COMPLETED: "Шинэ даалгавар" даалгавар дуусгагдлаа
```

### Task жагсаалт харах
```bash
curl http://localhost:3002/api/workspaces/1/tasks \
  -H "x-user-id: 1"
```

---

## Ажиглах Зүйлс

### Loose Coupling — Сул Холбоо
Task Service Notification Service-г нэрлэдэггүй, дуудаж байгаа кодгүй.
`taskPublisher.js`-д зөвхөн `publish()` байна — хэн сонсох огт хамаагүй.
Шинэ Analytics сервис нэмэхэд Task Service-г **ямар ч өөрчлөлтгүй** хийж болно.

### Алдаанд Тэсвэртэй
Notification Service унасан үед Task Service **хэвийн ажиллана**.
Notification Service дахин эхлэхэд RabbitMQ-д хуримтлагдсан Event-г боловсруулна.

### Асинхрон
`createTask` хариу буцаасны **дараа** Notification Service мэдэгдэл илгээнэ.
Хэрэглэгч мэдэгдэл дуустал хүлээхгүй.

---

## Нийтлэг Алдаа ба Шийдэл

**`ECONNREFUSED` — RabbitMQ холбогдохгүй:**
```bash
# RabbitMQ ажиллаж байгааг шалгах
sudo systemctl status rabbitmq-server
# Эсвэл
rabbitmq-diagnostics ping
```

**`P2025` — Prisma record олдсонгүй:**
```bash
# Migration ажиллуулсан эсэхийг шалгах
npx prisma migrate status
```

**Notification Service Event хүлээн авахгүй:**
```bash
# RabbitMQ Management UI-д Queue шалгах
# http://localhost:15672 → Queues
# "notification.task.created" Queue-д мессеж байгааг шалгах
```

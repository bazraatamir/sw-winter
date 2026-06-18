# Event-Driven Architecture — Дэлгэрэнгүй Онолын Гарын Авлага

---

## 1. Асуудал: Сервисүүд бие биенээс хамааралтай болох

Ердийн архитектурт нэг сервис нөгөөгийнхөө функцийг **шууд дуудна**. Task Manager-т жишээлбэл:

```
TaskService.createTask()
    ↓ шууд дуудна
NotificationService.sendNotification()
    ↓ шууд дуудна
EmailService.sendEmail()
    ↓ шууд дуудна
LogService.log()
```

Энэ "шууд дуудлага" буюу **tight coupling** (нягт холбоо) хэд хэдэн асуудал үүсгэнэ:

**NotificationService унавал TaskService зогсоно.** Мэдэгдэл илгээх сервис доголдсон ч task үүсгэх зогсоно — энэ логикийн хувьд зөв биш.

**TaskService NotificationService-ийн оршин байгааг мэдэх ёстой.** Нэг сервис нөгөөгийн хаяг, API-г мэдэх ёстой болдог. Сервис нэмэх бүрд TaskService-г өөрчлөх шаардлагатай болдог.

**Хэрэв 5 сервист мэдэгдэх ёстой бол TaskService 5 удаа дуудна.** Хурд удаашрана, нэг нь унавал бүх дуудлага амжилтгүй болно.

---

## 2. Event-Driven Architecture гэж юу вэ?

Event-Driven Architecture (EDA) бол системийн хэсгүүд **шууд биш, үйл явдлаар дамжуулан** харилцдаг архитектурын хэлбэр юм.

Нэг хэсэг "юу тохиолдсон" гэдгийг зарлана. Бусад хэсгүүд тухайн зарлалыг сонссон бол өөрсдийн хийх зүйлийг хийнэ. Зарласан хэсэг хэн сонсож, юу хийхийг мэдэхгүй, мэдэх шаардлагагүй.

Зүйрлэл: Мэдээний радио дамжуулалт гэж бодоорой. Радио станц мэдээ дамжуулна — хэн сонсож байгааг мэдэхгүй, сонсогч хэд байгааг мэдэхгүй. Сонсогч бүр өөрт хэрэгтэй мэдээг өөрийн хэрэгцээгээр ашиглана. Радио станц сонсогч бүртэй тусдаа утас татаагүй.

```
Шууд дуудлага (Tight Coupling):
TaskService ──→ NotificationService
            ──→ EmailService
            ──→ LogService
            ──→ AnalyticsService
TaskService 4 сервисийг мэддэг, 4 газар уналт боломжтой

Event-Driven (Loose Coupling):
TaskService ──→ "TaskCreated" үйл явдал зарлана
                      │
          ┌───────────┼───────────┬───────────┐
          ↓           ↓           ↓           ↓
   Notification   Email      Log        Analytics
     Service     Service    Service     Service
   (сонссон бол) (сонссон бол) (сонссон бол) (сонссон бол)
TaskService нэг ч сервисийг мэдэхгүй
```

---

## 3. Үндсэн Ойлголтууд

### Event (Үйл явдал)

Event бол **болсон зүйл** юм. Нэр нь өнгөрсөн цагт байдаг — юу болсон тухай мэдэгдэл:

```
✅ Зөв Event нэр (өнгөрсөн цаг):
TaskCreated
TaskStatusUpdated
MemberAdded
WorkspaceDeleted
UserLoggedIn

❌ Буруу (команд шиг):
CreateTask       ← энэ Command, Event биш
SendNotification ← энэ Command
UpdateStatus     ← энэ Command
```

Event нь **болсон зүйлийн баримт** юм — өөрчлөх боломжгүй, болоогүй болгох боломжгүй. Зөвхөн шинэ Event-ээр нөхцөл байдлыг өөрчилж болно.

Event нь дараах мэдээлэл агуулна:

```javascript
{
  type:      "TaskCreated",          // Ямар үйл явдал болсон
  payload: {
    taskId:      1,                  // Яг юу болсон тухай мэдээлэл
    title:       "Шинэ даалгавар",
    workspaceId: 5,
    assignedTo:  12,
    createdBy:   3,
  },
  metadata: {
    timestamp:  "2026-06-09T14:30:00Z",  // Хэзээ болсон
    eventId:    "evt-abc123",            // Өвөрмөц ID
    version:    1,                       // Event-ийн хувилбар
  }
}
```

### Publisher (Нийтлэгч)

Publisher буюу нийтлэгч нь Event үүсгэж, Message Broker-рүү илгээдэг хэсэг юм. Publisher хэн сонсохыг мэдэхгүй — зөвхөн "ийм зүйл болсон" гэдгийг зарладаг.

### Subscriber (Сонсогч)

Subscriber буюу сонсогч нь тодорхой Event-г хүлээн авч, өөрийн хийх зүйлийг гүйцэтгэдэг хэсэг юм. Subscriber нь Publisher-аас огт хамааралгүй — Publisher-г мэдэхгүй, Publisher Subscriber-г мэдэхгүй.

### Message Broker (Дамжуулагч)

Message Broker бол Publisher болон Subscriber-ийн хооронд **Event-г хадгалж, дамжуулдаг** дундын систем юм. Publisher Event илгээхэд Broker хадгалж, тухайн Event-г сонсдог Subscriber-ууд руу хүргэнэ.

```
Publisher ──→ [Message Broker] ──→ Subscriber 1
                                ──→ Subscriber 2
                                ──→ Subscriber 3
```

Хамгийн түгээмэл Message Broker-ууд: **RabbitMQ**, **Apache Kafka**, **Redis Pub/Sub**, **AWS SNS/SQS**.

---

## 4. Event-ийн Дамжуулалтын Хэлбэрүүд

### 4.1 Pub/Sub (Publish-Subscribe)

Хамгийн энгийн хэлбэр. Publisher Event илгээнэ, тухайн event-г subscribe хийсэн бүх сонсогчид хүлээн авна.

```
Publisher: "TaskCreated" Event илгээв
                │
         Message Broker
                │
    ┌───────────┼───────────┐
    ↓           ↓           ↓
Notification  Email       Log
Service       Service     Service
(Subscribe    (Subscribe  (Subscribe
хийсэн)       хийсэн)     хийсэн)
```

**Давуу тал:** Хялбар, нэг Event-г олон сонсогч хүлээн авна.
**Сул тал:** Broker унавал Event алдагдаж болно — хадгалалт байхгүй.

### 4.2 Message Queue (Дарааллын жагсаалт)

Event дарааллалсан байдлаар хадгалагдана. Сонсогч боловсруулах хүчин чадлаараа уншина — хэт олон Event ирсэн ч дарааллаар боловсруулна.

```
Publisher ──→ [Queue: TaskCreated, TaskCreated, TaskCreated, ...]
                           ↓ нэг нэгээр уншина
                     Subscriber
                   (өөрийн хурдаар)
```

**Давуу тал:** Subscriber удаан байсан ч Queue-д хадгалагдана, алдагдахгүй. Subscriber олон байвал ачаалал хуваарилагдана.
**Сул тал:** Нэг Event-г зөвхөн нэг Subscriber боловсруулна (Pub/Sub-аас ялгаатай).

### 4.3 Event Streaming (Kafka)

Event-ийг **дараалсан лог** маягаар хадгалдаг. Subscriber хэдэн ч удаа буцаж уншиж болно. Event "устгагдахгүй" — тодорхой хугацаанд хадгалагдсан хэвээр байна.

```
Topic: tasks
┌──────────────────────────────────────────────────┐
│ offset:0  │ offset:1    │ offset:2   │ offset:3  │
│ TaskCreate│ TaskUpdated │ TaskDeleted│ TaskCreate │
└──────────────────────────────────────────────────┘
     ↑                                    ↑
Subscriber A                        Subscriber B
(offset 0-с уншина)                (offset 2-с уншина)
```

**Давуу тал:** Subscriber дурын цагаас буцаж уншиж болно. Аналитик, аудит зориулалтад хамгийн тохиромжтой.
**Сул тал:** Хамгийн нарийн төвөгтэй, тохируулахад хэцүү.

---

## 5. Синхрон ба Асинхрон Харилцаа

EDA-ийн хамгийн чухал ойлголт бол **асинхрон** харилцаа юм.

### Синхрон

Publisher Event илгээж, Subscriber боловсруулах хүртэл **хүлээнэ**. HTTP хүсэлт-хариу яг ийм хэлбэр.

```
TaskService:  "TaskCreated" Event илгээв ──→ NotificationService
                                          ←── "Боловсруулав" хариу
TaskService:  хариуг хүлээж байсан (200мс)
```

Шууд хариу авах шаардлагатай үед тохиромжтой. Гэхдээ Subscriber удаан байвал Publisher ч удаашрана.

### Асинхрон

Publisher Event илгээгээд **хариу хүлээхгүй** — цааш үргэлжилнэ. Subscriber өөрийн цагтаа Event-г боловсруулна.

```
TaskService:  "TaskCreated" Event илгээв ──→ [Broker] ──→ NotificationService
TaskService:  цааш үргэлжилнэ (хариу хүлээхгүй)              (цагтаа боловсруулна)
```

**Хурд** — Publisher Subscriber-г хүлээхгүй тул хурдан. **Тусгаарлалт** — Subscriber унасан ч Publisher ажиллаж, Event Broker-д хадгалагдана. Гэхдээ Publisher Subscriber боловсрууллаа эсэхийг шууд мэдэхгүй.

---

## 6. Loose Coupling — Сул Холбоо

EDA-ийн хамгийн том давуу тал бол **loose coupling** буюу сул холбоо юм. Энэ нь:

**Publisher Subscriber-г мэдэхгүй.** TaskService зөвхөн "TaskCreated" Event зарлана — хэн сонсохыг, хэдэн сонсогч байхыг огт мэдэхгүй.

**Subscriber Publisher-г мэдэхгүй.** NotificationService зөвхөн "TaskCreated" Event-г сонсоно — хэнээс ирсэн, ямар сервис үүсгэсэн мэдэхгүй.

**Шинэ Subscriber нэмэхэд Publisher өөрчлөгдөхгүй.** "TaskCreated" Event-г сонсдог шинэ Analytics сервис нэмэхэд TaskService-ийг огт өөрчлөхгүй.

```
// Tight coupling — TaskService нэмэлт сервис бүрийг мэдэх ёстой
taskService.notifyUser();    // NotificationService мэдэх ёстой
taskService.sendEmail();     // EmailService мэдэх ёстой
taskService.logActivity();   // LogService мэдэх ёстой
taskService.trackAnalytics(); // AnalyticsService нэмэхэд TaskService өөрчлөгдөнө

// Loose coupling — TaskService зөвхөн Event зарлана
eventBus.publish("TaskCreated", payload);
// Шинэ сервис нэмсэн ч энэ мөр өөрчлөгдөхгүй
```

---

## 7. Event-Driven Architecture-ийн Хэлбэрүүд

### 7.1 Simple Event Notification

Хамгийн энгийн хэлбэр. "Ийм зүйл болсон" гэдгийг зарлахад л ашигладаг. Payload минимал байдаг.

```javascript
// "TaskCreated болсон, id нь 123" гэдгийг л зарлана
{ type: "TaskCreated", payload: { taskId: 123 } }
```

Subscriber дэлгэрэнгүй мэдээлэл хэрэгтэй бол өөрөө дуудаж авна. Payload бага учраас Event жижиг. Гэхдээ Subscriber нэмэлт хүсэлт явуулах шаардлагатай.

### 7.2 Event Carried State Transfer

Event дотор **дэлгэрэнгүй мэдээлэл** агуулна. Subscriber нэмэлт хүсэлт явуулах шаардлагагүй.

```javascript
{
  type: "TaskCreated",
  payload: {
    taskId:          123,
    title:           "Шинэ даалгавар",
    workspaceId:     5,
    workspaceName:   "Хөгжүүлэлтийн баг",
    assignedTo:      12,
    assigneeName:    "Батболд",
    assigneeEmail:   "bat@example.com",
    createdBy:       3,
    createdByName:   "Энхбаяр",
  }
}
```

Subscriber бүх хэрэгтэй мэдээлэлтэй болдог. Гэхдээ Event том болж, бизнесийн мэдээлэл хуулагдана.

### 7.3 Event Sourcing

Event-ийг **эх үүсвэр** болгон ашигладаг. Одоогийн төлвийг хадгалахын оронд болсон бүх Event-г хадгалж, дараа нь "тоглуулж" одоогийн төлвийг гарган авдаг.

```
events хүснэгт:
TaskCreated  { id:1, title:"Ажил" }
TaskAssigned { id:1, userId:5 }
StatusChanged{ id:1, status:"done" }

Одоогийн төлв = Event-ийг эхнээс нь тоглуулсны үр дүн
→ Task id=1: title="Ажил", assignedTo=5, status="done"
```

Бүх түүх хадгалагддаг тул аудит, дебаг маш хялбар болдог.

---

## 8. Event-ийн Найдвартай Байдал

### At-Least-Once Delivery

Broker Event-г **дор хаяж нэг удаа** хүргэдэг. Subscriber боловсруулж амжаагүй бол дахин илгээнэ. Гэхдээ хоёр удаа ирж болно.

Subscriber **idempotent** байх ёстой — нэг Event хоёр удаа ирсэн ч нэг л үр дүн гарна:

```javascript
// Idempotent биш — хоёр удаа дуудвал хоёр мэдэгдэл үүснэ
async function handleTaskCreated(event) {
  await prisma.notification.create({ data: { taskId: event.payload.taskId } });
}

// Idempotent — хоёр удаа дуудсан ч нэг мэдэгдэл л үүснэ
async function handleTaskCreated(event) {
  await prisma.notification.upsert({
    where:  { eventId: event.metadata.eventId },
    create: { eventId: event.metadata.eventId, taskId: event.payload.taskId },
    update: {},  // Аль хэдийн байвал өөрчлөхгүй
  });
}
```

### Dead Letter Queue

Subscriber Event-г боловсруулж чадахгүй (алдаа гарсан) бол тухайн Event-г **Dead Letter Queue (DLQ)** руу шилжүүлнэ. Энд хадгалагдсан Event-г дараа нь шинжлэж, гараар боловсруулж болно.

```
Subscriber → алдаа → [DLQ] → дараа нь шинжлэнэ, дахин оролдоно
```

---

## 9. EDA-ийн Давуу ба Сул Талууд

### Давуу талууд

**Loose coupling.** Сервисүүд бие биенээс хамааралгүй болдог. Нэг сервис өөрчлөх, нэмэх, устгахад бусад сервисүүдэд нөлөөлөхгүй.

**Масштаблах хялбар.** Subscriber-ийн тоог нэмснээр ачааллыг хуваарилж болно. Нэмэлт сервис нэмэхэд Publisher өөрчлөгдөхгүй.

**Алдаанд тэсвэртэй.** Subscriber унасан ч Publisher ажиллаж, Event Broker-д хадгалагдана. Subscriber сэргэхэд хуримтлагдсан Event-г боловсруулна.

**Аудит.** Болсон бүх Event лог болж хадгалагдана — ямар дарааллаар юу болсныг бүрэн мэдэж болно.

### Сул талууд

**Eventual consistency.** Publisher Event зарласны дараа Subscriber боловсруулахаас өмнө систем өөр өөр төлвийн мэдээлэл харуулж болно.

**Debug хэцүү.** Нэг хүсэлт олон сервисийг дамжих тул алдаа хаана гарсныг олоход хэцүү. Distributed tracing хэрэгсэл шаардлагатай болно.

**Event дизайн хүндрэлтэй.** Event-ийн бүтэц, хувилбар удирдалт, schema өөрчлөлт нарийн анхаарал шаардана. Event-ийн бүтэц өөрчлөгдвөл бүх Subscriber-г шинэчлэх шаардлагатай болж болно.

**Сүлжээний найдвартай байдал.** Broker байнга ажиллах ёстой — Broker унавал бүх Event дамжуулалт тасрана.

---

## 10. EDA vs Бусад Архитектурын Хэлбэрүүдтэй Харьцуулалт

### EDA vs REST API

REST API-д нэг сервис нөгөөгийн endpoint-г шууд дуудна — синхрон, tight coupling. EDA-д сервисүүд Event-ээр харилцана — асинхрон, loose coupling.

REST нь хариу шаарддаг үйлдлүүдэд (хэрэглэгч нэвтрэх, бараа захиалах) тохиромжтой. EDA нь хариу шаардаагүй, гинжин урвал үүсгэх үйлдлүүдэд (мэдэгдэл илгээх, лог бичих, аналитик) тохиромжтой.

### EDA vs CQRS

CQRS нь нэг сервис дотор уншилт ба бичилтийг тусгаарладаг. EDA нь олон сервисийн хоорондын харилцааны хэлбэр. Хоёулаа нэгэн зэрэг ашиглаж болно — Command гүйцэтгэгдэх үед Event зарлаж, Query handler тухайн Event-г сонсоод Read DB-г шинэчилнэ.

### EDA vs Microservice

Microservice нь сервисийг хэрхэн зохион байгуулах тухай архитектур. EDA нь тэдгээр сервисүүд хэрхэн харилцах тухай хэлбэр. Microservice архитектурт EDA ашиглах нь нийтлэг хослол.

---

## 11. Хэзээ EDA Ашиглах вэ?

**Ашиглах нь зүйтэй:**
- Нэг үйлдлийн дараа олон сервист мэдэгдэх шаардлагатай (Task үүсгэхэд мэдэгдэл, лог, аналитик гэх мэт)
- Сервисүүдийг бие биенээс бүрэн тусгаарлах хэрэгтэй
- Ачааллын оргил үед буфер хэрэгтэй (Queue-д хадгалагдаж, аажмаар боловсруулна)
- Аудит, түүхийн бүртгэл шаардлагатай

**Ашиглах шаардлагагүй:**
- Жижиг апп, нэг процессд ажиллаж байгаа
- Шууд хариу зайлшгүй шаардлагатай
- Broker тохируулах, удирдах хүч чадал байхгүй
- Баг жижиг, distributed системийн туршлага байхгүй

---

## 12. Task Manager-т EDA Нэвтрүүлэх Загвар

```
Task үүсгэгдэнэ
      ↓
TaskService → "TaskCreated" Event → [Message Broker]
                                          │
              ┌───────────────────────────┼────────────────────┐
              ↓                           ↓                    ↓
     NotificationService          ActivityLogService    AnalyticsService
     (оноогдсон хүнд мэдэгдэнэ)  (лог бичнэ)          (тоолуур нэмнэ)
```

Одоогийн Task Manager-т EDA нэмэхийн тулд:

- **Message Broker** сонгох — Redis Pub/Sub (хялбар) эсвэл RabbitMQ (найдвартай)
- **Event зарлах** газрыг тодорхойлох — Command handler-д Event зарлана
- **Subscriber** бичих — NotificationService, LogService гэх мэт
- **Idempotency** хангах — нэг Event хоёр удаа ирсэн ч асуудал гарахгүй байх

---

## Товч дүгнэлт

Event-Driven Architecture бол сервисүүдийг **шууд биш, үйл явдлаар дамжуулан** харилцуулах хэлбэр юм. Санах ойд байлгах зүйл:

- **Event** → болсон зүйлийн баримт, өнгөрсөн цагт нэртэй, өөрчлөх боломжгүй
- **Publisher** → Event зарлана, хэн сонсохыг мэдэхгүй
- **Subscriber** → Event сонсоно, хаанаас ирсэн мэдэхгүй
- **Loose coupling** → сервисүүд бие биенээс хамааралгүй болдог
- **Асинхрон** → Publisher хариу хүлээхгүй, хурдан
- **Idempotency** → нэг Event хоёр удаа ирсэн ч нэг л үр дүн гарна
- **Жижиг аппт шаардлагагүй** — Broker тохируулах нэмэлт ачаалал авчирна

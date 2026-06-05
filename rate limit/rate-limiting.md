# Rate Limiting — Дэлгэрэнгүй Тайлбар

## Rate Limiting гэж юу вэ?

Rate limiting буюу хүсэлтийн хурд хязгаарлалт нь нэг хэрэглэгч, IP хаяг, эсвэл API түлхүүр тодорхой хугацааны дотор хэдэн хүсэлт илгээж болохыг хязгаарлах механизм юм. Энэ нь вэб аппликейшны аюулгүй байдал болон тогтвортой ажиллагааг хангах чухал арга хэрэгсэл юм.

Хамгийн энгийн жишээгээр тайлбарлавал, нэг хүн секундэд 1000 удаа нэвтрэх оролдлого хийж байвал энэ нь хүний хийж чадах зүйл биш, автомат brute force халдлага гэдэг нь ойлгомжтой. Rate limiting нь яг ийм тохиолдолд тэр хүсэлтүүдийг хаан зогсооно.

---

## Rate Limiting яагаад чухал вэ?

**Brute Force халдлагаас хамгаалах.** Халдагчид нууц үгийг автоматаар олон мянган удаа туршиж таах оролдлого хийдэг. Rate limiting нь оролдлогын тоог хязгаарлан энэ халдлагыг бараг боломжгүй болгодог.

**DDoS халдлагыг багасгах.** Олон тооны хүсэлтээр серверийг дарж гацаахыг оролдох DDoS халдлагын үед rate limiting нь нэг эх сурвалжаас ирэх хүсэлтийн тоог хязгаарлан серверийн ачааллыг тэнцвэржүүлнэ.

**API-ийн хэт ачааллаас хамгаалах.** Гуравдагч талын хөгжүүлэгчид API-г хэт их ашиглах, алдаатай код давтан дуудлага хийх тохиолдолд сервер хэт ачаалалд ордог. Rate limiting нь энэ нөхцөлд тогтвортой ажиллагааг хангана.

**Зардал хэмнэх.** Cloud дэд бүтэц дээр ажиллаж буй аппликейшнд хэт их хүсэлт нь хэт их зардал дагуулдаг. Rate limiting нь зардлыг хянахад тусалдаг.

---

## Rate Limiting-ийн алгоритмууд

**Fixed Window** нь хамгийн энгийн алгоритм юм. Тодорхой цагийн цонхонд (жишээ нь: 1 минут) хэдэн хүсэлт зөвшөөрөхийг тогтоодог. Хэрэгжүүлэхэд хялбар боловч цагийн цонхны ирмэг дэх халдлагад (window edge attack) эмзэг байдаг. Жишээлбэл, минутын сүүлийн секундэд 100 хүсэлт, дараагийн минутын эхний секундэд 100 хүсэлт илгээвэл нийт 200 хүсэлт нэг секундэд орно.

**Sliding Window** нь Fixed Window-ийн дутагдлыг засдаг. Яг одоогийн цагаас n минут өмнөх хугацааг харгалзан тооцоолдог тул хязгаар илүү тэгш тархсан байдлаар хэрэгждэг.

**Token Bucket** нь уян хатан алгоритм бөгөөд "хувин"-д тогтмол хурдаар token нэмэгддэг ба хүсэлт ирэх бүрт token зарцуулагддаг. Хувин хоосон болбол хүсэлтийг хориглоно. Энэ нь богино хугацааны ачааллын өсөлтийг (burst) зөвшөөрдөг давуу талтай.

**Leaky Bucket** нь хүсэлтүүдийг тогтмол хурдаар боловсруулдаг дараалал (queue) юм. Хэт их хүсэлт ирвэл дараалалд хүлээнэ эсвэл татгалздаг.

---

## Express дээр Rate Limiting хэрэгжүүлэх

`express-rate-limit` сан ашиглан хэрэгжүүлнэ.

```bash
npm install express express-rate-limit
```

```javascript
const express = require("express");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(express.json());

// ── 1. Ерөнхий хязгаарлалт (бүх route-д)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100,                  // 100 хүсэлт
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: "Хэт олон хүсэлт илгээлээ. 15 минутын дараа дахин оролдоно уу.",
  },
});

// ── 2. Нэвтрэх endpoint-д хатуу хязгаарлалт
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10,                   // ердөө 10 оролдлого
  skipSuccessfulRequests: true, // Зөвхөн амжилтгүй хүсэлтийг тоолох
  message: {
    status: 429,
    error: "Нэвтрэх оролдлого хэт олон болсон. 15 минутын дараа оролдоно уу.",
  },
});

// ── 3. API endpoint-д дунд зэргийн хязгаарлалт
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минут
  max: 30,             // 30 хүсэлт
  keyGenerator: (req) => {
    // IP-ийн оронд API түлхүүрээр тоолох
    return req.headers["x-api-key"] || req.ip;
  },
  message: {
    status: 429,
    error: "API хязгаарт хүрлээ. 1 минутын дараа дахин оролдоно уу.",
  },
});

// ── Middleware холбох
app.use(globalLimiter);            // Бүх route-д
app.use("/api/auth", authLimiter); // Зөвхөн auth route-д
app.use("/api", apiLimiter);       // Зөвхөн API route-д

// ── Routes
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "1234") {
    return res.json({ success: true, message: "Амжилттай нэвтэрлээ!" });
  }
  res.status(401).json({ success: false, error: "Нэвтрэх мэдээлэл буруу байна." });
});

app.get("/api/users", (req, res) => {
  res.json({
    users: [
      { id: 1, name: "Болд" },
      { id: 2, name: "Оюун" },
    ],
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    message: "Сервер ажиллаж байна",
    rateLimit: {
      limit:     res.getHeader("RateLimit-Limit"),
      remaining: res.getHeader("RateLimit-Remaining"),
      reset:     res.getHeader("RateLimit-Reset"),
    },
  });
});

app.listen(3000, () => {
  console.log("Сервер 3000 порт дээр ажиллаж байна.");
});
```

---

## Limiter тохиргооны тайлбар

| Limiter | Route | Цонх | Хязгаар | Онцлог |
|---|---|---|---|---|
| `globalLimiter` | Бүх route | 15 минут | 100 | Ерөнхий хамгаалалт |
| `authLimiter` | `/api/auth` | 15 минут | 10 | Зөвхөн амжилтгүйг тоолно |
| `apiLimiter` | `/api` | 1 минут | 30 | API түлхүүрээр тоолно |

HTTP статус код `429 Too Many Requests` нь rate limit давсан үед буцаагддаг стандарт код юм.

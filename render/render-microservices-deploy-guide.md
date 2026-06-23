# Microservices төслийг Render дээр deploy хийх гарын авлага

**Төсөл:** `modular-vs-micro` — API Gateway + Auth microservice + нэг хуваалцсан Postgres
**Стек:** Node.js + Express + Prisma 7 + TypeScript-гаралттай Prisma Client
**Зорилго:** Сургалт — microservices-ийн бүх хэсгийг гараар, нэг нэгээр deploy хийж харуулах
**Платформ:** Render (үнэгүй tier)

---

## 1. Ерөнхий зураг

Гурван хэсгийг тус тусад нь deploy хийнэ:

```
[ Gateway ]  ──дотогш дуудна──>  [ Auth-service ]
     │                                  │
     └──────────┬───────────────────────┘
                ▼
          [ Postgres DB ]   ← нэг хуваалцсан өгөгдлийн сан
```

**Deploy хийх дараалал** (энэ нь чухал):

```
1. Postgres DB үүсгэх
2. Local-аас migration ажиллуулах
3. Auth-service deploy хийх
4. Gateway deploy хийх   ← auth-ийн URL хэрэгтэй тул хамгийн сүүлд
5. Тест
```

> Auth-ийг gateway-аас өмнө гаргадаг шалтгаан: gateway нь auth руу хүсэлт дамжуулдаг тул auth-ийн URL-ийг мэдэх ёстой. Auth-ийг эхэлж гаргавал URL нь бэлэн болж, gateway үүсгэхдээ шууд оруулна.

---

## 2. АСУУДАЛ ба ШИЙДЭЛ

Энэ төслийг deploy хийхэд тулгарах бүх асуудал, тус бүрийн шийдэл.

### Асуудал 1 — Render docker-compose-ийг ойлгодоггүй

**Асуудал:** Бидний compose загвар (бүх сервис нэг машинд) Render дээр шууд ажиллахгүй. Render бол "сервис бүрийг тусад нь" deploy хийдэг PaaS.

**Шийдэл:** Compose-оо орхиод, хэсэг бүрийг Render-ийн тусдаа нөөц болгоно:

| Compose дотор | Render дээр |
|---|---|
| `db` | Render Postgres (үнэгүй, 1 ширхэг) |
| `auth` | Web Service |
| `gateway` | Web Service |
| `migrate` | Local-аас ажиллуулна (доор) |

---

### Асуудал 2 — Render-ийн үнэгүй DB бол зөвхөн Postgres (бидэнд MariaDB)

**Асуудал:** Стек урьд нь MariaDB байсан. Render-ийн үнэгүй database зөвхөн PostgreSQL. MariaDB-д зориулсан код, migration Postgres дээр ажиллахгүй.

**Шийдэл:** Кодыг Postgres руу шилжүүлэх — 3 өөрчлөлт:

**2a. Provider солих** — `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**2b. Adapter солих:**
```bash
npm uninstall @prisma/adapter-mariadb
npm install @prisma/adapter-pg pg
```

**2c. Хуучин migration-ийг дахин үүсгэх** (хуучин SQL нь MariaDB-д зориулагдсан):
```bash
# 1. Хуучин migration устгах
rm -rf prisma/migrations

# 2. Локал Postgres түр асаах
docker run -d --name tmp-pg -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres:16

# 3. Шинэ Postgres migration үүсгэх
DATABASE_URL="postgresql://postgres:pass@localhost:5432/postgres" \
  npx prisma migrate dev --name init

# 4. Түр контейнерээ устгах
docker rm -f tmp-pg
```
Шинэ `prisma/migrations/` хавтсыг **git-д commit хий**.

---

### Асуудал 3 — Migration-ийг хэн эзэмших вэ (нэг schema, олон сервис)

**Асуудал:** Нэг `schema.prisma`-г хоёр сервис хуваалцаж байна. Хоёул `prisma migrate deploy` ажиллуулбал зөрчилдөж, schema эвдэрнэ.

**Шийдэл:** Migration-ийг **local-аас, нэг удаа** ажиллуулна. Тэгвэл сервисүүд migration огт хариуцахгүй — зөвхөн `prisma generate` хийнэ. Энэ нь "эзэмших" асуудлыг бүрэн арилгана.

(Алхам 2-р хэсэгт яаж хийхийг доор үзүүлэв.)

---

### Асуудал 4 — Prisma Client нь үүсгэгддэг код, gitignore-д орсон

**Асуудал:** `generated/prisma/` нь `.gitignore`-д орсон тул GitHub-д ороогүй. Сервис deploy хийхэд client байхгүй бол ажиллахгүй.

**Шийдэл:** Сервис бүрийн **build command-д `npx prisma generate` ЗААВАЛ** байна:
```
npm install && npx prisma generate
```
Render дээр auth, gateway тус бүр өөрийн filesystem-тэй тул тус бүр өөрийн client-ийг build үедээ үүсгэнэ. Хоёул нэг schema-аас үүсгэх тул ижил client гарна — энэ хэвийн.

---

### Асуудал 5 — TypeScript client + JavaScript entry-г хэрхэн ажиллуулах вэ

**Асуудал:** Prisma 7-ийн `prisma-client` generator нь **TypeScript** client үүсгэдэг. Гэтэл entry-нүүд (`app.js`, `auth/app.js`) нь plain JS. JS файл TS client-ийг шууд ажиллуулж чадахгүй.

**Шийдэл:** Бүх сервисийг **`tsx`-ээр ажиллуулна** (build хэрэггүй). `tsx` нь ажиллах үедээ TS-ийг хөрвүүлдэг тул JS entry → TS client бүгд асуудалгүй:
```
npx tsx app.js          # gateway start command
npx tsx auth/app.js     # auth start command
```

Үүний дагуу:
- `tsx`-ийг **`devDependencies` биш `dependencies`-д** байлга (Render runtime дээр хэрэгтэй):
  ```bash
  npm install tsx
  ```
- `lib/prisma.js`-ийг **устга** — зөвхөн `lib/prisma.ts`-ийг ашиглана (хоёр файл зэрэгцэхэд зөрүү гарах эрсдэлтэй).

---

### Асуудал 6 — Нэг хуваалцсан Prisma Client модуль

**Асуудал:** Сервис бүрт тусдаа client бичих үү? Үгүй. Нэг газар singleton хэлбэрээр бичиж, хоёул import хийнэ.

**Шийдэл:** `lib/prisma.ts`:
```ts
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 5,   // ★ free Postgres холболт цөөн — pool жижиг байлга (Асуудал 7)
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```
> Import зам (`../generated/prisma/client`) нь `prisma.config.ts` доторх output зам­тай таарах ёстой.

Сервис бүр зүгээр import хийнэ:
```js
import { prisma } from "../../lib/prisma.ts";
await prisma.user.create({ ... });
```

---

### Асуудал 7 — Холболтын pool дүүрэх (free Postgres)

**Асуудал:** Сервис бүр өөрийн холболтын pool нээдэг. Render-ийн үнэгүй Postgres (256MB RAM) холболт цөөнтэй. 2 сервис × pool 10 = 20 холболт → "too many connections" алдаа.

**Шийдэл:** Adapter дотор pool-оо жижиг байлга: **`max: 5`** (дээрх `lib/prisma.ts`-д орсон). Сервис олшрох тусам энэ улам чухал.

```
auth процесс    →  PrismaClient (pool, max 5)  ┐
                                               ├─→  нэг Postgres
gateway процесс →  PrismaClient (pool, max 5)  ┘
```

---

### Асуудал 8 — PORT-ийг env-ээс унших

**Асуудал:** Render аль порт ашиглахыг өөрөө зааж өгдөг. Hardcode хийвэл deploy амжилтгүй ("No open ports detected").

**Шийдэл:** `app.js`-ууд `process.env.PORT`-ийг уншина:
```js
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`on ${PORT}`));
```

---

### Асуудал 9 — JWT_SECRET хоёр сервист ижил байх

**Асуудал:** Auth токен зурж, gateway шалгана. Хоёр сервисийн `JWT_SECRET` зөрүүтэй бол "invalid token" алдаа.

**Шийдэл:** Нэг хүчтэй утга үүсгээд **хоёр сервист ЯГ ИЖИЛ** тавина:
```bash
openssl rand -hex 32      # үүсгэсэн утгаа хадгал
```

---

### Асуудал 10 — Internal vs External Database URL

**Асуудал:** Render database хоёр өөр холболтын хаяг өгдөг. Хольж хэрэглэвэл "connection refused" эсвэл SSL алдаа.

**Шийдэл:** Энгийн дүрэм:

| Хаанаас холбогдох | Аль URL |
|---|---|
| Сервис дотроос (auth, gateway) | **Internal** Database URL |
| Local машинаас (migration) | **External** Database URL (`sslmode=require`) |

---

### Асуудал 11 — AUTH_SERVICE_URL ба service-to-service дуудлага

**Асуудал:** Gateway нь auth руу дотогш хүсэлт дамжуулдаг. URL буруу эсвэл protocol дутуу бол холбогдохгүй.

**Шийдэл:** Auth-ийн нийтийн URL-ийг бүтэн (`https://`-тэй) хэлбэрээр gateway-ийн env-д өгнө:
```js
await fetch(`${process.env.AUTH_SERVICE_URL}/register`, { ... });
// AUTH_SERVICE_URL = https://auth-service-xxxx.onrender.com
```

---

## 3. Deploy хийх алхмууд

Асуудлуудыг засаад (Хэсэг 2), дараах дарааллаар гараар deploy хийнэ.

### Алхам 0 — Код бэлэн эсэхийг шалгах

- [ ] `schema.prisma` → `provider = "postgresql"` (Асуудал 2a)
- [ ] Adapter `@prisma/adapter-pg` болсон (Асуудал 2b)
- [ ] Postgres migration дахин үүсгэсэн, commit хийсэн (Асуудал 2c)
- [ ] `tsx` нь `dependencies`-д (Асуудал 5)
- [ ] `lib/prisma.ts` singleton, `max: 5` (Асуудал 6, 7)
- [ ] `lib/prisma.js` устгасан (Асуудал 5)
- [ ] `app.js`-ууд `process.env.PORT` уншдаг (Асуудал 8)
- [ ] GitHub руу push хийсэн

### Алхам 1 — Render дээр Postgres үүсгэх

1. Render → **New → Postgres**
2. Name: `app-db`, **Region: Singapore** (Монголд хамгийн ойр), Plan: **Free**
3. **Create**
4. Database хуудаснаас **Internal** болон **External** URL хоёрыг олж тэмдэглэ (Асуудал 10)

### Алхам 2 — Local-аас migration ажиллуулах

**External URL** ашиглана:
```bash
DATABASE_URL="<External Database URL>" npx prisma migrate deploy
```
Шалгах:
```bash
DATABASE_URL="<External URL>" npx prisma migrate status
# "Database schema is up to date" гарах ёстой
```

### Алхам 3 — Auth-service deploy хийх

1. Render → **New → Web Service** → repo сонгох
2. Тохиргоо:
   - Name: `auth-service`
   - **Region: Singapore** (DB-тэй ижил!)
   - Build Command: `npm install && npx prisma generate`
   - Start Command: `npx tsx auth/app.js`
   - Plan: **Free**
3. **Environment** хувьсагч:
   - `DATABASE_URL` = **Internal** URL
   - `JWT_SECRET` = үүсгэсэн утга (хадгал!)
4. **Create** → URL-ийг хуулж ав: `https://auth-service-xxxx.onrender.com`

### Алхам 4 — Gateway deploy хийх

1. Render → **New → Web Service** → **ижил repo**
2. Тохиргоо:
   - Name: `gateway`
   - **Region: Singapore**
   - Build Command: `npm install && npx prisma generate`
   - Start Command: `npx tsx app.js`
   - Plan: **Free**
3. **Environment**:
   - `DATABASE_URL` = **Internal** URL
   - `JWT_SECRET` = **Алхам 3-тай ЯГ ИЖИЛ** (Асуудал 9)
   - `AUTH_SERVICE_URL` = Алхам 3-ын auth URL (`https://`-тэй) (Асуудал 11)
4. **Create**

### Алхам 5 — Бүх гинжийг тест хийх

```bash
curl -X POST https://gateway-xxxx.onrender.com/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.mn","password":"12345678","name":"Тест"}'
```
Амжилттай хариу ирвэл бүх гинж ажиллаж байна:
```
Gateway  →  Auth-service  →  Postgres (хэрэглэгч үүснэ)
```
Database шалгах:
```bash
DATABASE_URL="<External URL>" npx prisma studio
```

---

## 4. Алдаа засах (Troubleshooting)

| Алдаа | Шалтгаан | Шийдэл |
|---|---|---|
| `No open ports detected` | PORT hardcode | `process.env.PORT` ашиглах (Асуудал 8) |
| `invalid token` / JWT таарахгүй | JWT_SECRET зөрүүтэй | Хоёр сервист ижил утга (Асуудал 9) |
| `connection refused` / SSL error | Internal/External хольсон | Сервист Internal, local-д External (Асуудал 10) |
| `too many connections` | Pool хэт том | adapter-д `max: 5` (Асуудал 7) |
| `Cannot find module '../generated/prisma'` | `prisma generate` ажиллаагүй | Build command-д нэмэх (Асуудал 4) |
| Auth руу холбогдохгүй | AUTH_SERVICE_URL буруу/protocol дутуу | Бүтэн `https://` URL (Асуудал 11) |
| Migration алдаа (P3018 г.м.) | MariaDB migration Postgres дээр | Migration дахин үүсгэх (Асуудал 2c) |
| TS client ажиллахгүй | `node`-оор ажиллуулсан | `npx tsx`-ээр ажиллуулах (Асуудал 5) |

---

## 5. Үнэгүй tier-ийн хязгаарлалт (сургалтад дурдах)

Эдгээр нь алдаа биш — сурах үнэ цэнэтэй цэгүүд:

- **750 цаг хуваалцана:** auth + gateway хоёулаа 24/7 ажиллавал сарын дунд бүх үнэгүй сервис зогсоно. Хичээлийн үед л асааж, дараа нь suspend хийвэл цаг хэмнэнэ.
- **Cold start:** 15 минут хүсэлтгүй бол сервис унтана. Эхний хүсэлт, ялангуяа gateway→auth гинж 30-60 секунд удана.
- **Auth нийтэд нээлттэй:** үнэгүй tier-д private service байхгүй тул auth-ийн URL гаднаас хандах боломжтой. Жинхэнэ production-д дотоод сервисийг нуудаг.
- **Postgres 30 хоног:** үүсгэснээс 30 хоногийн дараа устдаг. Хичээлийн дараа өгөгдөл хадгалах бол export хий.

---

## 6. Сургалтад тайлбарлах гол ойлголтууд

| Алхам | Юу харуулж байна |
|---|---|
| DB үүсгэх | Managed database — repo-оос build хийдэггүй, бэлэн сервер |
| Local migration | Schema-г гаднаас DB руу ажиллуулах (External URL, SSL) |
| `prisma generate` build-д | Client бол үүсгэгддэг код, commit хийдэггүй |
| `tsx`-ээр ажиллуулах | TS client-ийг JS entry-гээс ажиллуулах арга |
| Auth deploy | Бие даасан сервис, өөрийн процесс/instance/pool |
| Gateway deploy | Service-to-service дуудлага (gateway → auth) |
| Хуваалцсан DB + secret | Сервисүүд нэг DB, нэг JWT_SECRET хуваалцана |
| Тест | gateway → auth → DB гинжин холболт бүтнээрээ |
```

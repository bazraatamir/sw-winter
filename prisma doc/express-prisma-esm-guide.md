# Express + Prisma + `type: "module"` — Хэрхэн ажиллуулах заавар

Энэ заавар нь **`"type": "module"` (ESM)** ашигладаг Express + Prisma 7 төсөл дээр
"нэг файл нь `.ts`, нөгөө нь `.js` — яаж ажиллуулах вэ?" гэдэг асуултад хариулна.

---

## 1. Гол ойлголт: 2 төрлийн файлыг 2 өөр зүйл ажиллуулдаг

Танай төсөлд:

```
my-project/
├── prisma.config.ts     ← TypeScript  →  Prisma CLI ажиллуулна
├── prisma/schema.prisma
└── src/
    ├── index.js          ← JavaScript  →  node ажиллуулна
    ├── lib/prisma.js     ← JavaScript  →  node ажиллуулна
    └── routes/*.js       ← JavaScript  →  node ажиллуулна
```

| Файл | Хэн ажиллуулдаг вэ? | Команд |
|------|--------------------|--------|
| `src/*.js` | **Node.js** | `node src/index.js` |
| `prisma.config.ts` | **Prisma CLI** (node БИШ) | `npx prisma generate` |

> ⭐ **Чухал:** `prisma.config.ts` нь TypeScript ч гэсэн та үүнийг `node`-оор **хэзээ ч шууд ажиллуулдаггүй**. Prisma CLI өөрөө доторх TypeScript-loader-тэй тул `typescript` package суулгаагүй байсан ч уншиж чадна. Тиймээс "type:module + .ts config + .js код" гэсэн холимог **зөв ажиллана** — зөрчил гарахгүй.

---

## 2. Express код яаж ажиллуулах вэ (`.js`, ESM)

`"type": "module"` тул `.js` файлууд нь ESM болно. Compile (build) хийх **шаардлагагүй** — `node` шууд ажиллуулна:

```bash
# Энгийн ажиллуулах
node src/index.js

# Хөгжүүлэлтэд — файл өөрчлөгдөхөд автоматаар дахин ачаална
node --watch src/index.js
```

`package.json` дотор script болгож тавьвал илүү хялбар:

```json
{
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js"
  }
}
```

```bash
npm run dev
```

> 💡 `nodemon` суулгах шаардлагагүй — Node 18+ дотор `--watch` бий.

---

## 3. Бүрэн ажиллуулах дараалал

```bash
# 1. Package суулгах
npm install

# 2. .env үүсгэх
cp .env.example .env        # дотор нь DATABASE_URL засна

# 3. Prisma client үүсгэх  (prisma.config.ts-г CLI уншина)
npx prisma generate

# 4. Хүснэгт үүсгэх
npx prisma migrate dev

# 5. Server ажиллуулах  (node нь .js-г ажиллуулна)
npm run dev
```

---

## 4. ESM-ийн 3 анхаарах дүрэм

`"type": "module"` ашиглахад дараах 3 зүйл өөр болдог:

### ① Local import дээр `.js` өргөтгөл ЗААВАЛ

```js
// ❌ Буруу — ажиллахгүй
import { prisma } from './lib/prisma';

// ✅ Зөв — өргөтгөлтэй
import { prisma } from './lib/prisma.js';
```

> npm package-д өргөтгөл хэрэггүй: `import express from 'express'` (зөв).

### ② `require()` байхгүй → `import` ашиглана

```js
// ❌ CommonJS — ESM-д ажиллахгүй
const express = require('express');

// ✅ ESM
import express from 'express';
```

### ③ `__dirname` байхгүй

```js
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

---

## 5. Хэрэв TypeScript-гүй, 100% JavaScript болгохыг хүсвэл

Танд `.ts` файл огт байлгахыг хүсэхгүй бол `prisma.config.ts`-ийг **`prisma.config.mjs`** болгож болно (цэвэр JS):

```js
// prisma.config.mjs
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: env('DATABASE_URL') },
});
```

Ингэснээр төсөлд **ямар ч TypeScript файл үлдэхгүй** бөгөөд бүх зүйл `node`/`prisma` CLI-аар ажиллана.

---

## 6. Эсрэгээр — App кодоо TypeScript-ээр бичихийг хүсвэл

Хэрэв `src/` доторх файлуудаа `.ts` болгож, type аюулгүй байдал авахыг хүсвэл `tsx` ашиглана:

```bash
npm install -D tsx
```

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  }
}
```

`tsx` нь `.ts`-ийг шууд ажиллуулдаг (compile хийх шаардлагагүй) бөгөөд ESM-ийг автоматаар зөв зохицуулна. Энэ тохиолдолд import дээр `.js` биш `.ts` файлууд руу зааж болно.

> 📌 Шийдвэр: **Эхлэгчид цэвэр JS (3-р хэсэг) хамгийн хялбар.** Type аюулгүй байдал чухал бол бүх `src/`-ээ `.ts` болгоод `tsx` ашигла. Хамгийн будлиантай нь — `.js` болон `.ts`-ийг хольж хэрэглэх (энэ нь анхны алдаа байсан).

---

## 7. Түгээмэл алдаа & засвар

| Алдаа | Шалтгаан | Засвар |
|-------|----------|--------|
| `ERR_UNKNOWN_FILE_EXTENSION` `.ts` | `node` дээр `.ts` шууд ажиллуулсан | `.js` ажиллуул, эсвэл `tsx` ашигла |
| `ERR_MODULE_NOT_FOUND` (local) | import-д `.js` өргөтгөл дутуу | `'./lib/prisma.js'` гэж бич |
| `Cannot use import statement` | `"type":"module"` байхгүй | `package.json`-д нэм |
| `require is not defined` | ESM дотор `require` ашигласан | `import` болго |
| `__dirname is not defined` | ESM-д байхгүй | 4③-ийн кодыг ашигла |
| `does not provide an export named 'default'` | named/default зөрсөн | export ба import-оо тааруул |

---

## Хураангуй

- `"type": "module"` → `.js` файл нь **ESM**, `node`-оор шууд ажиллана (build хэрэггүй)
- `prisma.config.ts` нь **Prisma CLI**-аар ажилладаг тул `.js` кодтой зөрчилддөггүй
- Local import-д `.js` өргөтгөл **заавал**
- Цэвэр JS хүсвэл → `prisma.config.mjs`
- TS хүсвэл → бүгдийг `.ts` болгоод `tsx`
- `.js` + `.ts` **хольж** болохгүй (энэ нь будлианы гол эх үүсвэр)

# Prisma ORM — E-commerce API Лабораторын ажил

> **Зорилго:** Prisma ORM-ийг MySQL мэдээллийн сантай ашиглан e-commerce API бүтээх.  
> **Хамрах сэдвүүд:** Schema тодорхойлолт, Migration, Seed, CRUD, Relation query, Filter/Pagination, Transaction

---

## Агуулга

1. [Орчин бэлтгэх](#1-орчин-бэлтгэх)
2. [Prisma Schema](#2-prisma-schema)
3. [Migration](#3-migration)
4. [Seed өгөгдөл](#4-seed-өгөгдөл)
5. [CRUD үйлдлүүд](#5-crud-үйлдлүүд)
6. [Relation query](#6-relation-query)
7. [Filter ба Pagination](#7-filter-ба-pagination)
8. [Transaction](#8-transaction)
9. [Даалгавар](#9-даалгавар)

---

## 1. Орчин бэлтгэх

### 1.1 Суурилуулалт

```bash
mkdir prisma-ecommerce && cd prisma-ecommerce
npm init -y
npm install express prisma @prisma/client
npm install -D nodemon
npx prisma init
```

### 1.2 `.env` тохиргоо

```env
DATABASE_URL="mysql://root:password@localhost:3306/ecommerce_db"
```

> **Анхаарал:** `root`, `password` гэсэн утгуудыг өөрийн MySQL нэвтрэх мэдээллээр солино.

### 1.3 `package.json` скриптүүд

```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "seed": "node prisma/seed.js"
  }
}
```

### 1.4 Файлын бүтэц

```
prisma-ecommerce/
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── index.js
│   ├── routes/
│   │   ├── products.js
│   │   └── orders.js
│   └── controllers/
│       ├── productController.js
│       └── orderController.js
├── .env
└── package.json
```

---

## 2. Prisma Schema

`prisma/schema.prisma` файлыг дараах байдлаар тодорхойлно:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  orders    Order[]
  createdAt DateTime @default(now())
}

model Category {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  products Product[]
}

model Product {
  id          Int         @id @default(autoincrement())
  name        String
  price       Decimal     @db.Decimal(10, 2)
  stock       Int         @default(0)
  categoryId  Int
  category    Category    @relation(fields: [categoryId], references: [id])
  orderItems  OrderItem[]
  createdAt   DateTime    @default(now())
}

model Order {
  id         Int         @id @default(autoincrement())
  userId     Int
  user       User        @relation(fields: [userId], references: [id])
  status     OrderStatus @default(PENDING)
  total      Decimal     @db.Decimal(10, 2)
  items      OrderItem[]
  createdAt  DateTime    @default(now())
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  productId Int
  quantity  Int
  price     Decimal @db.Decimal(10, 2)
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id])
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  CANCELLED
}
```

### Schema-н тайлбар

| Загвар | Холбоо | Тайлбар |
|--------|--------|---------|
| `User` → `Order` | One-to-Many | Нэг хэрэглэгч олон захиалга хийж болно |
| `Category` → `Product` | One-to-Many | Нэг ангилалд олон бүтээгдэхүүн байна |
| `Order` ↔ `Product` | Many-to-Many (via `OrderItem`) | Захиалга ба бүтээгдэхүүний завсрын хүснэгт |
| `OrderItem` | Junction table | Тоо хэмжээ, үнийг тус тусад нь хадгална |

---

## 3. Migration

### 3.1 Анхны migration үүсгэх

```bash
npx prisma migrate dev --name init
```

Энэ команд:
- SQL migration файл үүсгэнэ (`prisma/migrations/` дотор)
- MySQL мэдээллийн санд хүснэгтүүдийг үүсгэнэ
- Prisma Client-ийг шинэчилнэ

### 3.2 Migration файлын агуулга (`migrations/.../migration.sql`)

Prisma дараах SQL-ийг автоматаар үүсгэнэ:

```sql
CREATE TABLE `User` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `User_email_key`(`email`)
);

CREATE TABLE `Product` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `stock` INTEGER NOT NULL DEFAULT 0,
  `categoryId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
);

-- ... бусад хүснэгтүүд
```

### 3.3 Schema өөрчлөх үед

```bash
# Schema-д өөрчлөлт оруулсны дараа
npx prisma migrate dev --name add_product_description

# Production орчинд
npx prisma migrate deploy
```

### 3.4 Prisma Studio (visual editor)

```bash
npx prisma studio
# http://localhost:5555 дээр нээгдэнэ
```

---

## 4. Seed өгөгдөл

`prisma/seed.js`:

```js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Ангилалууд үүсгэх
  const electronics = await prisma.category.create({
    data: { name: 'Электроник' }
  })
  const clothing = await prisma.category.create({
    data: { name: 'Хувцас' }
  })

  // Бүтээгдэхүүн үүсгэх
  await prisma.product.createMany({
    data: [
      { name: 'iPhone 15', price: 1299.99, stock: 50, categoryId: electronics.id },
      { name: 'Samsung TV', price: 799.99, stock: 20, categoryId: electronics.id },
      { name: 'Цамц', price: 29.99, stock: 200, categoryId: clothing.id },
      { name: 'Өвлийн пальто', price: 149.99, stock: 80, categoryId: clothing.id },
    ]
  })

  // Хэрэглэгч үүсгэх
  await prisma.user.createMany({
    data: [
      { name: 'Болд', email: 'bold@example.com' },
      { name: 'Сарнай', email: 'sarnai@example.com' },
    ]
  })

  console.log('Seed амжилттай!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Seed ажиллуулах:

```bash
npm run seed
```

---

## 5. CRUD үйлдлүүд

### 5.1 Prisma Client инициализаци

`src/db.js`:

```js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
module.exports = prisma
```

### 5.2 Бүтээгдэхүүн CRUD

`src/controllers/productController.js`:

```js
const prisma = require('../db')

// CREATE — бүтээгдэхүүн нэмэх
const createProduct = async (req, res) => {
  const { name, price, stock, categoryId } = req.body

  const product = await prisma.product.create({
    data: { name, price, stock, categoryId },
    include: { category: true }       // холбоотой ангилалыг хамт буцаана
  })

  res.status(201).json(product)
}

// READ — нэг бүтээгдэхүүн авах
const getProduct = async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(req.params.id) },
    include: { category: true }
  })

  if (!product) return res.status(404).json({ message: 'Олдсонгүй' })
  res.json(product)
}

// UPDATE — бүтээгдэхүүн шинэчлэх
const updateProduct = async (req, res) => {
  const product = await prisma.product.update({
    where: { id: Number(req.params.id) },
    data: req.body
  })
  res.json(product)
}

// DELETE — бүтээгдэхүүн устгах
const deleteProduct = async (req, res) => {
  await prisma.product.delete({
    where: { id: Number(req.params.id) }
  })
  res.json({ message: 'Устгагдлаа' })
}

module.exports = { createProduct, getProduct, updateProduct, deleteProduct }
```

### 5.3 Route тохиргоо

`src/routes/products.js`:

```js
const router = require('express').Router()
const ctrl = require('../controllers/productController')

router.post('/',        ctrl.createProduct)
router.get('/:id',      ctrl.getProduct)
router.put('/:id',      ctrl.updateProduct)
router.delete('/:id',   ctrl.deleteProduct)

module.exports = router
```

`src/index.js`:

```js
const express = require('express')
const app = express()

app.use(express.json())
app.use('/api/products', require('./routes/products'))
app.use('/api/orders',   require('./routes/orders'))

app.listen(3000, () => console.log('Server: http://localhost:3000'))
```

---

## 6. Relation Query

Prisma-д relation query нь `include` ба `select` ашиглан хийгдэнэ.

### 6.1 Nested include — гүнзгий холбоо

```js
// Захиалгыг хэрэглэгч + бүтээгдэхүүн мэдээллийн хамт авах
const order = await prisma.order.findUnique({
  where: { id: 1 },
  include: {
    user: true,                        // хэрэглэгчийн мэдээлэл
    items: {
      include: {
        product: {
          include: { category: true }  // бүтээгдэхүүний ангилал ч хамт
        }
      }
    }
  }
})
```

### 6.2 Select — зөвхөн хэрэгтэй талбарууд

```js
// Хэт их өгөгдөл буцаахгүйн тулд select ашиглана
const products = await prisma.product.findMany({
  select: {
    id: true,
    name: true,
    price: true,
    category: {
      select: { name: true }           // зөвхөн ангилалын нэр
    }
  }
})
```

### 6.3 Relation count

```js
// Ангилал бүрт хэдэн бүтээгдэхүүн байгааг тоолох
const categories = await prisma.category.findMany({
  include: {
    _count: {
      select: { products: true }
    }
  }
})
// Үр дүн: [{ id: 1, name: 'Электроник', _count: { products: 2 } }, ...]
```

---

## 7. Filter ба Pagination

### 7.1 Олон нөхцөлт шүүлт

```js
// GET /api/products?category=1&minPrice=100&maxPrice=1000&search=phone
const getProducts = async (req, res) => {
  const { category, minPrice, maxPrice, search } = req.query

  const products = await prisma.product.findMany({
    where: {
      categoryId: category ? Number(category) : undefined,
      price: {
        gte: minPrice ? Number(minPrice) : undefined,   // greater than or equal
        lte: maxPrice ? Number(maxPrice) : undefined    // less than or equal
      },
      name: search
        ? { contains: search }                          // LIKE '%search%'
        : undefined,
      stock: { gt: 0 }                                  // зөвхөн нөөцтэй бараа
    },
    include: { category: true }
  })

  res.json(products)
}
```

### 7.2 Cursor-based pagination

```js
// GET /api/products?page=2&limit=10
const getPaginatedProducts = async (req, res) => {
  const page  = Number(req.query.page)  || 1
  const limit = Number(req.query.limit) || 10
  const skip  = (page - 1) * limit

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.product.count()
  ])

  res.json({
    data: products,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  })
}
```

### 7.3 OrderBy — эрэмбэлэлт

```js
// Үнээр өсөх эрэмбэ, дараа нь нэрээр
const products = await prisma.product.findMany({
  orderBy: [
    { price: 'asc' },
    { name: 'asc' }
  ]
})
```

---

## 8. Transaction

Transaction нь хэд хэдэн үйлдлийг нэг дор гүйцэтгэх бөгөөд аль нэг нь алдаа гарвал **бүгдийг буцаана**.

### 8.1 Захиалга үүсгэх (бодит жишээ)

Энэ үйлдэлд:
1. Нөөц хүрэлцэхийг шалгах
2. Нөөцийг хасах
3. Захиалга үүсгэх
4. OrderItem-үүд нэмэх

— бүгд нэг transaction дотор явна.

```js
const createOrder = async (req, res) => {
  const { userId, items } = req.body
  // items = [{ productId: 1, quantity: 2 }, { productId: 3, quantity: 1 }]

  try {
    const order = await prisma.$transaction(async (tx) => {

      // 1. Бүтээгдэхүүн бүрийг шалгах
      let total = 0
      const checkedItems = []

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        })

        if (!product) {
          throw new Error(`Бүтээгдэхүүн #${item.productId} олдсонгүй`)
        }
        if (product.stock < item.quantity) {
          throw new Error(`${product.name}: нөөц хүрэлцэхгүй байна`)
        }

        total += Number(product.price) * item.quantity
        checkedItems.push({ product, quantity: item.quantity })
      }

      // 2. Нөөц хасах
      for (const { product, quantity } of checkedItems) {
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: quantity } }
        })
      }

      // 3. Захиалга үүсгэх
      const newOrder = await tx.order.create({
        data: {
          userId,
          total,
          status: 'PENDING',
          items: {
            create: checkedItems.map(({ product, quantity }) => ({
              productId: product.id,
              quantity,
              price: product.price
            }))
          }
        },
        include: { items: true }
      })

      return newOrder
    })

    res.status(201).json(order)

  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
```

### 8.2 Transaction-н ажиллагаа

```
prisma.$transaction(async (tx) => {
    │
    ├── Алдаагүй бол → COMMIT (бүх өөрчлөлт хадгалагдана)
    │
    └── Алдаа гарвал → ROLLBACK (бүх өөрчлөлт цуцлагдана)
```

> **Зөвлөгөө:** Transaction дотор `prisma` биш `tx` ашиглах ёстой. `prisma` ашиглавал transaction-н гадна ажиллана.

---

## 9. Даалгавар

Дараах даалгавруудыг биелүүлж лабораторын ажлаа дуусгана уу:

### Суурь даалгаврууд (заавал)

| # | Даалгавар | Холбогдох хэсэг |
|---|-----------|-----------------|
| 1 | Schema үүсгэж migration ажиллуулах | §2, §3 |
| 2 | Seed өгөгдөл оруулж Prisma Studio-д шалгах | §4 |
| 3 | Бүтээгдэхүүний CRUD endpoint-үүд бичих | §5 |
| 4 | Захиалгын бүх мэдээллийг `include` ашиглан авах | §6 |
| 5 | Үнийн хязгаар болон нэрээр шүүх endpoint хийх | §7 |
| 6 | Захиалга үүсгэх transaction хэрэгжүүлэх | §8 |

### Нэмэлт даалгаврууд (сонгон)

- **Soft delete:** Бүтээгдэхүүн устгахдаа `deletedAt` timestamp тавих (физик устгал биш)
- **Pagination meta:** `totalPages`, `hasNextPage`, `hasPrevPage` талбаруудыг response-д нэмэх
- **Order status update:** `PENDING → PAID → SHIPPED` гэсэн статус шилжилтийн endpoint хийх
- **Category filter:** Ангилал бүрийн бүтээгдэхүүний тоо, дундаж үнийг буцаах

---

## Ашигтай командууд

```bash
# Migration үүсгэх
npx prisma migrate dev --name <нэр>

# Schema-аас client шинэчлэх (migration хийхгүйгээр)
npx prisma generate

# Мэдээллийн санг reset хийх (бүх өгөгдөл устна!)
npx prisma migrate reset

# Prisma Studio нээх
npx prisma studio

# Seed ажиллуулах
npm run seed
```

---

## Лавлах холбоосууд

- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)

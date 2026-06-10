# Database Partitioning — Дэлгэрэнгүй Онолын Гарын Авлага

---

## 1. Асуудал: Хүснэгт хэт том болох

Апп удаан хугацаанд ажиллаж, өгөгдөл хуримтлагдах тусам хүснэгт аварга том болдог. Жишээлбэл:

```
orders хүснэгт:
┌────┬─────────┬────────────┬────────┐
│ id │ user_id │ created_at │ amount │
├────┼─────────┼────────────┼────────┤
│  1 │   101   │ 2020-01-05 │  5000  │
│  2 │   203   │ 2020-03-12 │  8000  │
│  3 │   ...   │ 2021-...   │  ...   │
│ .. │   ...   │ 2022-...   │  ...   │
│ .. │   ...   │ 2023-...   │  ...   │
│ .. │   ...   │ 2024-...   │  ...   │
│500,000,000│ ...  │ 2026-... │  ...  │  ← 500 сая мөр!
└────┴─────────┴────────────┴────────┘
```

Ийм хүснэгтэд `SELECT` хийхэд MySQL **бүх 500 сая мөрийг** нэг файлаас хайна. Index байсан ч хурд мэдэгдэхүйц удаашрана.

**Partitioning** бол энэ асуудлыг шийдэх арга — нэг аварга том хүснэгтийг **логик хэсгүүдэд хуваах** юм.

---

## 2. Partitioning гэж юу вэ?

Partitioning гэдэг нь нэг хүснэгтийн өгөгдлийг тодорхой дүрмийн дагуу **хэд хэдэн физик хэсэгт (partition)** хуваан хадгалах явдал юм.

Зүйрлэл: Нэг том архивын шүүгээ байна гэж бод. Бүх баримтыг нэг чихмэлд хийвэл хайхад хэцүү. Харин **онооор нь ялгаж** — 2020 оны баримт нэг хайрцаг, 2021 оны баримт өөр хайрцаг гэх мэтчилэн хийвэл хайлт хурдан болно. Partitioning яг ийм зарчмаар ажилладаг.

```
          orders хүснэгт (нүдэнд нэг хүснэгт харагдана)
                          ↓
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
  [2020 оны өгөгдөл] [2021 оны өгөгдөл] [2022 оны өгөгдөл] ...
   partition_2020     partition_2021     partition_2022
```

Чухал зүйл: Хөгжүүлэгч болон хэрэглэгчийн хувьд **нэг хүснэгт хэвээр харагдана**. MySQL дотроо л хуваан удирддаг.

---

## 3. Partitioning-ийн Төрлүүд

### 3.1 RANGE Partitioning — Муж утгаар хуваах

Хамгийн түгээмэл хэлбэр. Утгын мужаар partition үүсгэнэ. Он сар өдөр, тоон утгад хамгийн тохиромжтой.

```sql
CREATE TABLE orders (
  id         INT NOT NULL,
  user_id    INT NOT NULL,
  amount     DECIMAL(10,2),
  created_at DATE NOT NULL
)
PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2020 VALUES LESS THAN (2021),
  PARTITION p2021 VALUES LESS THAN (2022),
  PARTITION p2022 VALUES LESS THAN (2023),
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

Одоо `WHERE created_at >= '2023-01-01'` гэвэл MySQL зөвхөн `p2023` partition-г хайна — бусдыг огт үзэхгүй.

```
SELECT * FROM orders WHERE YEAR(created_at) = 2023;
         ↓
MySQL зөвхөн p2023-г скан хийнэ ✓
p2020, p2021, p2022, p2024 → огт хүрэхгүй
```

**Хэрэглээ:** Лог, захиалга, гүйлгээний түүх — цаг хугацааны дарааллалсан өгөгдөл.

### 3.2 LIST Partitioning — Тодорхой утгаар хуваах

RANGE-тэй төстэй боловч муж биш **тодорхой утгуудын жагсаалтаар** хуваана.

```sql
CREATE TABLE employees (
  id         INT NOT NULL,
  name       VARCHAR(100),
  department VARCHAR(50),
  region     VARCHAR(20) NOT NULL
)
PARTITION BY LIST COLUMNS (region) (
  PARTITION p_asia    VALUES IN ('MN', 'CN', 'JP', 'KR'),
  PARTITION p_europe  VALUES IN ('DE', 'FR', 'UK', 'IT'),
  PARTITION p_america VALUES IN ('US', 'CA', 'MX', 'BR')
);
```

```
SELECT * FROM employees WHERE region = 'MN';
         ↓
MySQL зөвхөн p_asia-г хайна ✓
```

**Хэрэглээ:** Бүсчилсэн өгөгдөл, ангилал, статус.

### 3.3 HASH Partitioning — Хэш функцээр хуваах

Тодорхой багана дээр хэш функц ажиллуулж, үр дүнд нь үндэслэн **жигд хуваарилна**.

```sql
CREATE TABLE sessions (
  id         INT NOT NULL,
  user_id    INT NOT NULL,
  data       TEXT,
  created_at DATETIME
)
PARTITION BY HASH (user_id)
PARTITIONS 8;   -- 8 partition үүснэ
```

`user_id = 100` бол `100 % 8 = 4` → 4-р partition-д орно.

```
user_id=1   → partition 1
user_id=2   → partition 2
...
user_id=9   → partition 1  (давтагдана)
user_id=100 → partition 4
```

**Давуу тал:** Өгөгдөл жигд хуваарилагдана, нэг partition хэт дүүрэхгүй.
**Сул тал:** Муж хайлт (`WHERE user_id BETWEEN 1 AND 100`) үр дүнгүй — бүх partition хайна.

**Хэрэглээ:** User-тэй холбоотой өгөгдөл, жигд ачаалал хуваарилах.

### 3.4 KEY Partitioning — Primary Key-р хуваах

HASH-тай адил боловч MySQL өөрийн дотоод хэш функцийг ашиглана. Primary key эсвэл unique key дээр хийдэг.

```sql
CREATE TABLE users (
  id    INT NOT NULL PRIMARY KEY,
  name  VARCHAR(100),
  email VARCHAR(100)
)
PARTITION BY KEY (id)
PARTITIONS 4;
```

**Хэрэглээ:** Primary key-р жигд хуваарилах хамгийн хялбар арга.

---

## 4. Partition Pruning — Хурдны нууц

Partitioning-ийн хамгийн том давуу тал бол **partition pruning** буюу MySQL шаардлагагүй partition-г **огт үзэхгүй** орхидог байдал юм.

### Жишээгээр харцгаая

500 сая мөртэй `orders` хүснэгт, жилд 100 сая мөр нэмэгддэг гэж бод.

```sql
-- Partition байхгүй үед:
SELECT * FROM orders WHERE YEAR(created_at) = 2023 AND amount > 10000;
-- MySQL 500 сая мөр бүгдийг шалгана 😱

-- Partition байхад:
SELECT * FROM orders WHERE YEAR(created_at) = 2023 AND amount > 10000;
-- MySQL зөвхөн p2023-ийн 100 сая мөрийг шалгана ✓
-- Хурд 5 дахин өснө
```

### Pruning ажиллахын тулд

WHERE нөхцөл нь **partition key-г шууд ашиглах** ёстой.

```sql
-- ✅ Pruning ажиллана:
WHERE created_at >= '2023-01-01'
WHERE YEAR(created_at) = 2023
WHERE region = 'MN'

-- ❌ Pruning ажиллахгүй (partition key хувиргасан):
WHERE DATE_FORMAT(created_at, '%Y') = '2023'  -- функц ашигласан
WHERE created_at + INTERVAL 1 DAY > '2023-01-01'  -- тооцоо хийсэн
```

---

## 5. Partition Удирдлага

Partitioning-ийн нэг том давуу тал бол partition бүрийг **бие даан удирдах** боломж юм.

### Partition нэмэх

```sql
-- Шинэ жил болоход partition нэмнэ
ALTER TABLE orders ADD PARTITION (
  PARTITION p2025 VALUES LESS THAN (2026)
);
```

### Partition устгах — Хамгийн хурдан устгал

Хуучин өгөгдлийг устгах хэд хэдэн арга байна:

```sql
-- МУРУУ арга: DELETE ашиглах (маш удаан)
DELETE FROM orders WHERE YEAR(created_at) = 2020;
-- MySQL мөр бүрийг нэг нэгээр нь устгана, log бичнэ → удаан

-- ЗӨВ арга: DROP PARTITION (маш хурдан)
ALTER TABLE orders DROP PARTITION p2020;
-- MySQL бүх файлыг нэгэн зэрэг устгана → хурдан, log бичихгүй
```

`DROP PARTITION` нь `DELETE`-с **хэдэн мянга дахин хурдан** байдаг. Энэ нь partitioning-ийн хамгийн том практик давуу талуудын нэг.

### Partition хоослох

```sql
-- Устгахгүй, зөвхөн өгөгдлийг хоослох
ALTER TABLE orders TRUNCATE PARTITION p2020;
```

### Partition-г задлах ба нэгтгэх

```sql
-- Нэг partition-г хоёр болгох
ALTER TABLE orders REORGANIZE PARTITION p_future INTO (
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Хоёр partition нэгтгэх
ALTER TABLE orders REORGANIZE PARTITION p2020, p2021 INTO (
  PARTITION p2020_2021 VALUES LESS THAN (2022)
);
```

---

## 6. Partitioning vs Index — Хэзээ алийг ашиглах вэ?

Partitioning болон Index хоёр нь хоёулаа хайлтыг хурдасгадаг боловч **өөр өөр асуудлыг** шийддэг.

| | Index | Partitioning |
|---|---|---|
| **Ажиллах зарчим** | B-Tree модоор хайна | Шаардлагагүй partition-г огт үзэхгүй |
| **Хамгийн сайн** | Цөөн мөр буцаах хайлт | Том хэсгийг скан хийх хайлт |
| **Устгал** | Мөр бүрийг нэг нэгээр | Бүхэл partition-г нэгэн зэрэг |
| **Засвар үйлчилгээ** | Автомат | Partition нэмэх, устгах шаардлагатай |
| **Хамгийн тохиромжтой** | `WHERE id = 5` | `WHERE YEAR(date) = 2023` |

**Хамгийн сайн нь хоёуланг хослуулах:**

```sql
CREATE TABLE orders (
  id         INT NOT NULL,
  user_id    INT NOT NULL,
  amount     DECIMAL(10,2),
  created_at DATE NOT NULL,
  INDEX idx_user_id (user_id),     -- Index: user_id-р хурдан хайх
  INDEX idx_amount (amount)        -- Index: amount-р хурдан хайх
)
PARTITION BY RANGE (YEAR(created_at)) (  -- Partition: жилээр хуваах
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026)
);
```

```sql
SELECT * FROM orders
WHERE YEAR(created_at) = 2024   -- Partition pruning: p2024 л хайна
  AND user_id = 101;             -- Index: тухайн partition дотор хурдан хайна
```

---

## 7. Partitioning-ийн Хязгаарлалтууд

Partitioning бүх асуудлыг шийддэггүй. Дараах хязгаарлалтуудыг мэдэх нь чухал:

**Foreign key дэмждэггүй.** Partition хийсэн хүснэгт дээр FOREIGN KEY ашиглах боломжгүй. Холбоог програмын түвшинд удирдах хэрэгтэй болно.

**Partition key нь PRIMARY KEY-д байх ёстой.** MySQL-д энэ шаардлага заавал биелэгдэх ёстой.

```sql
-- ❌ Алдаа гарна:
CREATE TABLE orders (
  id         INT PRIMARY KEY,
  created_at DATE
)
PARTITION BY RANGE (YEAR(created_at)) (...);

-- ✅ Зөв: created_at-г PRIMARY KEY-д нэмнэ
CREATE TABLE orders (
  id         INT NOT NULL,
  created_at DATE NOT NULL,
  PRIMARY KEY (id, created_at)   -- хоёуланг нэгтгэнэ
)
PARTITION BY RANGE (YEAR(created_at)) (...);
```

**Partition тоо хязгаартай.** MySQL нэг хүснэгтэд хамгийн ихдээ **8192 partition** зөвшөөрдөг. Практикт 50–100-аас хэтрүүлэхгүй байх нь зүйтэй.

**Бүх query хурдасдаггүй.** Partition key ашиглаагүй query бүх partition-г хайна — partition байхгүйтэй адил удаан байна.

---

## 8. Partitioning vs Sharding

Хоёул өгөгдлийг хуваадаг боловч **хэр хэмжээнд** хуваадагаараа ялгаатай.

```
Partitioning:
┌──────────────────────────────┐
│       Нэг MySQL сервер        │
│  [p2020] [p2021] [p2022] ... │  ← нэг серверт хуваана
└──────────────────────────────┘

Sharding:
┌────────────┐  ┌────────────┐  ┌────────────┐
│  Сервер 1  │  │  Сервер 2  │  │  Сервер 3  │
│ Хэрэглэгч  │  │ Хэрэглэгч  │  │ Хэрэглэгч  │
│  1–1M      │  │  1M–2M     │  │  2M–3M     │  ← өөр өөр серверт
└────────────┘  └────────────┘  └────────────┘
```

Partitioning нэг серверийн дотор ажилладаг тул удирдахад хялбар. Sharding олон сервер ашиглах тул хамгийн том хэмжээний өгөгдөлд тохиромжтой боловч маш хүндрэлтэй.

---

## 9. Хэзээ Partitioning Хэрэгтэй вэ?

**Хэрэгтэй үед:**
- Хүснэгтэд **10 сая мөроос дээш** өгөгдөл байвал
- Өгөгдлийг **хугацаагаар** архивлах, устгах шаардлагатай бол
- Тодорхой мужийн query (`WHERE year = 2023`) байнга удаан байвал
- Хуучин өгөгдлийг хурдан **DROP PARTITION** аргаар цэвэрлэх хэрэгтэй бол

**Хэрэггүй үед:**
- Хүснэгт жижиг (сая мөроос доош) байвал
- Partition key ашиглахгүй query давамгайлах бол
- Foreign key шаардлагатай нарийн хамаарал байвал

---

## 10. Практик: Log хүснэгтэд Partitioning

Task Manager дахь activity log хүснэгтийг жишээ болгон авъя. Log өгөгдөл хурдан хуримтлагддаг бөгөөд хуучин log-г байнга устгах шаардлагатай байдаг — partitioning-д хамгийн тохиромжтой тохиолдол.

```sql
CREATE TABLE activity_logs (
  id          BIGINT NOT NULL AUTO_INCREMENT,
  user_id     INT NOT NULL,
  action      VARCHAR(100) NOT NULL,
  created_at  DATE NOT NULL,
  PRIMARY KEY (id, created_at),
  INDEX idx_user_id (user_id)
)
PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

```sql
-- Энэ сарын log → зөвхөн p2026 хайна
SELECT * FROM activity_logs
WHERE created_at >= '2026-06-01'
  AND user_id = 42;

-- 2024 оны хуучин log-г хурдан устгах
ALTER TABLE activity_logs DROP PARTITION p2024;
-- Хэдэн секундэд дуусна, DELETE бол цаг зарцуулна
```

---

## Товч дүгнэлт

Partitioning бол **том хүснэгтийг удирдах** хамгийн хүчирхэг арга хэрэгслүүдийн нэг юм. Санах ойд байлгах цөөхөн зүйл:

- **RANGE** → цаг хугацааны өгөгдөлд хамгийн тохиромжтой
- **Partition pruning** → WHERE нөхцөлд partition key шууд байх ёстой
- **DROP PARTITION** → DELETE-с хэдэн мянга дахин хурдан
- **Foreign key дэмждэггүй** → том хязгаарлалт
- **Index + Partition хослуулах** нь хамгийн үр дүнтэй
- **10 сая мөроос доош** хүснэгтэд шаардлагагүй

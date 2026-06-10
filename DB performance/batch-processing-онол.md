# Batch Processing — Дэлгэрэнгүй Онолын Гарын Авлага

---

## 1. Асуудал: Нэг нэгээр боловсруулах нь үнэтэй

Өгөгдлийг нэг нэгээр боловсруулах нь мэдэгдэхүйц удаан байдаг. Жишээлбэл 10,000 хэрэглэгчид имэйл илгээх гэж бод:

```
Хэрэглэгч 1 → DB хадгал → имэйл илгээ
Хэрэглэгч 2 → DB хадгал → имэйл илгээ
Хэрэглэгч 3 → DB хадгал → имэйл илгээ
...
Хэрэглэгч 10,000 → DB хадгал → имэйл илгээ
```

Нэг үйлдэл 50мс зарцуулбал: `10,000 × 50мс = 500 секунд` буюу **8 гаруй минут**.

Нэмж хэлэхэд:
- DB руу **10,000 удаа** холболт хийнэ
- Сервер **10,000 хүсэлт** боловсруулна
- Нэг алдаа гарвал **хэдэн мянган үйлдэл** дундаас хаана алдаа гарсныг мэдэхэд хэцүү

**Batch processing** бол олон үйлдлийг **нэгтгэж, бөөнөөр** боловсруулах арга юм.

---

## 2. Batch Processing гэж юу вэ?

Batch processing буюу "багц боловсруулалт" нь олон үйлдлийг нэг дор цуглуулж, **нэг удаагийн үйлдлээр** гүйцэтгэх зарчим юм.

```
Нэг нэгээр:                    Batch-ээр:
┌───┐ ┌───┐ ┌───┐              ┌───────────────┐
│ 1 │ │ 2 │ │ 3 │  ...    →   │  1, 2, 3 ...  │  → нэг удаа
└───┘ └───┘ └───┘              └───────────────┘
3 удаа DB хүрнэ                1 удаа DB хүрнэ
```

Зүйрлэл: Захиалгын байшингаас хоол хүргэх гэж бод. Нэг хаягт нэг хоол хүргэхийн тулд тус бүрд нь машин явуулах биш, нэг жолооч бүх хоолыг нэг аяллаар хүргэдэг. Batch processing яг ийм зарчмаар ажилладаг.

---

## 3. DB дахь Batch Insert

### Нэг нэгээр оруулах (удаан)

```javascript
// ❌ 10,000 INSERT = 10,000 удаа DB хүрнэ
for (const user of users) {
  await pool.query(
    'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
    [user.id, 'Шинэ мэдэгдэл']
  );
}
```

### Batch INSERT (хурдан)

```javascript
// ✅ 10,000 мөр = 1 удаа DB хүрнэ
const values = users.map(u => [u.id, 'Шинэ мэдэгдэл']);

await pool.query(
  'INSERT INTO notifications (user_id, message) VALUES ?',
  [values]
);
```

MySQL дотроо нэг `INSERT` дотор олон мөр хүлээн авдаг:

```sql
INSERT INTO notifications (user_id, message) VALUES
  (1, 'Шинэ мэдэгдэл'),
  (2, 'Шинэ мэдэгдэл'),
  (3, 'Шинэ мэдэгдэл'),
  ...
  (10000, 'Шинэ мэдэгдэл');
```

### Chunk болгон хуваах

Нэг удаад хэт олон мөр оруулах нь санах ойд хэт их ачаалал үүсгэнэ. Тиймээс **chunk** буюу жижиг хэсгүүдэд хуваан боловсруулна.

```javascript
async function batchInsert(pool, rows, chunkSize = 1000) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = chunk.map(r => [r.userId, r.message]);
    await pool.query(
      'INSERT INTO notifications (user_id, message) VALUES ?',
      [values]
    );
    console.log(`${i + chunk.length}/${rows.length} боловсруулав`);
  }
}

// Ашиглах
await batchInsert(pool, allUsers);
```

---

## 4. Batch UPDATE

```javascript
// ❌ Нэг нэгээр UPDATE
for (const task of tasks) {
  await pool.query(
    'UPDATE tasks SET status = ? WHERE id = ?',
    ['archived', task.id]
  );
}

// ✅ Нэг SQL-ээр олон мөр UPDATE
const ids = tasks.map(t => t.id);
await pool.query(
  'UPDATE tasks SET status = ? WHERE id IN (?)',
  ['archived', ids]
);

// ✅ Мөр бүрт өөр утга оруулах — CASE WHEN
const cases = tasks.map(t => `WHEN ${t.id} THEN '${t.newStatus}'`).join(' ');
const ids = tasks.map(t => t.id).join(',');

await pool.query(`
  UPDATE tasks
  SET status = CASE id ${cases} END
  WHERE id IN (${ids})
`);
```

---

## 5. Batch Processing-ийн Хэлбэрүүд

### 5.1 Scheduled Batch — Цагаар ажиллах

Тодорхой цагт ажиллуулах batch. Шөнийн цагаар хуучин өгөгдөл цэвэрлэх, тайлан гаргах гэх мэт.

```javascript
const cron = require('node-cron');

// Өдөр бүр шөнийн 2:00 цагт
cron.schedule('0 2 * * *', async () => {
  console.log('Шөнийн batch эхэллээ...');

  // 30 хоногоос хуучин log устгах
  const [result] = await pool.query(`
    DELETE FROM activity_logs
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    LIMIT 10000
  `);

  console.log(`${result.affectedRows} мөр устгав`);
});
```

> **LIMIT нэмэх нь чухал** — хэт олон мөрийг нэг удаад устгавал DB-г удаан хугацаагаар түгжинэ.

### 5.2 Event-driven Batch — Хуримтлагдахад ажиллах

Тодорхой тооны үйлдэл хуримтлагдахад batch ажиллуулна.

```javascript
class BatchProcessor {
  constructor(pool, batchSize = 500, flushInterval = 5000) {
    this.pool = pool;
    this.batchSize = batchSize;
    this.queue = [];

    // 5 секунд тутам хуримтлагдсаныг flush хийнэ
    setInterval(() => this.flush(), flushInterval);
  }

  add(item) {
    this.queue.push(item);
    if (this.queue.length >= this.batchSize) {
      this.flush(); // Дүүрвэл шууд flush
    }
  }

  async flush() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);
    const values = batch.map(item => [item.userId, item.action, item.createdAt]);

    await this.pool.query(
      'INSERT INTO activity_logs (user_id, action, created_at) VALUES ?',
      [values]
    );

    console.log(`${batch.length} log хадгаллаа`);
  }
}

// Ашиглах
const logger = new BatchProcessor(pool);

// Хэрэглэгч үйлдэл хийх бүрт нэмнэ (шууд DB руу явахгүй)
logger.add({ userId: 1, action: 'login', createdAt: new Date() });
logger.add({ userId: 2, action: 'view_task', createdAt: new Date() });
```

### 5.3 Cursor-based Batch — Том өгөгдлийг аажмаар боловсруулах

Санах ойд багтахгүй том өгөгдлийг хуваан боловсруулна.

```javascript
async function processBigTable(pool) {
  let lastId = 0;
  const chunkSize = 1000;

  while (true) {
    const [rows] = await pool.query(
      'SELECT * FROM tasks WHERE id > ? ORDER BY id LIMIT ?',
      [lastId, chunkSize]
    );

    if (rows.length === 0) break; // Дуусвал гарна

    // Боловсруулах
    for (const row of rows) {
      // ... логик
    }

    lastId = rows[rows.length - 1].id;
    console.log(`${lastId} хүртэл боловсруулав`);
  }
}
```

`OFFSET` ашиглахгүй байгааг анхаар — том хүснэгтэд `OFFSET` улам удаашрах тул **cursor (lastId)** ашиглах нь зөв.

---

## 6. Алдаа Зохицуулалт

Batch боловсруулалтад нэг алдаа бүх batch-г зогсоож болно. Энэ нь асуудалтай.

```javascript
async function batchInsertSafe(pool, rows, chunkSize = 1000) {
  const results = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    try {
      const values = chunk.map(r => [r.userId, r.message]);
      await pool.query(
        'INSERT INTO notifications (user_id, message) VALUES ?',
        [values]
      );
      results.success += chunk.length;

    } catch (err) {
      results.failed += chunk.length;
      results.errors.push({ chunk: i / chunkSize, error: err.message });

      // Алдаатай chunk-г нэг нэгээр дахин оролдох
      for (const row of chunk) {
        try {
          await pool.query(
            'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
            [row.userId, row.message]
          );
          results.success++;
          results.failed--;
        } catch (e) {
          // Энэ мөр үнэхээр алдаатай — лог бичиж үргэлжлүүлнэ
        }
      }
    }
  }

  return results;
}
```

---

## 7. Task Manager дахь Batch Processing

```javascript
// 1. Workspace-ийн бүх гишүүнд мэдэгдэл илгээх
async function notifyWorkspaceMembers(workspaceId, message) {
  const [members] = await pool.query(
    'SELECT user_id FROM members WHERE workspace_id = ?',
    [workspaceId]
  );

  const notifications = members.map(m => [m.user_id, workspaceId, message, new Date()]);

  // Batch INSERT — нэг удаа DB хүрнэ
  await pool.query(
    'INSERT INTO notifications (user_id, workspace_id, message, created_at) VALUES ?',
    [notifications]
  );
}

// 2. Хуучин мэдэгдлийг цагаар цэвэрлэх
cron.schedule('0 3 * * *', async () => {
  let deleted = 0;

  // Chunk-ээр устгах — DB-г хэт удаан түгжихгүй
  while (true) {
    const [result] = await pool.query(`
      DELETE FROM notifications
      WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
      LIMIT 5000
    `);

    deleted += result.affectedRows;
    if (result.affectedRows < 5000) break;

    await new Promise(r => setTimeout(r, 100)); // 100мс амрах
  }

  console.log(`Нийт ${deleted} хуучин мэдэгдэл устгав`);
});
```

---

## Товч дүгнэлт

Batch processing бол **ачааллыг хуваарилах, хурдыг нэмэгдүүлэх** үндсэн арга юм. Санах ойд байлгах зүйл:

- **Нэг нэгээр биш, бөөнөөр** — DB хүрэх тоог эрс багасгана
- **Chunk хэмжээ** — хэт том chunk санах ойд ачааллана (500–2000 оновчтой)
- **LIMIT нэмэх** — DELETE/UPDATE-д заавал LIMIT тавих
- **Cursor ашиглах** — OFFSET биш lastId-р явах
- **Алдаа тусгаарлах** — нэг chunk алдаатай бол бусдыг зогсоохгүй

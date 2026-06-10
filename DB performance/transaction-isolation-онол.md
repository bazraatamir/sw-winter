# Transaction Isolation — Дэлгэрэнгүй Онолын Гарын Авлага

---

## 1. Асуудал: Зэрэгцээ transaction-ууд бие биенд нөлөөлөх

Өгөгдлийн санд нэгэн зэрэг олон хэрэглэгч ажиллахад transaction-ууд бие биений өгөгдөлд нөлөөлж болно. Энэ нь гурван төрлийн асуудал үүсгэдэг.

### Dirty Read

Transaction A өгөгдлийг өөрчилсөн боловч **commit хийгээгүй** байхад Transaction B тухайн өгөгдлийг уншина. Дараа нь A rollback хийвэл B хэзээ ч байгаагүй өгөгдлийг уншсан байна.

```
Transaction A:                    Transaction B:
UPDATE tasks SET status='done'
  WHERE id=1;
                                  SELECT status FROM tasks
                                  WHERE id=1;
                                  → 'done' харна  ← dirty!
ROLLBACK;  ← буцаана
                                  B 'done' гэж уншсан боловч
                                  өгөгдөл хэзээ ч 'done' болоогүй
```

### Non-repeatable Read

Transaction B нэг query-г **хоёр удаа** ажиллуулахад өөр үр дүн гарна. Учир нь A transaction дундаас commit хийсэн.

```
Transaction B:                    Transaction A:
SELECT amount FROM accounts
WHERE id=1;  → 1000
                                  UPDATE accounts SET amount=500
                                  WHERE id=1;
                                  COMMIT;
SELECT amount FROM accounts
WHERE id=1;  → 500  ← өөрчлөгдсөн!
```

### Phantom Read

Transaction B нэг мужийн query-г **хоёр удаа** ажиллуулахад шинэ мөр гарч ирнэ. Учир нь A transaction шинэ мөр INSERT хийсэн.

```
Transaction B:                    Transaction A:
SELECT * FROM tasks
WHERE status='pending';
→ 3 мөр харна

                                  INSERT INTO tasks (status)
                                  VALUES ('pending');
                                  COMMIT;

SELECT * FROM tasks
WHERE status='pending';
→ 4 мөр харна  ← шинэ мөр!
```

---

## 2. Isolation Level гэж юу вэ?

Isolation level бол дээрх асуудлуудаас **хэр хэмжээнд хамгаалах вэ** гэдгийг тодорхойлдог тохиргоо юм. SQL стандартад 4 түвшин байдаг.

```
Хамгаалалт багатай ←──────────────────────────→ Хамгаалалт их
  (хурдан)                                           (удаан)

READ         READ           REPEATABLE        SERIALIZABLE
UNCOMMITTED  COMMITTED      READ
```

Хамгаалалт ихсэх тусам **lock** их ашиглагддаг тул хурд буурна. Тиймээс зөв түвшин сонгох нь чухал.

---

## 3. READ UNCOMMITTED

Хамгийн бага хамгаалалттай түвшин. Commit хийгдээгүй өгөгдлийг уншиж болно.

```sql
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
```

```
Dirty Read:         ✅ гарч болно
Non-repeatable:     ✅ гарч болно
Phantom Read:       ✅ гарч болно
```

Бодит амьдралд ашиглах нь маш ховор. Зөвхөн яг таг тохирсон тохиолдолд (жишээ нь бодит цагийн ойролцоо тоолуур) ашиглаж болно.

---

## 4. READ COMMITTED

Зөвхөн **commit хийгдсэн өгөгдлийг** уншина. Dirty read байхгүй болно.

```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

```
Dirty Read:         ❌ хамгаалагдсан
Non-repeatable:     ✅ гарч болно
Phantom Read:       ✅ гарч болно
```

PostgreSQL-ийн **өгөгдмөл** түвшин. Ихэнх тохиолдолд хангалттай.

### Жишээ

```
Transaction B:                    Transaction A:
SELECT amount FROM accounts
WHERE id=1;  → 1000

                                  UPDATE accounts SET amount=500
                                  WHERE id=1;
                                  -- Commit хийгээгүй

SELECT amount FROM accounts
WHERE id=1;  → 1000  ✓ (A commit хийгээгүй тул хуучин утга харагдана)

                                  COMMIT;

SELECT amount FROM accounts
WHERE id=1;  → 500  (A commit хийснийхээ дараа шинэ утга харагдана)
```

---

## 5. REPEATABLE READ

Нэг transaction дотор нэг мөрийг **хэдэн удаа уншсан ч ижил утга** гарна. MySQL-ийн **өгөгдмөл** түвшин.

```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

```
Dirty Read:         ❌ хамгаалагдсан
Non-repeatable:     ❌ хамгаалагдсан
Phantom Read:       ⚠️ стандартаар гарч болно (MySQL-д InnoDB хамгаалдаг)
```

### Хэрхэн ажилладаг вэ? — MVCC

MySQL-ийн InnoDB энэ түвшнийг **MVCC (Multi-Version Concurrency Control)** буюу олон хувилбарын удирдлагаар хэрэгжүүлдэг.

Transaction эхлэхэд MySQL тухайн мөчийн өгөгдлийн **"агшин зураг" (snapshot)** авдаг. Тухайн transaction дуусах хүртэл энэ snapshot-ийн өгөгдлийг хардаг — бусад transaction ямар өөрчлөлт хийсэн ч хамаагүй.

```
Transaction B эхэлнэ → Snapshot: {task id=1, status='pending'}

                          Transaction A:
                          UPDATE tasks SET status='done' WHERE id=1;
                          COMMIT;

Transaction B уншина → Snapshot-аасаа: {status='pending'}  ✓
                       (A commit хийсэн ч B-ийн snapshot өөрчлөгдөөгүй)
```

### Жишээ

```
Transaction B:                    Transaction A:
BEGIN;
SELECT amount FROM accounts
WHERE id=1;  → 1000

                                  UPDATE accounts SET amount=500
                                  WHERE id=1;
                                  COMMIT;

SELECT amount FROM accounts
WHERE id=1;  → 1000  ✓ (snapshot-аас уншсан тул өөрчлөгдөөгүй)

COMMIT;
```

---

## 6. SERIALIZABLE

Хамгийн өндөр хамгаалалттай түвшин. Transaction-ууд **дарааллан** гүйцэтгэгдэж байгаа мэт ажилладаг.

```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

```
Dirty Read:         ❌ хамгаалагдсан
Non-repeatable:     ❌ хамгаалагдсан
Phantom Read:       ❌ хамгаалагдсан
```

### Хэрхэн ажилладаг вэ?

MySQL уншилтын query-д ч **lock** тавьдаг. Нэг transaction уншиж байхад өөр transaction тухайн мужид INSERT/UPDATE хийж чадахгүй — хүлээнэ.

```
Transaction B:
SELECT * FROM accounts WHERE amount > 500;
→ Range lock тавина

Transaction A:
INSERT INTO accounts (amount) VALUES (600);
→ Lock-г хүлээнэ... B дуустал хүлээнэ
```

**Давуу тал:** Бүх асуудлаас хамгаалагдана.
**Сул тал:** Lock ихтэй тул **deadlock** гарч болно, хурд мэдэгдэхүйц удаашрана.

**Хэрэглээ:** Банкны гүйлгээ, тасалбар захиалга — алдаа огт тэвчишгүй системд.

---

## 7. Дөрвөн Түвшний Харьцуулалт

| | Dirty Read | Non-repeatable | Phantom Read | Хурд |
|---|---|---|---|---|
| READ UNCOMMITTED | ✅ гарна | ✅ гарна | ✅ гарна | ⚡⚡⚡⚡ |
| READ COMMITTED | ❌ | ✅ гарна | ✅ гарна | ⚡⚡⚡ |
| REPEATABLE READ | ❌ | ❌ | ⚠️ | ⚡⚡ |
| SERIALIZABLE | ❌ | ❌ | ❌ | ⚡ |

---

## 8. Deadlock — Түгжрэл

Isolation level нэмэгдэх тусам lock ихсэх тул **deadlock** гарах эрсдэл нэмэгдэнэ.

Deadlock гэдэг нь хоёр transaction бие биенийхээ lock-г хүлээж **хоёулаа зогсох** байдал юм.

```
Transaction A:                    Transaction B:
Lock авна: tasks мөр id=1
                                  Lock авна: tasks мөр id=2

UPDATE tasks SET ... WHERE id=2;  -- B-ийн lock хүлээнэ
                                  UPDATE tasks SET ... WHERE id=1;
                                  -- A-ийн lock хүлээнэ

⏳ A, B хоёулаа хүлээж байна → Deadlock!
```

MySQL deadlock-г автоматаар илрүүлж, нэг transaction-г **rollback** хийдэг.

### Deadlock-оос зайлсхийх

**Нэг дарааллаар lock авах:** Бүх transaction-д нэг дарааллаар мөрүүдийг update хийх.

```javascript
// ❌ A: id=1 дараа id=2 | B: id=2 дараа id=1 → deadlock
// ✅ Аль ч transaction id-г эрэмбэлж update хийнэ
const ids = [2, 1].sort((a, b) => a - b); // [1, 2]
for (const id of ids) {
  await conn.query('UPDATE tasks SET status=? WHERE id=?', ['done', id]);
}
```

**Transaction-г богино байлгах:** Lock-г аль болох богино хугацаанд барих.

---

## 9. Node.js дахь Isolation Level

```javascript
const pool = require('../config/database');

// Тухайн transaction-д isolation level тавих
async function transferBalance(fromId, toId, amount) {
  const conn = await pool.getConnection();
  try {
    // SERIALIZABLE — мөнгөний гүйлгээнд заавал
    await conn.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    await conn.beginTransaction();

    const [[from]] = await conn.query(
      'SELECT balance FROM accounts WHERE id = ? FOR UPDATE',
      [fromId]
    );

    if (from.balance < amount) throw new Error('Үлдэгдэл хүрэлцэхгүй');

    await conn.query(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [amount, fromId]
    );
    await conn.query(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [amount, toId]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
```

### FOR UPDATE — Тусгай lock

```sql
-- Уншихдаа lock тавих (бусад transaction өөрчилж чадахгүй)
SELECT * FROM tasks WHERE id = 1 FOR UPDATE;

-- Зөвхөн уншилтын lock (бусад уншиж болно, өөрчилж болохгүй)
SELECT * FROM tasks WHERE id = 1 LOCK IN SHARE MODE;
```

---

## 10. Хэзээ Ямар Түвшин Ашиглах вэ?

**READ COMMITTED:**
- Ерөнхий CRUD үйлдлүүд
- Хэрэглэгч мэдээлэл харах, жагсаалт авах
- Non-repeatable read тэвчигдэх тохиолдол

**REPEATABLE READ (MySQL өгөгдмөл):**
- Тайлан гаргах — нэг transaction дотор тогтвортой өгөгдөл шаардлагатай
- Олон query-тэй нарийн тооцоо

**SERIALIZABLE:**
- Банкны гүйлгээ, төлбөр
- Тасалбар/захиалга — давхцал огт тэвчишгүй
- Inventory шинэчлэлт

### Task Manager дахь зөвлөмж

```javascript
// Ердийн task уншилт — өгөгдмөл REPEATABLE READ хангалттай
const tasks = await pool.query('SELECT * FROM tasks WHERE workspace_id = ?', [id]);

// Task status шинэчлэлт — READ COMMITTED хангалттай
await pool.query('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);

// Workspace-ийн member тоо шалган нэмэх — SERIALIZABLE
const conn = await pool.getConnection();
await conn.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
await conn.beginTransaction();
const [[{ count }]] = await conn.query(
  'SELECT COUNT(*) as count FROM members WHERE workspace_id = ?', [workspaceId]
);
if (count >= MAX_MEMBERS) throw new Error('Гишүүний хязгаарт хүрлээ');
await conn.query('INSERT INTO members (workspace_id, user_id) VALUES (?, ?)', [...]);
await conn.commit();
```

---

## Товч дүгнэлт

Transaction isolation бол **зэрэгцээ transaction-уудыг хэрхэн тусгаарлах** тухай юм. Санах ойд байлгах зүйл:

- **MySQL өгөгдмөл** → REPEATABLE READ
- **3 асуудал** → Dirty Read, Non-repeatable Read, Phantom Read
- **MVCC** → Lock биш snapshot ашиглан REPEATABLE READ хэрэгжүүлдэг
- **Isolation ихсэх = Lock ихсэх = Хурд буурах**
- **Мөнгөний гүйлгээ** → SERIALIZABLE + FOR UPDATE
- **Deadlock** → Lock дарааллыг нэгдсэн байлга

# DTO — Data Transfer Object Гарын Авлага
### Express.js + mysql2 MVC Архитектурт Зориулсан

---

## 1. DTO гэж юу вэ?

DTO буюу Data Transfer Object нь нэг давхаргаас нөгөө давхарга руу өгөгдөл дамжуулах зориулалтын объект юм. Энэ нь өгөгдлийн сангийн Model-ийн бүх талбарыг биш, зөвхөн шаардлагатай талбаруудыг сонгон авч, тохиромжтой форматаар дамжуулах зорилготой.

---

## 2. Яагаад DTO хэрэгтэй вэ?

Өгөгдлийн сангийн хүснэгтэд хадгалагдах өгөгдөл болон клиент рүү буцаах өгөгдөл ихэвчлэн ялгаатай байдаг. Хэрэглэгчийн хүснэгтэд нууц үг, давс (salt), сэргээх токен зэрэг мэдрэмтгий талбарууд байдаг ч эдгээрийг клиент рүү буцааж болохгүй. Мөн өгөгдлийн санд `created_at` хэлбэрээр хадгалагдсан талбарыг клиент рүү `createdAt` хэлбэрээр буцаах хэрэгтэй байж болно. DTO нь яг энэ ялгааг зохицуулна.

---

## 3. Манай Жишээнд DTO Хэрхэн Ажиллаж Байна вэ?

`toUserDTO(row)` функц нь өгөгдлийн сангийн мөрөөс клиент рүү буцаах аюулгүй объект үүсгэнэ. Өгөгдлийн санд `password`, `deleted_at` зэрэг талбарууд байгаа ч `toUserDTO` нь зөвхөн `id`, `name`, `email`, `role`, `createdAt` талбаруудыг л буцаана. Ингэснээр нууц үг санамсаргүйгээр задрах эрсдэл арилна.

```js
// src/models/user.model.js

const toUserDTO = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  createdAt: row.created_at,
  // password, deleted_at — оруулахгүй
});

module.exports = { toUserDTO };
```

Өгөгдлийн сангийн мөр дараах бүтэцтэй байсан ч:

```json
{
  "id": 1,
  "name": "Bat",
  "email": "bat@mail.com",
  "password": "$2a$10$hashedpassword...",
  "role": "user",
  "created_at": "2025-01-01T10:00:00",
  "deleted_at": null
}
```

`toUserDTO()` нь дараах аюулгүй объектыг л буцаана:

```json
{
  "id": 1,
  "name": "Bat",
  "email": "bat@mail.com",
  "role": "user",
  "createdAt": "2025-01-01T10:00:00"
}
```

---

## 4. DTO-г Хаана Ашиглах вэ?

Service давхаргад Repository-аас өгөгдөл авсны дараа клиент рүү буцаахын өмнө `toUserDTO()` дуудна. Controller нь Service-аас аль хэдийн DTO болсон өгөгдлийг хүлээн авч тэр хэвээр нь JSON хариу болгон буцаана. Ингэснээр Controller нь аль талбар аюулгүй вэ гэдгийг мэдэх шаардлагагүй болно, учир нь Service давхарга аль хэдийн шүүж өгсөн байна.

```js
// src/services/auth.service.js

const { findByEmail, createUser } = require('../repositories/user.repository');
const { toUserDTO } = require('../models/user.model');

const register = async ({ name, email, password }) => {
  // ...
  const user = await createUser({ name, email, password: hashed });
  return toUserDTO(user); // ← энд DTO болгоно
};
```

```js
// src/controllers/auth.controller.js

const registerHandler = async (req, res, next) => {
  try {
    const user = await register(req.body);
    res.status(201).json(success(user)); // ← аль хэдийн DTO болсон
  } catch (err) {
    next(err);
  }
};
```

---

## 5. Хүсэлтийн DTO

Зөвхөн хариуны DTO биш, хүсэлтийн өгөгдлийг шүүхэд ч DTO ашиглана. Жишээлбэл бүртгүүлэх хүсэлтэд клиент `name`, `email`, `password` гурван талбар л илгээх ёстой. Хэрэв клиент нэмэлтээр `role: "admin"` гэж илгээсэн ч хүсэлтийн DTO зөвхөн зөвшөөрөгдсөн гурван талбарыг л авч, `role` талбарыг үл тоомсорлоно. Ингэснээр хэрэглэгч өөрөө өөртөө admin роль олгох зэрэг аюулгүй байдлын эмзэг байдлаас хамгаалагдана.

```js
// src/models/user.model.js

const toRegisterInput = (body) => ({
  name: body.name,
  email: body.email,
  password: body.password,
  // role: body.role  ← хэзээ ч авахгүй
});

module.exports = { toUserDTO, toRegisterInput };
```

```js
// src/controllers/auth.controller.js

const { toRegisterInput } = require('../models/user.model');

const registerHandler = async (req, res, next) => {
  try {
    const input = toRegisterInput(req.body); // ← зөвхөн зөвшөөрөгдсөн талбар
    const user = await register(input);
    res.status(201).json(success(user, 'Бүртгэл амжилттай'));
  } catch (err) {
    next(err);
  }
};
```

---

## 6. DTO Давхаргын Диаграм

```
Клиент (хүсэлт)
      ↓
  toRegisterInput()     ← Хүсэлтийн DTO: зөвшөөрөгдсөн талбар шүүнэ
      ↓
   Controller
      ↓
    Service
      ↓
  Repository → DB       ← Бүх талбар хадгалагдана (password г.м.)
      ↑
    Service
      ↓
   toUserDTO()          ← Хариуны DTO: мэдрэмтгий талбар хасна
      ↓
   Controller
      ↓
Клиент (хариу)
```

---

## 7. Нийтлэг Алдаанаас Зайлсхийх

Repository-аас ирсэн мөрийг шууд буцаах нь нууц үг зэрэг мэдрэмтгий талбарыг задруулдаг тул буруу хандлага юм. Service давхаргад заавал `toUserDTO()` дуудаж, зөвхөн аюулгүй талбаруудыг л буцаах хэрэгтэй.

Мөн Controller-д `req.body`-г бүтнээр нь Service-д дамжуулах нь хэрэглэгч зөвшөөрөгдөөгүй талбар (жишээ нь `role`) илгээх боломж олгодог тул аюулгүй байдлын эрсдэл үүсгэнэ. `toRegisterInput()` зэрэг хүсэлтийн DTO ашиглан зөвхөн шаардлагатай талбаруудыг л Service-д дамжуулах ёстой.

---

## 8. Товч Хүснэгт

| Асуулт | Хариу |
|---|---|
| DTO гэж юу вэ? | Давхаргуудын хооронд өгөгдөл дамжуулах объект |
| Яагаад хэрэгтэй вэ? | Мэдрэмтгий талбарыг нуух, форматыг стандартчилах |
| Хаана үүсгэх вэ? | Model давхаргад (`user.model.js`) |
| Хаана дуудах вэ? | Service давхаргад, Repository-аас өгөгдөл авсны дараа |
| Хүсэлтэд ч ашиглах уу? | Тийм — зөвшөөрөгдсөн талбаруудыг л хүлээн авахад |
| Хэн үүсгэх вэ? | Функц хэлбэрээр Model-д тодорхойлно |

# JavaScript Error Handling — Дэлгэрэнгүй Гарын Авлага

---

## 1. Алдаа гэж юу вэ?

JavaScript программ ажиллах явцад янз бүрийн шалтгаанаар алдаа гарч болно. Алдаа гарахад хөтөч (browser) эсвэл Node.js нь тухайн алдааг **Error объект** хэлбэрээр үүсгэж, программын гүйцэтгэлийг зогсооно. Хэрэв алдааг зөв боловсруулахгүй бол хэрэглэгч цонхон дээр ойлгомжгүй мессеж харах, програм бүрмөсөн зогсох зэрэг сөрөг үр дагавар гарна.

Алдаа хоёр төрөлд хуваагдана:

**Синхрон алдаа** — код шууд ажиллах үед гарна.
```javascript
console.log(x); // x тодорхойлогдоогүй тул ReferenceError гарна
```

**Асинхрон алдаа** — setTimeout, fetch, Promise зэрэг хойшлогдсон үйлдлүүдэд гарна.
```javascript
setTimeout(() => {
  console.log(y); // энд ч мөн ReferenceError гарна, гэхдээ хожуу
}, 1000);
```

---

## 2. try...catch блок — Үндсэн механизм

`try...catch` нь JavaScript-н алдаа боловсруулах гол хэрэгсэл юм. Бүтэц нь дараах байдалтай:

```javascript
try {
  // Алдаа гарч болзошгүй код энд байрлана
} catch (error) {
  // Алдаа гарвал энэ блок ажиллана
} finally {
  // Алдаа гарсан эсэхээс үл хамааран энэ блок ҮРГЭЛЖ ажиллана
}
```

`try` блок доторх код ажиллаж байх үед алдаа гарвал JavaScript нь шууд `catch` блок руу үсэрнэ. `try` блокийн үлдсэн кодыг огт ажиллуулахгүй. `finally` блок бол заавал биш боловч байгаа тохиолдолд үргэлж ажилладаг онцлогтой.

```javascript
try {
  console.log("1-р мөр ажиллана");
  let data = JSON.parse("{буруу}"); // энд алдаа гарна
  console.log("2-р мөр ажиллахгүй"); // үсрэгдэнэ
} catch (err) {
  console.log("Алдаа барив:", err.message);
} finally {
  console.log("Энэ мөр үргэлж ажиллана");
}
```

Гаралт:
```
1-р мөр ажиллана
Алдаа барив: Unexpected token б in JSON at position 1
Энэ мөр үргэлж ажиллана
```

---

## 3. Error объект — Алдааны мэдээлэл

`catch` блок нь `Error` объектыг хүлээн авдаг. Энэ объект дараах шинж чанаруудтай:

```javascript
try {
  null.toString(); // TypeError
} catch (err) {
  console.log(err.name);    // "TypeError"
  console.log(err.message); // "Cannot read properties of null"
  console.log(err.stack);   
  // "TypeError: Cannot read properties of null
  //  at <anonymous>:2:8
  //  at ..."
}
```

- **name** — алдааны нэр (ямар төрлийн алдаа болохыг харуулна)
- **message** — алдааны тайлбар текст
- **stack** — алдаа яаг хаана гарсан, ямар функцуудаар дамжсаныг харуулах "мөрийн түүх" (debugging-д маш хэрэгтэй)

---

## 4. Алдааны бүх төрлүүд

JavaScript-д суурилагдсан 7 төрлийн алдаа байдаг:

**TypeError** — Буруу төрлийн утга дээр үйлдэл хийхэд гарна.
```javascript
let num = 42;
num.toUpperCase(); // TypeError: num.toUpperCase is not a function
```

**ReferenceError** — Тодорхойлогдоогүй хувьсагч руу хандахад гарна.
```javascript
console.log(undeclaredVar); // ReferenceError: undeclaredVar is not defined
```

**SyntaxError** — Кодын бичиглэл буруу байхад гарна. Ихэнхдээ `eval()` эсвэл `JSON.parse()` дотор илэрдэг.
```javascript
JSON.parse("{ name: John }"); // SyntaxError: Unexpected token n
```

**RangeError** — Тоон утга зөвшөөрөгдсөн хүрээнээс гарахад гарна.
```javascript
new Array(-1);          // RangeError: Invalid array length
(1.23456).toFixed(200); // RangeError: toFixed() digits argument must be between 0 and 100
```

**URIError** — `decodeURI()` гэх мэт URI функцэд буруу утга дамжуулахад гарна.
```javascript
decodeURIComponent('%'); // URIError: URI malformed
```

**EvalError** — `eval()` функцтэй холбоотой алдаа (өнөөдөр ховор тохиолддог).

**Error** — Ерөнхий буюу суурь алдааны класс. Дээрх бүх төрлүүд энэ классаас удамшина.

---

## 5. throw — Гараар алдаа үүсгэх

`throw` нь өөрийн алдааг үүсгэж, программын гүйцэтгэлийг зогсоох зааврыг өгнө. `throw`-н дараа ямар ч утга байж болно — тоо, текст, объект — гэхдээ `Error` объект хэрэглэх нь хамгийн зөв дадал юм.

```javascript
function getUserAge(age) {
  if (typeof age !== "number") {
    throw new TypeError("Нас тоо байх ёстой");
  }
  if (age < 0 || age > 150) {
    throw new RangeError("Нас 0-150 хооронд байх ёстой");
  }
  return age;
}

try {
  getUserAge("хорин");
} catch (err) {
  console.log(err.name + ": " + err.message);
  // TypeError: Нас тоо байх ёстой
}

try {
  getUserAge(200);
} catch (err) {
  console.log(err.name + ": " + err.message);
  // RangeError: Нас 0-150 хооронд байх ёстой
}
```

---

## 6. Custom Error класс — Өөрийн алдааны төрөл үүсгэх

Том проектуудад суурилагдсан алдааны төрлүүд хангалтгүй болдог. Иймд `Error` классаас удамшуулан өөрийн алдааны төрөл үүсгэж болно.

```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

class ValidationError extends AppError {
  constructor(message, field) {
    super(message, 400);
    this.name = "ValidationError";
    this.field = field;
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} олдсонгүй`, 404);
    this.name = "NotFoundError";
    this.resource = resource;
  }
}
```

Ингэж үүсгэсэн алдааг `instanceof` ашиглан ялгаж болно:

```javascript
function handleRequest(type) {
  if (type === "validate") throw new ValidationError("Утга хоосон", "email");
  if (type === "notfound") throw new NotFoundError("Хэрэглэгч");
}

try {
  handleRequest("validate");
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(`Талбар [${err.field}]: ${err.message}`);
  } else if (err instanceof NotFoundError) {
    console.log(`404: ${err.message}`);
  } else {
    console.log("Тодорхойгүй алдаа:", err.message);
  }
}
```

---

## 7. Алдааг дахин шидэх — Re-throwing

Заримдаа `catch` блок нь тухайн алдааг боловсруулах чадваргүй байж болно. Тийм үед алдааг дахин `throw` хийж, дээд түвшний handler руу дамжуулах хэрэгтэй.

```javascript
function processData(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    if (err instanceof SyntaxError) {
      // Энэ алдааг бид боловсруулна
      console.log("JSON формат буруу байна");
      return null;
    } else {
      // Бусад алдааг дахин шидэнэ
      throw err;
    }
  }
}
```

---

## 8. Promise дахь алдаа

`Promise` ашиглах үед `.catch()` метод нь алдаа боловсруулна.

```javascript
function fetchUser(id) {
  return new Promise((resolve, reject) => {
    if (!id) {
      reject(new Error("ID заавал шаардлагатай"));
    } else {
      resolve({ id, name: "Болд" });
    }
  });
}

fetchUser(null)
  .then(user => console.log(user))
  .catch(err => console.log("Алдаа:", err.message))
  .finally(() => console.log("Дуусгав"));
```

Promise chain дотор нэг `.catch()` нь өмнөх бүх `.then()`-н алдааг барьж чадна:

```javascript
fetch("/api/users")
  .then(res => {
    if (!res.ok) throw new Error("Сервер хариу өгсөнгүй");
    return res.json();
  })
  .then(data => {
    if (!data.length) throw new Error("Өгөгдөл хоосон байна");
    return data;
  })
  .catch(err => {
    // Дээрх аль ч then-н алдааг энд баринa
    console.error("Алдаа:", err.message);
  });
```

---

## 9. async/await дахь алдаа

`async/await` нь асинхрон кодыг синхрон мэт уншигдахуйц болгодог. Алдаа боловсруулахад `try...catch` ашиглана.

```javascript
async function loadUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);

    if (!response.ok) {
      throw new Error(`HTTP алдаа: ${response.status}`);
    }

    const user = await response.json();
    return user;

  } catch (err) {
    if (err instanceof TypeError) {
      console.error("Сүлжээний алдаа — интернет холболтоо шалгана уу");
    } else {
      console.error("Алдаа:", err.message);
    }
    return null;
  }
}
```

Олон async дуудлага хийх үед:

```javascript
async function getDashboardData() {
  try {
    const [users, posts, stats] = await Promise.all([
      fetch("/api/users").then(r => r.json()),
      fetch("/api/posts").then(r => r.json()),
      fetch("/api/stats").then(r => r.json()),
    ]);

    return { users, posts, stats };

  } catch (err) {
    console.error("Dashboard өгөгдөл татахад алдаа гарлаа:", err.message);
    return null;
  }
}
```

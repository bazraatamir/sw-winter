# Task Manager — Шаардлага & Даалгаврын Жагсаалт

---

## 👥 Үүргүүд (Roles)

| Үүрэг | Тайлбар |
|-------|---------|
| **Супер Админ** | Системийн бүрэн эрхтэй хэрэглэгч |
| **Админ** | Тодорхой workspace-ийн менежер |
| **Ажилтан** | Даалгавар гүйцэтгэгч |

---

## 🗂️ БЛОК 1: Төслийн суурь бүтэц

### TASK-001 — Төслийн фолдер бүтэц тогтоох
- `/frontend`, `/backend`, `/database` хавтас үүсгэх
- Технологи сонгох: React + Node.js/Express + PostgreSQL (эсвэл Firebase)

### TASK-002 — Өгөгдлийн сангийн схем зохиох
- `users` хүснэгт: id, name, email, password, role
  - role утгууд: `super_admin` | `admin` | `employee`
- `workspaces` хүснэгт: id, name, description, created_by, created_at
- `workspace_members` хүснэгт: id, workspace_id, user_id, role
- `tasks` хүснэгт: id, workspace_id, title, description, assigned_to, status, created_by, created_at, due_date

### TASK-003 — Аутентикацийн систем
- JWT токен суурилсан нэвтрэх систем
- Нууц үг хаш (bcrypt)
- Токен refresh механизм

---

## 👤 БЛОК 2: Хэрэглэгчийн үүрэг (Role) систем

### TASK-004 — Role-based access control (RBAC) middleware
- `super_admin` — бүх хандалт
- `admin` — зөвхөн өөрийн workspace-ийн хандалт
- `employee` — зөвхөн өөрт хамаарал бүхий workspace-ийн хандалт

### TASK-005 — Үүрэг шалгах guard/middleware функц
- Route тус бүрт үүрэг шалгах
- Зөвшөөрөлгүй хандалтад 403 алдаа буцаах

---

## 🏢 БЛОК 3: Ажилын талбар (Workspace) — Супер Админ

### TASK-006 — Workspace үүсгэх
- `POST /api/workspaces`
- Нэр, тайлбар оруулах форм
- Зөвхөн `super_admin` хийж чадна

### TASK-007 — Workspace засах
- `PUT /api/workspaces/:id`
- Нэр, тайлбар өөрчлөх

### TASK-008 — Workspace устгах
- `DELETE /api/workspaces/:id`
- Устгахаас өмнө баталгаажуулалт (confirm dialog)
- Холбоотой tasks, members-ийг каскад устгах

### TASK-009 — Workspace-д Admin томилох
- `POST /api/workspaces/:id/assign-admin`
- Хэрэглэгч жагсаалтаас admin сонгох
- `workspace_members`-д `role = 'admin'` хадгалах

### TASK-010 — Workspace-д ажилтан нэмэх
- `POST /api/workspaces/:id/members`
- Хэрэглэгч хайх, нэмэх
- `workspace_members`-д `role = 'employee'` хадгалах

---

## 📋 БЛОК 4: Даалгавар (Task) — Админ

### TASK-011 — Workspace-д даалгавар үүсгэх
- `POST /api/workspaces/:id/tasks`
- Гарчиг, тайлбар, эцсийн хугацаа оруулах
- Зөвхөн тухайн workspace-ийн admin хийж чадна

### TASK-012 — Даалгаварыг ажилтанд хуваарилах
- `PUT /api/tasks/:id/assign`
- Workspace-ийн ажилтнуудын жагсаалтаас сонгох
- `tasks.assigned_to` талбар шинэчлэх

### TASK-013 — Даалгавар засах, устгах
- `PUT /api/tasks/:id` — гарчиг, тайлбар, хугацаа өөрчлөх
- `DELETE /api/tasks/:id` — даалгавар устгах

---

## ✅ БЛОК 5: Даалгавар гүйцэтгэх — Ажилтан

### TASK-014 — Даалгаврын статус өөрчлөх
- `PUT /api/tasks/:id/status`
- Статусын дараалал: `todo` → `in_progress` → `done`
- Зөвхөн өөрт хуваарилагдсан даалгаврын статусыг өөрчилж чадна

---

## 🔍 БЛОК 6: Харагдах байдал (Visibility) — Шүүлтүүр

### TASK-015 — Super Admin: бүх workspace харах
- `GET /api/workspaces` — бүх workspace буцаана

### TASK-016 — Admin: зөвхөн өөрийн workspace харах
- `GET /api/workspaces` — `workspace_members`-ээр шүүж, өөрт хамаарах workspace-ийг л буцаана

### TASK-017 — Employee: зөвхөн өөрийн workspace харах
- `GET /api/workspaces` — мөн адил шүүлтүүр
- `GET /api/tasks` — зөвхөн өөрт хуваарилагдсан даалгаврыг харуулна

---

## 🖥️ БЛОК 7: Frontend хэсэг

### TASK-018 — Нэвтрэх хуудас (Login page)
- Email, нууц үг оруулах
- Нэвтэрсний дараа үүргийн дагуу redirect хийх

### TASK-019 — Dashboard хуудас
- Үүрэг тус бүрд өөр dashboard харуулах
  - **Super Admin:** бүх workspace + статистик
  - **Admin:** өөрийн workspace + task жагсаалт
  - **Employee:** өөрт хуваарилагдсан task жагсаалт

### TASK-020 — Workspace удирдах UI (Super Admin)
- Workspace жагсаалт, үүсгэх/засах/устгах товчнууд
- Гишүүн нэмэх, admin томилох modal

### TASK-021 — Task удирдах UI (Admin)
- Kanban эсвэл жагсаалт хэлбэрийн task board
- Task үүсгэх, хуваарилах форм

### TASK-022 — Task гүйцэтгэх UI (Employee)
- Өөрт хуваарилагдсан task-уудын жагсаалт
- Статус өөрчлөх товч (`todo` / `in_progress` / `done`)

---

## 🧪 БЛОК 8: Тест & Дуусгавар

### TASK-023 — API endpoint-уудын тест бичих
- Үүрэг тус бүрийн хандалт зөв эсэхийг шалгах
- Edge case-уудыг тест хийх

### TASK-024 — UI/UX сайжруулалт
- Responsive дизайн
- Алдааны мэдэгдэл, loading state

### TASK-025 — Deploy хийх
- Backend: Railway / Render
- Frontend: Vercel / Netlify
- Database: Supabase / PlanetScale

---

## 📊 Хураангуй

| Блок | Даалгаврын тоо | Хариуцагч |
|------|---------------|-----------|
| Суурь бүтэц | 3 | Dev |
| Үүрэг систем | 2 | Dev |
| Workspace (Super Admin) | 5 | Dev |
| Task (Admin) | 3 | Dev |
| Статус (Employee) | 1 | Dev |
| Visibility шүүлтүүр | 3 | Dev |
| Frontend | 5 | Dev |
| Тест & Deploy | 3 | Dev |
| **Нийт** | **25** | |

---

## 🚀 Санал болгох эхлэх дараалал

1. **TASK-001, 002, 003** — Суурь бүтэц, DB схем, Auth
2. **TASK-004, 005** — RBAC middleware
3. **TASK-006 → 010** — Workspace CRUD (Super Admin)
4. **TASK-011 → 013** — Task CRUD (Admin)
5. **TASK-014** — Статус өөрчлөх (Employee)
6. **TASK-015 → 017** — Visibility шүүлтүүр
7. **TASK-018 → 022** — Frontend
8. **TASK-023 → 025** — Тест & Deploy

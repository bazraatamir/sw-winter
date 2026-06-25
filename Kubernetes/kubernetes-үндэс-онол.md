# Kubernetes — Үндэс Онолын Гарын Авлага

---

## 1. Асуудал: Docker Compose Production-д Хангалтгүй

Docker Compose нь хөгжүүлэх орчинд маш тохиромжтой. Гэхдээ production орчинд дараах асуудлууд гардаг:

**Нэг сервер унавал бүх апп унана.** Docker Compose нэг хост дээр ажилладаг — тухайн хост унавал бүх контейнер зогсоно.

**Масштаблах хэцүү.** Container-ийн тоог нэмэхэд `--scale` команд ашиглаж болно, гэхдээ ачааллыг олон сервер хооронд хуваарилах боломжгүй.

**Унасан container автоматаар сэргэхгүй.** Container crash болоход `restart: always` гэж тохируулсан ч сервер өөрөө унавал юу ч хийж чадахгүй.

**Шинэчлэлт хийхэд downtime гардаг.** Шинэ хувилбарт шилжихэд бүх контейнер зогсоод, шинээр эхлүүлдэг тул хэрэглэгч тасалдалд өртдөг.

```
Docker Compose:              Kubernetes:
┌─────────────┐              ┌──────┐ ┌──────┐ ┌──────┐
│  Нэг хост   │              │Хост 1│ │Хост 2│ │Хост 3│
│ [Container] │     →        └──────┘ └──────┘ └──────┘
│ [Container] │              Олон хост, автомат удирдалт
└─────────────┘
```

---

## 2. Kubernetes гэж юу вэ?

Kubernetes (K8s гэж товчилдог — "ubernete" 8 үсэгтэй) бол Google-ийн 2014 онд нээлттэй болгосон **контейнер оркестрацийн систем** юм. Орчин үеийн production орчинд де-факто стандарт болсон.

Kubernetes бол **олон сервер дээр олон контейнерийг** автоматаар удирддаг систем. Ямар сервер дээр ямар контейнер ажиллуулах, хэдэн хуулбар байлгах, хэрэглэгч хэрхэн хандах, гэмтэл гарвал хэрхэн сэргэх — бүгдийг Kubernetes автоматаар удирддаг.

Зүйрлэл: Том зочид буудлын менежер гэж бодоорой. Олон ажилтан байна — хэн өмнөд байранд, хэн хойд байранд, хэн амарч байна гэдгийг менежер хянадаг. Нэг ажилтан өвчилвөл нөгөөг нь орлуулна. Зочин олон болвол нэмэлт ажилтан авна. Kubernetes яг энэ менежерийн үүрэг гүйцэтгэдэг — зөвхөн ажилтны оронд контейнер.

---

## 3. Kubernetes-ийн Архитектур

Kubernetes cluster нь хоёр төрлийн машинаас бүрдэнэ.

### Control Plane (Удирдлагын давхарга)

Бүх cluster-ийг удирддаг "тархи" юм. Ихэвчлэн тусдаа сервер дээр ажилладаг.

```
┌────────────────────────────────────────┐
│            Control Plane               │
│                                        │
│  API Server   etcd   Scheduler         │
│                       Controller       │
└────────────────────────────────────────┘
```

**API Server** — Kubernetes-ийн бүх хүсэлтийг хүлээн авдаг нэг цэг. `kubectl` команд болон бусад хэрэгслүүд энд хандана.

**etcd** — Cluster-ийн бүх тохиргоо, төлвийн мэдээллийг хадгалдаг distributed key-value сан. Cluster-ийн "ой санамж" гэж болно.

**Scheduler** — Шинэ Pod-г аль Node дээр ажиллуулахыг шийддэг. Node-ийн нөөц, дүрмүүдийг харгалзан шийдвэр гаргадаг.

**Controller Manager** — Cluster-ийн хүссэн төлвийг хадгалдаг. Жишээлбэл "3 Pod ажиллах ёстой" гэж тохируулсан бол нэг нь унасан даруйд шинийг үүсгэдэг.

### Worker Node (Ажлын машин)

Бодит контейнерүүд ажилладаг сервер. Cluster-т хэдэн ч Node байж болно.

```
┌─────────────────────────────────────┐
│            Worker Node              │
│                                     │
│  ┌─────┐  ┌─────┐  ┌─────┐         │
│  │ Pod │  │ Pod │  │ Pod │         │
│  └─────┘  └─────┘  └─────┘         │
│                                     │
│  kubelet          kube-proxy        │
└─────────────────────────────────────┘
```

**kubelet** — Control Plane-ийн зааврыг хэрэгжүүлдэг Node дахь агент. Pod үүсгэх, зогсоох, эрүүл мэндийг хянах үүрэгтэй.

**kube-proxy** — Node дээрх сүлжээний дүрмүүдийг удирддаг. Сервисүүдэд хандах хүсэлтийг зохих Pod руу чиглүүлдэг.

### Бүрэн зураг

```
┌──────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                    │
│                                                          │
│  ┌────────────────────┐                                  │
│  │   Control Plane    │                                  │
│  │ API Server         │                                  │
│  │ etcd               │                                  │
│  │ Scheduler          │                                  │
│  │ Controller Manager │                                  │
│  └────────────────────┘                                  │
│           │ зааварлана                                   │
│  ┌────────┴──────┬───────────────┐                       │
│  ↓               ↓               ↓                       │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│ │  Node 1  │ │  Node 2  │ │  Node 3  │                   │
│ │ [Pod][Pod│ │ [Pod][Pod│ │ [Pod]    │                   │
│ └──────────┘ └──────────┘ └──────────┘                   │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Kubernetes-ийн Үндсэн Объектууд

Kubernetes-д бүх зүйлийг YAML файлаар тодорхойлдог. Эдгээр YAML файлуудыг **manifest** гэнэ.

### 4.1 Pod — Хамгийн Жижиг Нэгж

Pod бол Kubernetes-д хамгийн жижиг, хамгийн бага нэгж юм. Нэг буюу хэд хэдэн тесгүй нягт холбоотой контейнерийг нэгтгэдэг.

Pod дотрох контейнерүүд:
- Нэг IP хаяг хуваалцдаг
- Нэг disk (volume) хуваалцаж болно
- Хоорондоо `localhost` ашиглан харилцдаг

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: task-service-pod
spec:
  containers:
  - name: task-service
    image: task-service:1.0
    ports:
    - containerPort: 3002
```

**Чухал:** Pod-г шууд үүсгэж ашиглахгүй — ихэвчлэн Deployment дамжуулан удирдана. Pod нь унасан дорхноо Deployment-аар дахин үүснэ.

### 4.2 Deployment — Pod-г Удирдах

Deployment нь "X ширхэг Pod энэ Image-аас ажиллаж байх ёстой" гэдгийг тодорхойлдог объект юм. Kubernetes тухайн тоог байнга хадгалдаг — нэг Pod унавал шинийг автоматаар үүсгэнэ.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
spec:
  replicas: 3                   # 3 Pod байх ёстой
  selector:
    matchLabels:
      app: task-service
  template:
    metadata:
      labels:
        app: task-service
    spec:
      containers:
      - name: task-service
        image: task-service:1.0
        ports:
        - containerPort: 3002
        env:
        - name: NODE_ENV
          value: production
        resources:
          requests:
            memory: "128Mi"     # дор хаяж 128MB RAM
            cpu: "250m"         # 0.25 CPU цөм
          limits:
            memory: "256Mi"     # хамгийн ихдээ 256MB
            cpu: "500m"         # хамгийн ихдээ 0.5 CPU цөм
```

**`replicas`** — хэдэн Pod ажиллах ёстойг тодорхойлно. Нэг Pod унавал Controller Manager шинийг автоматаар үүсгэнэ.

**`resources`** — Scheduler аль Node дээр Pod байрлуулахыг `requests`-аар шийддэг. `limits`-ийг давсан Pod-г Kubernetes зогсоодог.

### 4.3 Service — Pod руу Хандах Нэгдсэн Цэг

Pod-ийн IP хаяг байнга өөрчлөгдөж болно — Pod дахин үүсэх бүрт шинэ IP авна. Service нь Pod-уудын өмнө байж, **тогтвортой IP болон нэр** олгодог объект юм.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: task-service
spec:
  selector:
    app: task-service           # app=task-service label-тэй Pod-уудыг хамрана
  ports:
  - port: 3002                  # Service-ийн порт
    targetPort: 3002            # Pod-ийн порт
  type: ClusterIP               # Зөвхөн cluster дотроос хандах
```

Service нь `app: task-service` label-тэй Pod бүрт ачааллыг автоматаар хуваарилдаг (load balancing). Pod нэмэгдэх, хасагдахад Service автоматаар мэдэж шинэчлэгддэг.

**Service-ийн төрлүүд:**

`ClusterIP` — зөвхөн cluster дотроос хандаж болно (өгөгдмөл).

`NodePort` — Node бүрийн тодорхой port-оос гаднаас хандаж болно. Туршилтад тохиромжтой.

`LoadBalancer` — Үүлэн үйлчилгээний (AWS, GCP, Azure) load balancer-тай холбогддог. Production-д ашиглана.

### 4.4 Ingress — HTTP Хүсэлтийг Чиглүүлэх

Ingress нь HTTP/HTTPS хүсэлтийг **URL-д суурилан** зохих Service руу чиглүүлдэг объект юм. Нэг IP хаяг дээр олон сервис ажиллуулах боломж олгодог.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: task-manager-ingress
spec:
  rules:
  - host: api.taskmanager.com
    http:
      paths:
      - path: /api/tasks
        pathType: Prefix
        backend:
          service:
            name: task-service
            port:
              number: 3002
      - path: /api/workspaces
        pathType: Prefix
        backend:
          service:
            name: workspace-service
            port:
              number: 3003
```

### 4.5 ConfigMap — Тохиргоо Хадгалах

Image-д нэммэлтгүйгээр тохиргооны утгуудыг Pod-т дамжуулдаг объект юм.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: task-service-config
data:
  NODE_ENV:     production
  SERVICE_NAME: task-service
  PORT:         "3002"
```

```yaml
# Deployment дотор ашиглах
envFrom:
- configMapRef:
    name: task-service-config
```

### 4.6 Secret — Нууц Мэдээлэл Хадгалах

Нууц үг, API key, token зэрэг мэдрэмтгий мэдээллийг хадгалдаг. Base64 кодлогдсон байдлаар хадгалагддаг.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: task-service-secret
type: Opaque
data:
  # echo -n "rootpass" | base64
  DB_PASSWORD: cm9vdHBhc3M=
  JWT_SECRET:  c2VjcmV0a2V5
```

```yaml
# Deployment дотор ашиглах
env:
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: task-service-secret
      key:  DB_PASSWORD
```

### 4.7 PersistentVolume — Өгөгдөл Хадгалах

Pod устгагдсан ч өгөгдөл хадгалагдах хэрэгтэй үед (MySQL, Redis гэх мэт) PersistentVolume ашиглана.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc
spec:
  accessModes:
    - ReadWriteOnce         # нэг Node-оос бичих
  resources:
    requests:
      storage: 10Gi         # 10GB хүсэж байна
```

---

## 5. Label ба Selector — Объектуудыг Холбох

Kubernetes-д объектуудыг хооронд нь холбоход **label** ба **selector** ашигладаг.

**Label** нь объектод наасан tag юм:
```yaml
metadata:
  labels:
    app: task-service
    version: "1.0"
    env: production
```

**Selector** нь тодорхой label-тэй объектуудыг сонгодог:
```yaml
selector:
  matchLabels:
    app: task-service     # app=task-service label-тэй Pod-уудыг сонгоно
```

Deployment, Service, бусад объектуудыг Pod-тай холбоход яг энэ механизм ажилладаг.

---

## 6. Kubernetes vs Docker Compose

| | Docker Compose | Kubernetes |
|---|---|---|
| **Зорилго** | Хөгжүүлэх орчин | Production орчин |
| **Хост тоо** | Нэг хост | Олон хост (cluster) |
| **Автомат сэргэлт** | Хязгаарлагдмал | Бүрэн (self-healing) |
| **Масштаблах** | Нэг хост доторх | Олон хост хооронд |
| **Шинэчлэлт** | Downtime гардаг | Rolling update (downtime-гүй) |
| **Нарийн төвөгтэй** | Хялбар | Нарийн |
| **Суралцах хугацаа** | Богино | Урт |

---

## 7. Хэзээ Kubernetes Хэрэгтэй Вэ?

```
✅ Ашиглах нь зүйтэй:
- Олон сервис, олон хост шаардлагатай
- High availability (99.9%+ uptime) шаардлагатай
- Ачаалал тогтмол бус — автомат масштаблалт хэрэгтэй
- Том баг, олон хөгжүүлэгч

❌ Шаардлагагүй:
- Жижиг апп, нэг буюу хоёр сервис
- Хөгжүүлэх орчин → Docker Compose хангалттай
- Kubernetes-ийн нарийн төвөгтэй байдлыг удирдах боломж байхгүй
```

---

## 8. `kubectl` — Kubernetes Удирдах Хэрэгсэл

```bash
# ── Cluster мэдээлэл ────────────────────────────────────
kubectl cluster-info
kubectl get nodes                   # Node жагсаалт

# ── Pod ─────────────────────────────────────────────────
kubectl get pods                    # Pod жагсаалт
kubectl get pods -o wide            # Node мэдээллийг нэмж харуулна
kubectl describe pod <pod-нэр>      # Pod-ийн дэлгэрэнгүй мэдээлэл
kubectl logs <pod-нэр>              # Pod-ийн лог
kubectl logs -f <pod-нэр>           # Шууд урсгалаар
kubectl exec -it <pod-нэр> -- sh    # Pod-т нэвтрэх

# ── Deployment ──────────────────────────────────────────
kubectl get deployments
kubectl apply -f deployment.yaml    # YAML файлаас үүсгэх/шинэчлэх
kubectl delete -f deployment.yaml   # YAML файлаас устгах
kubectl scale deployment task-service --replicas=5  # Масштаблах

# ── Service ─────────────────────────────────────────────
kubectl get services
kubectl describe service task-service

# ── ConfigMap, Secret ───────────────────────────────────
kubectl get configmaps
kubectl get secrets

# ── Шинэчлэлт ───────────────────────────────────────────
# Rolling update — downtime-гүй шинэ image-д шилжих
kubectl set image deployment/task-service task-service=task-service:2.0

# Шинэчлэлтийн явцыг харах
kubectl rollout status deployment/task-service

# Буцаах (rollback)
kubectl rollout undo deployment/task-service

# ── Бүх объект ──────────────────────────────────────────
kubectl get all
```

---

## 9. Task Manager-ийн Kubernetes Manifest

```yaml
# task-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
  labels:
    app: task-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-service
  template:
    metadata:
      labels:
        app: task-service
    spec:
      containers:
      - name: task-service
        image: task-service:1.0
        ports:
        - containerPort: 3002
        envFrom:
        - configMapRef:
            name: task-service-config
        - secretRef:
            name: task-service-secret
        resources:
          requests:
            memory: "128Mi"
            cpu: "250m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:             # Pod амьд эсэхийг шалгана
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:            # Pod хүсэлт хүлээн авахад бэлэн эсэхийг шалгана
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: task-service
spec:
  selector:
    app: task-service
  ports:
  - port: 3002
    targetPort: 3002
  type: ClusterIP
```

```bash
# Ажиллуулах
kubectl apply -f task-service-deployment.yaml

# Шалгах
kubectl get pods -l app=task-service
kubectl get service task-service
```

---

## Товч Дүгнэлт

Kubernetes бол олон сервер дээр олон контейнерийг автоматаар удирддаг production-д зориулсан систем юм. Санах ойд байлгах зүйл:

- **Pod** → хамгийн жижиг нэгж, нэг буюу хэд хэдэн контейнер
- **Deployment** → Pod-г удирдана, хэдэн хуулбар байлгах тодорхойлно
- **Service** → Pod руу хандах тогтвортой цэг, load balancing
- **Ingress** → HTTP/HTTPS хүсэлтийг URL-ээр чиглүүлнэ
- **ConfigMap** → тохиргоо
- **Secret** → нууц мэдээлэл
- **Control Plane** → cluster-ийг удирдах тархи
- **Worker Node** → Pod ажилладаг сервер
- **Self-healing** → Pod унавал автоматаар сэргэнэ
- **Rolling update** → downtime-гүй шинэ хувилбарт шилжих

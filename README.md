# Sistema de Reservas de Hoteles — Starter

Proyecto base generado con artefactos iniciales: prisma schema, seed, libs y skeletons de API.

Instrucciones rápidas:

1. Copia `.env.example` a `.env` y edítalo.
2. `npm install`
3. `npx prisma generate`
4. `npx prisma migrate dev --name init`
5. `npm run seed`
6. `npm run dev`

# 🏨 Sistema de Reservas Hoteleras

Este proyecto implementa un **Sistema de Reservas Hoteleras** con autenticación JWT, gestión de roles, pagos simulados y registro de auditoría.  
Construido con **Next.js**, **Prisma ORM**, **MySQL** y **TypeScript**.

---

## 🚀 Tecnologías

- **Next.js 14** – Framework principal para la API y frontend.
- **Prisma ORM** – Mapeo objeto-relacional para MySQL.
- **MySQL** – Base de datos relacional.
- **JWT (jsonwebtoken)** – Autenticación y autorización por roles.
- **bcryptjs** – Cifrado de contraseñas.
- **Postman / curl** – Pruebas de endpoints.
- **TypeScript** – Tipado estático para mayor robustez.

---

## 📁 Estructura del proyecto

reservation-system/
├── lib/
│ ├── prisma.ts # Configuración Prisma Client
│ ├── auth.ts # Funciones para JWT
│ ├── middleware.ts # Middleware de autenticación y roles
│ ├── errorHandler.ts # Manejo global de errores
│ ├── logger.ts # Registro de auditoría
│
├── pages/
│ └── api/
│ ├── auth/
│ │ ├── register.ts
│ │ └── login.ts
│ ├── hotels/
│ │ └── index.ts
│ ├── reservations/
│ │ ├── index.ts
│ │ ├── confirm.ts
│ │ └── cancel.ts
│ ├── payments/
│ │ └── index.ts
│ └── logs/
│ └── index.ts
│
├── prisma/
│ ├── schema.prisma # Esquema de base de datos
│ └── seed.ts # Datos iniciales (usuarios, hoteles, etc.)
│
├── .env # Variables de entorno (DB, JWT)
├── package.json
└── README.md


---

## ⚙️ Configuración

### 1️⃣ Instalar dependencias
```bash
npm install

2️⃣ Configurar variables de entorno

Crea un archivo .env en la raíz del proyecto:

DATABASE_URL="mysql://user:password@localhost:3306/hotel_db"
JWT_SECRET="una-clave-secreta-larga-y-segura"

3️⃣ Ejecutar migraciones y datos iniciales

npx prisma migrate dev --name init
npx prisma db seed

4️⃣ Ejecutar el servidor en modo desarrollo

npm run dev
Servidor local: http://localhost:3000


🔑 Autenticación y Roles

| Rol          | Descripción                         | Permisos principales                |
| ------------ | ----------------------------------- | ----------------------------------- |
| `CLIENT`     | Usuario que realiza reservas        | Crear reservas, confirmar, cancelar |
| `ADMIN`      | Administrador de hoteles            | Crear hoteles, ver logs             |
| `SUPERADMIN` | Superusuario con todos los permisos | Control total del sistema           |

El token JWT se obtiene al hacer login y se envía en el header:
Authorization: Bearer <token>

🧩 Endpoints Principales
| Método | Endpoint             | Descripción                        |
| ------ | -------------------- | ---------------------------------- |
| POST   | `/api/auth/register` | Crear nuevo usuario                |
| POST   | `/api/auth/login`    | Iniciar sesión y obtener token JWT |

🏨 Hoteles
| Método | Endpoint      | Descripción              | Rol                |
| ------ | ------------- | ------------------------ | ------------------ |
| GET    | `/api/hotels` | Listar hoteles (público) | Público            |
| POST   | `/api/hotels` | Crear hotel              | ADMIN / SUPERADMIN |

🛏️ Reservas
| Método | Endpoint                    | Descripción               | Rol    |
| ------ | --------------------------- | ------------------------- | ------ |
| POST   | `/api/reservations`         | Crear reserva             | CLIENT |
| POST   | `/api/reservations/confirm` | Confirmar y pagar reserva | CLIENT |
| POST   | `/api/reservations/cancel`  | Cancelar reserva          | CLIENT |

💳 Pagos
| Método | Endpoint        | Descripción                  | Rol    |
| ------ | --------------- | ---------------------------- | ------ |
| POST   | `/api/payments` | Simular pago (crea registro) | CLIENT |

🧾 Logs / Auditoría
| Método | Endpoint    | Descripción              | Rol                |
| ------ | ----------- | ------------------------ | ------------------ |
| GET    | `/api/logs` | Ver acciones registradas | ADMIN / SUPERADMIN |

🧠 Validaciones y Seguridad

✅ Contraseñas cifradas con bcryptjs
✅ Tokens firmados con JWT
✅ Validación de fechas de reserva (startDate < endDate)
✅ Control de acceso por roles
✅ Manejo uniforme de errores ({ error, message })
✅ Auditoría automática con tabla Log

🧪 Pruebas con Postman

Importa la colección incluida:
👉 Hotel_Reservation_API.postman_collection.json

🧱 Modelo de Base de Datos

User → Clientes y administradores

Hotel → Información general de los hoteles

Room → Habitaciones y estado

Reservation → Reservas con fechas, usuario y estado

Payment → Pagos simulados

Log → Registro de acciones del sistema

📄 Licencia

Proyecto de ejemplo académico.
Libre para modificar y reutilizar con fines educativos.
Desarrollado por Diego 
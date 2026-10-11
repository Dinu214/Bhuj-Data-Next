# Bhuj-data Next.js Application

Next.js 14 App Router port of the Bhuj Data & Attendance Management system.

## 🌟 Highlights of this Migration

1. **Stateless `httpOnly` Cookie Auth (`hp_session`)**:
   - Eliminates `localStorage` token storage for XSS protection.
   - Eliminates cold-start spinner delays.
   - 7-day token lifespan.
   - Automatically sent with every request by the browser (no manual `Authorization: Bearer` headers needed).

2. **Clean Next.js 14 App Router**:
   - Replaced Express `server.cjs` (~1,300 lines) with modular Next.js route handlers under [`app/api/`](file:///app/api).
   - Global database pool caching in [`lib/db.ts`](file:///lib/db.ts) to avoid connection pool exhaustion on serverless / development hot reload.
   - Idempotent database migrations and index creation handled in [`lib/migrations.ts`](file:///lib/migrations.ts).

3. **PWA Enabled**:
   - Configured with `next-pwa` for offline caching and service worker lifecycle (`/sw.js`).

4. **Component Preservation**:
   - Preserved all UI views (`PeopleView`, `AttendanceView`, `Dashboard`, `OccasionsView`, `GroupsView`, `CategoriesView`, `UsersView`, etc.) with responsive Tailwind styling and client hydration.

---

## 🚀 Getting Started

### 1. Environment Variables

Create or verify `.env.local`:
```env
# Database Connection (Neon PostgreSQL)
POSTGRES_USER=neondb_owner
POSTGRES_HOST=ep-green-hill-a1e8hs4i.ap-southeast-1.aws.neon.tech
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DATABASE=Bhuj-data
POSTGRES_PORT=5432

# Or alternatively a single connection URL:
# DATABASE_URL=postgres://neondb_owner:password@ep-green-hill-...neon.tech/Bhuj-data?sslmode=require

# Admin credentials for auto-seeding
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password

# JWT secret
JWT_SECRET=bhuj-hp-secret-2024-change-in-production
```

### 2. Run Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

---

## 📁 Project Structure

```
Bhuj-data-next/
├── app/
│   ├── api/
│   │   ├── attendance/         # Attendance, sessions, bulk, dashboard & reports
│   │   ├── auth/               # Login, logout, me (cookie-based)
│   │   ├── categories/         # Categories CRUD
│   │   ├── groups/             # Groups CRUD
│   │   ├── init-data/          # Initial bootstrap & migrations trigger
│   │   ├── people/             # People CRUD & search
│   │   ├── upload/photo/       # Ephemeral photo stub
│   │   └── users/              # Users & RBAC management
│   ├── globals.css             # Tailwind base & custom components
│   ├── layout.tsx              # Root HTML & metadata
│   └── page.tsx                # Client-side SPA entry view
├── components/                 # All React UI components ('use client')
├── context/                    # DataContext & shared state
├── hooks/                      # useAuth, useDatabase hooks
├── lib/
│   ├── auth.ts                 # JWT sign/verify, cookies, RBAC middlewares
│   ├── db.ts                   # Cached PostgreSQL pool
│   ├── migrations.ts           # DB schema & index migrations
│   ├── rateLimit.ts            # Route handler rate limiting
│   └── sanitize.ts             # Input sanitation & validation
└── public/                     # Static icons, manifest.json, logo
```


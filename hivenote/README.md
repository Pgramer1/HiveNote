# 🐝 HiveNote

A full-stack academic resource-sharing platform built for university students. Upload, discover, and discuss PDFs, slides, and links — organized by university, department, batch, and subject.

---

## Tech Stack

| Layer           | Technology                               |
| --------------- | ---------------------------------------- |
| Framework       | Next.js 16 (App Router)                  |
| Language        | TypeScript                               |
| UI              | React 19, Tailwind CSS v4, Framer Motion |
| Database        | PostgreSQL (Neon)                        |
| ORM             | Prisma 7                                 |
| Auth            | NextAuth v4 — Google OAuth + credentials |
| File Storage    | Cloudinary                               |
| AI              | Vercel AI SDK, Google Gemini, Groq       |
| Email           | Brevo (transactional)                    |
| Package Manager | pnpm                                     |
| Deployment      | Vercel                                   |

---

## Features

### Resources

- Upload **PDF**, **PPT**, and **Link** resources
- Resources are scoped to university → department → batch → semester → subject
- View count tracking per resource
- Full-text extraction from PDFs for AI-powered chat

### AI Chat

- Chat with any uploaded PDF using `/api/chat`
- Powered by Vercel AI SDK with Google Gemini / Groq backends

### Authentication

- Google OAuth sign-in
- Email/password credentials
- University email detection (`isUniversityEmail` flag)
- Protected routes via NextAuth sessions

### Social & Community

- **Voting** — upvote/downvote resources with optimistic UI
- **Comments & Replies** — threaded comment system with likes
- **Favorites** — bookmark resources, view them at `/my-favorites`

### User Profiles

- Public profile pages at `/users/[id]`
- Fields: name, bio, university, department, batch
- Avatar support

### University Navigation

- Browse resources by university → department → batch → semester at `/university`
- Admin-managed departments, batches, and subjects

### Admin Panel (`/admin`)

- Manage subjects, departments, and batches
- Role-based access control (`ADMIN` vs `USER`)

### UX

- Dark mode with system preference detection and localStorage persistence
- Responsive design (mobile-first)
- Optimistic UI updates on votes
- Breadcrumb navigation
- Styled empty states with actionable CTAs

---

## Project Structure

```
src/
├── actions/        # Server Actions (resources, votes, comments, favorites, profile)
├── app/            # Next.js App Router pages and API routes
│   ├── admin/      # Admin dashboard (subjects, departments, batches)
│   ├── api/        # API routes (auth, chat, pdf, debug-session)
│   ├── auth/       # Sign-in / sign-up pages
│   ├── me/         # Current user profile
│   ├── my-favorites/
│   ├── my-uploads/
│   ├── resources/  # Resource listing, detail, and upload
│   ├── university/ # University-based browsing
│   └── users/      # Public user profiles
├── components/     # Reusable UI components (features/, layout/, ui/)
├── constants/
├── hooks/
├── lib/            # Core utilities (auth, prisma, cloudinary, email, permissions)
├── types/
└── utils/
prisma/
├── schema.prisma   # Database schema
├── seed.ts         # Database seeder
└── migrations/     # SQL migration history
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database (or a [Neon](https://neon.tech) project)

### 1. Clone and install

```bash
git clone <repo-url>
cd hivenote
pnpm install
```

### 2. Set up environment variables

Create a `.env` file in the project root. Required variables:

```env
# Database
DATABASE_URL=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# AI
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=

# Email (Brevo)
BREVO_API_KEY=
```

### 3. Set up the database

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

Optionally seed subjects:

```bash
node seed-subjects.js
```

### 4. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Command      | Description                               |
| ------------ | ----------------------------------------- |
| `pnpm dev`   | Start development server (Turbopack)      |
| `pnpm build` | Generate Prisma client + production build |
| `pnpm start` | Start production server                   |
| `pnpm lint`  | Run ESLint                                |

---

## Database Schema (Key Models)

- **User** — profile, university, department, batch, role
- **Resource** — title, type (PDF/PPT/LINK), fileUrl, university/department/batch/semester/subject scoping, extracted text
- **Subject** — name, code, semester, linked to department and batch
- **Vote** — upvote/downvote on resources
- **Comment / CommentLike** — threaded comments with likes
- **Favorite** — saved resources per user
- **DepartmentConfig / BatchConfig** — admin-managed university structure

---

## Deployment

The app is configured for Vercel deployment. See [markss/VERCEL_DEPLOYMENT.md](markss/VERCEL_DEPLOYMENT.md) for the full checklist.

Key points:

- Set all `.env` variables in Vercel project settings
- `pnpm-lock.yaml` is committed — Vercel auto-detects pnpm
- `prisma generate` runs automatically via the `postinstall` script

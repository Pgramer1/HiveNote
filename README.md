# 🐝 HiveNote

HiveNote is a full-stack web application designed for students to share and discover academic resources (PDFs, links, notes) in one centralized place — reducing last-minute stress caused by scattered resources.

---

## 🚀 Tech Stack

### Frontend & Backend

- **Next.js 16 (App Router)**
- **React 19**
- **TypeScript**

### Database & ORM

- **PostgreSQL**
- **Prisma ORM**

### Authentication

- **NextAuth (Auth.js)**
- Google OAuth
- Database-backed sessions

### File Storage

- **Cloudinary** (PDF uploads)

### Styling

- **Tailwind CSS**

---

## ✅ Features Implemented So Far

### 1. Resource Management

- Upload resources as:
  - 📄 PDF files
  - 🔗 External links
- View all uploaded resources
- View detailed page for each resource

### 2. Authentication & Authorization

- Google Sign-In using NextAuth
- Secure database-backed sessions
- Protected routes (only logged-in users can upload)
- Logout support

### 3. User-Specific Features

- “My Uploads” page showing resources uploaded by the logged-in user
- Resources are linked to real users in the database

### 4. Search & Filter (Server-Side)

- Search resources by title
- Filter by resource type (PDF / LINK)
- URL-based filtering (`/resources?query=...&type=...`)
- SEO-friendly and shareable search URLs

### 5. UX Improvements

- Preserved search & filter state
- Clear filters option
- Proper empty states
- Clean navigation bar with auth-aware UI

---

---

## 🛣️ Upcoming Features (Planned)

- Edit & delete uploaded resources
- Full-text search (PostgreSQL)
- Tags / subjects for resources
- College / semester-based access control
- Popularity-based sorting

---

## 🧠 Learning Outcomes

This project demonstrates:

- Real-world Next.js App Router usage
- Server Components & Server Actions
- Authentication with NextAuth
- Prisma relational data modeling
- Secure file uploads
- Clean full-stack architecture

---

<!-- ## 📌 Author -->
<!--
Built by a Computer Science student as a semester project and portfolio-grade full-stack application. -->

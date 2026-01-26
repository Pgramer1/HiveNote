This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🎨 Recent UI/UX Improvements

We've implemented a comprehensive set of 10 UI/UX enhancements to improve user experience, accessibility, and visual appeal:

### 1. **Display User Names Instead of Emails**

**What:** Changed all resource listings to show user display names instead of email addresses  
**Why:** Better privacy and more professional appearance  
**Implementation:** Updated all queries to select `user.name`, added fallback to "Anonymous" when name is null  
**Files:** `resources/page.tsx`, `resources/[id]/page.tsx`, `page.tsx` (home)

### 2. **Conditional Upload Form Fields**

**What:** Show only relevant input fields based on resource type selection  
**Why:** Reduces form complexity and user confusion  
**Implementation:**

- Converted upload page to client component with `useState` for resource type
- Conditional rendering: PDF type shows file input, LINK type shows URL input
- Added clear labels and improved styling for better UX  
  **Files:** `resources/upload/UploadForm.tsx`

### 3. **Vote Button Loading States**

**What:** Visual feedback during vote submission with optimistic UI updates  
**Why:** Instant user feedback improves perceived performance  
**Implementation:**

- Used `useOptimistic` hook for immediate UI updates before server response
- Added `useTransition` for loading states
- Calculate score changes client-side (toggle-off, new vote, change vote)
- Display "..." during pending state with opacity change  
  **Files:** `components/VoteButtons.tsx`, `resources/actions/vote.ts`

### 4. **Enhanced Home Page**

**What:** Complete redesign with hero section, stats, search, trending/recent resources  
**Why:** More engaging landing page that showcases platform value  
**Implementation:**

- Hero section with gradient background and CTAs
- Platform stats cards (total resources, total users) with gradient backgrounds
- Live search bar component with client-side routing
- Trending resources (sorted by vote score) and recent uploads
- Quick filter links by resource type (PDF/LINK)
- Responsive grid layouts (1 column mobile, 2 columns desktop)  
  **Files:** `page.tsx`, `components/HomeSearchBar.tsx`

### 5. **Dark Mode Toggle & Improved Spacing**

**What:** System-wide dark mode with theme toggle and better visual hierarchy  
**Why:** Reduces eye strain, modern UX standard, better section separation  
**Implementation:**

- Inline script in layout to apply theme before paint (prevents flash)
- `ThemeToggle` client component with localStorage persistence
- Added `suppressHydrationWarning` to handle SSR/client mismatch
- Tailwind v4 dark variant configuration: `@variant dark (&:is(.dark *))`
- Increased padding (p-6 → p-8), spacing (mb-6 → mb-10), card gaps (space-y-4 → space-y-6)
- Added section borders and separators  
  **Files:** `layout.tsx`, `globals.css`, `components/ThemeToggle.tsx`, all page files

### 6. **Better Empty States**

**What:** Styled empty state UI with icons, messages, and actionable CTAs  
**Why:** Guides users when no content is available instead of bare text  
**Implementation:**

- Centered layouts with background panels
- Large emoji icons (🔍, etc.)
- Clear headings and descriptions
- Action buttons (e.g., "Clear filters", "Upload your first resource")
- Dashed borders for visual distinction  
  **Files:** `resources/page.tsx`, `my-uploads/page.tsx`, `users/[id]/page.tsx`

### 7. **Improved Resource Card Design**

**What:** Enhanced cards with description preview and better layout  
**Why:** More information at a glance, better visual hierarchy  
**Implementation:**

- Flex layout with content on left, vote buttons on right
- Added description with `line-clamp-2` for preview
- Larger padding (p-4 → p-6), rounded corners (rounded → rounded-xl)
- Stronger borders (border → border-2)
- Improved hover states with shadow and border color changes  
  **Files:** `resources/page.tsx`, `users/[id]/page.tsx`, `my-uploads/page.tsx`

### 8. **Breadcrumbs Navigation**

**What:** Breadcrumb trails showing current location in site hierarchy  
**Why:** Improves navigation and helps users understand their location  
**Implementation:**

- Created reusable `Breadcrumbs` component accepting array of items
- Each item can be a link or plain text (current page)
- Shows Home (🐝) → Section → Current Page
- Added to resources, resource detail, upload, and user profile pages  
  **Files:** `components/Breadcrumbs.tsx`, updated all major pages

### 9. **Responsive Mobile Menu**

**What:** Hamburger menu for mobile devices, full navbar on desktop  
**Why:** Better mobile UX, prevents cramped navigation on small screens  
**Implementation:**

- Created `MobileMenu` client component with toggle state
- Hamburger icon (☰) transforms to close (✕) when open
- Slide-out menu with all navigation links
- Hidden on desktop (`md:hidden`), shown on mobile
- Positioned absolutely below navbar with proper z-index  
  **Files:** `components/MobileMenu.tsx`, `components/Navbar.tsx`

### 10. **Success/Error Toast Notifications**

**What:** Temporary notification popups for user actions  
**Why:** Immediate feedback for uploads, errors, and important events  
**Implementation:**

- Created `ToastProvider` with React Context
- Toast queue system with auto-dismiss (4 seconds)
- Three types: success (✅ green), error (❌ red), info (ℹ️ blue)
- Slide-in animation from right
- Manual close button
- Integrated with upload form (success/error handling)  
  **Files:** `components/ToastProvider.tsx`, `providers.tsx`, `resources/upload/UploadForm.tsx`, `resources/upload/actions.ts`

---

## 🏗️ Technical Stack & Architecture

**Framework:** Next.js 16 (App Router)  
**Styling:** Tailwind CSS v4 with PostCSS  
**Database:** Prisma ORM  
**Authentication:** NextAuth.js  
**File Storage:** Cloudinary  
**Key Patterns:**

- Server Components by default for performance
- Client Components only for interactivity (`"use client"`)
- Server Actions for mutations
- Optimistic UI updates with `useOptimistic`
- React Suspense and streaming
- TypeScript for type safety

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

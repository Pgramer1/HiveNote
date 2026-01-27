# HiveNote - Project Structure Guide

This document explains the improved project structure and organization patterns used in HiveNote.

## 📁 Directory Structure

```
hivenote/
├── src/
│   ├── actions/              # Centralized server actions
│   │   ├── index.ts          # Barrel export for all actions
│   │   ├── vote.ts           # Vote-related actions
│   │   ├── incrementView.ts  # View count actions
│   │   ├── resources.ts      # Resource CRUD actions
│   │   └── profile.ts        # User profile actions
│   │
│   ├── app/                  # Next.js App Router pages
│   │   ├── api/              # API routes
│   │   │   ├── auth/         # NextAuth endpoints
│   │   │   └── pdf/          # PDF proxy endpoint
│   │   ├── resources/        # Resources feature
│   │   ├── users/            # User profiles
│   │   ├── me/               # Current user profile
│   │   └── my-uploads/       # User's uploads
│   │
│   ├── components/           # React components (organized by type)
│   │   ├── index.ts          # Barrel export for components
│   │   ├── layout/           # Layout components (Navbar, Breadcrumbs, etc.)
│   │   ├── ui/               # Generic UI components (Theme, Toast, etc.)
│   │   └── features/         # Feature-specific components (VoteButtons, etc.)
│   │
│   ├── constants/            # App-wide constants and configuration
│   │   └── index.ts          # Routes, limits, settings
│   │
│   ├── hooks/                # Custom React hooks
│   │   └── index.ts          # useDebounce, useLocalStorage, etc.
│   │
│   ├── lib/                  # External library configurations
│   │   ├── auth.ts           # NextAuth configuration
│   │   ├── cloudinary.ts     # Cloudinary setup
│   │   └── prisma.ts         # Prisma client
│   │
│   ├── types/                # TypeScript type definitions
│   │   ├── index.ts          # Shared types
│   │   └── next-auth.d.ts    # NextAuth type extensions
│   │
│   └── utils/                # Utility functions
│       ├── common.ts         # Generic utilities (cn, truncate, etc.)
│       └── resources.ts      # Resource-specific utilities
│
├── prisma/                   # Database schema and migrations
└── public/                   # Static assets
```

## 📦 Key Folders Explained

### `/src/actions`

Centralized location for all Next.js Server Actions. This standardizes where data mutations happen and makes it easy to find and maintain server-side logic.

**Benefits:**

- Single source of truth for server actions
- Easy to audit and test
- Consistent patterns across features

**Example:**

```typescript
import { voteResource } from "@/actions/vote";
```

### `/src/components`

Components are organized into three categories:

#### `layout/`

Components that define page structure and navigation:

- `Navbar.tsx` - Main navigation
- `Breadcrumbs.tsx` - Breadcrumb navigation
- `MobileMenu.tsx` - Mobile navigation menu

#### `ui/`

Generic, reusable UI components:

- `ThemeToggle.tsx` - Dark/light mode toggle
- `ThemeProvider.tsx` - Theme context provider
- `ToastProvider.tsx` - Toast notification system

#### `features/`

Feature-specific components tied to business logic:

- `VoteButtons.tsx` - Resource voting interface
- `ResourcePreview.tsx` - Resource preview/display
- `HomeSearchBar.tsx` - Homepage search

**Import Pattern:**

```typescript
// Direct imports
import VoteButtons from "@/components/features/VoteButtons";

// Or use barrel exports
import { VoteButtons, Navbar } from "@/components";
```

### `/src/types`

Centralized TypeScript type definitions to ensure type safety across the app.

**Example:**

```typescript
import type { ResourceWithScore, VoteValue } from "@/types";
```

### `/src/utils`

Pure utility functions that don't depend on React or Next.js specifics.

**Categories:**

- `common.ts` - Generic helpers (cn, truncate, capitalize)
- `resources.ts` - Resource-specific logic (scoring, sorting)

### `/src/hooks`

Custom React hooks for reusable stateful logic.

**Available hooks:**

- `useDebounce` - Debounce rapid value changes
- `useLocalStorage` - Persist state to localStorage
- `useMediaQuery` - Responsive design utilities
- `useIsMounted` - Track component mount state

### `/src/constants`

Application-wide constants, configuration values, and enums.

**Example:**

```typescript
import { ROUTES, VOTE_VALUES, FILE_UPLOAD } from "@/constants";
```

## 🎯 Import Patterns

### Path Aliases

The project uses TypeScript path aliases for clean imports:

- `@/actions/*` → Server actions
- `@/components/*` → React components
- `@/lib/*` → Library configurations
- `@/types` → Type definitions
- `@/utils/*` → Utility functions
- `@/hooks/*` → Custom hooks
- `@/constants` → Constants and config

### Barrel Exports

Key folders have `index.ts` files for convenient imports:

```typescript
// Instead of:
import VoteButtons from "@/components/features/VoteButtons";
import Navbar from "@/components/layout/Navbar";

// You can use:
import { VoteButtons, Navbar } from "@/components";
```

## 🔧 Best Practices

### 1. Component Organization

- **Layout components:** Navigation, page structure
- **UI components:** Generic, reusable widgets
- **Feature components:** Business logic, feature-specific

### 2. Server Actions

- Keep all server actions in `/src/actions`
- One file per domain (vote, resources, profile)
- Export from `index.ts` for easy imports

### 3. Type Safety

- Define types in `/src/types`
- Use proper TypeScript types, not `any`
- Export commonly used types

### 4. Utility Functions

- Keep utilities pure and testable
- Organize by domain (common vs. feature-specific)
- No React/Next.js dependencies in utils

### 5. Custom Hooks

- Prefix with `use` (React convention)
- Keep hooks reusable and generic
- Document parameters and return values

## 🚀 Benefits of This Structure

1. **Scalability:** Clear separation of concerns makes it easy to add features
2. **Maintainability:** Logical organization helps developers find code quickly
3. **Consistency:** Standardized patterns reduce cognitive load
4. **Testability:** Pure utilities and separated concerns are easier to test
5. **Type Safety:** Centralized types prevent duplication and errors
6. **Developer Experience:** Barrel exports and path aliases improve DX

## 📝 Migration Notes

### What Changed

1. **Components moved:**
   - `@/components/Navbar` → `@/components/layout/Navbar`
   - `@/components/VoteButtons` → `@/components/features/VoteButtons`
   - `@/components/ThemeToggle` → `@/components/ui/ThemeToggle`

2. **Actions centralized:**
   - `@/app/resources/actions/vote` → `@/actions/vote`
   - `@/app/resources/upload/actions` → `@/actions/resources`
   - `@/app/me/edit/actions` → `@/actions/profile`

3. **New additions:**
   - `/src/types` - Type definitions
   - `/src/utils` - Utility functions
   - `/src/hooks` - Custom React hooks
   - `/src/constants` - App constants

### Removed

- `@/app/api/resources` - Unused API route (functionality handled by server actions)
- Empty action folders within app routes

## 🎨 Code Examples

### Using Utilities

```typescript
import { calculateResourceScore, sortResources } from "@/utils/resources";
import { cn, truncate } from "@/utils/common";

const resourceWithScore = calculateResourceScore(resource, userId);
const className = cn("btn", isActive && "btn-active");
```

### Using Types

```typescript
import type { ResourceWithScore, VoteValue } from "@/types";

function handleVote(value: VoteValue) {
  // value is properly typed as 1 | -1 | 0
}
```

### Using Custom Hooks

```typescript
import { useDebounce, useMediaQuery } from "@/hooks";

const debouncedSearch = useDebounce(searchTerm, 300);
const isMobile = useMediaQuery("(max-width: 768px)");
```

---

**Last Updated:** January 27, 2026

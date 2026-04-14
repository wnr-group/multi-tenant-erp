# Plan 1: Monorepo Scaffold + Shared Packages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the Turborepo monorepo with Next.js web app, Expo mobile app, shared packages, and the per-school config system — all compiling cleanly with TypeScript, Tailwind, and the Supabase client wired up.

**Architecture:** Single Turborepo root with `apps/web` (Next.js 14 App Router), `apps/mobile` (Expo SDK 52 + Expo Router), three packages (`packages/shared`, `packages/ui`, `packages/supabase`), and a `schools/` directory containing per-school JSON configs and assets. A script at `scripts/generate-eas-config.js` reads all school configs and writes the `eas.json` build profiles for white-label APK generation.

**Tech Stack:** pnpm workspaces, Turborepo, Next.js 14, Expo SDK 52, TypeScript 5, Tailwind CSS, NativeWind 4, shadcn/ui, Supabase JS v2, Zod 3

---

## File Map

```
balaji-erp/
├── package.json                          # pnpm workspace root
├── pnpm-workspace.yaml                   # workspace globs
├── turbo.json                            # pipeline config
├── tsconfig.base.json                    # shared TS config
├── .env.example                          # env var template
├── .gitignore
├── schools/
│   ├── configs/
│   │   └── demo.json                     # demo school config (used for local dev)
│   └── assets/
│       └── demo/
│           ├── icon.png                  # placeholder icon
│           └── splash.png               # placeholder splash
├── scripts/
│   └── generate-eas-config.js           # reads schools/configs/*.json → writes eas.json
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   ├── app/
│   │   │   ├── layout.tsx               # root layout with Supabase provider
│   │   │   ├── page.tsx                 # redirect to /login
│   │   │   └── (auth)/
│   │   │       └── login/
│   │   │           └── page.tsx         # placeholder login page
│   │   └── middleware.ts                # auth middleware stub
│   └── mobile/
│       ├── package.json
│       ├── tsconfig.json
│       ├── app.json                     # Expo config
│       ├── babel.config.js
│       ├── metro.config.js
│       ├── tailwind.config.js
│       ├── global.css                   # NativeWind global styles
│       └── app/
│           ├── _layout.tsx              # root Expo Router layout
│           └── index.tsx                # redirect to (auth)/login
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                 # barrel export
│   │   │   ├── types/
│   │   │   │   └── index.ts             # all shared TypeScript types
│   │   │   ├── schemas/
│   │   │   │   └── index.ts             # Zod validation schemas
│   │   │   └── supabase/
│   │   │       ├── client.ts            # browser Supabase client factory
│   │   │       └── server.ts            # server-side Supabase client (Next.js)
│   ├── ui/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts                 # placeholder export
│   └── supabase/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                 # barrel export
│           └── types.ts                 # placeholder DB types (replaced by generated types later)
```

---

## Task 1: Initialize Turborepo Root

**Files:**
- Create: `balaji-erp/package.json`
- Create: `balaji-erp/pnpm-workspace.yaml`
- Create: `balaji-erp/turbo.json`
- Create: `balaji-erp/tsconfig.base.json`
- Create: `balaji-erp/.gitignore`
- Create: `balaji-erp/.env.example`

- [ ] **Step 1: Create the project root directory**

```bash
mkdir -p ~/Documents/balaji-erp
cd ~/Documents/balaji-erp
git init
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "balaji-erp",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check"
  },
  "devDependencies": {
    "turbo": "^2.3.3",
    "typescript": "^5.7.2"
  },
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 3: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 5: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
.next/
dist/
.turbo/
.env
.env.local
*.tsbuildinfo
```

- [ ] **Step 7: Create `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: initialize turborepo root"
```

---

## Task 2: Create `packages/shared`

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/schemas/index.ts`
- Create: `packages/shared/src/supabase/client.ts`
- Create: `packages/shared/src/supabase/server.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@balaji-erp/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./schemas": "./src/schemas/index.ts",
    "./supabase/client": "./src/supabase/client.ts",
    "./supabase/server": "./src/supabase/server.ts"
  },
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.47.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/shared/src/types/index.ts`**

```typescript
export type Role =
  | "super_admin"
  | "school_admin"
  | "principal"
  | "teacher"
  | "student"
  | "parent";

export type AttendanceStatus = "present" | "absent" | "late" | "half_day";

export type FeePaymentStatus = "paid" | "partial" | "overdue";

export type FeedbackStatus = "open" | "responded" | "closed";

export type DisciplineCategory = "behavioral" | "academic" | "attendance";

export type DisciplineSeverity = "verbal" | "written" | "suspension";

export type AnnouncementTargetType = "school" | "class" | "section";

export interface UserSession {
  userId: string;
  schoolId: string | null;
  role: Role;
}
```

- [ ] **Step 4: Create `packages/shared/src/schemas/index.ts`**

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 5: Create `packages/shared/src/supabase/client.ts`**

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 6: Create `packages/shared/src/supabase/server.ts`**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from Server Component — cookies will be set by middleware
          }
        },
      },
    }
  );
}
```

- [ ] **Step 7: Create `packages/shared/src/index.ts`**

```typescript
export * from "./types/index";
export * from "./schemas/index";
```

- [ ] **Step 8: Commit**

```bash
git add packages/shared
git commit -m "feat: add shared package with types, schemas, supabase clients"
```

---

## Task 3: Create `packages/ui` and `packages/supabase`

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`
- Create: `packages/supabase/package.json`
- Create: `packages/supabase/tsconfig.json`
- Create: `packages/supabase/src/index.ts`
- Create: `packages/supabase/src/types.ts`

- [ ] **Step 1: Create `packages/ui/package.json`**

```json
{
  "name": "@balaji-erp/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Create `packages/ui/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/ui/src/index.ts`**

```typescript
// UI components will be added here as they are built
export {};
```

- [ ] **Step 4: Create `packages/supabase/package.json`**

```json
{
  "name": "@balaji-erp/supabase",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types.ts"
  },
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 5: Create `packages/supabase/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

- [ ] **Step 6: Create `packages/supabase/src/types.ts`**

```typescript
// This file will be replaced by auto-generated types from:
// pnpm supabase gen types typescript --project-id <id> > packages/supabase/src/types.ts
// Placeholder until Supabase project is created in Plan 2.
export type Database = Record<string, never>;
```

- [ ] **Step 7: Create `packages/supabase/src/index.ts`**

```typescript
export type { Database } from "./types";
```

- [ ] **Step 8: Commit**

```bash
git add packages/ui packages/supabase
git commit -m "feat: add ui and supabase placeholder packages"
```

---

## Task 4: Create `apps/web` (Next.js 14)

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/middleware.ts`

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@balaji-erp/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@balaji-erp/shared": "workspace:*",
    "@balaji-erp/ui": "workspace:*",
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.47.0",
    "next": "14.2.29",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.1",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `apps/web/next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@balaji-erp/shared", "@balaji-erp/ui"],
};

export default nextConfig;
```

- [ ] **Step 4: Create `apps/web/postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Create `apps/web/tailwind.config.ts`**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 6: Create `apps/web/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Balaji ERP",
  description: "Multi-school ERP platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Create `apps/web/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: Create `apps/web/app/page.tsx`**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
```

- [ ] **Step 9: Create `apps/web/app/(auth)/login/page.tsx`**

```tsx
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Balaji ERP — Login
        </h1>
        <p className="text-gray-500">Authentication coming in Plan 2.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 10: Create `apps/web/middleware.ts`**

```typescript
import { type NextRequest, NextResponse } from "next/server";

// Full auth middleware implemented in Plan 2.
// For now, all requests pass through.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 11: Verify the web app compiles**

```bash
cd apps/web
pnpm install
pnpm type-check
```

Expected: no TypeScript errors.

- [ ] **Step 12: Commit**

```bash
cd ~/Documents/balaji-erp
git add apps/web
git commit -m "feat: scaffold Next.js 14 web app with auth placeholder"
```

---

## Task 5: Create `apps/mobile` (Expo SDK 52)

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/metro.config.js`
- Create: `apps/mobile/tailwind.config.js`
- Create: `apps/mobile/global.css`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/index.tsx`

- [ ] **Step 1: Create `apps/mobile/package.json`**

```json
{
  "name": "@balaji-erp/mobile",
  "version": "0.0.1",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@balaji-erp/shared": "workspace:*",
    "@expo/metro-runtime": "~4.0.1",
    "@supabase/supabase-js": "^2.47.0",
    "expo": "~52.0.28",
    "expo-constants": "~17.0.7",
    "expo-font": "~13.0.3",
    "expo-linking": "~7.0.4",
    "expo-notifications": "~0.29.11",
    "expo-router": "~4.0.17",
    "expo-splash-screen": "~0.29.21",
    "expo-status-bar": "~2.0.1",
    "nativewind": "^4.1.23",
    "react": "18.3.1",
    "react-native": "0.76.7",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.4.0",
    "tailwindcss": "^3.4.16"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@types/react": "~18.3.12",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Create `apps/mobile/tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 3: Create `apps/mobile/app.json`**

```json
{
  "expo": {
    "name": "Balaji ERP",
    "slug": "balaji-erp",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "balajierp",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.wnradvisory.balajierp"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.wnradvisory.balajierp"
    },
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 4: Create `apps/mobile/babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    plugins: ["nativewind/babel"],
  };
};
```

- [ ] **Step 5: Create `apps/mobile/metro.config.js`**

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files in monorepo
config.watchFolders = [workspaceRoot];

// Resolve packages from workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
```

- [ ] **Step 6: Create `apps/mobile/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 7: Create `apps/mobile/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: Create `apps/mobile/app/_layout.tsx`**

```tsx
import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 9: Create `apps/mobile/app/index.tsx`**

```tsx
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
```

- [ ] **Step 10: Verify the mobile app compiles**

```bash
cd apps/mobile
pnpm install
pnpm type-check
```

Expected: no TypeScript errors.

- [ ] **Step 11: Commit**

```bash
cd ~/Documents/balaji-erp
git add apps/mobile
git commit -m "feat: scaffold Expo SDK 52 mobile app with NativeWind"
```

---

## Task 6: Wire Up Workspace + Verify Full Build

**Files:**
- Modify: `package.json` (already exists — verify scripts work)

- [ ] **Step 1: Install all workspace dependencies from root**

```bash
cd ~/Documents/balaji-erp
pnpm install
```

Expected: all packages resolve without errors.

- [ ] **Step 2: Run type-check across all packages**

```bash
pnpm type-check
```

Expected: 0 TypeScript errors across web, mobile, shared, ui, supabase packages.

- [ ] **Step 3: Start the web dev server and verify it loads**

```bash
pnpm --filter @balaji-erp/web dev
```

Open `http://localhost:3000` — should redirect to `/login` and show the placeholder login page with "Balaji ERP — Login" heading.

- [ ] **Step 4: Start the mobile dev server and verify it loads**

Open a second terminal:
```bash
pnpm --filter @balaji-erp/mobile dev
```

Expected: Expo dev server starts, QR code displayed, Metro bundler compiles without errors.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: verify full monorepo build — web + mobile + packages compile"
```

---

## Task 7: Per-School Config System + EAS Config Generator

**Files:**
- Create: `schools/configs/demo.json`
- Create: `schools/assets/demo/icon.png` (placeholder — copy any 1024x1024 PNG)
- Create: `schools/assets/demo/splash.png` (placeholder — copy any 2048x2048 PNG)
- Create: `scripts/generate-eas-config.js`
- Create: `apps/mobile/eas.json` (generated, but commit the initial version)

- [ ] **Step 1: Create `schools/configs/demo.json`**

```json
{
  "slug": "demo",
  "name": "Demo School",
  "schoolId": "aaaaaaaa-0000-0000-0000-000000000001",
  "primaryColor": "#2563EB",
  "bundleIdentifier": "com.demoschool.erp",
  "playStorePackage": "com.demoschool.erp",
  "iconPath": "../../schools/assets/demo/icon.png",
  "splashPath": "../../schools/assets/demo/splash.png"
}
```

- [ ] **Step 2: Add placeholder icon and splash assets**

```bash
mkdir -p schools/assets/demo
# Copy any 1024x1024 PNG as icon and any 2048x2048 PNG as splash
# For now, copy the default Expo assets:
cp apps/mobile/assets/icon.png schools/assets/demo/icon.png
cp apps/mobile/assets/splash.png schools/assets/demo/splash.png
```

- [ ] **Step 3: Create `scripts/generate-eas-config.js`**

```javascript
#!/usr/bin/env node
/**
 * Reads all schools/configs/*.json files and generates apps/mobile/eas.json
 * with one build profile per school.
 *
 * Usage: node scripts/generate-eas-config.js
 */

const fs = require("fs");
const path = require("path");

const configsDir = path.join(__dirname, "../schools/configs");
const easOutputPath = path.join(__dirname, "../apps/mobile/eas.json");

const schoolFiles = fs.readdirSync(configsDir).filter((f) => f.endsWith(".json"));

const buildProfiles = {};

for (const file of schoolFiles) {
  const school = JSON.parse(fs.readFileSync(path.join(configsDir, file), "utf8"));

  buildProfiles[school.slug] = {
    android: {
      buildType: "apk",
    },
    env: {
      EXPO_PUBLIC_SCHOOL_ID: school.schoolId,
      EXPO_PUBLIC_SCHOOL_NAME: school.name,
      EXPO_PUBLIC_PRIMARY_COLOR: school.primaryColor,
      EXPO_PUBLIC_BUNDLE_ID: school.bundleIdentifier,
      EXPO_PUBLIC_ICON_PATH: school.iconPath,
      EXPO_PUBLIC_SPLASH_PATH: school.splashPath,
    },
  };
}

const easConfig = {
  cli: {
    version: ">= 10.0.0",
  },
  build: buildProfiles,
};

fs.writeFileSync(easOutputPath, JSON.stringify(easConfig, null, 2) + "\n");
console.log(`✓ Generated eas.json with ${schoolFiles.length} school profile(s):`);
schoolFiles.forEach((f) => console.log(`  - ${f.replace(".json", "")}`));
```

- [ ] **Step 4: Run the generator**

```bash
node scripts/generate-eas-config.js
```

Expected output:
```
✓ Generated eas.json with 1 school profile(s):
  - demo
```

- [ ] **Step 5: Verify `apps/mobile/eas.json` was created**

```bash
cat apps/mobile/eas.json
```

Expected: valid JSON with a `build.demo` profile containing `EXPO_PUBLIC_SCHOOL_ID`, `EXPO_PUBLIC_SCHOOL_NAME`, `EXPO_PUBLIC_PRIMARY_COLOR`, `EXPO_PUBLIC_BUNDLE_ID`.

- [ ] **Step 6: Add `EXPO_PUBLIC_SCHOOL_ID` + `EXPO_PUBLIC_SCHOOL_NAME` usage to mobile app**

Update `apps/mobile/app/(auth)/login.tsx` login screen title to use the school name from env:

Replace:
```tsx
<Text className="mb-8 text-3xl font-bold text-gray-900">
  Balaji ERP
</Text>
```

With:
```tsx
<Text className="mb-8 text-3xl font-bold text-gray-900">
  {process.env.EXPO_PUBLIC_SCHOOL_NAME ?? "School ERP"}
</Text>
```

- [ ] **Step 7: Commit**

```bash
git add schools/ scripts/ apps/mobile/eas.json
git commit -m "feat: per-school config system and EAS config generator"
```

---

## Verification Checklist

Before declaring Plan 1 complete, confirm all of the following:

- [ ] `pnpm install` succeeds from repo root
- [ ] `pnpm type-check` passes with 0 errors
- [ ] Web app starts on `http://localhost:3000` and shows login placeholder
- [ ] Mobile Expo dev server starts and Metro compiles without errors
- [ ] `packages/shared` exports `Role`, `UserSession`, `loginSchema`, and both Supabase client factories
- [ ] `packages/supabase` exports `Database` placeholder type
- [ ] `schools/configs/demo.json` exists with valid school config
- [ ] `node scripts/generate-eas-config.js` runs and produces valid `apps/mobile/eas.json`
- [ ] Git history has 7 clean commits

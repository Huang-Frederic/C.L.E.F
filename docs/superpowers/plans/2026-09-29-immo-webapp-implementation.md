# Portage Immo.xlsx → Webapp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `Immo.xlsx` (real-estate investment screening tool) as a Next.js webapp with no database, storing its single JSON data blob on Google Drive via a dedicated service account.

**Architecture:** Next.js (App Router, TypeScript) deployed on Vercel. A pure calculation layer (`src/lib/calculations.ts`, `src/lib/confort.ts`) ports the Excel formulas with the two identified bugs fixed. A data layer (`src/lib/driveClient.ts`, `src/lib/dataStore.ts`) reads/writes a single `data.json` file on Google Drive with optimistic-lock conflict detection via `modifiedTime`. A thin auth layer (`src/lib/auth.ts`) gates every route behind one shared password using a signed session cookie. Excel import/export (`src/lib/excelExport.ts`, `src/lib/excelImport.ts`) lets the data be recovered as a real `.xlsx` at any time. React pages consume all of this through a single `useDataStore` client hook.

**Tech Stack:** Next.js 14 (App Router) + TypeScript, Tailwind CSS, `googleapis` (Drive API v3), `exceljs`, `jose` (session signing), Vitest + Testing Library (jsdom) for tests.

**Spec:** [docs/superpowers/specs/2026-09-28-immo-webapp-design.md](../specs/2026-09-28-immo-webapp-design.md)

## Global Constraints

- No database of any kind — all persistent state lives in one `data.json` file on Google Drive.
- Google Drive access goes through a dedicated service account; no end user ever authenticates to Google.
- Single shared password (`APP_PASSWORD` env var) gates the whole app — no per-user accounts.
- Hosting target is Vercel.
- The taxe foncière bug is fixed: it is an independent manual field, never derived from the rent formula.
- The credit-rate bug is fixed: the interest rate used in the monthly-payment calculation is an editable field per bien, never hardcoded.
- Feuille 11 and Feuille 12 (unused compound-interest scratch tables) are out of scope — do not port them.
- Automated tests focus on the pure calculation functions and the Excel import/export mapping; no end-to-end test suite.

## Review Focus

- A bien whose ville+type has no match in `referentielLoyers` and no `loyerM2Override` set — the app must not crash or silently show `NaN`; the loyer/rentabilité calculations must degrade to `0` and the UI must be able to detect "not found" to warn the user (Task 3).
- A newly created bien with `prixAchat + prixTravaux = 0` — rentabilité and mensualité calculations must not produce `Infinity`/`NaN` on screen (Task 3).
- `settings.objectifRentabilitePourcent` set to `0` — `calculMaxEncheres` must not divide by zero (Task 3).
- An imported `.xlsx` with blank cells in numeric columns — must map to `0`, not `NaN`, otherwise data is silently corrupted (Task 12).
- Two people saving at nearly the same time — the second save must be rejected by the `modifiedTime` conflict guard, never silently overwrite the first save (Task 7).

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Create: `tests/sanity.test.ts`
- Create: `.env.local.example`
- Create: `.gitignore`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a runnable Next.js app (`npm run dev`), a working test runner (`npm run test`), the `@/*` → `src/*` path alias used by every later task.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "clef-webapp",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "exceljs": "^4.4.0",
    "googleapis": "^140.0.0",
    "jose": "^5.6.3",
    "next": "^14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^20.14.14",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.1.1",
    "postcss": "^8.4.40",
    "tailwindcss": "^3.4.7",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

- [ ] **Step 5: Write `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

- [ ] **Step 6: Write `postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Write `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: Write `src/app/layout.tsx`**

```tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'CLEF — Calcul de Loyer, Emprunt & Financement',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Write a placeholder `src/app/page.tsx`**

```tsx
export default function HomePage() {
  return <main className="p-8">CLEF — en construction.</main>;
}
```

- [ ] **Step 10: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 11: Write `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 12: Write a sanity test**

```ts
import { describe, expect, it } from 'vitest';

describe('sanity', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 13: Run the sanity test**

Run: `npx vitest run tests/sanity.test.ts`
Expected: PASS (1 test).

- [ ] **Step 14: Write `.env.local.example`**

```
APP_PASSWORD=
SESSION_SECRET=
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=
GOOGLE_DRIVE_FILE_ID=
```

- [ ] **Step 15: Write `.gitignore`**

```
node_modules/
.next/
.env.local
```

- [ ] **Step 16: Verify the dev server boots**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 17: Commit**

```bash
git add package.json tsconfig.json next.config.mjs tailwind.config.ts postcss.config.js vitest.config.ts vitest.setup.ts src tests .env.local.example .gitignore package-lock.json
git commit -m "chore: scaffold Next.js app with Tailwind and Vitest"
```

---

### Task 2: Shared types and default data store

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/defaultData.ts`
- Test: `src/lib/defaultData.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Bien`, `ReferentielLoyer`, `BaremeConfortItem`, `MontageFinancier`, `EmailTemplate`, `Settings`, `DataStore` types from `src/lib/types.ts`; `createDefaultDataStore(): DataStore` from `src/lib/defaultData.ts` — used by every later task that touches `DataStore`.

- [ ] **Step 1: Write `src/lib/types.ts`**

```ts
export interface Bien {
  id: string;
  lienAnnonce: string;
  lieu: string;
  typePiece: string;
  surfaceSol: number;
  surfaceConfort: number;
  equipements: Record<string, number> | null;
  prixAchat: number;
  prixTravaux: number;
  tauxCredit: number;
  dureeCreditAnnees: number;
  loyerM2Override: number | null;
  taxeFonciere: number;
  chargesCopro: number;
  autresCharges: number;
  classeEnergie: string;
  dateVisite: string | null;
  dateVente: string | null;
  commentaireAntho: string;
  commentaireGilly: string;
  commentaireDecision: string;
}

export interface ReferentielLoyer {
  ville: string;
  typePiece: string;
  loyerM2: number;
}

export interface BaremeConfortItem {
  label: string;
  m2Bonus: number;
}

export interface MontageFinancier {
  prixAchat: number;
  prixTravaux: number;
  tauxCredit: number;
  dureeCreditAnnees: number;
  loyerHypothese: number;
  pno: number;
  assuranceEmprunteurMensuel: number;
  chargesMensuelles: number;
  enveloppeImprevus: number;
  gestionGliPourcent: number;
}

export interface EmailTemplate {
  titre: string;
  corps: string;
}

export interface Settings {
  objectifRentabilitePourcent: number;
  tauxCreditParDefaut: number;
  dureeCreditParDefautAnnees: number;
}

export interface DataStore {
  biens: Bien[];
  referentielLoyers: ReferentielLoyer[];
  baremeConfort: BaremeConfortItem[];
  montageFinancier: MontageFinancier;
  emailTemplates: EmailTemplate[];
  settings: Settings;
}
```

- [ ] **Step 2: Write the failing test for the default data factory**

```ts
import { describe, expect, it } from 'vitest';
import { createDefaultDataStore } from './defaultData';

describe('createDefaultDataStore', () => {
  it('returns an empty biens list and a pre-filled bareme confort', () => {
    const data = createDefaultDataStore();
    expect(data.biens).toEqual([]);
    expect(data.referentielLoyers).toEqual([]);
    expect(data.baremeConfort).toHaveLength(8);
    expect(data.baremeConfort[0]).toEqual({ label: 'Eau courante', m2Bonus: 4 });
  });

  it('defaults settings to a 6% target yield', () => {
    const data = createDefaultDataStore();
    expect(data.settings.objectifRentabilitePourcent).toBe(6);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/defaultData.test.ts`
Expected: FAIL — `Cannot find module './defaultData'`.

- [ ] **Step 4: Write `src/lib/defaultData.ts`**

```ts
import type { DataStore } from './types';

export function createDefaultDataStore(): DataStore {
  return {
    biens: [],
    referentielLoyers: [],
    baremeConfort: [
      { label: 'Eau courante', m2Bonus: 4 },
      { label: 'Gaz', m2Bonus: 2 },
      { label: 'Électricité', m2Bonus: 2 },
      { label: 'Lavabo', m2Bonus: 3 },
      { label: 'WC', m2Bonus: 3 },
      { label: 'Baignoire', m2Bonus: 5 },
      { label: 'Douche', m2Bonus: 4 },
      { label: 'Chauffage par pièce', m2Bonus: 2 },
    ],
    montageFinancier: {
      prixAchat: 0,
      prixTravaux: 0,
      tauxCredit: 3,
      dureeCreditAnnees: 25,
      loyerHypothese: 0,
      pno: 0,
      assuranceEmprunteurMensuel: 0,
      chargesMensuelles: 0,
      enveloppeImprevus: 0,
      gestionGliPourcent: 7.5,
    },
    emailTemplates: [],
    settings: {
      objectifRentabilitePourcent: 6,
      tauxCreditParDefaut: 3,
      dureeCreditParDefautAnnees: 25,
    },
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/defaultData.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/defaultData.ts src/lib/defaultData.test.ts
git commit -m "feat: add shared types and default data store"
```

---

### Task 3: Core rentability calculations

**Files:**
- Create: `src/lib/calculations.ts`
- Test: `src/lib/calculations.test.ts`

**Interfaces:**
- Consumes: `Bien`, `ReferentielLoyer` from `src/lib/types.ts`.
- Produces: `calculPmtMensuel(capital: number, tauxAnnuelPourcent: number, dureeAnnees: number): number`, `trouverLoyerM2(bien: Bien, referentielLoyers: ReferentielLoyer[]): number | null`, `calculLoyerMoyenMensuel(bien: Bien, referentielLoyers: ReferentielLoyer[]): number`, `calculMensualiteCredit(bien: Bien): number`, `calculMensualiteBreakeven(bien: Bien, referentielLoyers: ReferentielLoyer[]): number`, `calculRentabiliteNettePourcent(bien: Bien, referentielLoyers: ReferentielLoyer[]): number`, `calculMaxEncheres(bien: Bien, referentielLoyers: ReferentielLoyer[], objectifRentabilitePourcent: number): number` — used by Tasks 11, 15, 16.

- [ ] **Step 1: Write the failing test for the PMT function**

This uses a golden value from the original spreadsheet: `Analyse!K2` was `=-1*PMT(2/1200,25*12,F2+G2)` with `F2=259000`, `G2=5000`, cached at `1118.975454`.

```ts
import { describe, expect, it } from 'vitest';
import {
  calculPmtMensuel,
  calculLoyerMoyenMensuel,
  calculMensualiteCredit,
  calculMensualiteBreakeven,
  calculRentabiliteNettePourcent,
  calculMaxEncheres,
  trouverLoyerM2,
} from './calculations';
import type { Bien, ReferentielLoyer } from './types';

describe('calculPmtMensuel', () => {
  it('matches the original spreadsheet PMT formula', () => {
    expect(calculPmtMensuel(264000, 2, 25)).toBeCloseTo(1118.975454, 4);
  });

  it('returns capital / nombre de mensualités when the rate is 0', () => {
    expect(calculPmtMensuel(12000, 0, 10)).toBeCloseTo(100, 6);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/calculations.test.ts`
Expected: FAIL — `Cannot find module './calculations'`.

- [ ] **Step 3: Write `calculPmtMensuel` in `src/lib/calculations.ts`**

```ts
import type { Bien, ReferentielLoyer } from './types';

export function calculPmtMensuel(
  capital: number,
  tauxAnnuelPourcent: number,
  dureeAnnees: number
): number {
  const tauxMensuel = tauxAnnuelPourcent / 100 / 12;
  const nombreMensualites = dureeAnnees * 12;
  if (nombreMensualites <= 0) return 0;
  if (tauxMensuel === 0) return capital / nombreMensualites;
  return (capital * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nombreMensualites));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/calculations.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for `trouverLoyerM2` and `calculLoyerMoyenMensuel`**

This uses the `Analyse!H2` golden value: `E2=12.9`, `C2=95`, `D2=30` → `H2 = 1612.5`.

```ts
function makeBien(overrides: Partial<Bien> = {}): Bien {
  return {
    id: 'b1',
    lienAnnonce: '',
    lieu: 'Eaubonne',
    typePiece: '4P+',
    surfaceSol: 95,
    surfaceConfort: 30,
    equipements: null,
    prixAchat: 259000,
    prixTravaux: 5000,
    tauxCredit: 2,
    dureeCreditAnnees: 25,
    loyerM2Override: null,
    taxeFonciere: 0,
    chargesCopro: 0,
    autresCharges: 0,
    classeEnergie: '',
    dateVisite: null,
    dateVente: null,
    commentaireAntho: '',
    commentaireGilly: '',
    commentaireDecision: '',
    ...overrides,
  };
}

const referentiel: ReferentielLoyer[] = [
  { ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 },
];

describe('trouverLoyerM2', () => {
  it('finds the matching entry by ville + typePiece', () => {
    expect(trouverLoyerM2(makeBien(), referentiel)).toBe(12.9);
  });

  it('returns null when there is no match and no override', () => {
    expect(trouverLoyerM2(makeBien({ lieu: 'Inconnue' }), referentiel)).toBeNull();
  });

  it('prefers loyerM2Override over the référentiel', () => {
    expect(trouverLoyerM2(makeBien({ loyerM2Override: 20 }), referentiel)).toBe(20);
  });
});

describe('calculLoyerMoyenMensuel', () => {
  it('matches the original spreadsheet formula', () => {
    expect(calculLoyerMoyenMensuel(makeBien(), referentiel)).toBeCloseTo(1612.5, 4);
  });

  it('returns 0 instead of NaN when there is no matching référentiel entry', () => {
    expect(calculLoyerMoyenMensuel(makeBien({ lieu: 'Inconnue' }), referentiel)).toBe(0);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/lib/calculations.test.ts`
Expected: FAIL — `trouverLoyerM2` and `calculLoyerMoyenMensuel` are not exported.

- [ ] **Step 7: Implement `trouverLoyerM2` and `calculLoyerMoyenMensuel`**

```ts
export function trouverLoyerM2(bien: Bien, referentielLoyers: ReferentielLoyer[]): number | null {
  if (bien.loyerM2Override !== null) return bien.loyerM2Override;
  const entry = referentielLoyers.find(
    (r) => r.ville === bien.lieu && r.typePiece === bien.typePiece
  );
  return entry ? entry.loyerM2 : null;
}

export function calculLoyerMoyenMensuel(bien: Bien, referentielLoyers: ReferentielLoyer[]): number {
  const loyerM2 = trouverLoyerM2(bien, referentielLoyers) ?? 0;
  return loyerM2 * (bien.surfaceSol + bien.surfaceConfort);
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/lib/calculations.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 9: Write the failing test for `calculMensualiteCredit`**

```ts
describe('calculMensualiteCredit', () => {
  it('matches the original spreadsheet formula', () => {
    expect(calculMensualiteCredit(makeBien())).toBeCloseTo(1118.975454, 4);
  });
});
```

- [ ] **Step 10: Implement `calculMensualiteCredit`**

```ts
export function calculMensualiteCredit(bien: Bien): number {
  return calculPmtMensuel(bien.prixAchat + bien.prixTravaux, bien.tauxCredit, bien.dureeCreditAnnees);
}
```

- [ ] **Step 11: Run the test to verify it passes**

Run: `npx vitest run src/lib/calculations.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 12: Write the failing tests for breakeven, rentabilité and max enchères, including the division-by-zero guards from the Review Focus**

```ts
describe('calculMensualiteBreakeven', () => {
  it('adds the credit instalment to the monthly share of fixed costs', () => {
    const bien = makeBien({ taxeFonciere: 1200, chargesCopro: 600, autresCharges: 0 });
    expect(calculMensualiteBreakeven(bien, referentiel)).toBeCloseTo(1268.975454, 4);
  });
});

describe('calculRentabiliteNettePourcent', () => {
  it('matches the expected net yield formula', () => {
    const bien = makeBien({ taxeFonciere: 1200, chargesCopro: 600, autresCharges: 0 });
    // (1612.5 - 150) / 264000 * 1200
    expect(calculRentabiliteNettePourcent(bien, referentiel)).toBeCloseTo(6.647727, 4);
  });

  it('returns 0 instead of Infinity/NaN when prixAchat + prixTravaux is 0', () => {
    const bien = makeBien({ prixAchat: 0, prixTravaux: 0 });
    expect(calculRentabiliteNettePourcent(bien, referentiel)).toBe(0);
  });
});

describe('calculMaxEncheres', () => {
  it('matches the expected max-bid formula', () => {
    const bien = makeBien({ taxeFonciere: 1200, chargesCopro: 600, autresCharges: 0 });
    // (1612.5 - 150) * 12 / 0.06
    expect(calculMaxEncheres(bien, referentiel, 6)).toBeCloseTo(292500, 2);
  });

  it('returns 0 instead of dividing by zero when the target yield is 0%', () => {
    const bien = makeBien();
    expect(calculMaxEncheres(bien, referentiel, 0)).toBe(0);
  });
});
```

- [ ] **Step 13: Run the tests to verify they fail**

Run: `npx vitest run src/lib/calculations.test.ts`
Expected: FAIL — the three functions are not exported yet.

- [ ] **Step 14: Implement breakeven, rentabilité nette and max enchères with the zero-division guards**

```ts
function chargesMensuellesFixes(bien: Bien): number {
  return (bien.taxeFonciere + bien.chargesCopro + bien.autresCharges) / 12;
}

export function calculMensualiteBreakeven(bien: Bien, referentielLoyers: ReferentielLoyer[]): number {
  return calculMensualiteCredit(bien) + chargesMensuellesFixes(bien);
}

export function calculRentabiliteNettePourcent(
  bien: Bien,
  referentielLoyers: ReferentielLoyer[]
): number {
  const capital = bien.prixAchat + bien.prixTravaux;
  if (capital <= 0) return 0;
  const loyerNetMensuel = calculLoyerMoyenMensuel(bien, referentielLoyers) - chargesMensuellesFixes(bien);
  return (loyerNetMensuel / capital) * 1200;
}

export function calculMaxEncheres(
  bien: Bien,
  referentielLoyers: ReferentielLoyer[],
  objectifRentabilitePourcent: number
): number {
  if (objectifRentabilitePourcent <= 0) return 0;
  const loyerNetMensuel = calculLoyerMoyenMensuel(bien, referentielLoyers) - chargesMensuellesFixes(bien);
  return (loyerNetMensuel * 12) / (objectifRentabilitePourcent / 100);
}
```

- [ ] **Step 15: Run the full test file to verify everything passes**

Run: `npx vitest run src/lib/calculations.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 16: Commit**

```bash
git add src/lib/calculations.ts src/lib/calculations.test.ts
git commit -m "feat: port core rentability calculations with bug fixes and zero guards"
```

---

### Task 4: Surface confort calculation

**Files:**
- Create: `src/lib/confort.ts`
- Test: `src/lib/confort.test.ts`

**Interfaces:**
- Consumes: `BaremeConfortItem` from `src/lib/types.ts`.
- Produces: `calculSurfaceConfort(equipements: Record<string, number>, bareme: BaremeConfortItem[]): number` — used by Task 16's `ConfortCalculator` component.

- [ ] **Step 1: Write the failing test**

This reproduces the exact golden total from `Aide m2 supp confort!D11` (`= 30`).

```ts
import { describe, expect, it } from 'vitest';
import { calculSurfaceConfort } from './confort';
import type { BaremeConfortItem } from './types';

const bareme: BaremeConfortItem[] = [
  { label: 'Eau courante', m2Bonus: 4 },
  { label: 'Gaz', m2Bonus: 2 },
  { label: 'Électricité', m2Bonus: 2 },
  { label: 'Lavabo', m2Bonus: 3 },
  { label: 'WC', m2Bonus: 3 },
  { label: 'Baignoire', m2Bonus: 5 },
  { label: 'Douche', m2Bonus: 4 },
  { label: 'Chauffage par pièce', m2Bonus: 2 },
];

describe('calculSurfaceConfort', () => {
  it('matches the original spreadsheet total', () => {
    const equipements = {
      'Eau courante': 1,
      Gaz: 1,
      Électricité: 1,
      Lavabo: 2,
      WC: 1,
      Baignoire: 1,
      Douche: 0,
      'Chauffage par pièce': 4,
    };
    expect(calculSurfaceConfort(equipements, bareme)).toBe(30);
  });

  it('treats a missing equipment quantity as 0', () => {
    expect(calculSurfaceConfort({}, bareme)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/confort.test.ts`
Expected: FAIL — `Cannot find module './confort'`.

- [ ] **Step 3: Implement `src/lib/confort.ts`**

```ts
import type { BaremeConfortItem } from './types';

export function calculSurfaceConfort(
  equipements: Record<string, number>,
  bareme: BaremeConfortItem[]
): number {
  return bareme.reduce((total, item) => total + (equipements[item.label] ?? 0) * item.m2Bonus, 0);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/confort.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/confort.ts src/lib/confort.test.ts
git commit -m "feat: port surface confort calculation"
```

---

### Task 5: Montage financier calculation

**Files:**
- Modify: `src/lib/calculations.ts`
- Modify: `src/lib/calculations.test.ts`

**Interfaces:**
- Consumes: `MontageFinancier` from `src/lib/types.ts`, `calculPmtMensuel` from this same file.
- Produces: `MontageFinancierResultat` type and `calculMontageFinancier(m: MontageFinancier): MontageFinancierResultat` — used by Task 18's montage financier page.

- [ ] **Step 1: Write the failing test**

Golden values reproduced from `Montage financier!C3:K3` (`B3=161000.21`, taux `2.9%`, `D3=20`, `E3=20`, `F3=170.0833333`, `G3=25`, `I3=1200`, `H3=90`, `J3=1080.216963`, `K3=119.7830369`).

```ts
import type { MontageFinancier } from './types';

describe('calculMontageFinancier', () => {
  it('matches the original spreadsheet scenario', () => {
    const montage: MontageFinancier = {
      prixAchat: 161000.21,
      prixTravaux: 0,
      tauxCredit: 2.9,
      dureeCreditAnnees: 25,
      loyerHypothese: 1200,
      pno: 20,
      assuranceEmprunteurMensuel: 20,
      chargesMensuelles: 170.0833333,
      enveloppeImprevus: 25,
      gestionGliPourcent: 7.5,
    };
    const resultat = calculMontageFinancier(montage);
    expect(resultat.mensualiteBanque).toBeCloseTo(755.1336298, 4);
    expect(resultat.gestionGli).toBeCloseTo(90, 4);
    expect(resultat.totalMensualite).toBeCloseTo(1080.216963, 3);
    expect(resultat.cashflow).toBeCloseTo(119.7830369, 3);
    expect(resultat.rendementBrutPourcent).toBeCloseTo(8.944, 3);
    expect(resultat.rendementNetPourcent).toBeCloseTo(7.677, 3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/calculations.test.ts`
Expected: FAIL — `calculMontageFinancier` is not exported.

- [ ] **Step 3: Add the import and implement `calculMontageFinancier` in `src/lib/calculations.ts`**

Add `MontageFinancier` to the existing type import at the top of the file:

```ts
import type { Bien, ReferentielLoyer, MontageFinancier } from './types';
```

Append at the end of the file:

```ts
export interface MontageFinancierResultat {
  mensualiteBanque: number;
  gestionGli: number;
  totalMensualite: number;
  cashflow: number;
  rendementBrutPourcent: number;
  rendementNetPourcent: number;
}

export function calculMontageFinancier(m: MontageFinancier): MontageFinancierResultat {
  const capital = m.prixAchat + m.prixTravaux;
  const mensualiteBanque = calculPmtMensuel(capital, m.tauxCredit, m.dureeCreditAnnees);
  const gestionGli = m.loyerHypothese * (m.gestionGliPourcent / 100);
  const totalMensualite =
    mensualiteBanque + m.pno + m.assuranceEmprunteurMensuel + m.chargesMensuelles + m.enveloppeImprevus + gestionGli;
  const cashflow = m.loyerHypothese - totalMensualite;
  const rendementBrutPourcent = capital > 0 ? (m.loyerHypothese * 12) / capital * 100 : 0;
  const rendementNetPourcent =
    capital > 0 ? ((m.loyerHypothese - m.chargesMensuelles) * 12) / capital * 100 : 0;
  return { mensualiteBanque, gestionGli, totalMensualite, cashflow, rendementBrutPourcent, rendementNetPourcent };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/calculations.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculations.ts src/lib/calculations.test.ts
git commit -m "feat: port montage financier calculation"
```

---

### Task 6: Google Drive client wrapper

**Files:**
- Create: `src/lib/driveClient.ts`
- Test: `src/lib/driveClient.test.ts`

**Interfaces:**
- Consumes: `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` env var (base64-encoded service account JSON key).
- Produces: `createDriveFilesClient()`, `getFileContent(fileId: string, filesClient?): Promise<string>`, `getFileModifiedTime(fileId: string, filesClient?): Promise<string>`, `updateFileContent(fileId: string, content: string, filesClient?): Promise<string>` — used by Task 7's `dataStore.ts`.

- [ ] **Step 1: Write the failing tests using an injected fake Drive client**

Each exported function accepts an optional `filesClient` so tests never touch the real `googleapis` network calls.

```ts
import { describe, expect, it, vi } from 'vitest';
import { getFileContent, getFileModifiedTime, updateFileContent } from './driveClient';

describe('getFileContent', () => {
  it('requests the file body as media', async () => {
    const fakeClient = { get: vi.fn().mockResolvedValue({ data: '{"foo":1}' }), update: vi.fn() };
    const content = await getFileContent('file-123', fakeClient as never);
    expect(content).toBe('{"foo":1}');
    expect(fakeClient.get).toHaveBeenCalledWith(
      { fileId: 'file-123', alt: 'media' },
      { responseType: 'text' }
    );
  });
});

describe('getFileModifiedTime', () => {
  it('requests the modifiedTime field', async () => {
    const fakeClient = {
      get: vi.fn().mockResolvedValue({ data: { modifiedTime: '2026-09-29T10:00:00.000Z' } }),
      update: vi.fn(),
    };
    const modifiedTime = await getFileModifiedTime('file-123', fakeClient as never);
    expect(modifiedTime).toBe('2026-09-29T10:00:00.000Z');
    expect(fakeClient.get).toHaveBeenCalledWith({ fileId: 'file-123', fields: 'modifiedTime' });
  });
});

describe('updateFileContent', () => {
  it('uploads the new content as JSON media and returns the new modifiedTime', async () => {
    const fakeClient = {
      get: vi.fn(),
      update: vi.fn().mockResolvedValue({ data: { modifiedTime: '2026-09-29T10:05:00.000Z' } }),
    };
    const modifiedTime = await updateFileContent('file-123', '{"foo":2}', fakeClient as never);
    expect(modifiedTime).toBe('2026-09-29T10:05:00.000Z');
    expect(fakeClient.update).toHaveBeenCalledWith({
      fileId: 'file-123',
      media: { mimeType: 'application/json', body: '{"foo":2}' },
      fields: 'modifiedTime',
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/driveClient.test.ts`
Expected: FAIL — `Cannot find module './driveClient'`.

- [ ] **Step 3: Implement `src/lib/driveClient.ts`**

```ts
import { google, drive_v3 } from 'googleapis';

type DriveFilesClient = drive_v3.Resource$Files;

function getAuth() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!encoded) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 is not set.');
  const credentials = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

export function createDriveFilesClient(): DriveFilesClient {
  return google.drive({ version: 'v3', auth: getAuth() }).files;
}

export async function getFileContent(fileId: string, filesClient = createDriveFilesClient()): Promise<string> {
  const res = await filesClient.get({ fileId, alt: 'media' }, { responseType: 'text' });
  return res.data as unknown as string;
}

export async function getFileModifiedTime(
  fileId: string,
  filesClient = createDriveFilesClient()
): Promise<string> {
  const res = await filesClient.get({ fileId, fields: 'modifiedTime' });
  return res.data.modifiedTime as string;
}

export async function updateFileContent(
  fileId: string,
  content: string,
  filesClient = createDriveFilesClient()
): Promise<string> {
  const res = await filesClient.update({
    fileId,
    media: { mimeType: 'application/json', body: content },
    fields: 'modifiedTime',
  });
  return res.data.modifiedTime as string;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/driveClient.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/driveClient.ts src/lib/driveClient.test.ts
git commit -m "feat: add Google Drive client wrapper with injectable client for tests"
```

---

### Task 7: Data store — load/save with conflict detection

**Files:**
- Create: `src/lib/dataStore.ts`
- Test: `src/lib/dataStore.test.ts`

**Interfaces:**
- Consumes: `getFileContent`, `getFileModifiedTime`, `updateFileContent` from `src/lib/driveClient.ts`; `createDefaultDataStore` from `src/lib/defaultData.ts`; `DataStore` from `src/lib/types.ts`.
- Produces: `SaveConflictError` (has `currentModifiedTime: string`), `LoadedData` (`{ data: DataStore; modifiedTime: string }`), `loadData(fileId: string): Promise<LoadedData>`, `saveData(fileId: string, data: DataStore, expectedModifiedTime: string, force?: boolean): Promise<string>` — used by Tasks 10, 11, 12.

- [ ] **Step 1: Write the failing tests, mocking `./driveClient`**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { loadData, saveData, SaveConflictError } from './dataStore';
import * as driveClient from './driveClient';
import { createDefaultDataStore } from './defaultData';

vi.mock('./driveClient');

beforeEach(() => {
  vi.resetAllMocks();
});

describe('loadData', () => {
  it('parses the JSON content and returns the modifiedTime', async () => {
    const stored = { ...createDefaultDataStore(), biens: [] };
    vi.mocked(driveClient.getFileContent).mockResolvedValue(JSON.stringify(stored));
    vi.mocked(driveClient.getFileModifiedTime).mockResolvedValue('2026-09-29T10:00:00.000Z');

    const result = await loadData('file-123');

    expect(result.data).toEqual(stored);
    expect(result.modifiedTime).toBe('2026-09-29T10:00:00.000Z');
  });

  it('returns the default data store when the file is empty', async () => {
    vi.mocked(driveClient.getFileContent).mockResolvedValue('');
    vi.mocked(driveClient.getFileModifiedTime).mockResolvedValue('2026-09-29T10:00:00.000Z');

    const result = await loadData('file-123');

    expect(result.data).toEqual(createDefaultDataStore());
  });
});

describe('saveData', () => {
  it('writes the new content when the expected modifiedTime matches the current one', async () => {
    vi.mocked(driveClient.getFileModifiedTime).mockResolvedValue('2026-09-29T10:00:00.000Z');
    vi.mocked(driveClient.updateFileContent).mockResolvedValue('2026-09-29T10:05:00.000Z');

    const data = createDefaultDataStore();
    const newModifiedTime = await saveData('file-123', data, '2026-09-29T10:00:00.000Z');

    expect(newModifiedTime).toBe('2026-09-29T10:05:00.000Z');
    expect(driveClient.updateFileContent).toHaveBeenCalledWith('file-123', JSON.stringify(data, null, 2));
  });

  it('throws SaveConflictError when someone else saved in the meantime, without writing', async () => {
    vi.mocked(driveClient.getFileModifiedTime).mockResolvedValue('2026-09-29T10:10:00.000Z');

    const data = createDefaultDataStore();
    await expect(saveData('file-123', data, '2026-09-29T10:00:00.000Z')).rejects.toBeInstanceOf(
      SaveConflictError
    );
    expect(driveClient.updateFileContent).not.toHaveBeenCalled();
  });

  it('bypasses the conflict check when force is true', async () => {
    vi.mocked(driveClient.getFileModifiedTime).mockResolvedValue('2026-09-29T10:10:00.000Z');
    vi.mocked(driveClient.updateFileContent).mockResolvedValue('2026-09-29T10:15:00.000Z');

    const data = createDefaultDataStore();
    const newModifiedTime = await saveData('file-123', data, '2026-09-29T10:00:00.000Z', true);

    expect(newModifiedTime).toBe('2026-09-29T10:15:00.000Z');
    expect(driveClient.getFileModifiedTime).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/dataStore.test.ts`
Expected: FAIL — `Cannot find module './dataStore'`.

- [ ] **Step 3: Implement `src/lib/dataStore.ts`**

```ts
import type { DataStore } from './types';
import { createDefaultDataStore } from './defaultData';
import { getFileContent, getFileModifiedTime, updateFileContent } from './driveClient';

export class SaveConflictError extends Error {
  currentModifiedTime: string;

  constructor(currentModifiedTime: string) {
    super("Le fichier a été modifié par quelqu'un d'autre depuis le dernier chargement.");
    this.name = 'SaveConflictError';
    this.currentModifiedTime = currentModifiedTime;
  }
}

export interface LoadedData {
  data: DataStore;
  modifiedTime: string;
}

export async function loadData(fileId: string): Promise<LoadedData> {
  const [content, modifiedTime] = await Promise.all([
    getFileContent(fileId),
    getFileModifiedTime(fileId),
  ]);
  const data: DataStore = content.trim().length > 0 ? JSON.parse(content) : createDefaultDataStore();
  return { data, modifiedTime };
}

export async function saveData(
  fileId: string,
  data: DataStore,
  expectedModifiedTime: string,
  force = false
): Promise<string> {
  if (!force) {
    const current = await getFileModifiedTime(fileId);
    if (current !== expectedModifiedTime) {
      throw new SaveConflictError(current);
    }
  }
  return updateFileContent(fileId, JSON.stringify(data, null, 2));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/dataStore.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dataStore.ts src/lib/dataStore.test.ts
git commit -m "feat: add data store with optimistic-lock conflict detection"
```

---

### Task 8: Auth — password check and session tokens

**Files:**
- Create: `src/lib/auth.ts`
- Test: `src/lib/auth.test.ts`

**Interfaces:**
- Consumes: `APP_PASSWORD`, `SESSION_SECRET` env vars.
- Produces: `SESSION_COOKIE_NAME: string`, `checkPassword(password: string): boolean`, `createSessionToken(): Promise<string>`, `verifySessionToken(token: string): Promise<boolean>` — used by Task 9's routes and middleware.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { checkPassword, createSessionToken, verifySessionToken, SESSION_COOKIE_NAME } from './auth';
import { SignJWT } from 'jose';

beforeEach(() => {
  vi.stubEnv('APP_PASSWORD', 'secret-du-groupe');
  vi.stubEnv('SESSION_SECRET', 'a-very-long-test-secret-key-0123456789');
});

describe('SESSION_COOKIE_NAME', () => {
  it('is a non-empty string', () => {
    expect(SESSION_COOKIE_NAME.length).toBeGreaterThan(0);
  });
});

describe('checkPassword', () => {
  it('accepts the configured password', () => {
    expect(checkPassword('secret-du-groupe')).toBe(true);
  });

  it('rejects any other password', () => {
    expect(checkPassword('wrong')).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(checkPassword('')).toBe(false);
  });
});

describe('session tokens', () => {
  it('round-trips: a freshly created token verifies successfully', async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
  });

  it('rejects a tampered token', async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(`${token}tampered`)).toBe(false);
  });

  it('rejects an expired token', async () => {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const expiredToken = await new SignJWT({ role: 'member' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret);
    expect(await verifySessionToken(expiredToken)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: FAIL — `Cannot find module './auth'`.

- [ ] **Step 3: Implement `src/lib/auth.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE_NAME = 'clef_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 jours

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set.');
  return new TextEncoder().encode(secret);
}

export function checkPassword(password: string): boolean {
  return password.length > 0 && password === process.env.APP_PASSWORD;
}

export async function createSessionToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: 'member' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_DURATION_SECONDS)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecretKey());
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.test.ts
git commit -m "feat: add shared-password auth and signed session tokens"
```

---

### Task 9: Auth API routes and middleware

**Files:**
- Create: `src/app/api/login/route.ts`
- Create: `src/app/api/logout/route.ts`
- Create: `src/middleware.ts`
- Test: `src/app/api/login/route.test.ts`
- Test: `src/middleware.test.ts`

**Interfaces:**
- Consumes: `checkPassword`, `createSessionToken`, `verifySessionToken`, `SESSION_COOKIE_NAME` from `src/lib/auth.ts`.
- Produces: `POST /api/login`, `POST /api/logout`, `middleware(request: NextRequest)` — gates every page/route except `/login` and `/api/login`.

- [ ] **Step 1: Write the failing test for the login route**

```ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { POST } from './route';

beforeEach(() => {
  vi.stubEnv('APP_PASSWORD', 'secret-du-groupe');
  vi.stubEnv('SESSION_SECRET', 'a-very-long-test-secret-key-0123456789');
});

describe('POST /api/login', () => {
  it('returns 401 for a wrong password', async () => {
    const request = new Request('http://localhost/api/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('sets a session cookie for the correct password', async () => {
    const request = new Request('http://localhost/api/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'secret-du-groupe' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('clef_session=');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/api/login/route.test.ts`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Implement `src/app/api/login/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { checkPassword, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };
  if (!checkPassword(password ?? '')) {
    return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 });
  }
  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/api/login/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement `src/app/api/logout/route.ts` (no test — trivial cookie clear mirrored by the login test's cookie assertion pattern)**

```ts
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return response;
}
```

- [ ] **Step 6: Write the failing test for the middleware**

```ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'a-very-long-test-secret-key-0123456789');
});

describe('middleware', () => {
  it('redirects to /login when there is no session cookie', async () => {
    const request = new NextRequest('http://localhost/');
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login');
  });

  it('lets the request through when the session cookie is valid', async () => {
    const token = await createSessionToken();
    const request = new NextRequest('http://localhost/', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });
    const response = await middleware(request);
    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npx vitest run src/middleware.test.ts`
Expected: FAIL — `Cannot find module './middleware'`.

- [ ] **Step 8: Implement `src/middleware.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export const config = {
  matcher: ['/((?!login|api/login|_next/static|_next/image|favicon.ico).*)'],
};

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token && (await verifySessionToken(token))) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL('/login', request.url));
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run src/middleware.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 10: Commit**

```bash
git add src/app/api/login/route.ts src/app/api/login/route.test.ts src/app/api/logout/route.ts src/middleware.ts src/middleware.test.ts
git commit -m "feat: add login/logout routes and session-checking middleware"
```

---

### Task 10: Data API routes

**Files:**
- Create: `src/app/api/data/route.ts`
- Test: `src/app/api/data/route.test.ts`

**Interfaces:**
- Consumes: `loadData`, `saveData`, `SaveConflictError` from `src/lib/dataStore.ts`; `DataStore` from `src/lib/types.ts`. Requires `GOOGLE_DRIVE_FILE_ID` env var.
- Produces: `GET /api/data` → `{ data: DataStore; modifiedTime: string }`; `PUT /api/data` (body `{ data, expectedModifiedTime, force? }`) → `200 { ok: true; modifiedTime }` or `409 { error: 'conflict'; currentModifiedTime }` — used by Task 13's `useDataStore` hook.

- [ ] **Step 1: Write the failing tests, mocking `@/lib/dataStore`**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET, PUT } from './route';
import * as dataStore from '@/lib/dataStore';
import { createDefaultDataStore } from '@/lib/defaultData';

vi.mock('@/lib/dataStore');

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('GOOGLE_DRIVE_FILE_ID', 'file-123');
});

describe('GET /api/data', () => {
  it('returns the loaded data and modifiedTime', async () => {
    const data = createDefaultDataStore();
    vi.mocked(dataStore.loadData).mockResolvedValue({ data, modifiedTime: '2026-09-29T10:00:00.000Z' });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ data, modifiedTime: '2026-09-29T10:00:00.000Z' });
  });
});

describe('PUT /api/data', () => {
  it('saves the data and returns the new modifiedTime', async () => {
    vi.mocked(dataStore.saveData).mockResolvedValue('2026-09-29T10:05:00.000Z');
    const data = createDefaultDataStore();
    const request = new Request('http://localhost/api/data', {
      method: 'PUT',
      body: JSON.stringify({ data, expectedModifiedTime: '2026-09-29T10:00:00.000Z' }),
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, modifiedTime: '2026-09-29T10:05:00.000Z' });
    expect(dataStore.saveData).toHaveBeenCalledWith('file-123', data, '2026-09-29T10:00:00.000Z', false);
  });

  it('returns 409 with the current modifiedTime on conflict', async () => {
    vi.mocked(dataStore.saveData).mockRejectedValue(new dataStore.SaveConflictError('2026-09-29T10:10:00.000Z'));
    const data = createDefaultDataStore();
    const request = new Request('http://localhost/api/data', {
      method: 'PUT',
      body: JSON.stringify({ data, expectedModifiedTime: '2026-09-29T10:00:00.000Z' }),
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: 'conflict', currentModifiedTime: '2026-09-29T10:10:00.000Z' });
  });

  it('forwards the force flag', async () => {
    vi.mocked(dataStore.saveData).mockResolvedValue('2026-09-29T10:05:00.000Z');
    const data = createDefaultDataStore();
    const request = new Request('http://localhost/api/data', {
      method: 'PUT',
      body: JSON.stringify({ data, expectedModifiedTime: '2026-09-29T10:00:00.000Z', force: true }),
    });

    await PUT(request);

    expect(dataStore.saveData).toHaveBeenCalledWith('file-123', data, '2026-09-29T10:00:00.000Z', true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/api/data/route.test.ts`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Implement `src/app/api/data/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { loadData, saveData, SaveConflictError } from '@/lib/dataStore';
import type { DataStore } from '@/lib/types';

function getFileId(): string {
  const fileId = process.env.GOOGLE_DRIVE_FILE_ID;
  if (!fileId) throw new Error('GOOGLE_DRIVE_FILE_ID is not set.');
  return fileId;
}

export async function GET() {
  const { data, modifiedTime } = await loadData(getFileId());
  return NextResponse.json({ data, modifiedTime });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    data: DataStore;
    expectedModifiedTime: string;
    force?: boolean;
  };
  try {
    const modifiedTime = await saveData(getFileId(), body.data, body.expectedModifiedTime, body.force ?? false);
    return NextResponse.json({ ok: true, modifiedTime });
  } catch (error) {
    if (error instanceof SaveConflictError) {
      return NextResponse.json(
        { error: 'conflict', currentModifiedTime: error.currentModifiedTime },
        { status: 409 }
      );
    }
    throw error;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/api/data/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/data/route.ts src/app/api/data/route.test.ts
git commit -m "feat: add /api/data route with conflict-aware save"
```

---

### Task 11: Excel export

**Files:**
- Create: `src/lib/excelExport.ts`
- Create: `src/app/api/export/route.ts`
- Test: `src/lib/excelExport.test.ts`
- Test: `src/app/api/export/route.test.ts`

**Interfaces:**
- Consumes: `DataStore` from `src/lib/types.ts`; `calculLoyerMoyenMensuel`, `calculMensualiteCredit`, `calculMensualiteBreakeven`, `calculRentabiliteNettePourcent`, `calculMaxEncheres` from `src/lib/calculations.ts`; `loadData` from `src/lib/dataStore.ts`.
- Produces: `buildWorkbookBuffer(data: DataStore): Promise<Buffer>`; `GET /api/export` — used by Task 20's export button.

- [ ] **Step 1: Write the failing test for `buildWorkbookBuffer`**

```ts
import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildWorkbookBuffer } from './excelExport';
import { createDefaultDataStore } from './defaultData';
import type { Bien } from './types';

function makeBien(overrides: Partial<Bien> = {}): Bien {
  return {
    id: 'b1',
    lienAnnonce: 'https://example.com/annonce',
    lieu: 'Eaubonne',
    typePiece: '4P+',
    surfaceSol: 95,
    surfaceConfort: 30,
    equipements: null,
    prixAchat: 259000,
    prixTravaux: 5000,
    tauxCredit: 2,
    dureeCreditAnnees: 25,
    loyerM2Override: null,
    taxeFonciere: 1200,
    chargesCopro: 600,
    autresCharges: 0,
    classeEnergie: 'D',
    dateVisite: null,
    dateVente: null,
    commentaireAntho: '',
    commentaireGilly: '',
    commentaireDecision: '',
    ...overrides,
  };
}

describe('buildWorkbookBuffer', () => {
  it('writes the bien with its computed columns onto the Analyse sheet', async () => {
    const data = createDefaultDataStore();
    data.referentielLoyers = [{ ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 }];
    data.biens = [makeBien()];

    const buffer = await buildWorkbookBuffer(data);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const analyse = workbook.getWorksheet('Analyse');
    expect(analyse).toBeDefined();
    const row = analyse!.getRow(2);
    expect(row.getCell(1).value).toBe('https://example.com/annonce');
    expect(row.getCell(9).value as number).toBeCloseTo(1612.5, 4);
  });

  it('writes the référentiel loyers onto its own sheet', async () => {
    const data = createDefaultDataStore();
    data.referentielLoyers = [{ ville: 'Paris', typePiece: '2P', loyerM2: 29.3 }];

    const buffer = await buildWorkbookBuffer(data);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const referentiel = workbook.getWorksheet('Aide Loyer Moyen');
    expect(referentiel!.getRow(2).getCell(1).value).toBe('Paris');
    expect(referentiel!.getRow(2).getCell(3).value).toBe(29.3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/excelExport.test.ts`
Expected: FAIL — `Cannot find module './excelExport'`.

- [ ] **Step 3: Implement `src/lib/excelExport.ts`**

```ts
import ExcelJS from 'exceljs';
import type { DataStore } from './types';
import {
  calculLoyerMoyenMensuel,
  calculMensualiteCredit,
  calculMensualiteBreakeven,
  calculRentabiliteNettePourcent,
  calculMaxEncheres,
} from './calculations';

export async function buildWorkbookBuffer(data: DataStore): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const analyse = workbook.addWorksheet('Analyse');
  analyse.columns = [
    { header: 'Lien annonce', key: 'lienAnnonce' },
    { header: 'Lieu', key: 'lieu' },
    { header: 'Type', key: 'typePiece' },
    { header: 'Surface sol m2', key: 'surfaceSol' },
    { header: 'Surface confort m2', key: 'surfaceConfort' },
    { header: 'Prix achat', key: 'prixAchat' },
    { header: 'Prix travaux', key: 'prixTravaux' },
    { header: 'Taux crédit %', key: 'tauxCredit' },
    { header: 'Loyer moyen mensuel', key: 'loyerMoyenMensuel' },
    { header: 'Mensualité crédit', key: 'mensualiteCredit' },
    { header: 'Taxe foncière /an', key: 'taxeFonciere' },
    { header: 'Charges copro /an', key: 'chargesCopro' },
    { header: 'Autres charges /an', key: 'autresCharges' },
    { header: 'Mensualité breakeven', key: 'mensualiteBreakeven' },
    { header: 'Rentabilité nette %', key: 'rentabiliteNette' },
    { header: 'Max enchères', key: 'maxEncheres' },
    { header: 'Classe énergie', key: 'classeEnergie' },
    { header: 'Commentaire Antho', key: 'commentaireAntho' },
    { header: 'Commentaire Gilly', key: 'commentaireGilly' },
    { header: 'Commentaire décision', key: 'commentaireDecision' },
  ];
  for (const bien of data.biens) {
    analyse.addRow({
      lienAnnonce: bien.lienAnnonce,
      lieu: bien.lieu,
      typePiece: bien.typePiece,
      surfaceSol: bien.surfaceSol,
      surfaceConfort: bien.surfaceConfort,
      prixAchat: bien.prixAchat,
      prixTravaux: bien.prixTravaux,
      tauxCredit: bien.tauxCredit,
      loyerMoyenMensuel: calculLoyerMoyenMensuel(bien, data.referentielLoyers),
      mensualiteCredit: calculMensualiteCredit(bien),
      taxeFonciere: bien.taxeFonciere,
      chargesCopro: bien.chargesCopro,
      autresCharges: bien.autresCharges,
      mensualiteBreakeven: calculMensualiteBreakeven(bien, data.referentielLoyers),
      rentabiliteNette: calculRentabiliteNettePourcent(bien, data.referentielLoyers),
      maxEncheres: calculMaxEncheres(bien, data.referentielLoyers, data.settings.objectifRentabilitePourcent),
      classeEnergie: bien.classeEnergie,
      commentaireAntho: bien.commentaireAntho,
      commentaireGilly: bien.commentaireGilly,
      commentaireDecision: bien.commentaireDecision,
    });
  }

  const referentiel = workbook.addWorksheet('Aide Loyer Moyen');
  referentiel.columns = [
    { header: 'Ville', key: 'ville' },
    { header: 'Type', key: 'typePiece' },
    { header: 'Loyer m2', key: 'loyerM2' },
  ];
  referentiel.addRows(data.referentielLoyers);

  const bareme = workbook.addWorksheet('Aide m2 supp confort');
  bareme.columns = [
    { header: 'Équipement', key: 'label' },
    { header: 'm2 bonus', key: 'm2Bonus' },
  ];
  bareme.addRows(data.baremeConfort);

  const emails = workbook.addWorksheet('Email');
  emails.columns = [
    { header: 'Titre', key: 'titre' },
    { header: 'Corps', key: 'corps' },
  ];
  emails.addRows(data.emailTemplates);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/excelExport.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for the export route**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from './route';
import * as dataStore from '@/lib/dataStore';
import * as excelExport from '@/lib/excelExport';
import { createDefaultDataStore } from '@/lib/defaultData';

vi.mock('@/lib/dataStore');
vi.mock('@/lib/excelExport');

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('GOOGLE_DRIVE_FILE_ID', 'file-123');
});

describe('GET /api/export', () => {
  it('streams the generated workbook as an xlsx attachment', async () => {
    vi.mocked(dataStore.loadData).mockResolvedValue({
      data: createDefaultDataStore(),
      modifiedTime: '2026-09-29T10:00:00.000Z',
    });
    vi.mocked(excelExport.buildWorkbookBuffer).mockResolvedValue(Buffer.from('fake-xlsx'));

    const response = await GET();
    const body = await response.arrayBuffer();

    expect(response.headers.get('content-type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(response.headers.get('content-disposition')).toContain('Immo.xlsx');
    expect(Buffer.from(body).toString()).toBe('fake-xlsx');
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/app/api/export/route.test.ts`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 7: Implement `src/app/api/export/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { loadData } from '@/lib/dataStore';
import { buildWorkbookBuffer } from '@/lib/excelExport';

export async function GET() {
  const fileId = process.env.GOOGLE_DRIVE_FILE_ID;
  if (!fileId) throw new Error('GOOGLE_DRIVE_FILE_ID is not set.');
  const { data } = await loadData(fileId);
  const buffer = await buildWorkbookBuffer(data);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Immo.xlsx"',
    },
  });
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/app/api/export/route.test.ts`
Expected: PASS (1 test).

- [ ] **Step 9: Commit**

```bash
git add src/lib/excelExport.ts src/lib/excelExport.test.ts src/app/api/export/route.ts src/app/api/export/route.test.ts
git commit -m "feat: add Excel export builder and /api/export route"
```

---

### Task 12: Excel import

**Files:**
- Create: `src/lib/excelImport.ts`
- Create: `src/app/api/import/route.ts`
- Test: `src/lib/excelImport.test.ts`
- Test: `src/app/api/import/route.test.ts`

**Interfaces:**
- Consumes: `DataStore`, `Bien`, `ReferentielLoyer`, `BaremeConfortItem` from `src/lib/types.ts`; `createDefaultDataStore` from `src/lib/defaultData.ts`; `loadData`, `saveData` from `src/lib/dataStore.ts`.
- Produces: `ImportResult` (`{ ok: true; data: DataStore } | { ok: false; errors: string[] }`), `parseWorkbookBuffer(buffer: Buffer): Promise<ImportResult>`; `POST /api/import` — used by Task 20's import button.

- [ ] **Step 1: Write the failing tests, building fixture workbooks with `exceljs` directly**

```ts
import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { parseWorkbookBuffer } from './excelImport';

async function buildValidWorkbookBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const analyse = workbook.addWorksheet('Analyse');
  analyse.columns = [
    { header: 'Lien annonce', key: 'lienAnnonce' },
    { header: 'Lieu', key: 'lieu' },
    { header: 'Type', key: 'typePiece' },
    { header: 'Surface sol m2', key: 'surfaceSol' },
    { header: 'Surface confort m2', key: 'surfaceConfort' },
    { header: 'Prix achat', key: 'prixAchat' },
    { header: 'Prix travaux', key: 'prixTravaux' },
    { header: 'Taux crédit %', key: 'tauxCredit' },
    { header: 'Taxe foncière /an', key: 'taxeFonciere' },
    { header: 'Charges copro /an', key: 'chargesCopro' },
    { header: 'Autres charges /an', key: 'autresCharges' },
    { header: 'Classe énergie', key: 'classeEnergie' },
    { header: 'Commentaire Antho', key: 'commentaireAntho' },
    { header: 'Commentaire Gilly', key: 'commentaireGilly' },
    { header: 'Commentaire décision', key: 'commentaireDecision' },
  ];
  analyse.addRow({
    lienAnnonce: 'https://example.com/a',
    lieu: 'Eaubonne',
    typePiece: '4P+',
    surfaceSol: 95,
    surfaceConfort: 30,
    prixAchat: 259000,
    prixTravaux: 5000,
    tauxCredit: 2,
    taxeFonciere: 1200,
    chargesCopro: 600,
    autresCharges: null,
    classeEnergie: 'D',
    commentaireAntho: '',
    commentaireGilly: '',
    commentaireDecision: '',
  });

  const referentiel = workbook.addWorksheet('Aide Loyer Moyen');
  referentiel.columns = [
    { header: 'Ville', key: 'ville' },
    { header: 'Type', key: 'typePiece' },
    { header: 'Loyer m2', key: 'loyerM2' },
  ];
  referentiel.addRow({ ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 });

  const bareme = workbook.addWorksheet('Aide m2 supp confort');
  bareme.columns = [
    { header: 'Équipement', key: 'label' },
    { header: 'm2 bonus', key: 'm2Bonus' },
  ];
  bareme.addRow({ label: 'Eau courante', m2Bonus: 4 });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('parseWorkbookBuffer', () => {
  it('maps a valid workbook to a DataStore', async () => {
    const buffer = await buildValidWorkbookBuffer();
    const result = await parseWorkbookBuffer(buffer);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.data.biens).toHaveLength(1);
    expect(result.data.biens[0].lienAnnonce).toBe('https://example.com/a');
    expect(result.data.biens[0].surfaceSol).toBe(95);
    expect(result.data.referentielLoyers).toEqual([{ ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 }]);
    expect(result.data.baremeConfort).toEqual([{ label: 'Eau courante', m2Bonus: 4 }]);
  });

  it('maps a blank numeric cell to 0, not NaN', async () => {
    const buffer = await buildValidWorkbookBuffer();
    const result = await parseWorkbookBuffer(buffer);

    if (!result.ok) throw new Error('expected ok result');
    expect(result.data.biens[0].autresCharges).toBe(0);
  });

  it('rejects a workbook missing a required column, without returning partial data', async () => {
    const workbook = new ExcelJS.Workbook();
    const analyse = workbook.addWorksheet('Analyse');
    analyse.addRow(['Lieu', 'Type']); // 'Lien annonce' header missing
    workbook.addWorksheet('Aide Loyer Moyen');
    workbook.addWorksheet('Aide m2 supp confort');
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await parseWorkbookBuffer(buffer);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure result');
    expect(result.errors.some((e) => e.includes('Lien annonce'))).toBe(true);
  });

  it('rejects a workbook missing an entire required sheet', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Analyse');
    workbook.addWorksheet('Aide m2 supp confort');
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await parseWorkbookBuffer(buffer);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure result');
    expect(result.errors.some((e) => e.includes('Aide Loyer Moyen'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/excelImport.test.ts`
Expected: FAIL — `Cannot find module './excelImport'`.

- [ ] **Step 3: Implement `src/lib/excelImport.ts`**

```ts
import ExcelJS from 'exceljs';
import { randomUUID } from 'node:crypto';
import type { Bien, BaremeConfortItem, DataStore, ReferentielLoyer } from './types';
import { createDefaultDataStore } from './defaultData';

export type ImportResult = { ok: true; data: DataStore } | { ok: false; errors: string[] };

const REQUIRED_ANALYSE_HEADERS = [
  'Lien annonce',
  'Lieu',
  'Type',
  'Surface sol m2',
  'Surface confort m2',
  'Prix achat',
  'Prix travaux',
  'Taux crédit %',
  'Taxe foncière /an',
  'Charges copro /an',
  'Autres charges /an',
  'Classe énergie',
  'Commentaire Antho',
  'Commentaire Gilly',
  'Commentaire décision',
];
const REQUIRED_REFERENTIEL_HEADERS = ['Ville', 'Type', 'Loyer m2'];
const REQUIRED_BAREME_HEADERS = ['Équipement', 'm2 bonus'];

function readHeaderRow(sheet: ExcelJS.Worksheet | undefined): string[] {
  if (!sheet) return [];
  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim();
  });
  return headers;
}

function missingHeaders(actual: string[], required: string[]): string[] {
  return required.filter((header) => !actual.includes(header));
}

function toSafeNumber(value: ExcelJS.CellValue): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toSafeString(value: ExcelJS.CellValue): string {
  return value == null ? '' : String(value);
}

export async function parseWorkbookBuffer(buffer: Buffer): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const analyseSheet = workbook.getWorksheet('Analyse');
  const referentielSheet = workbook.getWorksheet('Aide Loyer Moyen');
  const baremeSheet = workbook.getWorksheet('Aide m2 supp confort');

  const errors: string[] = [];
  if (!analyseSheet) errors.push('Feuille "Analyse" manquante.');
  if (!referentielSheet) errors.push('Feuille "Aide Loyer Moyen" manquante.');
  if (!baremeSheet) errors.push('Feuille "Aide m2 supp confort" manquante.');

  const analyseHeaders = readHeaderRow(analyseSheet);
  const referentielHeaders = readHeaderRow(referentielSheet);
  const baremeHeaders = readHeaderRow(baremeSheet);

  if (analyseSheet) {
    missingHeaders(analyseHeaders, REQUIRED_ANALYSE_HEADERS).forEach((h) =>
      errors.push(`Colonne "${h}" manquante dans la feuille "Analyse".`)
    );
  }
  if (referentielSheet) {
    missingHeaders(referentielHeaders, REQUIRED_REFERENTIEL_HEADERS).forEach((h) =>
      errors.push(`Colonne "${h}" manquante dans la feuille "Aide Loyer Moyen".`)
    );
  }
  if (baremeSheet) {
    missingHeaders(baremeHeaders, REQUIRED_BAREME_HEADERS).forEach((h) =>
      errors.push(`Colonne "${h}" manquante dans la feuille "Aide m2 supp confort".`)
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const data = createDefaultDataStore();

  analyseSheet!.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cell = (header: string) => row.getCell(analyseHeaders.indexOf(header) + 1).value;
    const bien: Bien = {
      id: randomUUID(),
      lienAnnonce: toSafeString(cell('Lien annonce')),
      lieu: toSafeString(cell('Lieu')),
      typePiece: toSafeString(cell('Type')),
      surfaceSol: toSafeNumber(cell('Surface sol m2')),
      surfaceConfort: toSafeNumber(cell('Surface confort m2')),
      equipements: null,
      prixAchat: toSafeNumber(cell('Prix achat')),
      prixTravaux: toSafeNumber(cell('Prix travaux')),
      tauxCredit: toSafeNumber(cell('Taux crédit %')),
      dureeCreditAnnees: 25,
      loyerM2Override: null,
      taxeFonciere: toSafeNumber(cell('Taxe foncière /an')),
      chargesCopro: toSafeNumber(cell('Charges copro /an')),
      autresCharges: toSafeNumber(cell('Autres charges /an')),
      classeEnergie: toSafeString(cell('Classe énergie')),
      dateVisite: null,
      dateVente: null,
      commentaireAntho: toSafeString(cell('Commentaire Antho')),
      commentaireGilly: toSafeString(cell('Commentaire Gilly')),
      commentaireDecision: toSafeString(cell('Commentaire décision')),
    };
    data.biens.push(bien);
  });

  referentielSheet!.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cell = (header: string) => row.getCell(referentielHeaders.indexOf(header) + 1).value;
    const entry: ReferentielLoyer = {
      ville: toSafeString(cell('Ville')),
      typePiece: toSafeString(cell('Type')),
      loyerM2: toSafeNumber(cell('Loyer m2')),
    };
    data.referentielLoyers.push(entry);
  });

  data.baremeConfort = [];
  baremeSheet!.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cell = (header: string) => row.getCell(baremeHeaders.indexOf(header) + 1).value;
    const entry: BaremeConfortItem = {
      label: toSafeString(cell('Équipement')),
      m2Bonus: toSafeNumber(cell('m2 bonus')),
    };
    data.baremeConfort.push(entry);
  });

  return { ok: true, data };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/excelImport.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing test for the import route**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from './route';
import * as excelImport from '@/lib/excelImport';
import * as dataStore from '@/lib/dataStore';
import { createDefaultDataStore } from '@/lib/defaultData';

vi.mock('@/lib/excelImport');
vi.mock('@/lib/dataStore');

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('GOOGLE_DRIVE_FILE_ID', 'file-123');
});

function buildRequestWithFile(): Request {
  const formData = new FormData();
  formData.set('file', new Blob(['fake-bytes']), 'Immo.xlsx');
  return new Request('http://localhost/api/import', { method: 'POST', body: formData });
}

describe('POST /api/import', () => {
  it('returns 400 with the validation errors when the workbook is invalid', async () => {
    vi.mocked(excelImport.parseWorkbookBuffer).mockResolvedValue({
      ok: false,
      errors: ['Feuille "Analyse" manquante.'],
    });

    const response = await POST(buildRequestWithFile());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'invalid', details: ['Feuille "Analyse" manquante.'] });
    expect(dataStore.saveData).not.toHaveBeenCalled();
  });

  it('replaces the stored data and returns the new modifiedTime when the workbook is valid', async () => {
    const imported = createDefaultDataStore();
    vi.mocked(excelImport.parseWorkbookBuffer).mockResolvedValue({ ok: true, data: imported });
    vi.mocked(dataStore.loadData).mockResolvedValue({
      data: createDefaultDataStore(),
      modifiedTime: '2026-09-29T10:00:00.000Z',
    });
    vi.mocked(dataStore.saveData).mockResolvedValue('2026-09-29T10:05:00.000Z');

    const response = await POST(buildRequestWithFile());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, modifiedTime: '2026-09-29T10:05:00.000Z' });
    expect(dataStore.saveData).toHaveBeenCalledWith('file-123', imported, '2026-09-29T10:00:00.000Z', true);
  });

  it('returns 400 when no file is provided', async () => {
    const response = await POST(new Request('http://localhost/api/import', { method: 'POST', body: new FormData() }));
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/app/api/import/route.test.ts`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 7: Implement `src/app/api/import/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { parseWorkbookBuffer } from '@/lib/excelImport';
import { loadData, saveData } from '@/lib/dataStore';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await parseWorkbookBuffer(buffer);
  if (!result.ok) {
    return NextResponse.json({ error: 'invalid', details: result.errors }, { status: 400 });
  }

  const fileId = process.env.GOOGLE_DRIVE_FILE_ID;
  if (!fileId) throw new Error('GOOGLE_DRIVE_FILE_ID is not set.');
  const { modifiedTime } = await loadData(fileId);
  const newModifiedTime = await saveData(fileId, result.data, modifiedTime, true);
  return NextResponse.json({ ok: true, modifiedTime: newModifiedTime });
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/app/api/import/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add src/lib/excelImport.ts src/lib/excelImport.test.ts src/app/api/import/route.ts src/app/api/import/route.test.ts
git commit -m "feat: add Excel import parser with column validation and /api/import route"
```

---

### Task 13: Client data hook

**Files:**
- Create: `src/hooks/useDataStore.ts`
- Test: `src/hooks/useDataStore.test.ts`

**Interfaces:**
- Consumes: `DataStore` from `src/lib/types.ts`; `fetch('/api/data')` (GET/PUT).
- Produces: `useDataStore()` returning `{ data: DataStore | null; loading: boolean; error: string | null; conflict: { currentModifiedTime: string } | null; save(next: DataStore, force?: boolean): Promise<void>; resolveConflictReload(): Promise<void> }` — used by Tasks 15–20's pages.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDataStore } from './useDataStore';
import { createDefaultDataStore } from '@/lib/defaultData';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useDataStore', () => {
  it('loads the data on mount', async () => {
    const data = createDefaultDataStore();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data, modifiedTime: '2026-09-29T10:00:00.000Z' }),
      })
    );

    const { result } = renderHook(() => useDataStore());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(data);
    expect(result.current.error).toBeNull();
  });

  it('updates data and modifiedTime after a successful save', async () => {
    const initial = createDefaultDataStore();
    const updated = { ...initial, emailTemplates: [{ titre: 'Test', corps: 'Corps' }] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: initial, modifiedTime: 'v1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, modifiedTime: 'v2' }) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDataStore());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save(updated);
    });

    expect(result.current.data).toEqual(updated);
    expect(result.current.conflict).toBeNull();
  });

  it('exposes a conflict instead of overwriting data when the server returns 409', async () => {
    const initial = createDefaultDataStore();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: initial, modifiedTime: 'v1' }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'conflict', currentModifiedTime: 'v2' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDataStore());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save({ ...initial, emailTemplates: [{ titre: 'X', corps: 'Y' }] });
    });

    expect(result.current.conflict).toEqual({ currentModifiedTime: 'v2' });
    expect(result.current.data).toEqual(initial);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/hooks/useDataStore.test.ts`
Expected: FAIL — `Cannot find module './useDataStore'`.

- [ ] **Step 3: Implement `src/hooks/useDataStore.ts`**

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DataStore } from '@/lib/types';

interface ConflictInfo {
  currentModifiedTime: string;
}

export function useDataStore() {
  const [data, setData] = useState<DataStore | null>(null);
  const [modifiedTime, setModifiedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Impossible de charger les données.');
      const body = await res.json();
      setData(body.data);
      setModifiedTime(body.modifiedTime);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const save = useCallback(
    async (next: DataStore, force = false) => {
      if (!modifiedTime) return;
      const res = await fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: next, expectedModifiedTime: modifiedTime, force }),
      });
      if (res.status === 409) {
        const body = await res.json();
        setConflict({ currentModifiedTime: body.currentModifiedTime });
        return;
      }
      if (!res.ok) {
        setError('Erreur lors de la sauvegarde.');
        return;
      }
      const body = await res.json();
      setData(next);
      setModifiedTime(body.modifiedTime);
      setConflict(null);
    },
    [modifiedTime]
  );

  const resolveConflictReload = useCallback(async () => {
    setConflict(null);
    await fetchData();
  }, [fetchData]);

  return { data, loading, error, conflict, save, resolveConflictReload };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/hooks/useDataStore.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDataStore.ts src/hooks/useDataStore.test.ts
git commit -m "feat: add useDataStore client hook with conflict handling"
```

---

### Task 14: Login page

**Files:**
- Create: `src/app/login/page.tsx`
- Test: `src/app/login/page.test.tsx`

**Interfaces:**
- Consumes: `POST /api/login` (Task 9).
- Produces: `/login` page — the only page middleware (Task 9) lets through unauthenticated.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('location', { href: '' } as unknown as Location);
});

describe('LoginPage', () => {
  it('shows an error message when the password is wrong', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Mot de passe incorrect.' }) })
    );
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Mot de passe'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('Mot de passe incorrect.')).toBeInTheDocument();
  });

  it('redirects to / after a successful login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret-du-groupe');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => expect(window.location.href).toBe('/'));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/login/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`.

- [ ] **Step 3: Implement `src/app/login/page.tsx`**

```tsx
'use client';

import { useState, type FormEvent } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? 'Erreur de connexion.');
      setSubmitting(false);
      return;
    }
    window.location.href = '/';
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow">
        <h1 className="text-xl font-semibold">CLEF</h1>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Se connecter
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/login/page.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/login/page.tsx src/app/login/page.test.tsx
git commit -m "feat: add login page"
```

---

### Task 15: Dashboard — biens table

**Files:**
- Create: `src/components/BienTable.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/components/BienTable.test.tsx`

**Interfaces:**
- Consumes: `Bien`, `ReferentielLoyer`, `Settings` from `src/lib/types.ts`; `calculLoyerMoyenMensuel`, `calculMensualiteCredit`, `calculMensualiteBreakeven`, `calculRentabiliteNettePourcent`, `calculMaxEncheres`, `trouverLoyerM2` from `src/lib/calculations.ts`; `useDataStore` from `src/hooks/useDataStore.ts`.
- Produces: `<BienTable biens referentielLoyers settings onDelete onAdd />` component; wires the dashboard route `/`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BienTable } from './BienTable';
import type { Bien, ReferentielLoyer, Settings } from '@/lib/types';

const settings: Settings = { objectifRentabilitePourcent: 6, tauxCreditParDefaut: 3, dureeCreditParDefautAnnees: 25 };
const referentielLoyers: ReferentielLoyer[] = [{ ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 }];

function makeBien(overrides: Partial<Bien> = {}): Bien {
  return {
    id: 'b1',
    lienAnnonce: '',
    lieu: 'Eaubonne',
    typePiece: '4P+',
    surfaceSol: 95,
    surfaceConfort: 30,
    equipements: null,
    prixAchat: 259000,
    prixTravaux: 5000,
    tauxCredit: 2,
    dureeCreditAnnees: 25,
    loyerM2Override: null,
    taxeFonciere: 1200,
    chargesCopro: 600,
    autresCharges: 0,
    classeEnergie: '',
    dateVisite: null,
    dateVente: null,
    commentaireAntho: '',
    commentaireGilly: '',
    commentaireDecision: '',
    ...overrides,
  };
}

describe('BienTable', () => {
  it('renders the computed rentabilité nette for each bien', () => {
    render(
      <BienTable biens={[makeBien()]} referentielLoyers={referentielLoyers} settings={settings} onDelete={vi.fn()} onAdd={vi.fn()} />
    );
    expect(screen.getByText('6.65%')).toBeInTheDocument();
  });

  it('shows a warning instead of a number when the référentiel has no match', () => {
    render(
      <BienTable
        biens={[makeBien({ lieu: 'Inconnue' })]}
        referentielLoyers={referentielLoyers}
        settings={settings}
        onDelete={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    expect(screen.getByText('loyer inconnu')).toBeInTheDocument();
  });

  it('calls onDelete with the bien id when the delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(
      <BienTable biens={[makeBien()]} referentielLoyers={referentielLoyers} settings={settings} onDelete={onDelete} onAdd={vi.fn()} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onDelete).toHaveBeenCalledWith('b1');
  });

  it('calls onAdd when the add button is clicked', async () => {
    const onAdd = vi.fn();
    render(<BienTable biens={[]} referentielLoyers={referentielLoyers} settings={settings} onDelete={vi.fn()} onAdd={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un bien' }));
    expect(onAdd).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/BienTable.test.tsx`
Expected: FAIL — `Cannot find module './BienTable'`.

- [ ] **Step 3: Implement `src/components/BienTable.tsx`**

```tsx
'use client';

import Link from 'next/link';
import type { Bien, ReferentielLoyer, Settings } from '@/lib/types';
import {
  calculMensualiteCredit,
  calculMensualiteBreakeven,
  calculRentabiliteNettePourcent,
  calculMaxEncheres,
  trouverLoyerM2,
} from '@/lib/calculations';

interface BienTableProps {
  biens: Bien[];
  referentielLoyers: ReferentielLoyer[];
  settings: Settings;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function BienTable({ biens, referentielLoyers, settings, onDelete, onAdd }: BienTableProps) {
  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Biens</h1>
        <button onClick={onAdd} className="rounded bg-slate-900 px-4 py-2 text-white">
          Ajouter un bien
        </button>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Lieu</th>
            <th className="p-2">Type</th>
            <th className="p-2">Mensualité crédit</th>
            <th className="p-2">Breakeven</th>
            <th className="p-2">Rentabilité nette</th>
            <th className="p-2">Max enchères</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {biens.map((bien) => {
            const loyerM2 = trouverLoyerM2(bien, referentielLoyers);
            return (
              <tr key={bien.id} className="border-b">
                <td className="p-2">
                  <Link href={`/biens/${bien.id}`}>{bien.lieu}</Link>
                </td>
                <td className="p-2">{bien.typePiece}</td>
                <td className="p-2">{calculMensualiteCredit(bien).toFixed(2)} €</td>
                <td className="p-2">
                  {loyerM2 === null ? 'loyer inconnu' : `${calculMensualiteBreakeven(bien, referentielLoyers).toFixed(2)} €`}
                </td>
                <td className="p-2">
                  {loyerM2 === null
                    ? 'loyer inconnu'
                    : `${calculRentabiliteNettePourcent(bien, referentielLoyers).toFixed(2)}%`}
                </td>
                <td className="p-2">
                  {loyerM2 === null
                    ? 'loyer inconnu'
                    : `${calculMaxEncheres(bien, referentielLoyers, settings.objectifRentabilitePourcent).toFixed(0)} €`}
                </td>
                <td className="p-2">
                  <button onClick={() => onDelete(bien.id)} className="text-red-600">
                    Supprimer
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/BienTable.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire `src/app/page.tsx` to `useDataStore` and `BienTable`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useDataStore } from '@/hooks/useDataStore';
import { BienTable } from '@/components/BienTable';
import { createDefaultDataStore } from '@/lib/defaultData';
import { randomUUID } from '@/lib/randomId';

export default function HomePage() {
  const { data, loading, error, save } = useDataStore();
  const router = useRouter();

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  async function handleAdd() {
    const nouveauBien = { ...createDefaultDataStore().biens, id: randomUUID() };
    void nouveauBien;
    router.push('/biens/new');
  }

  async function handleDelete(id: string) {
    await save({ ...data, biens: data.biens.filter((b) => b.id !== id) });
  }

  return (
    <BienTable
      biens={data.biens}
      referentielLoyers={data.referentielLoyers}
      settings={data.settings}
      onAdd={handleAdd}
      onDelete={handleDelete}
    />
  );
}
```

Note: this step introduces a call to `@/lib/randomId`, created in the next step, and navigates to `/biens/new` (built in Task 16) instead of creating the bien inline — the detail page owns creation.

- [ ] **Step 6: Create `src/lib/randomId.ts`**

```ts
export function randomUUID(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 7: Simplify `handleAdd` now that creation is delegated to the detail page**

Replace the body of `handleAdd` in `src/app/page.tsx` with:

```tsx
  function handleAdd() {
    router.push('/biens/new');
  }
```

Remove the now-unused `createDefaultDataStore` and `randomUUID` imports from `src/app/page.tsx`.

- [ ] **Step 8: Run the full test suite to confirm nothing broke**

Run: `npx vitest run`
Expected: PASS (all tests so far).

- [ ] **Step 9: Commit**

```bash
git add src/components/BienTable.tsx src/components/BienTable.test.tsx src/app/page.tsx src/lib/randomId.ts
git commit -m "feat: add dashboard biens table"
```

---

### Task 16: Bien detail page — form and confort calculator

**Files:**
- Create: `src/components/ConfortCalculator.tsx`
- Create: `src/components/BienForm.tsx`
- Create: `src/app/biens/[id]/page.tsx`
- Create: `src/app/biens/new/page.tsx`
- Test: `src/components/ConfortCalculator.test.tsx`
- Test: `src/components/BienForm.test.tsx`

**Interfaces:**
- Consumes: `calculSurfaceConfort` from `src/lib/confort.ts`; `BaremeConfortItem`, `Bien`, `ReferentielLoyer` from `src/lib/types.ts`; `trouverLoyerM2` from `src/lib/calculations.ts`; `useDataStore` from `src/hooks/useDataStore.ts`; `randomUUID` from `src/lib/randomId.ts`.
- Produces: `<ConfortCalculator bareme equipements onChange(surfaceConfort, equipements) />`, `<BienForm bien referentielLoyers baremeConfort onSubmit onCancel />` — used by `/biens/[id]` and `/biens/new`.

- [ ] **Step 1: Write the failing test for `ConfortCalculator`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfortCalculator } from './ConfortCalculator';
import type { BaremeConfortItem } from '@/lib/types';

const bareme: BaremeConfortItem[] = [
  { label: 'Eau courante', m2Bonus: 4 },
  { label: 'Gaz', m2Bonus: 2 },
];

describe('ConfortCalculator', () => {
  it('recomputes the surface confort live as quantities change', async () => {
    const onChange = vi.fn();
    render(<ConfortCalculator bareme={bareme} equipements={{}} onChange={onChange} />);

    await userEvent.clear(screen.getByLabelText('Eau courante'));
    await userEvent.type(screen.getByLabelText('Eau courante'), '2');

    expect(onChange).toHaveBeenLastCalledWith(8, { 'Eau courante': 2 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ConfortCalculator.test.tsx`
Expected: FAIL — `Cannot find module './ConfortCalculator'`.

- [ ] **Step 3: Implement `src/components/ConfortCalculator.tsx`**

```tsx
'use client';

import type { BaremeConfortItem } from '@/lib/types';
import { calculSurfaceConfort } from '@/lib/confort';

interface ConfortCalculatorProps {
  bareme: BaremeConfortItem[];
  equipements: Record<string, number>;
  onChange: (surfaceConfort: number, equipements: Record<string, number>) => void;
}

export function ConfortCalculator({ bareme, equipements, onChange }: ConfortCalculatorProps) {
  function handleQuantityChange(label: string, quantity: number) {
    const nextEquipements = { ...equipements, [label]: quantity };
    onChange(calculSurfaceConfort(nextEquipements, bareme), nextEquipements);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Équipements (surface confort)</legend>
      {bareme.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <label htmlFor={`confort-${item.label}`} className="w-48">
            {item.label}
          </label>
          <input
            id={`confort-${item.label}`}
            aria-label={item.label}
            type="number"
            min={0}
            value={equipements[item.label] ?? 0}
            onChange={(e) => handleQuantityChange(item.label, Number(e.target.value) || 0)}
            className="w-20 rounded border px-2 py-1"
          />
          <span className="text-sm text-slate-500">+{item.m2Bonus} m² / unité</span>
        </div>
      ))}
    </fieldset>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ConfortCalculator.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Write the failing test for `BienForm`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BienForm } from './BienForm';
import type { Bien, ReferentielLoyer, BaremeConfortItem } from '@/lib/types';

const referentielLoyers: ReferentielLoyer[] = [{ ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 }];
const baremeConfort: BaremeConfortItem[] = [{ label: 'Eau courante', m2Bonus: 4 }];

function makeBien(overrides: Partial<Bien> = {}): Bien {
  return {
    id: 'b1',
    lienAnnonce: '',
    lieu: '',
    typePiece: '',
    surfaceSol: 0,
    surfaceConfort: 0,
    equipements: {},
    prixAchat: 0,
    prixTravaux: 0,
    tauxCredit: 3,
    dureeCreditAnnees: 25,
    loyerM2Override: null,
    taxeFonciere: 0,
    chargesCopro: 0,
    autresCharges: 0,
    classeEnergie: '',
    dateVisite: null,
    dateVente: null,
    commentaireAntho: '',
    commentaireGilly: '',
    commentaireDecision: '',
    ...overrides,
  };
}

describe('BienForm', () => {
  it('submits the edited surfaceSol value', async () => {
    const onSubmit = vi.fn();
    render(
      <BienForm bien={makeBien()} referentielLoyers={referentielLoyers} baremeConfort={baremeConfort} onSubmit={onSubmit} onCancel={vi.fn()} />
    );

    await userEvent.type(screen.getByLabelText('Surface sol (m2)'), '95');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ surfaceSol: 95 }));
  });

  it('updates surfaceConfort when an equipment quantity changes', async () => {
    const onSubmit = vi.fn();
    render(
      <BienForm bien={makeBien()} referentielLoyers={referentielLoyers} baremeConfort={baremeConfort} onSubmit={onSubmit} onCancel={vi.fn()} />
    );

    await userEvent.clear(screen.getByLabelText('Eau courante'));
    await userEvent.type(screen.getByLabelText('Eau courante'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ surfaceConfort: 8 }));
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/components/BienForm.test.tsx`
Expected: FAIL — `Cannot find module './BienForm'`.

- [ ] **Step 7: Implement `src/components/BienForm.tsx`**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import type { Bien, ReferentielLoyer, BaremeConfortItem } from '@/lib/types';
import { ConfortCalculator } from './ConfortCalculator';

interface BienFormProps {
  bien: Bien;
  referentielLoyers: ReferentielLoyer[];
  baremeConfort: BaremeConfortItem[];
  onSubmit: (bien: Bien) => void;
  onCancel: () => void;
}

export function BienForm({ bien, referentielLoyers, baremeConfort, onSubmit, onCancel }: BienFormProps) {
  const [form, setForm] = useState<Bien>(bien);
  const villes = Array.from(new Set(referentielLoyers.map((r) => r.ville)));
  const typesPourVille = referentielLoyers.filter((r) => r.ville === form.lieu).map((r) => r.typePiece);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-8">
      <div>
        <label htmlFor="lienAnnonce" className="block text-sm font-medium">
          Lien annonce
        </label>
        <input
          id="lienAnnonce"
          value={form.lienAnnonce}
          onChange={(e) => setForm({ ...form, lienAnnonce: e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="lieu" className="block text-sm font-medium">
          Ville
        </label>
        <select
          id="lieu"
          value={form.lieu}
          onChange={(e) => setForm({ ...form, lieu: e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">—</option>
          {villes.map((ville) => (
            <option key={ville} value={ville}>
              {ville}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="typePiece" className="block text-sm font-medium">
          Type
        </label>
        <select
          id="typePiece"
          value={form.typePiece}
          onChange={(e) => setForm({ ...form, typePiece: e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">—</option>
          {typesPourVille.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="surfaceSol" className="block text-sm font-medium">
          Surface sol (m2)
        </label>
        <input
          id="surfaceSol"
          type="number"
          value={form.surfaceSol}
          onChange={(e) => setForm({ ...form, surfaceSol: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <ConfortCalculator
        bareme={baremeConfort}
        equipements={form.equipements ?? {}}
        onChange={(surfaceConfort, equipements) => setForm({ ...form, surfaceConfort, equipements })}
      />
      <div>
        <label htmlFor="prixAchat" className="block text-sm font-medium">
          Prix achat
        </label>
        <input
          id="prixAchat"
          type="number"
          value={form.prixAchat}
          onChange={(e) => setForm({ ...form, prixAchat: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="prixTravaux" className="block text-sm font-medium">
          Prix travaux
        </label>
        <input
          id="prixTravaux"
          type="number"
          value={form.prixTravaux}
          onChange={(e) => setForm({ ...form, prixTravaux: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="tauxCredit" className="block text-sm font-medium">
          Taux crédit (%)
        </label>
        <input
          id="tauxCredit"
          type="number"
          step="0.1"
          value={form.tauxCredit}
          onChange={(e) => setForm({ ...form, tauxCredit: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="taxeFonciere" className="block text-sm font-medium">
          Taxe foncière /an
        </label>
        <input
          id="taxeFonciere"
          type="number"
          value={form.taxeFonciere}
          onChange={(e) => setForm({ ...form, taxeFonciere: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="chargesCopro" className="block text-sm font-medium">
          Charges copro /an
        </label>
        <input
          id="chargesCopro"
          type="number"
          value={form.chargesCopro}
          onChange={(e) => setForm({ ...form, chargesCopro: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="autresCharges" className="block text-sm font-medium">
          Autres charges /an
        </label>
        <input
          id="autresCharges"
          type="number"
          value={form.autresCharges}
          onChange={(e) => setForm({ ...form, autresCharges: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="dureeCreditAnnees" className="block text-sm font-medium">
          Durée crédit (années)
        </label>
        <input
          id="dureeCreditAnnees"
          type="number"
          value={form.dureeCreditAnnees}
          onChange={(e) => setForm({ ...form, dureeCreditAnnees: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="loyerM2Override" className="block text-sm font-medium">
          Loyer €/m² (surcharge manuelle, laisser vide pour utiliser le référentiel)
        </label>
        <input
          id="loyerM2Override"
          type="number"
          step="0.1"
          value={form.loyerM2Override ?? ''}
          onChange={(e) =>
            setForm({ ...form, loyerM2Override: e.target.value === '' ? null : Number(e.target.value) })
          }
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="classeEnergie" className="block text-sm font-medium">
          Classe énergie
        </label>
        <input
          id="classeEnergie"
          value={form.classeEnergie}
          onChange={(e) => setForm({ ...form, classeEnergie: e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="dateVisite" className="block text-sm font-medium">
          Date de visite
        </label>
        <input
          id="dateVisite"
          type="date"
          value={form.dateVisite ?? ''}
          onChange={(e) => setForm({ ...form, dateVisite: e.target.value === '' ? null : e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="dateVente" className="block text-sm font-medium">
          Date de vente
        </label>
        <input
          id="dateVente"
          type="date"
          value={form.dateVente ?? ''}
          onChange={(e) => setForm({ ...form, dateVente: e.target.value === '' ? null : e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="commentaireAntho" className="block text-sm font-medium">
          Commentaire Antho
        </label>
        <textarea
          id="commentaireAntho"
          value={form.commentaireAntho}
          onChange={(e) => setForm({ ...form, commentaireAntho: e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="commentaireGilly" className="block text-sm font-medium">
          Commentaire Gilly
        </label>
        <textarea
          id="commentaireGilly"
          value={form.commentaireGilly}
          onChange={(e) => setForm({ ...form, commentaireGilly: e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="commentaireDecision" className="block text-sm font-medium">
          Commentaire décision
        </label>
        <textarea
          id="commentaireDecision"
          value={form.commentaireDecision}
          onChange={(e) => setForm({ ...form, commentaireDecision: e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Enregistrer
        </button>
        <button type="button" onClick={onCancel} className="rounded border px-4 py-2">
          Annuler
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/components/BienForm.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Create the empty-bien factory in `src/lib/defaultData.ts`**

Append to the file:

```ts
import type { Bien } from './types';

export function createEmptyBien(id: string): Bien {
  return {
    id,
    lienAnnonce: '',
    lieu: '',
    typePiece: '',
    surfaceSol: 0,
    surfaceConfort: 0,
    equipements: {},
    prixAchat: 0,
    prixTravaux: 0,
    tauxCredit: 3,
    dureeCreditAnnees: 25,
    loyerM2Override: null,
    taxeFonciere: 0,
    chargesCopro: 0,
    autresCharges: 0,
    classeEnergie: '',
    dateVisite: null,
    dateVente: null,
    commentaireAntho: '',
    commentaireGilly: '',
    commentaireDecision: '',
  };
}
```

Move the `import type { Bien } from './types';` line up to join the existing `DataStore` import at the top of the file instead of leaving a second import statement.

- [ ] **Step 10: Implement `src/app/biens/new/page.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useDataStore } from '@/hooks/useDataStore';
import { BienForm } from '@/components/BienForm';
import { createEmptyBien } from '@/lib/defaultData';
import { randomUUID } from '@/lib/randomId';
import type { Bien } from '@/lib/types';

export default function NewBienPage() {
  const { data, loading, error, save } = useDataStore();
  const router = useRouter();

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  async function handleSubmit(bien: Bien) {
    await save({ ...data!, biens: [...data!.biens, bien] });
    router.push('/');
  }

  return (
    <BienForm
      bien={createEmptyBien(randomUUID())}
      referentielLoyers={data.referentielLoyers}
      baremeConfort={data.baremeConfort}
      onSubmit={handleSubmit}
      onCancel={() => router.push('/')}
    />
  );
}
```

- [ ] **Step 11: Implement `src/app/biens/[id]/page.tsx`**

```tsx
'use client';

import { useRouter, useParams } from 'next/navigation';
import { useDataStore } from '@/hooks/useDataStore';
import { BienForm } from '@/components/BienForm';
import type { Bien } from '@/lib/types';

export default function BienDetailPage() {
  const { data, loading, error, save } = useDataStore();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  const bien = data.biens.find((b) => b.id === params.id);
  if (!bien) return <main className="p-8">Bien introuvable.</main>;

  async function handleSubmit(updated: Bien) {
    await save({ ...data!, biens: data!.biens.map((b) => (b.id === updated.id ? updated : b)) });
    router.push('/');
  }

  return (
    <BienForm
      bien={bien}
      referentielLoyers={data.referentielLoyers}
      baremeConfort={data.baremeConfort}
      onSubmit={handleSubmit}
      onCancel={() => router.push('/')}
    />
  );
}
```

- [ ] **Step 12: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (all tests so far).

- [ ] **Step 13: Commit**

```bash
git add src/components/ConfortCalculator.tsx src/components/ConfortCalculator.test.tsx src/components/BienForm.tsx src/components/BienForm.test.tsx src/app/biens src/lib/defaultData.ts
git commit -m "feat: add bien detail page with confort calculator"
```

---

### Task 17: Référentiel loyers and barème confort pages

**Files:**
- Create: `src/components/ReferentielTable.tsx`
- Create: `src/components/BaremeConfortTable.tsx`
- Create: `src/app/referentiel/page.tsx`
- Create: `src/app/bareme-confort/page.tsx`
- Test: `src/components/ReferentielTable.test.tsx`
- Test: `src/components/BaremeConfortTable.test.tsx`

**Interfaces:**
- Consumes: `ReferentielLoyer`, `BaremeConfortItem` from `src/lib/types.ts`; `useDataStore` from `src/hooks/useDataStore.ts`.
- Produces: `<ReferentielTable rows onChange />`, `<BaremeConfortTable rows onChange />`; `/referentiel` and `/bareme-confort` pages.

- [ ] **Step 1: Write the failing test for `ReferentielTable`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReferentielTable } from './ReferentielTable';
import type { ReferentielLoyer } from '@/lib/types';

describe('ReferentielTable', () => {
  it('adds a new empty row', async () => {
    const onChange = vi.fn();
    render(<ReferentielTable rows={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une ligne' }));
    expect(onChange).toHaveBeenCalledWith([{ ville: '', typePiece: '', loyerM2: 0 }]);
  });

  it('updates a field on an existing row', async () => {
    const rows: ReferentielLoyer[] = [{ ville: 'Paris', typePiece: '2P', loyerM2: 29.3 }];
    const onChange = vi.fn();
    render(<ReferentielTable rows={rows} onChange={onChange} />);

    await userEvent.clear(screen.getByDisplayValue('29.3'));
    await userEvent.type(screen.getByDisplayValue(''), '30');

    expect(onChange).toHaveBeenLastCalledWith([{ ville: 'Paris', typePiece: '2P', loyerM2: 30 }]);
  });

  it('removes a row', async () => {
    const rows: ReferentielLoyer[] = [{ ville: 'Paris', typePiece: '2P', loyerM2: 29.3 }];
    const onChange = vi.fn();
    render(<ReferentielTable rows={rows} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ReferentielTable.test.tsx`
Expected: FAIL — `Cannot find module './ReferentielTable'`.

- [ ] **Step 3: Implement `src/components/ReferentielTable.tsx`**

```tsx
'use client';

import type { ReferentielLoyer } from '@/lib/types';

interface ReferentielTableProps {
  rows: ReferentielLoyer[];
  onChange: (rows: ReferentielLoyer[]) => void;
}

export function ReferentielTable({ rows, onChange }: ReferentielTableProps) {
  function updateRow(index: number, patch: Partial<ReferentielLoyer>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...rows, { ville: '', typePiece: '', loyerM2: 0 }]);
  }

  return (
    <div className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Référentiel loyers</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Ville</th>
            <th className="p-2">Type</th>
            <th className="p-2">Loyer m2</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b">
              <td className="p-2">
                <input
                  value={row.ville}
                  onChange={(e) => updateRow(index, { ville: e.target.value })}
                  className="w-full rounded border px-2 py-1"
                />
              </td>
              <td className="p-2">
                <input
                  value={row.typePiece}
                  onChange={(e) => updateRow(index, { typePiece: e.target.value })}
                  className="w-full rounded border px-2 py-1"
                />
              </td>
              <td className="p-2">
                <input
                  type="number"
                  value={row.loyerM2}
                  onChange={(e) => updateRow(index, { loyerM2: Number(e.target.value) || 0 })}
                  className="w-full rounded border px-2 py-1"
                />
              </td>
              <td className="p-2">
                <button onClick={() => removeRow(index)} className="text-red-600">
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} className="mt-4 rounded bg-slate-900 px-4 py-2 text-white">
        Ajouter une ligne
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ReferentielTable.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing test for `BaremeConfortTable`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BaremeConfortTable } from './BaremeConfortTable';
import type { BaremeConfortItem } from '@/lib/types';

describe('BaremeConfortTable', () => {
  it('adds a new empty row', async () => {
    const onChange = vi.fn();
    render(<BaremeConfortTable rows={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une ligne' }));
    expect(onChange).toHaveBeenCalledWith([{ label: '', m2Bonus: 0 }]);
  });

  it('updates the bonus of an existing row', async () => {
    const rows: BaremeConfortItem[] = [{ label: 'Gaz', m2Bonus: 2 }];
    const onChange = vi.fn();
    render(<BaremeConfortTable rows={rows} onChange={onChange} />);

    await userEvent.clear(screen.getByDisplayValue('2'));
    await userEvent.type(screen.getByDisplayValue(''), '3');

    expect(onChange).toHaveBeenLastCalledWith([{ label: 'Gaz', m2Bonus: 3 }]);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/components/BaremeConfortTable.test.tsx`
Expected: FAIL — `Cannot find module './BaremeConfortTable'`.

- [ ] **Step 7: Implement `src/components/BaremeConfortTable.tsx`**

```tsx
'use client';

import type { BaremeConfortItem } from '@/lib/types';

interface BaremeConfortTableProps {
  rows: BaremeConfortItem[];
  onChange: (rows: BaremeConfortItem[]) => void;
}

export function BaremeConfortTable({ rows, onChange }: BaremeConfortTableProps) {
  function updateRow(index: number, patch: Partial<BaremeConfortItem>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...rows, { label: '', m2Bonus: 0 }]);
  }

  return (
    <div className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Barème confort</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Équipement</th>
            <th className="p-2">m² bonus</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b">
              <td className="p-2">
                <input
                  value={row.label}
                  onChange={(e) => updateRow(index, { label: e.target.value })}
                  className="w-full rounded border px-2 py-1"
                />
              </td>
              <td className="p-2">
                <input
                  type="number"
                  value={row.m2Bonus}
                  onChange={(e) => updateRow(index, { m2Bonus: Number(e.target.value) || 0 })}
                  className="w-full rounded border px-2 py-1"
                />
              </td>
              <td className="p-2">
                <button onClick={() => removeRow(index)} className="text-red-600">
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} className="mt-4 rounded bg-slate-900 px-4 py-2 text-white">
        Ajouter une ligne
      </button>
    </div>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/components/BaremeConfortTable.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Implement `src/app/referentiel/page.tsx`**

```tsx
'use client';

import { useDataStore } from '@/hooks/useDataStore';
import { ReferentielTable } from '@/components/ReferentielTable';
import type { ReferentielLoyer } from '@/lib/types';

export default function ReferentielPage() {
  const { data, loading, error, save } = useDataStore();

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  async function handleChange(referentielLoyers: ReferentielLoyer[]) {
    await save({ ...data!, referentielLoyers });
  }

  return <ReferentielTable rows={data.referentielLoyers} onChange={handleChange} />;
}
```

- [ ] **Step 10: Implement `src/app/bareme-confort/page.tsx`**

```tsx
'use client';

import { useDataStore } from '@/hooks/useDataStore';
import { BaremeConfortTable } from '@/components/BaremeConfortTable';
import type { BaremeConfortItem } from '@/lib/types';

export default function BaremeConfortPage() {
  const { data, loading, error, save } = useDataStore();

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  async function handleChange(baremeConfort: BaremeConfortItem[]) {
    await save({ ...data!, baremeConfort });
  }

  return <BaremeConfortTable rows={data.baremeConfort} onChange={handleChange} />;
}
```

- [ ] **Step 11: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (all tests so far).

- [ ] **Step 12: Commit**

```bash
git add src/components/ReferentielTable.tsx src/components/ReferentielTable.test.tsx src/components/BaremeConfortTable.tsx src/components/BaremeConfortTable.test.tsx src/app/referentiel src/app/bareme-confort
git commit -m "feat: add référentiel loyers and barème confort CRUD pages"
```

---

### Task 18: Montage financier page

**Files:**
- Create: `src/components/MontageFinancierForm.tsx`
- Create: `src/app/montage-financier/page.tsx`
- Test: `src/components/MontageFinancierForm.test.tsx`

**Interfaces:**
- Consumes: `MontageFinancier` from `src/lib/types.ts`; `calculMontageFinancier` from `src/lib/calculations.ts`; `useDataStore` from `src/hooks/useDataStore.ts`.
- Produces: `<MontageFinancierForm montage onChange />`; `/montage-financier` page.

- [ ] **Step 1: Write the failing test**

Reuses the golden scenario from Task 5.

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MontageFinancierForm } from './MontageFinancierForm';
import type { MontageFinancier } from '@/lib/types';

const montage: MontageFinancier = {
  prixAchat: 161000.21,
  prixTravaux: 0,
  tauxCredit: 2.9,
  dureeCreditAnnees: 25,
  loyerHypothese: 1200,
  pno: 20,
  assuranceEmprunteurMensuel: 20,
  chargesMensuelles: 170.0833333,
  enveloppeImprevus: 25,
  gestionGliPourcent: 7.5,
};

describe('MontageFinancierForm', () => {
  it('shows the computed cashflow for the given inputs', () => {
    render(<MontageFinancierForm montage={montage} onChange={vi.fn()} />);
    expect(screen.getByText('119.78 €')).toBeInTheDocument();
  });

  it('calls onChange with the updated montage when an input changes', async () => {
    const onChange = vi.fn();
    render(<MontageFinancierForm montage={montage} onChange={onChange} />);

    await userEvent.clear(screen.getByLabelText('Loyer hypothèse'));
    await userEvent.type(screen.getByLabelText('Loyer hypothèse'), '1300');

    expect(onChange).toHaveBeenLastCalledWith({ ...montage, loyerHypothese: 1300 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/MontageFinancierForm.test.tsx`
Expected: FAIL — `Cannot find module './MontageFinancierForm'`.

- [ ] **Step 3: Implement `src/components/MontageFinancierForm.tsx`**

```tsx
'use client';

import type { MontageFinancier } from '@/lib/types';
import { calculMontageFinancier } from '@/lib/calculations';

interface MontageFinancierFormProps {
  montage: MontageFinancier;
  onChange: (montage: MontageFinancier) => void;
}

const FIELDS: Array<{ key: keyof MontageFinancier; label: string }> = [
  { key: 'prixAchat', label: 'Prix achat' },
  { key: 'prixTravaux', label: 'Prix travaux' },
  { key: 'tauxCredit', label: 'Taux crédit (%)' },
  { key: 'dureeCreditAnnees', label: 'Durée crédit (années)' },
  { key: 'loyerHypothese', label: 'Loyer hypothèse' },
  { key: 'pno', label: 'PNO' },
  { key: 'assuranceEmprunteurMensuel', label: 'Assurance emprunteur / mois' },
  { key: 'chargesMensuelles', label: 'Charges mensuelles' },
  { key: 'enveloppeImprevus', label: 'Enveloppe imprévus' },
  { key: 'gestionGliPourcent', label: 'Gestion + GLI (%)' },
];

export function MontageFinancierForm({ montage, onChange }: MontageFinancierFormProps) {
  const resultat = calculMontageFinancier(montage);

  function updateField(key: keyof MontageFinancier, value: number) {
    onChange({ ...montage, [key]: value });
  }

  return (
    <div className="grid grid-cols-2 gap-8 p-8">
      <div className="space-y-4">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={field.key} className="block text-sm font-medium">
              {field.label}
            </label>
            <input
              id={field.key}
              type="number"
              step="0.01"
              value={montage[field.key]}
              onChange={(e) => updateField(field.key, Number(e.target.value) || 0)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
        ))}
      </div>
      <div className="space-y-2 rounded border p-4">
        <h2 className="font-medium">Résultats</h2>
        <p>Mensualité banque : {resultat.mensualiteBanque.toFixed(2)} €</p>
        <p>Gestion + GLI : {resultat.gestionGli.toFixed(2)} €</p>
        <p>Total mensualité : {resultat.totalMensualite.toFixed(2)} €</p>
        <p>Cashflow : {resultat.cashflow.toFixed(2)} €</p>
        <p>Rendement brut : {resultat.rendementBrutPourcent.toFixed(2)}%</p>
        <p>Rendement net : {resultat.rendementNetPourcent.toFixed(2)}%</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/MontageFinancierForm.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement `src/app/montage-financier/page.tsx`**

```tsx
'use client';

import { useDataStore } from '@/hooks/useDataStore';
import { MontageFinancierForm } from '@/components/MontageFinancierForm';
import type { MontageFinancier } from '@/lib/types';

export default function MontageFinancierPage() {
  const { data, loading, error, save } = useDataStore();

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  async function handleChange(montageFinancier: MontageFinancier) {
    await save({ ...data!, montageFinancier });
  }

  return <MontageFinancierForm montage={data.montageFinancier} onChange={handleChange} />;
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (all tests so far).

- [ ] **Step 7: Commit**

```bash
git add src/components/MontageFinancierForm.tsx src/components/MontageFinancierForm.test.tsx src/app/montage-financier
git commit -m "feat: add montage financier simulator page"
```

---

### Task 19: Email templates page

**Files:**
- Create: `src/components/EmailTemplateList.tsx`
- Create: `src/app/emails/page.tsx`
- Test: `src/components/EmailTemplateList.test.tsx`

**Interfaces:**
- Consumes: `EmailTemplate` from `src/lib/types.ts`; `useDataStore` from `src/hooks/useDataStore.ts`; `navigator.clipboard.writeText`.
- Produces: `<EmailTemplateList templates onChange />`; `/emails` page.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailTemplateList } from './EmailTemplateList';
import type { EmailTemplate } from '@/lib/types';

const templates: EmailTemplate[] = [{ titre: 'Contact avocat', corps: 'Bonjour Maître,' }];

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe('EmailTemplateList', () => {
  it('copies the template body to the clipboard', async () => {
    render(<EmailTemplateList templates={templates} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Copier' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Bonjour Maître,');
  });

  it('adds a new empty template', async () => {
    const onChange = vi.fn();
    render(<EmailTemplateList templates={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un modèle' }));
    expect(onChange).toHaveBeenCalledWith([{ titre: '', corps: '' }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/EmailTemplateList.test.tsx`
Expected: FAIL — `Cannot find module './EmailTemplateList'`.

- [ ] **Step 3: Implement `src/components/EmailTemplateList.tsx`**

```tsx
'use client';

import type { EmailTemplate } from '@/lib/types';

interface EmailTemplateListProps {
  templates: EmailTemplate[];
  onChange: (templates: EmailTemplate[]) => void;
}

export function EmailTemplateList({ templates, onChange }: EmailTemplateListProps) {
  function updateTemplate(index: number, patch: Partial<EmailTemplate>) {
    onChange(templates.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function addTemplate() {
    onChange([...templates, { titre: '', corps: '' }]);
  }

  async function copyToClipboard(corps: string) {
    await navigator.clipboard.writeText(corps);
  }

  return (
    <div className="space-y-6 p-8">
      <h1 className="text-xl font-semibold">Templates email</h1>
      {templates.map((template, index) => (
        <div key={index} className="space-y-2 rounded border p-4">
          <input
            value={template.titre}
            onChange={(e) => updateTemplate(index, { titre: e.target.value })}
            className="w-full rounded border px-3 py-2 font-medium"
            placeholder="Titre"
          />
          <textarea
            value={template.corps}
            onChange={(e) => updateTemplate(index, { corps: e.target.value })}
            className="h-40 w-full rounded border px-3 py-2"
          />
          <button onClick={() => copyToClipboard(template.corps)} className="rounded border px-4 py-2">
            Copier
          </button>
        </div>
      ))}
      <button onClick={addTemplate} className="rounded bg-slate-900 px-4 py-2 text-white">
        Ajouter un modèle
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/EmailTemplateList.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement `src/app/emails/page.tsx`**

```tsx
'use client';

import { useDataStore } from '@/hooks/useDataStore';
import { EmailTemplateList } from '@/components/EmailTemplateList';
import type { EmailTemplate } from '@/lib/types';

export default function EmailsPage() {
  const { data, loading, error, save } = useDataStore();

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  async function handleChange(emailTemplates: EmailTemplate[]) {
    await save({ ...data!, emailTemplates });
  }

  return <EmailTemplateList templates={data.emailTemplates} onChange={handleChange} />;
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (all tests so far).

- [ ] **Step 7: Commit**

```bash
git add src/components/EmailTemplateList.tsx src/components/EmailTemplateList.test.tsx src/app/emails
git commit -m "feat: add email templates page with copy to clipboard"
```

---

### Task 20: Settings panel, Excel import/export UI, and conflict modal

**Files:**
- Create: `src/components/ConflictModal.tsx`
- Create: `src/components/SettingsPanel.tsx`
- Create: `src/components/ImportExportPanel.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/components/ConflictModal.test.tsx`
- Test: `src/components/SettingsPanel.test.tsx`
- Test: `src/components/ImportExportPanel.test.tsx`

**Interfaces:**
- Consumes: `Settings`, `DataStore` from `src/lib/types.ts`; `useDataStore` from `src/hooks/useDataStore.ts` (specifically its `conflict` and `resolveConflictReload` fields, plus `save(next, force)`).
- Produces: `<ConflictModal onReload onForce />`, `<SettingsPanel settings onChange />`, `<ImportExportPanel onImportError />` — wired into the dashboard.

- [ ] **Step 1: Write the failing test for `ConflictModal`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConflictModal } from './ConflictModal';

describe('ConflictModal', () => {
  it('calls onReload when the reload button is clicked', async () => {
    const onReload = vi.fn();
    render(<ConflictModal onReload={onReload} onForce={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Recharger la dernière version' }));
    expect(onReload).toHaveBeenCalled();
  });

  it('calls onForce when the force button is clicked', async () => {
    const onForce = vi.fn();
    render(<ConflictModal onReload={vi.fn()} onForce={onForce} />);
    await userEvent.click(screen.getByRole('button', { name: "Forcer l'écrasement" }));
    expect(onForce).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ConflictModal.test.tsx`
Expected: FAIL — `Cannot find module './ConflictModal'`.

- [ ] **Step 3: Implement `src/components/ConflictModal.tsx`**

```tsx
'use client';

interface ConflictModalProps {
  onReload: () => void;
  onForce: () => void;
}

export function ConflictModal({ onReload, onForce }: ConflictModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="max-w-sm space-y-4 rounded-lg bg-white p-6">
        <h2 className="font-semibold">Conflit de sauvegarde</h2>
        <p className="text-sm">
          Quelqu&apos;un d&apos;autre a sauvegardé des changements entre-temps. Que veux-tu faire ?
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onReload} className="rounded border px-4 py-2">
            Recharger la dernière version
          </button>
          <button onClick={onForce} className="rounded bg-red-600 px-4 py-2 text-white">
            Forcer l&apos;écrasement
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ConflictModal.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for `SettingsPanel`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from './SettingsPanel';
import type { Settings } from '@/lib/types';

const settings: Settings = { objectifRentabilitePourcent: 6, tauxCreditParDefaut: 3, dureeCreditParDefautAnnees: 25 };

describe('SettingsPanel', () => {
  it('calls onChange with the updated objectif de rentabilité', async () => {
    const onChange = vi.fn();
    render(<SettingsPanel settings={settings} onChange={onChange} />);

    await userEvent.clear(screen.getByLabelText('Objectif rentabilité (%)'));
    await userEvent.type(screen.getByLabelText('Objectif rentabilité (%)'), '7');

    expect(onChange).toHaveBeenLastCalledWith({ ...settings, objectifRentabilitePourcent: 7 });
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/components/SettingsPanel.test.tsx`
Expected: FAIL — `Cannot find module './SettingsPanel'`.

- [ ] **Step 7: Implement `src/components/SettingsPanel.tsx`**

```tsx
'use client';

import type { Settings } from '@/lib/types';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="space-y-4 rounded border p-4">
      <h2 className="font-medium">Paramètres</h2>
      <div>
        <label htmlFor="objectifRentabilitePourcent" className="block text-sm font-medium">
          Objectif rentabilité (%)
        </label>
        <input
          id="objectifRentabilitePourcent"
          type="number"
          step="0.1"
          value={settings.objectifRentabilitePourcent}
          onChange={(e) =>
            onChange({ ...settings, objectifRentabilitePourcent: Number(e.target.value) || 0 })
          }
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="tauxCreditParDefaut" className="block text-sm font-medium">
          Taux crédit par défaut (%)
        </label>
        <input
          id="tauxCreditParDefaut"
          type="number"
          step="0.1"
          value={settings.tauxCreditParDefaut}
          onChange={(e) => onChange({ ...settings, tauxCreditParDefaut: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="dureeCreditParDefautAnnees" className="block text-sm font-medium">
          Durée crédit par défaut (années)
        </label>
        <input
          id="dureeCreditParDefautAnnees"
          type="number"
          value={settings.dureeCreditParDefautAnnees}
          onChange={(e) =>
            onChange({ ...settings, dureeCreditParDefautAnnees: Number(e.target.value) || 0 })
          }
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/components/SettingsPanel.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 9: Write the failing test for `ImportExportPanel`**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportExportPanel } from './ImportExportPanel';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ImportExportPanel', () => {
  it('shows the validation errors returned by the import endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'invalid', details: ['Feuille "Analyse" manquante.'] }),
      })
    );
    const onImportError = vi.fn();
    render(<ImportExportPanel onImportError={onImportError} />);

    const file = new File(['contenu'], 'Immo.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await userEvent.upload(screen.getByLabelText('Importer un Excel'), file);

    expect(onImportError).toHaveBeenCalledWith(['Feuille "Analyse" manquante.']);
  });
});
```

- [ ] **Step 10: Run the test to verify it fails**

Run: `npx vitest run src/components/ImportExportPanel.test.tsx`
Expected: FAIL — `Cannot find module './ImportExportPanel'`.

- [ ] **Step 11: Implement `src/components/ImportExportPanel.tsx`**

```tsx
'use client';

import type { ChangeEvent } from 'react';

interface ImportExportPanelProps {
  onImportError: (errors: string[]) => void;
  onImportSuccess?: () => void;
}

export function ImportExportPanel({ onImportError, onImportSuccess }: ImportExportPanelProps) {
  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set('file', file);
    const res = await fetch('/api/import', { method: 'POST', body: formData });
    if (!res.ok) {
      const body = await res.json();
      onImportError(body.details ?? [body.error ?? 'Import invalide.']);
      return;
    }
    onImportSuccess?.();
  }

  return (
    <div className="flex items-center gap-4">
      <a href="/api/export" className="rounded border px-4 py-2">
        Exporter en Excel
      </a>
      <label className="rounded border px-4 py-2">
        Importer un Excel
        <input
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Importer un Excel"
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 12: Run the test to verify it passes**

Run: `npx vitest run src/components/ImportExportPanel.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 13: Wire everything into `src/app/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/hooks/useDataStore';
import { BienTable } from '@/components/BienTable';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ImportExportPanel } from '@/components/ImportExportPanel';
import { ConflictModal } from '@/components/ConflictModal';
import type { Settings } from '@/lib/types';

export default function HomePage() {
  const { data, loading, error, conflict, save, resolveConflictReload } = useDataStore();
  const router = useRouter();
  const [importErrors, setImportErrors] = useState<string[] | null>(null);

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  function handleAdd() {
    router.push('/biens/new');
  }

  async function handleDelete(id: string) {
    await save({ ...data!, biens: data!.biens.filter((b) => b.id !== id) });
  }

  async function handleSettingsChange(settings: Settings) {
    await save({ ...data!, settings });
  }

  async function handleForceOverwrite() {
    await save(data!, true);
  }

  return (
    <main>
      <div className="flex items-center justify-between p-8 pb-0">
        <ImportExportPanel onImportError={setImportErrors} onImportSuccess={() => window.location.reload()} />
      </div>
      {importErrors && (
        <div className="mx-8 mt-4 rounded border border-red-400 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Import refusé :</p>
          <ul className="list-disc pl-5">
            {importErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      <BienTable
        biens={data.biens}
        referentielLoyers={data.referentielLoyers}
        settings={data.settings}
        onAdd={handleAdd}
        onDelete={handleDelete}
      />
      <div className="px-8 pb-8">
        <SettingsPanel settings={data.settings} onChange={handleSettingsChange} />
      </div>
      {conflict && <ConflictModal onReload={resolveConflictReload} onForce={handleForceOverwrite} />}
    </main>
  );
}
```

- [ ] **Step 14: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (all tests in the project).

- [ ] **Step 15: Run the production build to catch any type errors across pages**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 16: Commit**

```bash
git add src/components/ConflictModal.tsx src/components/ConflictModal.test.tsx src/components/SettingsPanel.tsx src/components/SettingsPanel.test.tsx src/components/ImportExportPanel.tsx src/components/ImportExportPanel.test.tsx src/app/page.tsx
git commit -m "feat: wire settings, import/export and conflict resolution into the dashboard"
```

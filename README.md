# Tapanta Books — prototype

A clickable, front-end-only prototype of the Tapanta Books accounting app, built from the TroveSuite redesign brief. Its visual language comes from Acctual: calm, monochrome, large readable amounts, and no shadows.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Start with `/design-system` to see every shared pattern in light and dark.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn/ui (Radix), TanStack Table v8, Recharts through shadcn's chart component, react-hook-form with zod, Zustand and lucide-react.

## Where things live

| Path | What |
|---|---|
| `app/globals.css` | All design tokens. Change the look here. |
| `design-reference/tokens.md` | Where each token came from. |
| `lib/nav.ts` | The 27-item nav. Page titles are read from here, so a nav label and its page title always match. |
| `lib/money.ts`, `components/patterns/money.tsx` | `formatMoney` and `<Money>`: the only way an amount becomes text. |
| `lib/constants.ts` | `DEMO_TODAY = 2026-10-05`, entities, branches, users. |
| `lib/selectors/` | Every figure computed once, then shared by KPIs, badges and tabs (filled in stage 2). |
| `components/patterns/` | PageHeader, KpiStrip, StatusTabs, DataTable, FilterChip, EntityDrawer, JournalLines, MoneyCell, StatusBadge, Banner, EmptyState, ListPage, ReportShell. |
| `components/shell/` | Sidebar, top bar, ⌘K palette. |

## Build stages

- [x] **1. Foundation:** tokens, app shell, command palette, `/design-system`
- [ ] **2. Core money flow:** mock ledger and selectors, Home, Invoices with the split editor, Record money in/out
- [ ] **3. Accountant flow:** Bank & cash, Reconcile, Journals, Chart of accounts, General ledger
- [ ] **4. Reports and the rest**
- [ ] **5. Handover:** deploy, demo script, CHANGES.md

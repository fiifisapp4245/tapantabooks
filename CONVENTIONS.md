# Building screens in Tapanta Books

Read this before adding or changing a screen.

## Visual rules (non-negotiable)

- **No shadows, blur or translucency anywhere.** Never use `shadow-*`, `drop-shadow-*` or `backdrop-blur`. Separation comes from a 1px border (`border`) and the canvas (`bg-background`) vs card (`bg-card`) step.
  - The one exception is the sticky notes on Home (`components/home/sticky-notes.css`). They have a soft paper shadow by request. Don't copy it anywhere else.
- **No boxes inside boxes.** A page is `PageBody` → unboxed `PageHeader` → content blocks. Each content block is **one** `rounded-xl border bg-card` container. Never put a bordered card inside another bordered card. Inside a card, separate parts with `border-t`/`divide-y`, not new cards. Tables are already their own card (DataTable) — don't wrap them in another.
- **Primary colour is Tapanta crimson** (`bg-primary`, `--brand`). It's used for primary buttons, the active nav item and focus only. **Never** use it for status, errors or "overdue". Status colours come only from `<StatusBadge>` / `<Banner>`.
- **Tabs are shadcn's default `Tabs`** (the segmented control). For list status filters use `<StatusTabs>`; for page sections use `<Tabs><TabsList className="h-9">` with `TabsTrigger className="data-[state=active]:bg-card"`.
- One control height: 36px (default `Button`, `Input`, `SelectTrigger`). Button labels never wrap.
- Money is always `<Money>` / `<MoneyCell>` (right-aligned, tabular). Never format numbers inline. Codes (INV-, JE-, account codes) use `<Code>`.
- Plain language first: "Who owes you", "What you owe", "Money in/out". Put the accounting term in `<Term term="…">`.

## Page skeleton

```tsx
"use client"
export default function Page() {
  return (
    <PageBody>
      <PageHeader title={nav.label} description={nav.description} primary={<Button>…</Button>} />
      <KpiStrip … />              // optional, max 4, each clickable
      <StatusTabs … />            // lists: always starts with All, shows counts
      <DataTable … />             // includes search, filter chips, Columns menu
      <SomeDrawer … />            // rows open an EntityDrawer
    </PageBody>
  )
}
```

`ListPage` in `components/patterns/list-page.tsx` composes all of that for simple lists. Page titles **must** equal the nav label in `lib/nav.ts`. Use `findNavItem(usePathname())` or the literal label.

## Navigation

`lib/nav.ts` is the single registry.

- **`PAGES`** lists every page with its label, which is also its page title, and its description.
- **`NAV`** is the 15-item sidebar, plus `NAV_FOOTER` for Settings.
- **`SECTIONS`** joins pages that share one sidebar entry. They show as link tabs at the top of the page, which `PageBody` renders automatically:
  - Invoices | Credit notes
  - Bills | Supplier credits
  - All reports | each report
  - Settings: General | Connections | Imports | Mapping & rules | Audit trail

A new page goes in `PAGES`. If it doesn't earn a sidebar slot, add it to a section and to that sidebar item's `covers`, so the parent stays highlighted. ⌘K lists every page in `PAGES` automatically.

## Data

- Read data with `useLedger()` (`lib/ledger.ts`) and compute with the selectors in `lib/selectors/index.ts`, through `useSelect(fn)`. Don't compute a figure that already has a selector. If a figure is needed in two places, add a selector.
- Dates: `TODAY` and helpers from `lib/dates.ts` (`fmtDate`, `relative`, `daysBetween`). Never call `new Date()` for business logic.
- The current user is `usePrefs((s) => s.userId)`. Open create forms with `usePrefs.getState().openForm("invoice" | "bill" | "money-in" | "money-out" | "journal" | "customer" | "supplier", prefill?)`.
- Journals open in `<JournalDrawer journalId onClose>`. Report drill-downs use `<DrillDrawer>` (both in `components/drawers/journal-drawer.tsx`).

## Forms

- Large `Dialog`, or a full-width `Sheet` for the invoice editor.
- Use the `Field` wrapper. The primary action is disabled until valid, with `<SubmitReason reason>` beside it.
- Closing a dirty form goes through `useDiscardGuard(dirty, onClose)`.
- Account and contact fields use `AccountPicker` / `ContactPicker` (searchable, grouped).
- Show a "What this posts" collapsible using `<JournalLines>`.

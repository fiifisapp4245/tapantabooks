# Tapanta Books — design tokens

All tokens live in `app/globals.css` as shadcn CSS variables. Change them there and the whole app follows.

**Source.** Values were read from the live Acctual site (acctual.com, 15 Oct 2026) using computed styles, plus the screenshots in `design-reference/acctual/`. We don't have screenshots of the Acctual *app* (app.acctual.com) yet, so the marketing site's invoice mock-up (`02-invoice-document.jpg`) stands in for app styling. Where the brief gives a starting value and Acctual doesn't show one, the brief's value is used and marked *brief*.

## Rule: no shadows

The interface is flat. Depth comes only from the canvas-to-card step and 1px hairlines.

- Every `--shadow-*` and `--drop-shadow-*` theme token resolves to `0 0 #0000`, so a `shadow-md` added later still renders nothing.
- `shadow-*` classes were stripped from every generated shadcn component.
- Overlays (Dialog, Sheet, AlertDialog) use a flat 25% scrim, with no backdrop blur.
- The top bar is a solid colour, with no translucency or blur.

## Colour

| Token | Light | Dark | Source / note |
|---|---|---|---|
| `--background` | `#F7F8FA` | `#0E0F11` | Acctual body `rgb(247,250,252)`, slightly neutralised. Page canvas. |
| `--card` | `#FFFFFF` | `#16171A` | Acctual cards are white on the canvas. 1px border, no shadow. |
| `--border` | `#EBEBEB` | `#26272B` | Acctual hairline `rgba(0,0,0,.06)`, made opaque so it reads on both canvas and card. |
| `--input` | `#E2E2E2` | `#303136` | Acctual input edge `rgba(0,0,0,.16)`, softened. |
| `--foreground` | `#1E1E1E` | `#EDEDED` | Acctual heading colour `rgb(30,30,30)`. |
| `--muted-foreground` | `#737373` | `#9A9A9A` | Acctual uses `#8D8D8D`, which is only 3.3:1 on white and fails AA at 13px. `#737373` (*brief*) passes. |
| `--primary` | `#1E1E1E` | `#EDEDED` | Acctual's near-black main button ("Send my first invoice"). |
| `--brand` / `--ring` | `#0098F2` | `#33ADF5` | Acctual blue (eyebrows, links, "Used by 5,000+" pill). Used for the logo, active-nav marker and focus ring **only**. |
| `--info` | `#0077C2` | `#5CBCF7` | Darker step of the Acctual blue so status text passes contrast. Open/Unpaid, info banners. |
| `--success` | `#2A8A14` | `#6CC95A` | Acctual green `rgb(44,160,28)`, darkened for text. |
| `--warning` | `#B45309` | `#F0A646` | *brief* amber `#D97706`, darkened for text. Overdue, awaiting approval, out of balance. |
| `--destructive` | `#DC2626` | `#F26B6B` | *brief*. Errors and void only. |
| `--negative` | `#C2410C` | `#F2905C` | Muted red for negative money (with a "Credit balance" tooltip). |

Soft variants (`--info-soft`, `--success-soft`, …) are the same hue at 10–14% opacity, matching Acctual's tinted pills such as `rgba(0,152,242,.16)`.

**Brand never means status.** Brand blue and info blue are different tokens. If Tapanta's own brand colour turns out to be different, change `--brand` and nothing else moves.

## Charts

Charts use the brand colours: crimson first, black second.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--chart-1` | `#AD0E36` crimson | `#E0476F` | Main series (revenue, cash) |
| `--chart-2` | `#1E1E1E` black | `#EDEDED` | Second series (expenses) |
| `--chart-3` | `#D9728C` crimson tint | `#F09AB0` | Third series |
| `--chart-4` | `#737373` grey | `#9A9A9A` | Fourth series |
| `--chart-5` | `#C4C4C4` light grey | `#5C5C5C` | Fifth series |

Revenue is crimson and expenses are black, so they're easy to tell apart.

The ageing bars run from crimson (current) through the crimson tint and greys to black (90+ days). Crimson marks healthy, recent money there, so it still never means "overdue".

The palette validator passes on colour-blind separation, normal-vision separation and contrast. It flags black as "not a hue"; that's intentional.

## Type

| Role | Font | Size / weight | Source |
|---|---|---|---|
| Page title | Open Runde | 26 / 600, −0.02em | Acctual H1 is Open Runde 600, −1.2px tracking |
| KPI amount | Open Runde | 20–30 / 600, tabular, scales to its card | *brief* 28–32 |
| Section heading | Open Runde | 18 / 600 | |
| Body, tables | Inter | 14 / 400, −0.01em | Acctual body is Inter, −0.28px at 14px |
| Labels, helper text | Inter | 13 / 400, muted | *brief* |
| Codes (INV-, JE-, accounts) | Geist Mono | 13, muted | *brief* |

Open Runde is open source (SIL OFL) and self-hosted from `app/fonts/`. All money uses `tabular-nums`.

## Shape and density

| Token | Value | Note |
|---|---|---|
| Control height | 36px | One height for buttons, inputs and selects (*brief*). |
| `--radius-lg` (controls) | 8px | Buttons, inputs, menus. |
| `--radius-xl` (cards) | 12px | Cards, tables, drawers' inner panels. Acctual cards use 18px; 12px suits a denser accounting app. |
| Table row | 48px | Header 40px. |
| Page padding | 32px desktop / 16px mobile | |

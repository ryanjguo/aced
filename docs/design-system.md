# Design system

Aced's look: **monochrome with one crimson accent**, Geist type, medium density, dark and light themes. Built on shadcn/ui; this file is the rules every page follows.

Reference: the [home page POC](https://claude.ai/artifact/EV8Wty61sdmXkZ3RhDqQtV) (desktop and mobile, both themes). When this file and the POC disagree, this file wins.

## Principles

1. **Content first.** Esports data and discussion are the color. The chrome stays gray.
2. **Crimson means something.** It's used in a few places only (below), so it always draws the eye.
3. **Dense but calm.** More on screen than a typical social app, never cramped.
4. **Numbers are data.** Tabular figures, monospace for tags and stat lines, aligned in columns.

## Color tokens

CSS variables on `:root` (light) and `.dark` (dark). Components only use these names, never raw hex. The one exception is generated images (`opengraph-image.tsx`), which can't read CSS: they import the dark values from a shared `apps/web/lib/theme-colors.ts`, which mirrors this table.

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--bg` | `#0c0d0f` | `#ffffff` | Page background |
| `--surface` | `#141619` | `#f7f8f9` | Cards, rails, row hover |
| `--surface-2` | `#1c1f23` | `#eef0f2` | Chips, badges, stat cards, avatar fallback |
| `--border` | `#25282d` | `#e3e5e8` | All 1px borders and dividers |
| `--fg` | `#eceef1` | `#121418` | Primary text |
| `--muted` | `#8b919b` | `#5d646e` | Secondary text, metadata, icons |
| `--accent` | `#f06a7c` | `#c42f45` | Crimson (see rules) |
| `--accent-tint` | `rgb(224 69 90 / 0.16)` | `rgb(196 47 69 / 0.10)` | Background behind crimson elements |
| `--btn` | `#eceef1` | `#121418` | Primary button background |
| `--on-btn` | `#0c0d0f` | `#ffffff` | Primary button text |
| `--success` | `#4ade80` | `#166534` | Confirmed transfers, success messages only |
| `--danger` | `#f06a7c` | `#c42f45` | Errors and destructive actions (same hue as accent) |

All text tokens meet WCAG AA (4.5:1) on `--bg`, `--surface` and `--surface-2` in both themes.

### Crimson rules

Use `--accent` **only** for:

- Live states: LIVE badges, live dots, live scores
- The logo dot in "aced."
- Active indicators: selected tab underline, current nav item marker, unread dots for your own notifications
- Your own upvotes (arrow + score in crimson on `--accent-tint`)
- Errors and destructive actions (as `--danger`)

Never for: primary buttons (those are monochrome `--btn`), links (see Links below), headings, decoration, or charts other than a single highlighted value.

## Themes

- Dark and light, following the system setting by default, with a toggle in the header that saves the choice.
- No flash of the wrong theme on load (set the class before paint).
- Every new component is checked in both themes.

## Typography

- **Geist** for UI and text, **Geist Mono** for team tags (`NW`, `EXH`), hashtags and mentions, scores, stat lines and numbers in tables. Load with the `geist` package (`next/font`).
- Numbers outside monospace use `font-variant-numeric: tabular-nums`.
- Weights: 400 regular, 500 medium (labels, titles), 600 semibold (logo, page titles, player names on stat cards). Nothing heavier.

| Role | Size / line height | Weight |
| --- | --- | --- |
| Page title | 22px / 28px | 600 |
| Section title | 16px / 24px | 600 |
| Body, post titles | 14px / 20px | 400–500 |
| Secondary, metadata | 12.5px / 18px | 400 |
| Rail headings, captions | 12px / 16px | 500, `--muted` |
| Badges, tiny labels | 11px / 14px | 400–600 |

Sentence case everywhere ("Live and upcoming", not "Live And Upcoming"), except the LIVE badge.

## Spacing and density

4px base grid. Medium density:

| Element | Value |
| --- | --- |
| Page gutters | 20px desktop, 16px mobile |
| Gap between columns and sections | 16–20px |
| Feed / list row padding | 12px vertical, 16px horizontal |
| Rail card padding | 12px 14px |
| Rail list item | 7px vertical, 1px top border between items |
| Header height | 56px desktop, 52px mobile |
| Control height | 34px (buttons, inputs) desktop; 44px touch targets on mobile |

## Radius and elevation

- Radius: 6px small (badges, nav items), 8px controls, 10px chips and stat cards, 12px cards and panels.
- Flat: no shadows except popovers and dialogs. Separation comes from borders and `--surface` steps.

## Layout

- Max content width 1240px.
- **Home**: three columns on desktop: left rail 180–200px (your teams, boards), feed (flexible, min 520px), right rail 240–280px (live and upcoming, transfer tracker, trending, top ACS). Rails wrap below 1024px; on phones they collapse into the Today strip and the bottom tab bar.
- **Mobile**: bottom tab bar (Home, Matches, Post, Boards, You), 64px tall; header shows logo, search and theme toggle.

## Components

| Component | Rules |
| --- | --- |
| Primary button | `--btn` / `--on-btn`, 500 weight. One per view. |
| Secondary button | Transparent, 1px `--border`, `--fg` text. |
| Ghost / icon button | Transparent; hover `--surface-2`. Icon-only needs `aria-label`. |
| Tabs | Text tabs, 13px; selected = `--fg`, 500, 2px `--accent` underline; others `--muted`. |
| Badge (post kind) | 11px, `--surface-2` background, `--muted` text, 5px radius. |
| Rumor badge | "Unconfirmed": 1px `--border`, `--muted` text. "Confirmed": `--success` text and border. "Denied": 1px `--border`, `--muted` text, struck through. |
| Chip (tags, Today matches) | Geist Mono 12px, `--surface-2` or `--surface` with border. |
| Feed row | Vote column 36px (arrow + score in mono), then badge + title, metadata line in `--muted` 12.5px. Divider between rows, `--surface` on hover. |
| Stat card | `--surface-2` block, 10px radius: "Stat line · map", player name 16px/600 + team tag, then K/D/A, ACS, opponent in mono columns. Labelled "Auto-generated". |
| Rail card | 1px border, 12px radius, 12px heading in `--muted`, items separated by 1px borders. |
| Live badge | Crimson dot + "LIVE" 11px 600 in `--accent`. |
| Vote | Arrows `--muted`. Your upvote: `--accent` on `--accent-tint`, score in `--accent`. Your downvote: `--fg` arrow on `--surface-2`, score unchanged in color. |

### Links

Links are never colored. Inside running text (post and comment bodies, "Sign in to comment"): `--fg` with an always-visible underline in `--muted`, so they stand out without color. Elsewhere (nav, metadata, rows): no underline, underline on hover.

Icons: Lucide (shadcn default), 16px in rows, 18–20px in navigation, 2px stroke.

## Accessibility

- Text contrast 4.5:1 minimum (all tokens above pass).
- Visible focus ring: 2px `--fg` outline with 2px offset on every interactive element.
- Real `<button>` and `<a>` elements; icon-only buttons have `aria-label`; tabs use `role="tablist"` / `aria-selected`; votes use `aria-pressed`.
- Touch targets at least 44px on mobile.
- Never rely on crimson alone: LIVE also has text, votes also change the number.

## The `/design` page

`apps/web/app/design` shows every token and component in both themes. It is **admin-only**: non-admins get a 404, it's `noindex` and left out of the sitemap. Always visible in local development.

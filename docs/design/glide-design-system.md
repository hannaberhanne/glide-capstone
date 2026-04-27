# Glide Design System

## Design North Star
Dashboard and Planner define the canonical Glide visual language. The rest of the product should be brought into that family, not the other way around.

The current repo already points to the right direction:

- warm paper backgrounds
- dark ink typography
- moss green action accents
- gold progress accents
- restrained rounding
- dense, work-focused layouts
- serif display with sans-serif body copy

## Brand Expression
Glide should feel studious, calm, tactile, and intentional. It should not look like a generic SaaS dashboard or a bright gamified habit toy.

### Visual personality
- academic, not corporate
- warm, not sugary
- focused, not sterile
- premium but grounded
- supportive without becoming soft or childish

## Canonical Tokens

### Color
The repo currently contains overlapping variables in `App.css`, `DashboardPage.css`, and `PlannerPage.css`. Consolidate them into one system.

| Token | Purpose | Canonical Value |
| --- | --- | --- |
| `--glide-bg-app` | Global application backdrop | `#f3ede3` |
| `--glide-bg-paper` | Main paper panel | `#fbf7f0` |
| `--glide-bg-paper-2` | Secondary paper/rail | `#f1e8da` |
| `--glide-bg-panel` | Planner side panel tone | `#dfd5c4` |
| `--glide-ink` | Primary text | `#2e261f` |
| `--glide-ink-muted` | Secondary text | `#6c5c4b` |
| `--glide-moss` | Primary positive/action accent | `#7d9577` |
| `--glide-moss-strong` | Hover/pressed accent | `#5e7156` |
| `--glide-gold` | XP, streak, and reward accent | `#b28a1e` |
| `--glide-terracotta` | Warning/recovery accent | `#a45c46` |
| `--glide-line` | Standard border/divider | `rgba(46, 38, 31, 0.1)` |
| `--glide-line-strong` | Strong border/divider | `rgba(46, 38, 31, 0.16)` |
| `--glide-success` | Confirming success state | `#6b8f71` |
| `--glide-alert` | Highlight attention state | `#f5cb5c` |

### Typography
| Token | Usage | Spec |
| --- | --- | --- |
| `--font-display` | Major page titles and hero statements | `"Libre Baskerville", serif` |
| `--font-body` | Body text, controls, metadata | `"SF Pro Text", "Segoe UI", sans-serif` |
| `--text-hero` | Primary page title | `34px / 1.05 / 700` |
| `--text-h1` | Section title | `28px / 1.1 / 700` |
| `--text-h2` | Panel title | `22px / 1.15 / 700` |
| `--text-h3` | Card or module title | `18px / 1.2 / 600` |
| `--text-body` | Standard body text | `14px / 1.5 / 400` |
| `--text-meta` | Labels, tabs, chips | `12px / 1.2 / 700 / uppercase / 0.08-0.1em tracking` |

### Spacing
One scale only:

| Token | Value |
| --- | --- |
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `40px` |
| `--space-8` | `56px` |

### Radius
| Token | Value | Usage |
| --- | --- | --- |
| `--radius-sm` | `12px` | Inputs, chips |
| `--radius-md` | `16px` | Cards, small panels |
| `--radius-lg` | `22px` | Major panels |
| `--radius-xl` | `28px` | Hero sheets, dashboard surfaces |
| `--radius-pill` | `999px` | Buttons, tabs, status pills |

### Shadow
| Token | Value |
| --- | --- |
| `--shadow-soft` | `0 8px 24px rgba(46, 38, 31, 0.06)` |
| `--shadow-panel` | `0 18px 32px rgba(46, 38, 31, 0.06)` |
| `--shadow-focus` | `0 0 0 4px rgba(125, 149, 119, 0.14)` |

## Layout System

### App Shell
- Persistent left navigation spine for private routes
- Content constrained to `min(1360px-1440px, 100%)`
- Footer and accessibility menu remain in the private shell
- Dashboard and Planner may have specialized internal layouts, but not separate app themes

### Public/Auth Family
- Simpler than private screens
- Same typography, paper palette, and control language
- Hero moments are allowed on landing and demo, but must still read as Glide

## Shared Components

### Buttons
- Primary button: dark ink background, paper text, pill radius
- Secondary button: paper background, ink border
- Tertiary link button: ink text, no fake heavy CTA styling
- Destructive button: terracotta border/text treatment

### Form Controls
- One input height family
- One select styling family
- High-contrast, focus-visible states required
- Settings, auth, onboarding, and modal forms must use the same field model

### Tabs
- Pill or segmented controls with subtle paper fill and strong active state
- Used in settings and potentially goals/planner subtabs

### Cards and Panels
- Paper surfaces, not glassmorphism experiments
- Dense vertical rhythm
- Border-first styling over dramatic shadows
- Empty states must be productive, not decorative

### Stat Chips
- Use gold, moss, or neutral paper accents
- Never show fake values
- If data is unavailable, show a truthful fallback state instead of `null days`

### Alerts and Banners
- Success: moss family
- Warning: gold family
- Error/recovery: terracotta family
- Copy should explain the outcome and next action when needed

### Modals
- Used for task and goal editing only when inline flows would be heavier
- Share the same card, input, and button language

### Empty States
- Must offer a next action
- No dead "coming soon" sections on private screens
- No empty badge galleries without a truthful fallback

## Surface Rules By Page Family

### Dashboard
- Daily paper sheet plus supporting rail
- Strong contrast between planned work and supporting metrics
- Most information-dense page

### Planner
- Remains the visual north star
- Dense monthly surface with clear schedule explanations
- AI states should feel operational, not gimmicky

### Goals
- Must be redesigned into the same paper-and-ink family
- Project and routine cards should be distinct by structure, not by unrelated theming

### Settings and Canvas Setup
- Must stop looking like utility pages from another app
- Should inherit the same shell, controls, and tone as the private workspace

### Auth, Onboarding, Landing, Demo
- Simpler, lighter layouts
- Still clearly part of the same family through typography, palette, and rhythm

## Accessibility
- Theme, font scaling, contrast, highlight links, and reduce motion remain supported
- Preferences must persist coherently across devices through the user profile
- Reduce-motion mode should tone down animation, not break layout hierarchy

## Reject List
- separate page palettes with unrelated emotional tone
- unrelated font systems by route
- purple-first default styling
- fake stats and fake badges
- empty placeholder cards presented as product features
- settings controls without real backend behavior
- utility-page aesthetics for Canvas or account management
- disconnected CTA styles across public surfaces

## Implementation Rule
Move page-specific tokens into `App.css` and `index.css`, then let route CSS files consume shared variables. Dashboard and Planner may keep a few local aliases, but not separate design systems.

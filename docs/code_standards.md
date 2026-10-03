# Technical & Architectural Code Standards

---

## 1. Core Architectural Pillars

1. **Local-First & Zero Latency:** SQLite embedded in WAL mode is the single source of truth. All critical paths (<1ms queries, <10s POS checkout) must execute locally without network dependencies.
2. **ACID Concurrency:** All financial mutations (creating invoices, updating stock, inserting khata entries, recording payments) must be wrapped inside `conn.transaction()?` in Rust.
3. **Strict Type Safety & Zero Warnings:** TypeScript `noUnusedLocals: true` and Rust `cargo check` must compile cleanly with 0 errors/warnings at all times.

---

## 2. 4-Layer Design Token Architecture

No component is permitted to hardcode hex codes, pixel spacings, or ad-hoc Tailwind values. All styles derive from the 4 token layers in `src/index.css`:

```text
Layer 1: Primitive Tokens   (--primitive-blue-600, --primitive-gray-100, etc.)
Layer 2: Semantic Tokens    (--color-action-primary, --color-bg-surface, etc.)
Layer 3: Component Tokens   (--button-height-md, --table-header-bg, etc.)
Layer 4: POS & Billing Tokens (--pos-numpad-bg, --pos-total-display, etc.)
```

---

## 3. Mandatory UI & Frontend Rules

### 3.1 Tailwind CSS v4 Canonical Syntax
* **Rule:** Do NOT write variable strings like `bg-[var(--color-bg-surface)]`.
* **Standard:** Use the canonical parenthesis syntax:
  * `bg-(--color-bg-surface)`
  * `text-(--color-text-primary)`
  * `border-(--color-border-default)`
* **@theme Tokens:** Standard tokens configured in `@theme` must be used directly: `rounded-sm`, `rounded-md`, `rounded-lg`, `h-9`, `h-11`, `h-14`.

### 3.2 Truncated Text & Hover Tooltips (Mandatory Alignment Rule)
* **Rule:** Table cells, cards, and grid rows must NEVER wrap multi-line text if it disrupts vertical alignment and high information density.
* **Standard:** Use `truncate` with `title={fullText}` or a tooltip wrapper:
  ```tsx
  <span className="truncate max-w-xs cursor-help" title={product.name}>
    {product.name}
  </span>
  ```

### 3.3 Focus States & Input Outlines (Zero Double Borders)
* **Rule:** Never allow browser default focus outline to layer on top of custom input border rings.
* **Standard:** Always use:
  ```tsx
  className="... outline-none focus:outline-none focus:ring-2 focus:ring-(--color-action-primary)/20 focus:border-(--color-action-primary) ..."
  ```

### 3.4 Windows & Keyboard-First Ergonomics
* **Rule:** Every primary action must have a keyboard shortcut.
* **Standard:**
  * Universal Search: `(e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'`
  * POS Numpad: `/` (Quantity), `*` (Discount), `+` / `Enter` (Complete Sale)
  * Module Hotkeys: `F1` (POS), `F2` (Wholesale), `F3` (Products), `F4` (Khata), `F5` (GST), `F6` (Settings/Printers)

---

## 4. Retrospective & Technical Lessons Learned

| Topic | Mistake / Challenge | Correction & Permanent Guideline |
| :--- | :--- | :--- |
| **Tailwind v4 Variables** | Writing `text-[var(--color-...)]` caused linter warnings. | Always write `text-(--color-...)` and `bg-(--color-...)`. |
| **TypeScript Strictness** | Unused imports (e.g. `RotateCcw`) failed `npm run build`. | Clean unused imports before triggering builds. |
| **Input Double Border** | `border-2` + focus outline looked doubled on Windows Chromium. | Use `outline-none focus:ring-2 focus:border-transparent`. |
| **Button Padding** | Icons flush to left border in narrow sidebar containers. | Add explicit `px-3 gap-2 shrink-0` on button icons. |
| **Text Overflow** | Long product names pushed table headers out of alignment. | Use single-line `truncate` paired with `title={...}` tooltips. |
| **Khata Sync** | Standalone khata updates could diverge from invoice stock. | Compound mutations must execute inside atomic SQLite transactions. |

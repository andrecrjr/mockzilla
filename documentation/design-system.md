# Design System & Color Palette

This document outlines the visual identity, design tokens, and UI patterns used across the Mockzilla platform. The system is built on top of **Tailwind CSS v4** with a focus on high-fidelity, accessible, and developer-friendly interfaces.

## 🎨 Color Palette

Mockzilla uses a sophisticated color system defined using **OKLCH** color spaces for better perceptual uniformity and vibrant gradients.

### Core Variables (Light & Dark Mode)

| Variable | Light Mode (OKLCH) | Dark Mode (OKLCH) | Purpose |
| :--- | :--- | :--- | :--- |
| `--primary` | `0.65 0.25 280` | `0.65 0.25 280` | Main brand color (Purple/Indigo) |
| `--secondary` | `0.88 0.05 280` | `0.25 0.04 280` | Secondary surfaces and badges |
| `--accent` | `0.7 0.28 270` | `0.7 0.28 270` | Interactive accents and highlights |
| `--background` | `0.98 0.01 265` | `0.08 0.02 265` | Page background |
| `--foreground` | `0.15 0.02 265` | `0.98 0.01 265` | Main text color |
| `--card` | `1 0 0` | `0.12 0.015 265` | Card surfaces |
| `--destructive` | `0.55 0.22 25` | `0.55 0.22 25` | Error and delete actions (Red/Orange) |
| `--border` | `0.92 0.02 265` | `0.18 0.025 265` | Default component borders |

### Brand Specific Colors

*   **Primary Purple**: Used for main CTAs, active states, and primary iconography.
*   **Success Green**: Typically `text-green-600` or `text-green-400` in dark mode, used for `2xx` status codes and enabled states.
*   **Warning Amber**: Used for `4xx` status codes and wildcard warnings.
*   **Destructive Red**: Used for `5xx` status codes and dangerous actions.

---

## 🔡 Typography

We prioritize readability and a technical aesthetic using modern sans-serif and monospace fonts.

*   **Sans-serif**: `Inter`, `system-ui`, `-apple-system`. Used for general UI, labels, and documentation.
*   **Monospace**: `JetBrains Mono`, `Courier New`, `monospace`. Used for paths, code blocks, JSON payloads, and technical identifiers.

---

## 💎 Custom Mockzilla Styles

Beyond the base Tailwind classes, Mockzilla employs specific visual patterns to create a cohesive developer-centric experience.

### Glassmorphism & Translucency
Most surface areas use a "glass" effect to maintain context and depth.
*   **Utility**: `bg-card/50 backdrop-blur-sm`
*   **Usage**: Navbar (`LandingNavbar`), dialog overlays, and card backgrounds in dashboard lists.

### Branded Gradients
Used sparingly for high-impact sections and brand recognition.
*   **Brand Primary**: `bg-gradient-to-r from-primary to-purple-700` (Landing backgrounds)
*   **Subtle Accent**: `bg-gradient-to-br from-primary/5 to-purple-500/5` (Section backgrounds)
*   **Gradient Text**: `bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent`

### Workflow & Effect Coding
Workflow mode uses a color-coding system to distinguish between State and Database operations.

| Operation Type | Border/BG Style | Color Logic |
| :--- | :--- | :--- |
| **Database (DB)** | `border-blue-200 bg-blue-50` (Light) / `dark:border-blue-900 dark:bg-blue-950` | Professional Blue |
| **State** | `border-orange-200 bg-orange-50` (Light) / `dark:border-orange-900 dark:bg-orange-950` | Logical Orange |
| **Scenario** | `border-l-4 border-l-blue-500` | Indicator left-border |
| **Transition** | `border-l-4 border-l-green-500` | Indicator left-border |

### Custom Documentation Styles
The documentation components (`@components/docs/**`) use a specific "Editor" theme for code previews.
*   **Editor Block**: `bg-[#1e1e1e] text-white p-4 rounded-lg overflow-x-auto shadow-inner`
*   **Tip/Note Cards**: `bg-primary/5 border border-primary/20 rounded-lg p-4`

### Reusable Custom Classes (`app/globals.css`)
*   **`.mockzilla-border`**: `border border-primary/30 dark:border-primary/40`
*   **`.mockzilla-glow`**: `shadow-lg shadow-primary/20 dark:shadow-primary/30`
*   **`.mockzilla-card-hover`**: `transition-all hover:shadow-md hover:border-primary/50`

---

## 📐 Spacing & Layout

Mockzilla follows a structured spacing system to ensure consistency and visual balance across the application.

### Border Radii
We use a hierarchical border radius system based on a central `--radius` variable.

| Variable | Value | Usage |
| :--- | :--- | :--- |
| `--radius` | `0.625rem` (10px) | Default radius for standard components |
| `--radius-sm` | `calc(var(--radius) - 4px)` (6px) | Small buttons, sub-items |
| `--radius-md` | `calc(var(--radius) - 2px)` (8px) | Inputs, small cards |
| `--radius-lg` | `var(--radius)` (10px) | Standard cards, dialogs |
| `--radius-xl` | `calc(var(--radius) + 4px)` (14px) | Large containers, main surface areas |

### Common Spacing Patterns
While we use standard Tailwind spacing utilities, certain patterns are prevalent:

*   **Page Padding**: Main content areas typically use `px-4 sm:px-6 lg:px-8` for responsive horizontal padding.
*   **Card Padding**: Standard cards (`@components/ui/card.tsx`) use `p-6` or `py-6`.
*   **Grid Gaps**: Dashboard grids and lists usually use `gap-4` or `gap-6`.
*   **Form Spacing**: Form elements are typically stacked with `space-y-4` or `space-y-6`.
*   **Dialog Spacing**: `DialogContent` usually includes `p-6` with `gap-4` for headers and footers.

### Custom Utilities
*   **`.scrollbar-thin`**: A custom utility for Firefox and Webkit to provide a non-obtrusive scrolling experience.
    *   **Thumb**: `theme('colors.gray.400')`
    *   **Track**: `theme('colors.gray.100')`
    *   **Width**: `8px`

---

## 🏗️ Architecture: shadcn/ui & Custom Elements

Mockzilla's UI is built on a foundation of **shadcn/ui** (Radix UI primitives + Tailwind CSS), with strategic enhancements to match our brand's technical aesthetic.

### Standard shadcn/ui Components
Most components in `@components/ui/` follow the standard shadcn/ui pattern but are customized via `app/globals.css` variables.

*   **Primitives**: Accordion, Alert, Alert Dialog, Dialog, Dropdown Menu, Popover, Select, Switch, Tabs, Tooltip.
*   **Data Display**: Badge, Table, Skeleton.
*   **Forms**: Input, Label, Textarea.

### Mockzilla Enhancements
We have modified several base components to provide a more "robust" feel:

1.  **Button**: Enhanced with `focus-visible:ring-[3px]` for higher visibility and custom dark-mode background colors (`dark:bg-input/30`).
2.  **Card**: Customized with `rounded-xl`, `shadow-sm`, and `gap-6` defaults to provide more internal breathing room than the shadcn default.
3.  **Inputs & Textareas**: Integrated with `--input` variable which uses `oklch` for more precise color matching in both themes.

### Custom Components (Non-shadcn)
The following components are unique to Mockzilla and built specifically for our workflow engine:

*   **`VisualPatternPreview`**: Specialized logic for visualizing wildcard path matching.
*   **`EffectsEditor`**: A complex, stateful editor for transition side-effects.
*   **`StateInspector`**: A diagnostic tool for real-time mini-DB and variable monitoring.
*   **`MockVariantManager`**: Advanced logic for handling multiple response variants.

---

## 🛠️ UI Components (`@components/ui/`)

The design system utilizes a set of low-level primitive components built with Radix UI:

*   **Accordion**: Used in FAQs and documentation for collapsible content.
*   **Badge**: Used for HTTP methods (`GET`, `POST`), status codes, and tags.
*   **Button**: Multiple variants including `default`, `outline`, `ghost`, and `destructive`.
*   **Card**: The fundamental container for UI grouping. Usually combined with `.mockzilla-border`.
*   **Dialog**: Used for forms and complex interactions (Create Mock, Edit Folder).
*   **Input / Textarea**: Styled with consistent borders and focus states.
*   **Select**: Accessible dropdowns for methods and status codes.
*   **Tabs**: Used in the Mock Editor to switch between Manual, Schema, and Advanced options.

---

## 📐 Layout & Spacing

*   **Border Radius**: Default `--radius` is `0.625rem` (10px).
*   **Container**: Max-width usually set to `7xl` (`max-w-7xl`) for landing pages and `6xl` for editor dialogs.
*   **Backdrop Blur**: Frequently used on cards and navigation (`backdrop-blur-sm`) to create a layered effect over gradients.

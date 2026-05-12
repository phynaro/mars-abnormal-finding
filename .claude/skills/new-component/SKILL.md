---
name: new-component
description: Scaffold a new React component following this project's Radix UI + Tailwind + TypeScript pattern
---

Create a new React component for the mars-abnormal-finding frontend.

## Usage
Arguments: `<ComponentName> <category> [brief description of what it does]`

- `ComponentName` — PascalCase, e.g. `StatusBadge`
- `category` — subfolder under `frontend/src/components/`, e.g. `common`, `tickets`, `dashboard`

## Output
Create the file at `frontend/src/components/<category>/<ComponentName>.tsx`.

## Pattern to follow

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface <ComponentName>Props {
  // define props with TypeScript
  className?: string
}

export const <ComponentName>: React.FC<<ComponentName>Props> = ({
  className,
  ...props
}) => {
  return (
    <div className={cn("", className)}>
      {/* implementation */}
    </div>
  )
}
```

## Rules
- Always use `cn()` from `@/lib/utils` for conditional class merging — never string concatenation
- Use Radix UI primitives when the component needs accessibility (Dialog, Select, Checkbox, Tooltip, etc.)
- Use `cva` from `class-variance-authority` if the component has visual variants (like Button)
- Export a named TypeScript interface for props, not an inline type
- Named export only — no default export
- Tailwind classes only — no inline styles, no CSS modules
- If the component fetches data, accept it as props; data fetching stays in the page or a custom hook
- Use `useLanguage()` from `@/contexts/LanguageContext` for any user-visible strings: `const { t } = useLanguage()`
- Support dark mode via Tailwind's `dark:` variants (the project uses class-based dark mode)

## Radix UI packages available
`@radix-ui/react-avatar`, `checkbox`, `collapsible`, `dialog`, `dropdown-menu`, `label`, `progress`,
`scroll-area`, `select`, `separator`, `slot`, `switch`, `tabs`, `toast`, `tooltip`

After creating the file, show the import path the consumer should use.

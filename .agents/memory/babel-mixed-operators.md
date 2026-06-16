---
name: Babel mixed logical operators
description: Babel parser requires explicit parens when mixing || and ?? in the same expression.
---

## Rule
When mixing `||` and `??` in a single expression, Babel's parser throws:
> Nullish coalescing operator(??) requires parens when mixing with logical operators.

## Fix
Wrap the `??` operand in parens:

```ts
// WRONG — Babel parse error:
const x = a || b ?? "";

// CORRECT:
const x = a || (b ?? "");
```

**Why:** This is a Babel parser restriction (not just TypeScript). It applies to `.tsx` files processed by Vite's `vite:react-babel` plugin. The error manifests at dev-server transform time, not at tsc typecheck time.

**How to apply:** Any time you write `expr || someCall() ?? fallback`, wrap the right side: `expr || (someCall() ?? fallback)`.

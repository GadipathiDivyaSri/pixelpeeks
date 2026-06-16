---
name: OTP 2FA login flow
description: How the two-factor auth login flow works in PixelPeek and TypeScript gotchas found.
---

## Flow
1. POST /auth/login → `{ requiresOtp: true, pendingToken, devOtp? }` (devOtp only when no SMTP configured)
2. Frontend stores `pendingToken` + `devOtp` in sessionStorage, navigates to `/otp-verify?purpose=login&email=X`
3. POST /auth/verify-otp `{ email, otp, purpose, pendingToken }` → `{ token, user }`

## TypeScript gotcha — useEffect cleanup
When a `useEffect` callback conditionally returns a cleanup function, TypeScript (with `noImplicitReturns` or strict mode) complains "Not all code paths return a value". Use the early-return guard pattern:

```ts
useEffect(() => {
  if (condition <= 0) return;   // early return (void)
  const t = setTimeout(...);
  return () => clearTimeout(t); // cleanup return
}, [condition]);
```

NOT the nested if pattern (which TypeScript flags even though React accepts it).

**Why:** The tsconfig for the pixelpeek frontend has strict settings that catch mixed-return functions.

**How to apply:** Any `useEffect` with a conditional cleanup must use the early-return guard pattern.

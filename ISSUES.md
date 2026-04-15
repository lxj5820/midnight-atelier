# Code Review Issues & Fixes

## HIGH — Security

### 1. CORS localhost bypass
- **File**: `server/src/index.ts:37`
- **Bug**: `origin.includes('localhost')` matches `evil-localhost.com`
- **Fix**: Replace with `origin.startsWith('http://localhost:')`

### 2. Cookie secure flag disabled on Railway
- **File**: `server/src/routes.ts:87,97`
- **Bug**: `secure: !isRailway && ...` disables secure in production on Railway
- **Fix**: Change to `secure: process.env.NODE_ENV === 'production'`. For cross-origin cookie delivery use `sameSite: 'none'` + `secure: true` in production.

### 3. Verification code uses Math.random()
- **File**: `server/src/email.ts:115`
- **Bug**: `Math.floor(100000 + Math.random() * 900000)` is predictable
- **Fix**: Use `crypto.randomInt(100000, 999999).toString()`

### 4. Rate limit memory leak
- **File**: `server/src/routes.ts:102`
- **Bug**: `rateLimitMap` never cleans expired entries
- **Fix**: In `checkRateLimit`, delete entry when `record.resetTime < now` before creating new one. Or add a periodic `setInterval` cleanup.

### 5. No login brute-force protection
- **File**: `server/src/routes.ts:230`
- **Bug**: `/auth/login` has no rate limit
- **Fix**: Apply `checkRateLimit(clientIP)` at start of login handler, same pattern as send-verification-code.

### 6. SMTP TLS cert mismatch with IP connect
- **File**: `server/src/email.ts:67-80`
- **Bug**: Resolves hostname to IP then connects with `host: ip`. TLS cert is issued to domain, not IP → cert validation fails in production.
- **Fix**: Use `host: config.host` with `family: 4` in transport options to force IPv4 without breaking TLS. Remove the dns.resolve4 workaround. Example:
```ts
const transporter = nodemailer.createTransport({
  host: config.host,
  port: config.port,
  secure: config.secure,
  auth: { user: config.user, pass: config.pass },
  tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  // Force IPv4
  ...(process.env.RAILWAY_ENVIRONMENT ? { dnsOptions: { family: 4 } } : {}),
});
```

## MEDIUM — Data Integrity

### 7. Refund allows duplicate refunds
- **File**: `server/src/db.ts:379-411`
- **Bug**: `refundComputePoints` finds recent consume log but never marks it as refunded. User can call refund repeatedly.
- **Fix**: After refund, update the original consume log's reason to append `[已退款]`, and in the query filter exclude logs whose reason contains `[已退款]`. Or add a `refunded` boolean field to `ComputePointLog`.

### 8. Compute point ops + log not in transaction
- **File**: `server/src/db.ts:317-324,369-376,401-408`
- **Bug**: `adminGiftComputePoints`, `consumeComputePoints`, `refundComputePoints` do point update and log creation as separate calls. If log fails, points changed with no record.
- **Fix**: Wrap each in `prisma.$transaction()`. Example for `consumeComputePoints`:
```ts
export async function consumeComputePoints(userId: string, points: number, reason: string) {
  try {
    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId, compute_points: { gte: points } },
        data: { compute_points: { decrement: points } },
      }),
      prisma.computePointLog.create({
        data: { id: `log_${Date.now()}_${crypto.randomUUID()}`, userId, amount: -points, type: 'consume', reason, operatorId: userId },
      }),
    ]);
    return { success: true, user: toSafeUser(user) };
  } catch {
    return { success: false, error: '算力值不足' };
  }
}
```
Apply same pattern to `adminGiftComputePoints`, `adminCompensateComputePoints`, `refundComputePoints`, `dailySignIn`.

### 9. Daily sign-in timezone
- **File**: `server/src/db.ts:428-431`
- **Bug**: `today.setHours(0,0,0,0)` uses server TZ, not user TZ
- **Fix**: Use UTC: `const today = new Date(); today.setUTCHours(0,0,0,0);` and `tomorrow.setUTCDate(...)`. Document that sign-in resets at UTC midnight.

## LOW — Cleanup

### 10. Dead code removal
- `src/App.tsx:196-204`: `getGenerationHistory()` — reads localStorage, unused after IndexedDB migration. Delete it.
- `src/App.tsx:211-213`: `getGenerationHistoryByType()` — always returns `[]`. Delete it.
- `server/src/db.ts:654-656`: `addComputePointsToUser` — alias of `addUserComputePoints`. Delete and remove from exports in `routes.ts`.
- `server/src/routes.ts:171-177` + `src/api.ts:116-118`: `/public/default-api-key` endpoint and `getDefaultApiKey()` — returns empty string, dead endpoint. Delete both.

### 11. SMTP config N+1 queries
- **File**: `server/src/email.ts:16-21`
- **Bug**: 6 separate DB queries for SMTP config
- **Fix**: Replace with single call: `const all = await getAllSystemSettings();` then read keys from the returned object.

### 12. IndexedDB db.close() timing
- **File**: `src/App.tsx:250-251,265,276,299`
- **Bug**: `db.close()` called before transaction completes
- **Fix**: Move `db.close()` inside `tx.oncomplete` callback.

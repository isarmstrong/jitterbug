# Jitterbug Next.js Example

This example shows how to use Jitterbug with Next.js 15 in Edge Runtime.

## Features Demonstrated

- Edge Runtime integration
- Real-time logging with SSE
- Debug panel integration
- Type-safe error handling

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) to see the example.

## Key Files

- `src/app/api/logs/route.ts` - Edge API route for log handling
- `src/app/debug/page.tsx` - Debug panel integration
- `src/lib/logger.ts` - Jitterbug logger configuration

## Environment Variables

```env
NEXT_PUBLIC_DEBUG_MODE=true # Enable debug panel
```

## Notes

- This example uses Edge Runtime exclusively
- Demonstrates proper error handling and type safety
- Shows real-time log streaming with SSE 
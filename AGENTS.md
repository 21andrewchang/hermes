# AGENTS.md

This file contains guidelines and commands for agentic coding agents working in this SvelteKit repository.

## Project Overview

Modern SvelteKit 5 project with TypeScript and Tailwind CSS v4. Uses Vite, ESLint, Prettier, and Vercel adapter. Strict TypeScript enabled.

## Essential Commands

### Development

```bash
npm run dev              # Start development server
npm run dev -- --open    # Start dev server and open browser
```

### Building & Deployment

```bash
npm run build           # Create production build
npm run preview         # Preview production build locally
```

### Type Checking

```bash
npm run check           # Run svelte-check type checking
npm run check:watch     # Run type checking in watch mode
```

### Code Quality

```bash
npm run lint            # Run ESLint and Prettier check
npm run format          # Format code with Prettier
```

### Project Maintenance

```bash
npm run prepare         # Sync SvelteKit (run after package changes)
```

## Code Style Guidelines

### Formatting Rules

- **Indentation**: Use tabs (not spaces)
- **Quotes**: Single quotes for strings
- **Trailing commas**: None
- **Line width**: 100 characters maximum
- **Semicolons**: Use where required

### Svelte 5 Modern Syntax

- Use runes syntax: `$props()`, `$state()`, `$derived()`, `$effect()`
- Prefer `<script lang="ts">` blocks
- Use `{@render children()}` for slot patterns
- Use `$bindable()` for two-way binding when needed

### TypeScript Requirements

- **Strict mode**: Enabled, no implicit any
- **Explicit typing**: All functions, variables, and props
- **Interfaces**: Use for object shapes, types for primitives/unions
- **Never use `any`**: Always prefer proper typing

### Import Patterns

```typescript
import type { ComponentType } from '$lib/types';
import { myFunction } from '$lib/utils';
import MyComponent from '$lib/components/MyComponent.svelte';
import favicon from '$lib/assets/favicon.svg';
```

### Component Conventions

- **File naming**: PascalCase for components (MyComponent.svelte)
- **Props typing**: Always type props with interfaces
- **Reactivity**: Use `$state()` for local state, stores for global state
- **Events**: Use Svelte event dispatching with proper typing

## File Structure & Conventions

### SvelteKit Routing

```
src/routes/
├── +layout.svelte      # Root layout
├── +page.svelte        # Home page
├── about/
│   └── +page.svelte    # About page
└── api/
    └── +server.ts      # API routes
```

### Library Organization

```
src/lib/
├── components/         # Reusable UI components
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── stores/            # Svelte stores
└── assets/            # Static assets (images, icons)
```

### TypeScript Declarations

- Use `src/app.d.ts` for global type extensions
- Define App namespace interfaces for SvelteKit
- Export types from `src/lib/types/` for reuse

## Development Best Practices

### Error Handling

```typescript
try {
	const result = await apiCall();
	return { success: true, data: result };
} catch (error) {
	console.error('API call failed:', error);
	return { success: false, error: error.message };
}
```

### Performance Optimization

- Use SvelteKit's built-in code splitting
- Lazy load heavy components with dynamic imports
- Optimize images and assets
- Use `loading` patterns for better UX

### Accessibility

- Use semantic HTML elements
- Add ARIA labels where needed
- Ensure keyboard navigation
- Test with screen readers

### State Management

- Use `$state()` for component-local state
- Use Svelte stores for cross-component state
- Consider server state vs client state
- Use SvelteKit's load functions for data fetching

## CSS and Styling

### Tailwind CSS v4

- Use CSS-first approach with `@import 'tailwindcss'`
- Utility classes in component markup
- Custom CSS in component `<style>` blocks when needed
- Responsive design with mobile-first approach

### Styling Patterns

```svelte
<div class="flex items-center justify-between rounded-lg bg-white p-4 shadow">
	<h2 class="text-xl font-semibold text-gray-900">{title}</h2>
	<button class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
		{buttonText}
	</button>
</div>
```

## Testing Strategy

### Current Status

No testing framework is currently configured in this project.

### Recommended Setup

When adding tests, use:

- **Vitest** for unit testing
- **Svelte Testing Library** for component testing
- **Playwright** for end-to-end testing

### Test Organization

```
src/
├── components/
│   ├── MyComponent.svelte
│   └── __tests__/
│       └── MyComponent.test.ts
└── lib/
    ├── utils/
    │   ├── myUtil.ts
    │   └── __tests__/
    │       └── myUtil.test.ts
```

## Tooling Integration

### ESLint Configuration

- TypeScript + Svelte rules enabled
- Prettier integration for consistent formatting
- Custom rules in `eslint.config.js`

### Prettier Configuration

- Svelte plugin for .svelte files
- Tailwind plugin for CSS class sorting
- Configuration in `.prettierrc`

### VS Code Settings

- Tailwind CSS file associations configured
- Recommended extensions: Svelte, TypeScript, Tailwind

### Git Configuration

- Strict npm engine versioning enabled
- Proper ignore patterns for build artifacts
- Pre-commit hooks recommended for lint/format

## Common Patterns

### API Data Fetching

```typescript
export async function load({ fetch }) {
	const response = await fetch('/api/data');
	const data = await response.json();
	return { data };
}
```

### Form Handling

```typescript
export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		return { success: true };
	}
};
```

### Component Props

```typescript
interface Props {
	title: string;
	count?: number;
	onSubmit?: (value: string) => void;
}

let { title, count = 0, onSubmit }: Props = $props();
```

## Before Committing

Always run these commands before committing:

```bash
npm run check    # Ensure TypeScript passes
npm run lint     # Check code quality
npm run format   # Format code if needed
```

this ensures the codebase maintains high quality and consistency across all contributions.

## Invoice Demo Build Plan

### App Structure (Routes/Tabs/Components)

- **Single Route**: Use SvelteKit's default `+page.svelte` as the main entry point. No additional routes needed.
- **Tabs/Views**: Implement three primary views as tabbed sections within the main page:
  - Inbox (default view): List of all invoices with filters and batch actions.
  - Check Run Queue: List of invoices queued for checks.
  - Digest: Summary view post-batch actions, with counters and top exceptions.
- **Components**:
  - `InvoiceTable.svelte`: Reusable table for displaying invoice rows (used in Inbox and Check Queue).
  - `InvoiceRow.svelte`: Individual row component with status badges, reason text, and click-to-detail.
  - `ExceptionDetail.svelte`: Drawer/modal for exception details, audit trail, and action buttons.
  - `BatchActions.svelte`: Top bar with "Approve all Trusted" and "Queue all Checks" buttons, plus counters.
  - `Filters.svelte`: Dropdown/filter bar for status (All/Trusted/Check/Exception/Approved/Queued).
  - `DigestSummary.svelte`: Section for post-batch summary (Approved electronic, Checks queued, Exceptions remaining, top 10 exceptions).
  - `Counters.svelte`: Global top counters (Total, Approved, Checks queued, Exceptions remaining).
- **Layout**: Wrap in `+layout.svelte` with Tailwind CSS for responsive grid. Use Svelte 5 runes (`$state`, `$derived`) for reactivity.

### Data Model (TypeScript Interfaces)

- **Invoice Interface**:
  ```typescript
  interface Invoice {
  	id: string;
  	vendor: string;
  	description: string;
  	date: string; // ISO format
  	invoiceNumber: string;
  	amount: number;
  	paymentType: 'Electronic' | 'Check';
  	status: 'Trusted' | 'Check' | 'Exception' | 'Approved' | 'Queued';
  	reason: string; // One-line explanation for status
  	auditTrail: string[]; // Array of decision strings, e.g., ["Trusted Vendor + under threshold", "Approved because..."]
  	// Additional fields for exceptions: duplicateId?: string; typicalAmount?: number; etc.
  }
  ```
- **Store Interface**: Simple in-memory store using Svelte `$state.raw`.
  ```typescript
  interface InvoiceStore {
  	invoices: Invoice[];
  	approvedCount: number;
  	queuedCount: number;
  	exceptionCount: number;
  }
  ```

### Hardcoded Data Generation Approach

- Generate 1000 invoice objects in a `data.ts` file (exported as array).
- **Distribution**:
  - 700 Trusted electronic: From 3-5 known vendors (e.g., "Green Gardens", "Pest Control Co") with amounts consistently <$500 (e.g., $200-400 range).
  - 200 Check invoices: From check-only vendors (e.g., "Utility Services"), varying amounts.
  - 100 Exceptions: Mix of specific cases (duplicate invoice: pair two with same `invoiceNumber` for same vendor; new vendor: unknown name; high amount: 3x typical, e.g., $1200 for $400 vendor; missing fields: omit `date` or `invoiceNumber` randomly; edge cases: check-only vendor with electronic payment).
- **Generation Logic**: Use a loop in `data.ts` to create objects. Seed with faker-like logic (hardcoded arrays for vendors, dates in last month, random amounts within ranges). Ensure determinism: Use fixed seeds or predefined arrays to avoid randomness during demo. Include `auditTrail` with 1-3 hardcoded strings per invoice explaining decisions (e.g., "Approved because Trusted Vendor + under threshold").

### State Management Strategy

- Use Svelte's `$state.raw` for a global store in `lib/stores.ts` (single source of truth).
- Actions: Functions in `lib/actions.ts` to update statuses (e.g., batch approve Trusted, queue Checks, approve exceptions individually).
- Reactivity: `$derived` for computed counters (total approved, etc.). No external stores needed; keep in-memory only.

### Key User Flows (Step-by-Step)

1. **Load Inbox**: App starts in Inbox tab, displays all 1000 invoices. Counters show Total: 1000, others 0.
2. **Filter and Browse**: User applies filters (e.g., Trusted) to see subsets. Clicks an exception row to open detail drawer.
3. **Batch Actions**: Click "Approve all Trusted (700)" → Updates 700 statuses to Approved. Click "Queue all Checks (200)" → Moves 200 to Check Queue tab.
4. **Handle Exceptions**: Remaining 100 exceptions shown. Click one → Open detail modal with audit trail and buttons (Approve anyway → move to Approved).
5. **View Check Queue**: Switch to Check Run Queue tab; see 200 queued invoices.
6. **Digest View**: Switch to Digest tab; see summary with counts and top 10 exceptions (one-line reasons).

### Acceptance Criteria Checklist

- [ ] Inbox loads 1000 invoices instantly (no loading states).
- [ ] Filters work: Show only Trusted (700), Check (200), Exception (100).
- [ ] Batch actions: Approve Trusted button updates 700 to Approved; Queue Checks moves 200 to Check Queue.
- [ ] Counters update live: After batches, Approved: 700, Queued: 200, Exceptions: 100.
- [ ] Exception detail: Clicking any exception opens modal with full details, audit trail, and action buttons (Approve anyway works).
- [ ] Digest summary: Shows exact counts, top 10 exceptions with reasons.
- [ ] Tabs switch smoothly; no data loss between views.
- [ ] Demo runs 7-10 min: Smooth performance, no crashes, deterministic counts.

### Demo Script (Speaker Notes Aligned to UI Steps)

1. **Intro (30s)**: "Welcome to our invoice automation demo. This shows how we reduce manual clicks for 1000 monthly invoices – 50/50 electronic vs. check."
2. **Inbox Load (1min)**: "Here's the inbox with 1000 invoices. Filters help narrow down." [Click filters to show subsets.]
3. **Batch Actions (2min)**: "Batch approve all 700 Trusted electronic invoices." [Click button; show counters update.] "Now queue 200 checks." [Click button; show Check Queue tab.]
4. **Exceptions Handling (3min)**: "100 exceptions remain. Let's review one." [Click exception row; open modal.] "See the audit trail – why it's an exception. Approve anyway." [Click button; update.]
5. **Check Queue & Digest (3min)**: "Check queue ready for batch run." [Switch tab.] "Digest summary: 700 approved electronically, 200 checks queued, 100 exceptions with top reasons." [Switch to Digest; highlight top 10.]
6. **Close (1min)**: "This automation saves hours monthly. Ready for integration?"

### Risk List

- Slow load/render of 1000 rows (fix: Virtual scrolling or pagination).
- Non-deterministic data (fix: Hardcode exact counts and reasons).
- Modal/drawer bugs (fix: Test on target devices).
- Counter mismatches (fix: Unit-test state updates).

### Demo Hardening Steps

- Seed data with exact 700/200/100 split; no randomness.
- Pre-compute audit trails; ensure reasons are clear and varied.
- Test on low-end devices; add loading skeletons if needed.
- Version data in git; run `npm run check` and `npm run lint` pre-demo.

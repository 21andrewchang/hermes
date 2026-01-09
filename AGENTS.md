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

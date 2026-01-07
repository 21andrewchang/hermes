<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
	type Size = 'default' | 'sm' | 'lg' | 'icon';

	interface Props extends HTMLButtonAttributes {
		variant?: Variant;
		size?: Size;
	}

	let {
		variant = 'default',
		size = 'default',
		class: className,
		children,
		...rest
	}: Props = $props();
</script>

<button
	class={cn(
		'ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
		{
			'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
			'bg-destructive text-destructive-foreground hover:bg-destructive/90':
				variant === 'destructive',
			'border-input bg-background hover:bg-accent hover:text-accent-foreground border':
				variant === 'outline',
			'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
			'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
			'text-primary underline-offset-4 hover:underline': variant === 'link'
		},
		{
			'h-10 px-4 py-2': size === 'default',
			'h-9 rounded-md px-3': size === 'sm',
			'h-11 rounded-md px-8': size === 'lg',
			'h-10 w-10': size === 'icon'
		},
		className
	)}
	{...rest}
>
	{@render children?.()}
</button>

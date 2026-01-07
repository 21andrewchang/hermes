<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		value?: string;
		class?: string;
		children?: any;
	}

	let {
		value = $bindable(),
		class: className,
		children,
		...rest
	}: Props = $props();
</script>

<select
	bind:value
	class={cn(
		'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
		className
	)}
	{...rest}
>
	{@render children?.()}
</select>
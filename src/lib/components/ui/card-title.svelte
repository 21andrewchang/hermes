<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		class?: string;
		children?: any;
	}

	let { class: className, children, ...rest }: Props = $props();
</script>

<h3
	class={cn(
		'text-2xl font-semibold leading-none tracking-tight',
		className
	)}
	{...rest}
>
	{@render children?.()}
</h3>
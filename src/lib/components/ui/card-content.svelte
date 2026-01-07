<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		class?: string;
		children?: any;
	}

	let { class: className, children, ...rest }: Props = $props();
</script>

<div
	class={cn(
		'p-6 pt-0',
		className
	)}
	{...rest}
>
	{@render children?.()}
</div>
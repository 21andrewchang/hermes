<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		class?: string;
		children?: any;
	}

	let { class: className, children, ...rest }: Props = $props();
</script>

<div class="relative w-full overflow-auto">
	<table
		class={cn('w-full caption-bottom text-sm', className)}
		{...rest}
	>
		{@render children?.()}
	</table>
</div>
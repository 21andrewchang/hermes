<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		storageKey?: string;
	};

	let { storageKey = 'hermes_checkin_date' }: Props = $props();
	let show = $state(false);
	let today = '';

	onMount(() => {
		today = new Date().toISOString().slice(0, 10);
		const last = localStorage.getItem(storageKey);
		if (last !== today) {
			show = true;
		}
	});

	const dismiss = () => {
		if (today) {
			localStorage.setItem(storageKey, today);
		}
		show = false;
	};
</script>

{#if show}
	<div class="fixed right-6 top-6 z-50 w-80 rounded-2xl border border-stone-200 bg-stone-50 p-4 shadow-sm">
		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="text-xs uppercase tracking-[0.3em] text-stone-500">Daily check-in</p>
				<p class="mt-2 text-sm text-stone-700">
					Mood tap, stress source, and anything bothering you about the partnership today.
				</p>
			</div>
			<button
				class="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-600"
				type="button"
				on:click={dismiss}
			>
				Dismiss
			</button>
		</div>
	</div>
{/if}

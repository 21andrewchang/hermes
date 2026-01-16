<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';

	type Profile = {
		id: string;
		email: string | null;
		name: string | null;
	};

	let profiles = $state<Profile[]>([]);
	let errorMessage = $state<string | null>(null);

	const loadProfiles = async () => {
		const { data, error } = await supabase
			.from('profiles')
			.select('id, email, name')
			.order('created_at', { ascending: true });

		if (error) {
			errorMessage = error.message;
			return;
		}

		profiles = (data ?? []) as Profile[];
	};

	const switchUser = (profile: Profile) => {
		localStorage.setItem('hermes_dev_user_id', profile.id);
		goto('/chat');
	};

	const clearDevOverride = () => {
		localStorage.removeItem('hermes_dev_user_id');
		goto('/');
	};

	onMount(loadProfiles);
</script>

<main class="min-h-screen bg-white px-6 py-12 text-stone-900">
	<div class="mx-auto w-full max-w-3xl space-y-10">
		<header class="space-y-2">
			<p class="text-xs uppercase tracking-[0.3em] text-stone-500">Hermes Dev</p>
			<h1 class="text-2xl font-semibold">Switch user</h1>
			<p class="text-sm text-stone-500">Click a name to enter chat as that founder.</p>
		</header>

		{#if errorMessage}
			<p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
				{errorMessage}
			</p>
		{/if}

		<div class="grid gap-4 sm:grid-cols-2">
			{#each profiles as profile (profile.id)}
				<button
					type="button"
					class="rounded-2xl border border-stone-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-stone-300"
					on:click={() => switchUser(profile)}
				>
					<p class="text-sm font-semibold text-stone-900">{profile.name ?? 'Founder'}</p>
					<p class="mt-1 text-xs text-stone-500">{profile.email ?? profile.id}</p>
				</button>
			{/each}
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<button
				type="button"
				class="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-700"
				on:click={() => goto('/logs')}
			>
				View logs
			</button>
			<button
				type="button"
				class="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-700"
				on:click={clearDevOverride}
			>
				Exit dev mode
			</button>
		</div>
	</div>
</main>

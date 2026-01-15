<script lang="ts">
	import { onMount } from 'svelte';
	import ChatPanel from '$lib/components/ChatPanel.svelte';
	import CheckInToast from '$lib/components/CheckInToast.svelte';

	type Profile = {
		id: string;
		name: string;
		role: 'a' | 'b';
	};

	type ChatMessage = {
		id: string;
		sender_id: string;
		sender_type: 'user' | 'ai';
		content: string;
		timestamp: string;
	};

	type ViewMode = 'andrew' | 'nico' | 'both';

	let profiles = $state<Profile[]>([]);
	let chatAndrew = $state<ChatMessage[]>([]);
	let chatNico = $state<ChatMessage[]>([]);
	let viewMode = $state<ViewMode>('andrew');
	let loadError = $state<string | null>(null);

	const loadProfiles = async () => {
		const res = await fetch('/api/profiles');
		if (!res.ok) throw new Error('Failed to load profiles.');
		return (await res.json()) as Profile[];
	};

	const loadChat = async (user: 'andrew' | 'nico') => {
		const res = await fetch(`/api/chat/${user}`);
		if (!res.ok) throw new Error(`Failed to load chat for ${user}.`);
		return (await res.json()) as ChatMessage[];
	};

	const refresh = async () => {
		try {
			loadError = null;
			const [nextProfiles, nextAndrew, nextNico] = await Promise.all([
				loadProfiles(),
				loadChat('andrew'),
				loadChat('nico')
			]);
			profiles = nextProfiles;
			chatAndrew = nextAndrew;
			chatNico = nextNico;
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Failed to load data.';
		}
	};

	const sendMessage = async (user: 'andrew' | 'nico', content: string) => {
		const res = await fetch(`/api/chat/${user}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content })
		});
		if (!res.ok) {
			loadError = 'Failed to send message.';
			return;
		}
		const message = (await res.json()) as ChatMessage;
		if (user === 'andrew') {
			chatAndrew = [...chatAndrew, message];
		} else {
			chatNico = [...chatNico, message];
		}
	};

	const handleAndrewSend = (content: string) => sendMessage('andrew', content);
	const handleNicoSend = (content: string) => sendMessage('nico', content);

	onMount(refresh);

	const getProfile = (id: string) => profiles.find((profile) => profile.id === id);
	const andrewProfile = () => getProfile('andrew') ?? { id: 'andrew', name: 'Andrew', role: 'a' };
	const nicoProfile = () => getProfile('nico') ?? { id: 'nico', name: 'Nico', role: 'b' };
</script>

<main class="min-h-screen bg-stone-50 px-10 py-10 text-stone-800">
	<CheckInToast />
	<div class="mx-auto w-full max-w-6xl space-y-8">
		<header class="flex items-center justify-between">
			<div>
				<p class="text-xs uppercase tracking-[0.3em] text-stone-500">Hermes v0</p>
				<h1 class="mt-2 text-2xl font-semibold">Single-machine demo</h1>
			</div>
			<div class="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-2 py-2">
				<button
					class={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] ${
						viewMode === 'andrew' ? 'bg-stone-800 text-stone-50' : 'text-stone-600'
					}`}
					type="button"
					on:click={() => (viewMode = 'andrew')}
				>
					Andrew POV
				</button>
				<button
					class={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] ${
						viewMode === 'nico' ? 'bg-stone-800 text-stone-50' : 'text-stone-600'
					}`}
					type="button"
					on:click={() => (viewMode = 'nico')}
				>
					Nico POV
				</button>
				<button
					class={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] ${
						viewMode === 'both' ? 'bg-stone-800 text-stone-50' : 'text-stone-600'
					}`}
					type="button"
					on:click={() => (viewMode = 'both')}
				>
					Side by side
				</button>
			</div>
		</header>

		{#if loadError}
			<p class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{loadError}
			</p>
		{/if}

		{#if viewMode === 'both'}
			<div class="grid gap-6 lg:grid-cols-2">
				<ChatPanel profile={andrewProfile()} messages={chatAndrew} onSend={handleAndrewSend} />
				<ChatPanel profile={nicoProfile()} messages={chatNico} onSend={handleNicoSend} />
			</div>
		{:else if viewMode === 'nico'}
			<ChatPanel profile={nicoProfile()} messages={chatNico} onSend={handleNicoSend} />
		{:else}
			<ChatPanel profile={andrewProfile()} messages={chatAndrew} onSend={handleAndrewSend} />
		{/if}
	</div>
</main>

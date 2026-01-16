<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';

	type Profile = {
		id: string;
		email: string | null;
		name: string | null;
		mood_score: number | null;
		mood_confidence: number | null;
	};

	type ChatMessage = {
		id: string;
		session_id: string;
		sender_type: 'user' | 'ai';
		content: string;
		created_at: string;
	};

	type ChatSession = {
		id: string;
		user_id: string;
	};

	type Issue = {
		id: string;
		created_by_user_id: string | null;
		title: string;
		stage: string | null;
		severity: string | null;
		active: boolean;
		created_at: string;
	};

	let profile = $state<Profile | null>(null);
	let chatSession = $state<ChatSession | null>(null);
	let messages = $state<ChatMessage[]>([]);
	let issue = $state<Issue | null>(null);
	let draft = $state('');
	let errorMessage = $state<string | null>(null);
	let isSending = $state(false);
	let showMenu = $state(false);
	let isResetting = $state(false);

	const resolveName = (email: string | null) => {
		if (!email) return 'Founder';
		if (email.toLowerCase() === '21andrewch@gmail.com') return 'Andrew';
		if (email.toLowerCase() === 'nicoluo@gmail.com') return 'Nico';
		return email.split('@')[0] ?? 'Founder';
	};

	const loadProfile = async () => {
		const { data, error } = await supabase.auth.getSession();
		if (error || !data.session?.user) {
			goto('/');
			return null;
		}

		const user = data.session.user;
		const { data: existingProfile } = await supabase
			.from('profiles')
			.select('*')
			.eq('id', user.id)
			.maybeSingle();

		if (existingProfile) {
			return existingProfile as Profile;
		}

		const name = resolveName(user.email ?? null);
		const { data: createdProfile, error: createError } = await supabase
			.from('profiles')
			.insert({ id: user.id, email: user.email, name })
			.select()
			.single();

		if (createError) {
			errorMessage = createError.message;
			return null;
		}

		return createdProfile as Profile;
	};

	const loadChatSession = async (userId: string) => {
		const { data: existingSession } = await supabase
			.from('chat_sessions')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: true })
			.limit(1)
			.maybeSingle();

		if (existingSession) {
			return existingSession as ChatSession;
		}

		const { data: createdSession, error } = await supabase
			.from('chat_sessions')
			.insert({ user_id: userId })
			.select()
			.single();

		if (error) {
			errorMessage = error.message;
			return null;
		}

		return createdSession as ChatSession;
	};

	const loadMessages = async (sessionId: string) => {
		const { data, error } = await supabase
			.from('chat_messages')
			.select('*')
			.eq('session_id', sessionId)
			.order('created_at', { ascending: true });

		if (error) {
			errorMessage = error.message;
			return [] as ChatMessage[];
		}

		return (data ?? []) as ChatMessage[];
	};

	const loadIssue = async (userId: string) => {
		const { data } = await supabase
			.from('issues')
			.select('*')
			.eq('created_by_user_id', userId)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		return (data as Issue | null) ?? null;
	};

	const refresh = async () => {
		errorMessage = null;
		const loadedProfile = await loadProfile();
		if (!loadedProfile) return;
		profile = loadedProfile;

		const session = await loadChatSession(loadedProfile.id);
		if (!session) return;
		chatSession = session;

		messages = await loadMessages(session.id);
		issue = await loadIssue(loadedProfile.id);
	};

	const sendMessage = async () => {
		const trimmed = draft.trim();
		if (!trimmed || !chatSession || !profile) return;
		isSending = true;
		errorMessage = null;

		const { data: userMessage, error } = await supabase
			.from('chat_messages')
			.insert({ session_id: chatSession.id, sender_type: 'user', content: trimmed })
			.select()
			.single();

		if (error || !userMessage) {
			errorMessage = error?.message ?? 'Failed to send message.';
			isSending = false;
			return;
		}

		messages = [...messages, userMessage as ChatMessage];
		draft = '';

		const response = await fetch('/api/assistant', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				userId: profile.id,
				sessionId: chatSession.id,
				content: trimmed
			})
		});

		if (!response.ok) {
			errorMessage = 'Hermes failed to respond.';
			isSending = false;
			return;
		}

		const payload = (await response.json()) as {
			reply: ChatMessage;
			issue: Issue | null;
		};

		if (payload.reply) {
			messages = [...messages, payload.reply];
		}
		if (payload.issue) {
			issue = payload.issue;
		} else if (profile) {
			issue = await loadIssue(profile.id);
		}

		isSending = false;
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key !== 'Enter' || event.shiftKey) return;
		event.preventDefault();
		sendMessage();
	};

	const resetHistory = async () => {
		if (isResetting) return;
		isResetting = true;
		showMenu = false;
		errorMessage = null;

		const response = await fetch('/api/reset', { method: 'POST' });
		if (!response.ok) {
			const payload = (await response.json()) as { errors?: string[] };
			errorMessage = payload.errors?.join(' | ') ?? 'Failed to reset history.';
			isResetting = false;
			return;
		}

		messages = [];
		issue = null;
		await refresh();
		isResetting = false;
	};

	onMount(refresh);
</script>

<main class="min-h-screen bg-white text-stone-900">
	<div class="mx-auto flex min-h-screen w-full flex-col px-6 py-10 lg:w-[70%]">
		<header class="mb-10 grid min-h-[52px] grid-cols-[1fr_auto_1fr] items-center">
			<p class="text-xs uppercase tracking-[0.3em] text-stone-500">Hermes</p>
			<div class="flex min-h-[36px] justify-center">
				{#if issue}
					<div
						class="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-800 shadow-sm"
						transition:fly={{ y: -12, duration: 250 }}
					>
						<span class="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
						></span>
						<span class="text-xs font-medium">{issue.title}</span>
					</div>
				{:else}
					<div class="h-9"></div>
				{/if}
			</div>
			<div class="relative flex justify-end">
				<button
					type="button"
					class="flex items-center gap-2 text-sm font-semibold text-stone-800"
					on:click={() => (showMenu = !showMenu)}
				>
					<span>{profile?.name ?? ''}</span>
					<span class="text-xs text-stone-400">▾</span>
				</button>
				{#if showMenu}
					<div
						class="absolute right-0 top-full mt-2 w-40 rounded-md border border-stone-200 bg-white p-2 text-sm shadow-lg"
					>
						<button
							type="button"
							class="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
							on:click={resetHistory}
							disabled={isResetting}
						>
							{isResetting ? 'Resetting...' : 'Reset history'}
						</button>
					</div>
				{/if}
			</div>
		</header>

		{#if errorMessage}
			<p class="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
				{errorMessage}
			</p>
		{/if}

		<section class="flex-1 space-y-6">
			{#each messages as message (message.id)}
				<div class={message.sender_type === 'ai' ? 'w-full' : 'flex w-full justify-end'}>
					<div
						class={message.sender_type === 'ai' ? 'w-full text-left' : 'inline-flex max-w-[70%]'}
					>
						<div
							class={message.sender_type === 'ai'
								? 'whitespace-pre-wrap text-sm text-stone-700'
								: 'whitespace-pre-wrap rounded-2xl bg-stone-200 px-4 py-3 text-sm text-stone-800'}
						>
							{message.content}
						</div>
					</div>
				</div>
			{/each}
			{#if isSending}
				<div class="w-full text-left">
					<div class="text-sm text-stone-500">...</div>
				</div>
			{/if}
		</section>

		<form class="mt-10" on:submit|preventDefault={sendMessage}>
			<div
				class="flex items-center gap-3 rounded-full border border-stone-200 bg-white px-6 py-2 shadow-sm"
			>
				<input
					id="composer"
					type="text"
					class="flex-1 border-none bg-transparent text-sm text-stone-800 outline-none"
					placeholder="How are you doing?"
					bind:value={draft}
					on:keydown={handleKeyDown}
				/>
				<button
					type="submit"
					disabled={isSending}
					class="ml-auto -mr-3 flex h-11 w-11 items-center justify-center rounded-full bg-black text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
					aria-label="Send"
				>
					<svg
						class="h-4 w-4"
						viewBox="0 0 20 20"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M10 4v12" stroke-linecap="round" />
						<path d="M5 9l5-5 5 5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
			</div>
		</form>
	</div>
</main>

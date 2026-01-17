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
		message_type?: 'response' | 'checkin' | null;
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
		context?: string | null;
		stage: string | null;
		severity: string | null;
		active: boolean;
		created_at: string;
	};

	type Toast = {
		id: string;
		message: string;
		kind: 'checkin';
		checkinId?: string;
		payload?: string;
	};

	let profile = $state<Profile | null>(null);
	let otherProfile = $state<Profile | null>(null);
	let chatSession = $state<ChatSession | null>(null);
	let messages = $state<ChatMessage[]>([]);
	let issue = $state<Issue | null>(null);
	let toasts = $state<Toast[]>([]);
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
		const devUserId = localStorage.getItem('hermes_dev_user_id');
		if (devUserId) {
			const { data: devProfile } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', devUserId)
				.maybeSingle();
			if (!devProfile) {
				errorMessage = 'Dev user not found.';
				return null;
			}
			return devProfile as Profile;
		}

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
			.or('stage.is.null,stage.neq.resolved');

		const issues = (data ?? []) as Issue[];
		if (issues.length === 0) return null;

		const severityScore = (severity: string | null) => {
			switch (severity) {
				case 'high':
					return 3;
				case 'med':
					return 2;
				case 'low':
					return 1;
				default:
					return 0;
			}
		};

		return issues.reduce((best, current) => {
			const bestScore = (best.active ? 100 : 0) + severityScore(best.severity);
			const currentScore = (current.active ? 100 : 0) + severityScore(current.severity);
			if (currentScore > bestScore) return current;
			if (currentScore < bestScore) return best;
			return new Date(current.created_at) > new Date(best.created_at) ? current : best;
		});
	};

	const loadOtherProfile = async (userId: string) => {
		const { data } = await supabase.from('profiles').select('*').neq('id', userId).limit(1);
		return (data?.[0] as Profile | undefined) ?? null;
	};

	const createToastId = () =>
		globalThis.crypto?.randomUUID?.() ?? `toast-${Math.random().toString(16).slice(2)}`;

	const addToast = (toast: Omit<Toast, 'id'>) => {
		const id = createToastId();
		toasts = [...toasts, { id, ...toast }];
	};

	const dismissToast = (id: string) => {
		toasts = toasts.filter((toast) => toast.id !== id);
	};

	const switchDevUser = () => {
		if (!otherProfile) return;
		localStorage.setItem('hermes_dev_user_id', otherProfile.id);
		toasts = [];
		window.location.href = '/chat';
	};

	const deliverCheckins = async () => {
		if (!profile) return;
		const now = new Date().toISOString();
		const { data: pending } = await supabase
			.from('checkins')
			.select('*')
			.eq('target_user_id', profile.id)
			.is('sent_at', null)
			.lte('scheduled_for', now)
			.order('created_at', { ascending: true });

		const checkins = (pending ?? []) as Array<{ id: string; payload: string | null }>;
		if (checkins.length === 0) return;

		for (const checkin of checkins) {
			if (toasts.some((toast) => toast.checkinId === checkin.id)) continue;
			const payload = checkin.payload ?? 'Quick check-in: how are you feeling today?';
			addToast({
				message: 'A new check-in is ready',
				kind: 'checkin',
				checkinId: checkin.id,
				payload
			});
		}
	};

	const openCheckin = async (toast: Toast) => {
		if (!toast.checkinId || !chatSession) return;
		const payload = toast.payload ?? 'Quick check-in: how are you feeling today?';
		const { data: message } = await supabase
			.from('chat_messages')
			.insert({
				session_id: chatSession.id,
				sender_type: 'ai',
				content: payload,
				message_type: 'checkin'
			})
			.select()
			.single();

		if (message) {
			messages = [...messages, message as ChatMessage];
		}

		const seenKey = `hermes_checkin_seen_${toast.checkinId}`;
		localStorage.setItem(seenKey, 'true');

		await supabase
			.from('checkins')
			.update({ sent_at: new Date().toISOString() })
			.eq('id', toast.checkinId);

		dismissToast(toast.id);
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

		otherProfile = await loadOtherProfile(loadedProfile.id);
		await deliverCheckins();
	};

	const sendMessage = async () => {
		const trimmed = draft.trim();
		if (!trimmed || !chatSession || !profile) return;
		isSending = true;
		errorMessage = null;

		const { data: userMessage, error } = await supabase
			.from('chat_messages')
			.insert({
				session_id: chatSession.id,
				sender_type: 'user',
				content: trimmed,
				message_type: 'response'
			})
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
		if (payload.issue && profile && payload.issue.created_by_user_id === profile.id) {
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

	onMount(() => {
		refresh().then(() => {
			deliverCheckins();
		});
		const interval = setInterval(() => {
			deliverCheckins();
		}, 30000);
		return () => clearInterval(interval);
	});
</script>

<main class="min-h-screen bg-white text-stone-900">
	<div class="relative h-screen">
		<div class="absolute inset-0 overflow-y-auto">
			<div class="mx-auto flex w-full flex-col px-6 pb-32 pt-20 lg:w-[70%]">
				{#if errorMessage}
					<p class="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
						{errorMessage}
					</p>
				{/if}

				<section class="flex-1 space-y-6">
					{#each messages as message (message.id)}
						{#if message.message_type === 'checkin'}
							<div class="flex w-full justify-center">
								<div class="px-5 py-3 text-sm italic text-stone-500">
									~ {message.content} ~
								</div>
							</div>
						{:else}
							<div class={message.sender_type === 'ai' ? 'w-full' : 'flex w-full justify-end'}>
								<div
									class={message.sender_type === 'ai'
										? 'w-full text-left'
										: 'inline-flex max-w-[70%]'}
								>
									<div
										class={message.sender_type === 'ai'
											? 'mb-6 leading-8 whitespace-pre-wrap text-sm text-stone-700'
											: 'mb-6 leading-8 whitespace-pre-wrap rounded-2xl bg-stone-50 px-4 py-2 text-sm text-stone-800'}
									>
										{message.content}
									</div>
								</div>
							</div>
						{/if}
					{/each}

					{#if isSending}
						<div class="w-full text-left">
							<div class="flex items-center gap-2 text-sm text-stone-500">
								<span class="font-medium">Thinking</span>
								<svg class="thinking-wave" viewBox="0 0 48 10" aria-hidden="true">
									<path d="M0 5 C4 1 8 1 12 5 C16 9 20 9 24 5 C28 1 32 1 36 5 C40 9 44 9 48 5" />
								</svg>
							</div>
						</div>
					{/if}
				</section>
			</div>
		</div>

		<div
			class="pointer-events-none absolute left-0 right-0 top-0 z-10 h-24 bg-gradient-to-b from-white/80 to-white/0"
		></div>
		<div
			class="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-24 bg-gradient-to-t from-white/80 to-white/0"
		></div>

		<header
			class="fixed left-0 right-0 top-0 z-20 border-stone-100 bg-white lg:bg-transparent border-b lg:border-transparent"
		>
			<div class="mx-auto grid min-h-[52px] grid-cols-[1fr_auto_1fr] items-center px-6 py-4">
				<p class="text-sm uppercase tracking-[0.3em] text-stone-500">Hermes</p>
				<div class="flex min-h-[36px] justify-center">
					{#if issue}
						<div
							class="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-800"
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
						class="flex items-center gap-2 text-sm font-medium text-stone-800"
						on:click={() => (showMenu = !showMenu)}
					>
						<span>{profile?.name ?? ''}</span>
					</button>
					{#if showMenu}
						<div
							class="absolute right-0 top-full mt-2 w-48 rounded-xl border border-stone-200 bg-white p-1 text-sm shadow-lg"
						>
							<button
								type="button"
								class="w-full rounded-lg px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-stone-50"
								on:click={switchDevUser}
							>
								Switch user (dev)
							</button>
							<button
								type="button"
								class="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
								on:click={resetHistory}
								disabled={isResetting}
							>
								{isResetting ? 'Resetting...' : 'Reset history'}
							</button>
						</div>
					{/if}
				</div>
			</div>
		</header>

		<div
			class="fixed left-1/2 bottom-24 z-50 flex w-72 -translate-x-1/2 flex-col items-center gap-3"
		>
			{#each toasts as toast (toast.id)}
				<div
					class="flex items-center gap-3 rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 cursor-pointer hover:bg-stone-100"
					in:fly={{ y: 8, duration: 200 }}
					on:click={() => openCheckin(toast)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						fill="currentColor"
						viewBox="0 0 16 16"
						class="text-stone-600"
					>
						<path
							d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z"
						/>
					</svg>
					<p class="text-sm text-stone-800">{toast.message}</p>
					<button
						type="button"
						class="text-sm text-stone-400 transition hover:text-stone-600"
						aria-label="Close"
						on:click|stopPropagation={() => dismissToast(toast.id)}
					>
						×
					</button>
				</div>
			{/each}
		</div>

		<div class="fixed bottom-6 left-0 right-0 z-20">
			<div class="mx-auto w-full px-6 lg:w-[70%]">
				<form on:submit|preventDefault={sendMessage}>
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
		</div>
	</div>
</main>

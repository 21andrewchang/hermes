<script lang="ts">
	type ChatMessage = {
		id: string;
		sender_id: string;
		sender_type: 'user' | 'ai';
		content: string;
		timestamp: string;
	};

	type Profile = {
		id: string;
		name: string;
		role: 'a' | 'b';
	};

	type Props = {
		profile: Profile;
		messages: ChatMessage[];
		onSend: (content: string) => void;
	};

	let { profile, messages, onSend }: Props = $props();
	let draft = $state('');

	const formatTime = (value: string) =>
		new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

	const submit = () => {
		const trimmed = draft.trim();
		if (!trimmed) return;
		onSend(trimmed);
		draft = '';
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key !== 'Enter' || event.shiftKey) return;
		event.preventDefault();
		submit();
	};

	const resolveSender = (message: ChatMessage) => {
		if (message.sender_type === 'ai') return 'Hermes';
		return profile.name;
	};
</script>

<section class="flex h-full flex-col gap-4 rounded-3xl border border-stone-200 bg-stone-50 p-6">
	<header>
		<p class="text-xs uppercase tracking-[0.3em] text-stone-500">Hermes</p>
		<h2 class="text-lg font-semibold">{profile.name} Chat</h2>
	</header>

	<div class="flex-1 space-y-4 overflow-y-auto pr-1">
		{#each messages as message (message.id)}
			<div class={message.sender_type === 'ai' ? 'w-full' : 'flex w-full justify-end'}>
				<div class={message.sender_type === 'ai' ? 'w-full text-left' : 'w-[70%] text-right'}>
					<div class="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-stone-500">
						<span>{resolveSender(message)}</span>
						<span>{formatTime(message.timestamp)}</span>
					</div>
					<div
						class={
							message.sender_type === 'ai'
								? 'mt-2 whitespace-pre-wrap text-sm text-stone-700'
								: 'mt-2 whitespace-pre-wrap rounded-2xl bg-stone-200 px-4 py-3 text-sm text-stone-800'
						}
					>
						{message.content}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<form class="mt-auto flex flex-col gap-3" on:submit|preventDefault={submit}>
		<label class="text-xs uppercase tracking-[0.3em] text-stone-500" for={`composer-${profile.id}`}>
			New message
		</label>
		<textarea
			id={`composer-${profile.id}`}
			rows="3"
			class="w-full resize-none rounded-2xl border border-stone-300 bg-white p-4 text-sm text-stone-800 outline-none focus:border-stone-500"
			bind:value={draft}
			on:keydown={handleKeyDown}
			placeholder="Type your message..."
		></textarea>
		<div class="flex items-center justify-between text-xs text-stone-500">
			<span>Enter to send, Shift+Enter for newline.</span>
			<button
				type="submit"
				class="rounded-full border border-stone-800 bg-stone-800 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-50"
			>
				Send
			</button>
		</div>
	</form>
</section>

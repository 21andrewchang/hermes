<script lang="ts">
	type Tab =
		| 'inbox'
		| 'mariposa'
		| 'willoughby'
		| 'stanford'
		| 'sycamore'
		| 'pickford'
		| '18th'
		| '17th';

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'inbox', label: 'Inbox' },
		{ id: 'mariposa', label: 'Mariposa' },
		{ id: 'willoughby', label: 'Willoughby' },
		{ id: 'stanford', label: 'Stanford' },
		{ id: 'sycamore', label: 'Sycamore' },
		{ id: 'pickford', label: 'Pickford' },
		{ id: '18th', label: '18th' },
		{ id: '17th', label: '17th' }
	];

	const tabLabels: Record<Tab, string> = tabs.reduce(
		(acc, tab) => {
			acc[tab.id] = tab.label;
			return acc;
		},
		{} as Record<Tab, string>
	);

	let activeTab = $state<Tab>('inbox');

	interface TableEntry {
		time: string;
		building: string;
		unit: string;
		description: string;
		action: string;
		status: 'Pending' | 'In Progress' | 'Complete';
		isDraft?: boolean;
	}

	const statusOptions: TableEntry['status'][] = ['Pending', 'In Progress', 'Complete'];
	type EditableField = 'building' | 'unit' | 'description' | 'action';

	interface ChatMessage {
		id: number;
		role: 'user' | 'assistant';
		content: string;
		timestamp: string;
	}

	const initialEntries: TableEntry[] = [
		{
			time: '1/7/2026 21:16:35',
			building: 'Mariposa',
			unit: '206',
			description: 'Cigarette smoke smell issue',
			action: 'Esther notified',
			status: 'In Progress'
		},
		{
			time: '1/7/2026 20:41:39',
			building: 'Mariposa',
			unit: '408',
			description: 'Gas leak',
			action: 'Sent Esther',
			status: 'Complete'
		},
		{
			time: '1/7/2026 10:50:01',
			building: 'Willoughby',
			unit: '5',
			description: 'Rental verification + reference check',
			action: '',
			status: 'Complete'
		},
		{
			time: '1/6/2026 10:44:01',
			building: 'Willoughby',
			unit: '5',
			description: 'Bathroom shower door broken',
			action: '',
			status: 'Pending'
		},
		{
			time: '1/5/2026 9:27:02',
			building: 'Mariposa',
			unit: '501',
			description: 'Dishwasher broken',
			action: 'Contacted appliance guy',
			status: 'In Progress'
		},
		{
			time: '1/4/2026 14:03:26',
			building: 'Mariposa',
			unit: '407',
			description: 'Dishwasher broken',
			action: 'Contacted appliance guy',
			status: 'In Progress'
		},
		{
			time: '1/3/2026 21:20:12',
			building: 'Mariposa',
			unit: '407',
			description: 'Broken fob key',
			action: 'Delivered new fob',
			status: 'Complete'
		}
	];

	const statusRank: Record<TableEntry['status'], number> = {
		Pending: 0,
		'In Progress': 1,
		Complete: 2
	};

	function sortEntries(list: TableEntry[]): TableEntry[] {
		return [...list].sort((a, b) => {
			if (a.isDraft && !b.isDraft) return 1;
			if (!a.isDraft && b.isDraft) return -1;
			return statusRank[a.status] - statusRank[b.status];
		});
	}

	let entries = $state(sortEntries(initialEntries));
	let openStatusIndex = $state<number | null>(null);
	const hasDraftEntry = $derived(entries.some((entry) => entry.isDraft));

	const conversation: ChatMessage[] = [
		{
			id: 1,
			role: 'assistant',
			content: 'Hi Esther! Need help summarizing today’s property issues?',
			timestamp: '09:12'
		},
		{
			id: 2,
			role: 'user',
			content: 'Give me the quick takeaways for Mariposa.',
			timestamp: '09:14'
		},
		{
			id: 3,
			role: 'assistant',
			content:
				'Four open tickets: two dishwashers awaiting vendor confirmation, one gas leak resolved, one shower repair pending approval.',
			timestamp: '09:14'
		}
	];

	let chatInput = $state('');

	function toggleStatusMenu(index: number) {
		openStatusIndex = openStatusIndex === index ? null : index;
	}

	function updateStatus(targetIndex: number, status: TableEntry['status']) {
		const updated = entries.map((entry, index) =>
			index === targetIndex ? { ...entry, status } : entry
		);
		entries = sortEntries(updated);
	}

	function updateEntryField(index: number, field: EditableField, value: string) {
		const updated = entries.map((entry, entryIndex) =>
			entryIndex === index ? { ...entry, [field]: value } : entry
		);
		entries = updated;
	}

	function handleFieldInput(index: number, field: EditableField, event: Event) {
		const target = event.currentTarget as HTMLInputElement | HTMLTextAreaElement;
		updateEntryField(index, field, target.value);
	}

	function statusStyles(status: TableEntry['status']): string {
		if (status === 'Pending') return 'bg-amber-100 text-amber-800';
		if (status === 'In Progress') return 'bg-blue-100 text-blue-800';
		return 'bg-emerald-100 text-emerald-800';
	}

	function statusDotStyles(status: TableEntry['status']): string {
		if (status === 'Pending') return 'bg-amber-500';
		if (status === 'In Progress') return 'bg-blue-500';
		return 'bg-emerald-500';
	}

	function formatTimestamp(date: Date): string {
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const year = date.getFullYear();
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		const seconds = date.getSeconds().toString().padStart(2, '0');
		return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
	}

	function addNewIssue() {
		if (entries.some((entry) => entry.isDraft)) return;
		const now = new Date();
		const draftEntry: TableEntry = {
			time: formatTimestamp(now),
			building: '',
			unit: '',
			description: '',
			action: '',
			status: 'Pending',
			isDraft: true
		};
		entries = sortEntries([...entries, draftEntry]);
	}

	function handleSend(event: SubmitEvent) {
		event.preventDefault();
		chatInput = '';
	}

	$effect(() => {
		function handleClick() {
			openStatusIndex = null;
		}
		window.addEventListener('click', handleClick);
		return () => {
			window.removeEventListener('click', handleClick);
		};
	});
</script>

<div class="flex h-screen bg-white text-black">
	<div class="flex w-3/4 flex-col">
		<header class="flex items-center justify-between border-b border-stone-200 px-2 py-2">
			<div class="flex flex-wrap items-center gap-2">
				{#each tabs as tab}
					<button
						class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-stone-600 transition hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500"
						onclick={() => (activeTab = tab.id)}
					>
						{tab.label}
						{#if tab.id === 'inbox'}
							<span class="rounded bg-stone-700 px-2 py-0.5 text-xs text-white"
								>{entries.length}</span
							>
						{/if}
					</button>
				{/each}
			</div>
		</header>

		<main class="flex-1 overflow-hidden px-6 py-4">
			{#if activeTab === 'inbox'}
				<div class="flex h-full flex-col gap-6">
					<div class="flex items-end justify-between">
						<div>
							<h1 class="text-3xl font-semibold text-stone-900">Inbox</h1>
							<p class="text-sm text-stone-500">
								This inbox lists open property issues that need human approval before work can
								proceed.
							</p>
						</div>
					</div>

					<div class="flex-1 overflow-hidden rounded-xl border border-stone-200">
						<div
							class="grid grid-cols-[170px_0.8fr_0.7fr_2fr_1.4fr_1fr] border-b border-stone-200 bg-stone-50 text-xs font-semibold tracking-wide text-stone-500 uppercase"
						>
							<div class="px-4 py-3">Time</div>
							<div class="px-4 py-3">Building</div>
							<div class="px-4 py-3">Unit</div>
							<div class="px-4 py-3">Description</div>
							<div class="px-4 py-3">Action</div>
							<div class="px-4 py-3">Status</div>
						</div>
						<div class="relative">
							<div
								class="pointer-events-none absolute inset-0 z-0 grid grid-cols-[170px_0.8fr_0.7fr_2fr_1.4fr_1fr]"
							>
								{#each Array(6) as _, index}
									<div
										class={`border-r border-stone-200 ${index === 5 ? 'border-r-0' : ''}`}
										aria-hidden="true"
									></div>
								{/each}
							</div>
							<div class="relative">
								{#each entries as entry, index (index)}
									<div
										class="grid grid-cols-[170px_0.8fr_0.7fr_2fr_1.4fr_1fr] border-b border-stone-200 text-sm text-stone-800"
									>
										<div class="px-4 py-4 font-mono text-xs text-stone-500">{entry.time}</div>
										<div class="px-4 py-4">
											{#if entry.isDraft}
												<input
													class="w-full rounded-md border border-transparent bg-transparent px-3 py-2 text-sm text-stone-800 transition outline-none focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
													value={entry.building}
													oninput={(event) => handleFieldInput(index, 'building', event)}
												/>
											{:else}
												<span class="font-medium">{entry.building}</span>
											{/if}
										</div>
										<div class="px-4 py-4">
											{#if entry.isDraft}
												<input
													class="w-full rounded-md border border-transparent bg-transparent px-3 py-2 text-sm text-stone-800 transition outline-none focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
													value={entry.unit}
													oninput={(event) => handleFieldInput(index, 'unit', event)}
												/>
											{:else}
												{entry.unit}
											{/if}
										</div>
										<div class="px-4 py-4 text-stone-600">
											{#if entry.isDraft}
												<textarea
													class="w-full rounded-md border border-transparent bg-transparent px-3 py-2 text-sm text-stone-800 transition outline-none focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
													rows="2"
													value={entry.description}
													oninput={(event) => handleFieldInput(index, 'description', event)}
												></textarea>
											{:else}
												{entry.description}
											{/if}
										</div>
										<div class="px-4 py-4">
											{#if entry.isDraft}
												<input
													class="w-full rounded-md border border-transparent bg-transparent px-3 py-2 text-sm text-stone-800 transition outline-none focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
													value={entry.action}
													oninput={(event) => handleFieldInput(index, 'action', event)}
												/>
											{:else}
												{entry.action}
											{/if}
										</div>
										<div class="relative px-4 py-4">
											<button
												class={`flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold ${statusStyles(entry.status)}`}
												onclick={(event) => {
													event.stopPropagation();
													toggleStatusMenu(index);
												}}
											>
												<span
													class={`h-2.5 w-2.5 rounded-full ${statusDotStyles(entry.status)}`}
													aria-hidden="true"
												></span>
												{entry.status}
											</button>
											{#if openStatusIndex === index}
												<div
													class="absolute top-full right-0 z-10 mt-2 w-44 rounded-md border border-stone-200 bg-white shadow-lg"
												>
													{#each statusOptions as option}
														<button
															class={`flex w-full items-center justify-between px-3 py-2 text-xs text-stone-700 hover:bg-stone-100 ${
																option === entry.status ? 'font-semibold text-stone-900' : ''
															}`}
															onclick={(event) => {
																event.stopPropagation();
																updateStatus(index, option);
																openStatusIndex = null;
															}}
														>
															<span>{option}</span>
															{#if option === entry.status}
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	width="12"
																	height="12"
																	fill="currentColor"
																	viewBox="0 0 16 16"
																>
																	<path
																		d="M13.485 1.929a.75.75 0 0 1 0 1.06L6.486 9.99a.75.75 0 0 1-1.06 0L2.515 7.08a.75.75 0 0 1 1.06-1.06L6 8.445l6.425-6.515a.75.75 0 0 1 1.06 0"
																	/>
																</svg>
															{/if}
														</button>
													{/each}
												</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
						{#if !hasDraftEntry}
							<button
								type="button"
								class="items-center px-2 py-1 mt-2 ml-2 rounded-md text-left text-sm font-medium text-stone-600 transition hover:bg-stone-100"
								onclick={addNewIssue}
							>
								<span class="flex items-center gap-2">
									<span
										class="flex h-6 w-6 items-center justify-center rounded-full text-base text-stone-600"
										aria-hidden="true"
									>
										+
									</span>
									New issue
								</span>
							</button>
						{/if}
					</div>
				</div>
			{:else}
				<div class="flex h-full flex-col items-center justify-center gap-3 text-center">
					<p class="text-sm tracking-wide text-stone-500 uppercase">Coming soon</p>
					<h1 class="text-3xl font-semibold text-stone-900">{tabLabels[activeTab]} workspace</h1>
					<p class="max-w-md text-sm text-stone-600">
						This tab is reserved for {tabLabels[activeTab]} workflows. Continue managing requests from
						the Inbox for now.
					</p>
				</div>
			{/if}
		</main>
	</div>
	<section class="flex w-1/4 flex-col border-l border-stone-200 bg-white">
		<div class="flex flex-1 flex-col px-4 py-4">
			<div class="flex-1 space-y-4 overflow-y-auto pr-1">
				{#each conversation as message}
					<div class={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
						<div
							class={`w-full rounded-xl px-4 py-3 text-sm ${
								message.role === 'assistant'
									? 'bg-transparent text-stone-700'
									: 'bg-stone-100 text-stone-900'
							}`}
						>
							<p>{message.content}</p>
						</div>
					</div>
				{/each}
			</div>
			<form class="relative mt-4" onsubmit={handleSend}>
				<label class="sr-only" for="copilot-input">Ask Hermes</label>
				<textarea
					id="copilot-input"
					class="w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 pr-16 text-sm text-xs text-stone-800 shadow-sm transition outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
					rows="3"
					placeholder="Drag in context, complete issues"
					bind:value={chatInput}
				></textarea>
				<button
					type="submit"
					class="absolute right-2 bottom-3 flex h-6 w-6 items-center justify-center rounded-full bg-black text-white shadow-sm transition hover:bg-white"
					aria-label="Send message"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						fill="none"
						viewBox="0 0 16 16"
					>
						<path
							fill="currentColor"
							d="M8 12.75a.75.75 0 0 1-.75-.75V5.81l-2.22 2.22a.75.75 0 0 1-1.06-1.06l3.5-3.5a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 1 1-1.06 1.06L8.75 5.81V12a.75.75 0 0 1-.75.75Z"
						/>
					</svg>
				</button>
			</form>
		</div>
	</section>
</div>

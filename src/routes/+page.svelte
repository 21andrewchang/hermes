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
		status: 'Needs Approval' | 'In Progress' | 'Complete';
	}

	const statusOptions: TableEntry['status'][] = ['Needs Approval', 'In Progress', 'Complete'];

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
			status: 'Needs Approval'
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
		'Needs Approval': 0,
		'In Progress': 1,
		Complete: 2
	};

	let entries = $state([...initialEntries].sort((a, b) => statusRank[a.status] - statusRank[b.status]));
	let openStatusIndex = $state<number | null>(null);

	function statusStyles(status: TableEntry['status']): string {
		if (status === 'Needs Approval') return 'bg-amber-100 text-amber-800';
		if (status === 'In Progress') return 'bg-blue-100 text-blue-800';
		return 'bg-emerald-100 text-emerald-800';
	}

	function toggleStatusMenu(index: number) {
		openStatusIndex = openStatusIndex === index ? null : index;
	}

	function updateStatus(targetIndex: number, status: TableEntry['status']) {
		const updated = entries.map((entry, index) => (index === targetIndex ? { ...entry, status } : entry));
		entries = updated.sort((a, b) => statusRank[a.status] - statusRank[b.status]);
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

<div class="flex h-screen flex-col bg-white text-black">
	<header class="flex items-center justify-between border-b border-stone-200 px-6 py-4">
		<div class="flex flex-wrap items-center gap-2">
			{#each tabs as tab}
				<button
					class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-stone-600 transition hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500"
					onclick={() => (activeTab = tab.id)}
				>
					{tab.label}
					{#if tab.id === 'inbox'}
						<span class="rounded bg-stone-700 px-2 py-0.5 text-xs text-white">{entries.length}</span>
					{/if}
				</button>
			{/each}
		</div>
		<div class="flex items-center gap-3">
			<button
				class="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
					<path
						d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"
					/>
				</svg>
			</button>
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-sm text-stone-700"
			>
				GG
			</div>
		</div>
	</header>

	<main class="flex-1 overflow-hidden px-20 py-6">
		{#if activeTab === 'inbox'}
			<div class="flex h-full flex-col gap-6">
				<div class="flex items-end justify-between">
					<div>
						<h1 class="text-3xl font-semibold text-stone-900">Inbox</h1>
						<p class="text-sm text-stone-500">
							This inbox lists open property issues that need human approval before work can proceed.
						</p>
					</div>
				</div>

				<div class="flex-1 overflow-hidden rounded-xl border border-stone-200">
					<div class="grid grid-cols-[170px_0.8fr_0.7fr_2fr_1.4fr_1fr] border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
						<div class="px-4 py-3">Time</div>
						<div class="px-4 py-3">Building</div>
						<div class="px-4 py-3">Unit</div>
						<div class="px-4 py-3">Description</div>
						<div class="px-4 py-3">Action</div>
						<div class="px-4 py-3">Status</div>
					</div>
						<div class="relative">
							<div class="pointer-events-none absolute inset-0 z-0 grid grid-cols-[170px_0.8fr_0.7fr_2fr_1.4fr_1fr]">
								{#each Array(6) as _, index}
									<div class={`border-r border-stone-200 ${index === 5 ? 'border-r-0' : ''}`} aria-hidden="true"></div>
								{/each}
							</div>
							<div class="relative divide-y divide-stone-200">
								{#each entries as entry, index (index)}
									<div class="grid grid-cols-[170px_0.8fr_0.7fr_2fr_1.4fr_1fr] text-sm text-stone-800">
										<div class="px-4 py-4 font-mono text-xs text-stone-500">{entry.time}</div>
										<div class="px-4 py-4 font-medium">{entry.building}</div>
										<div class="px-4 py-4">{entry.unit}</div>
										<div class="px-4 py-4 text-stone-600">{entry.description}</div>
										<div class="px-4 py-4">{entry.action}</div>
										<div class="relative px-4 py-4">
											<button
												class={`flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold ${statusStyles(entry.status)}`}
												onclick={(event) => {
													event.stopPropagation();
													toggleStatusMenu(index);
												}}
											>
											{entry.status}
											<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
												<path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0" />
											</svg>
										</button>
										{#if openStatusIndex === index}
											<div class="absolute right-0 top-full z-10 mt-2 w-44 rounded-md border border-stone-200 bg-white shadow-lg">
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
															<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
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
					</div>
			</div>
		{:else}
			<div class="flex h-full flex-col items-center justify-center gap-3 text-center">
				<p class="text-sm uppercase tracking-wide text-stone-500">Coming soon</p>
				<h1 class="text-3xl font-semibold text-stone-900">{tabLabels[activeTab]} workspace</h1>
				<p class="max-w-md text-sm text-stone-600">
					This tab is reserved for {tabLabels[activeTab]} workflows. Continue managing requests from the Inbox for now.
				</p>
			</div>
		{/if}
	</main>
</div>

<script lang="ts">
	import type { PageData } from './$types';
	import { supabase } from '$lib/supabase';
	import type { IssueRow } from '$lib/types/issues';
	import type { InvoiceRow, InvoiceStatus } from '$lib/types/invoices';

	type Tab =
		| 'inbox'
		| 'payables'
		| 'mariposa'
		| 'willoughby'
		| 'stanford'
		| 'sycamore'
		| 'pickford'
		| '18th'
		| '17th';
	type BuildingTab = Exclude<Tab, 'inbox' | 'payables'>;

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'inbox', label: 'Inbox' },
		{ id: 'payables', label: 'Payables' },
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
	const props = $props<{ data: PageData }>();

	interface TableEntry {
		id: string;
		time: string;
		reportedAt: string;
		building: string;
		unit: string;
		description: string;
		action: string;
		status: 'Needs Approval' | 'Review' | 'Pending' | 'In Progress' | 'Complete';
		isDraft?: boolean;
		unitFilter?: string;
		draft?: string | null;
	}

	const statusOptions: TableEntry['status'][] = [
		'Review',
		'Pending',
		'In Progress',
		'Complete'
	];
	const invoiceStatusOptions: InvoiceStatus[] = ['Pending', 'Approved', 'Paid'];
	const buildingOptions = tabs.filter((tab) => tab.id !== 'inbox' && tab.id !== 'payables');

	interface BuildingProfile {
		name: string;
		address: string;
		description: string;
		units: string[];
	}
	const buildingUnits: Record<string, string[]> = {
		Mariposa: [
			'101',
			'201',
			'202',
			'203',
			'204',
			'205',
			'206',
			'207',
			'301',
			'302',
			'303',
			'304',
			'305',
			'306',
			'307',
			'308',
			'401',
			'402',
			'403',
			'404',
			'405',
			'406',
			'407',
			'408',
			'501',
			'502',
			'503',
			'504',
			'505',
			'506',
			'507',
			'508'
		],
		Willoughby: ['1', '2', '3', '4', '5', '6', '7'],
		Stanford: ['1', '2', '3', '4', '5', '6'],
		Sycamore: ['836', '836 1/2', '838', '838 1/2'],
		Pickford: ['4637', '4637 1/2', '4639', '4639 1/2'],
		'18th': ['1', '2', '3', '4'],
		'17th': ['4723', '4725']
	};
	type EditableField = 'building' | 'unit' | 'description' | 'action';

	interface ChatMessage {
		id: string;
		role: 'user' | 'assistant';
		content: string;
		isPending?: boolean;
	}

const buildingUnitMap: Record<BuildingTab, string[]> = {
	mariposa: buildingUnits['Mariposa'],
	willoughby: buildingUnits['Willoughby'],
	stanford: buildingUnits['Stanford'],
	sycamore: buildingUnits['Sycamore'],
	pickford: buildingUnits['Pickford'],
	'18th': buildingUnits['18th'],
	'17th': buildingUnits['17th']
};

	const buildingProfiles: Record<BuildingTab, BuildingProfile> = {
		mariposa: {
			name: 'Mariposa',
			address: '1234 W Mariposa Ave, Los Angeles, CA 90006',
			description: 'Unit directory for Mariposa.',
			units: buildingUnitMap.mariposa
		},
		willoughby: {
			name: 'Willoughby',
			address: '200 Willoughby Blvd, Los Angeles, CA 90010',
			description: 'Unit directory for Willoughby.',
			units: buildingUnitMap.willoughby
		},
		stanford: {
			name: 'Stanford',
			address: '855 Stanford Dr, Los Angeles, CA 90036',
			description: 'Unit directory for Stanford.',
			units: buildingUnitMap.stanford
		},
		sycamore: {
			name: 'Sycamore',
			address: '480 Sycamore Ave, Los Angeles, CA 90036',
			description: 'Unit directory for Sycamore.',
			units: buildingUnitMap.sycamore
		},
		pickford: {
			name: 'Pickford',
			address: '4637 Pickford St, Los Angeles, CA 90019',
			description: 'Unit directory for Pickford.',
			units: buildingUnitMap.pickford
		},
		'18th': {
			name: '18th',
			address: '18th Street Collection',
			description: 'Unit directory for 18th Street.',
			units: buildingUnitMap['18th']
		},
		'17th': {
			name: '17th',
			address: '17th Street Collection',
			description: 'Unit directory for 17th Street.',
			units: buildingUnitMap['17th']
		}
	};

	type IssueRecord = IssueRow;

	function formatIssueTimestamp(value: string | null): string {
		if (!value) return '';
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return value;
		return formatTimestamp(parsed);
	}

	function issueToEntry(issue: IssueRecord): TableEntry {
		return {
			id: issue.id,
			reportedAt: issue.reported_at ?? new Date().toISOString(),
			time: formatIssueTimestamp(issue.reported_at),
			building: issue.building ?? '',
			unit: issue.unit ?? '',
			description: issue.description ?? '',
			action: issue.action ?? '',
			status: issue.status ?? 'Needs Approval',
			isDraft: issue.is_draft ?? false,
			draft: issue.draft ?? null
		};
	}

	function mapIssuesToEntries(issues: IssueRecord[]): TableEntry[] {
		return issues.map(issueToEntry);
	}

	const initialEntries: TableEntry[] = mapIssuesToEntries(props.data.issues ?? []);

	function upsertEntryFromIssue(issue: IssueRecord) {
		const entry = issueToEntry(issue);
		const index = entries.findIndex((item) => item.id === entry.id);
		if (index >= 0) {
			const updated = [...entries];
			updated[index] = { ...entry, unitFilter: entries[index].unitFilter };
			entries = sortEntries(updated);
		} else {
			entries = sortEntries([...entries, entry]);
		}
	}

const statusRank: Record<TableEntry['status'], number> = {
	'Needs Approval': 0,
	Review: 1,
	Pending: 2,
	'In Progress': 3,
	Complete: 4
};

	

	function sortEntries(list: TableEntry[]): TableEntry[] {
		return [...list].sort((a, b) => {
			if (a.isDraft && !b.isDraft) return -1;
			if (!a.isDraft && b.isDraft) return 1;
			return statusRank[a.status] - statusRank[b.status];
		});
	}

	function isEntryComplete(entry: TableEntry): boolean {
		return (
			entry.building.trim().length > 0 && entry.unit.trim().length > 0 && entry.description.trim().length > 0
		);
	}

	function entryToPayload(entry: TableEntry) {
		return {
			id: entry.id,
			reported_at: entry.reportedAt ?? new Date().toISOString(),
			building: entry.building,
			unit: entry.unit,
			description: entry.description,
			action: entry.action,
			status: entry.status,
			is_draft: entry.isDraft ?? false,
			draft: entry.draft ?? null
		};
	}

	async function saveIssue(entry: TableEntry): Promise<void> {
		const { data, error } = await supabase
			.from('issues')
			.upsert(entryToPayload(entry))
			.select('id, reported_at, building, unit, description, action, status, is_draft, draft')
			.single();

		if (error) {
			console.error('Failed to save issue:', error);
			return;
		}

		if (!data) return;

		const updatedEntry = issueToEntry(data as IssueRecord);
		entries = entries.map((current) =>
			current.id === updatedEntry.id ? { ...updatedEntry, unitFilter: current.unitFilter } : current
		);
	}

	function persistEntryById(id?: string) {
		if (!id) return;
		const target = entries.find((entry) => entry.id === id);
		if (!target || !isEntryComplete(target)) return;
		const cleanEntry = { ...target, isDraft: false };
		entries = entries.map((entry) => (entry.id === id ? cleanEntry : entry));
		void saveIssue(cleanEntry);
	}

	function handleFieldBlur(index: number) {
		const target = entries[index];
		persistEntryById(target?.id);
	}

	function createEntryId(): string {
		if (typeof crypto.randomUUID === 'function') {
			return crypto.randomUUID();
		}
		const bytes = crypto.getRandomValues(new Uint8Array(16));
		return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
	}

let entries = $state(sortEntries(initialEntries));
function hasIncompleteDraft(): boolean {
	return entries.some((entry) => entry.isDraft && !isEntryComplete(entry));
}
let openStatusIndex = $state<number | null>(null);
let openBuildingIndex = $state<number | null>(null);
let openUnitIndex = $state<number | null>(null);
let selectedIds = $state<Set<string>>(new Set());
let expandedId = $state<string | null>(null);

function toggleExpand(id: string) {
	expandedId = expandedId === id ? null : id;
}

function toggleSelection(id: string) {
	const newSet = new Set(selectedIds);
	if (newSet.has(id)) {
		newSet.delete(id);
	} else {
		newSet.add(id);
	}
	selectedIds = newSet;
}

function toggleSelectAll() {
	if (selectedIds.size === entries.length) {
		selectedIds = new Set();
	} else {
		selectedIds = new Set(entries.map((e) => e.id));
	}
}

async function deleteSelected() {
	if (selectedIds.size === 0) return;

	const idsToDelete = Array.from(selectedIds);
	const { error } = await supabase
		.from('issues')
		.delete()
		.in('id', idsToDelete);

	if (error) {
		console.error('Failed to delete issues:', error);
		return;
	}

	entries = entries.filter((entry) => !selectedIds.has(entry.id));
	selectedIds = new Set();
}

// Invoice state and functions
let invoices = $state<InvoiceRow[]>(props.data.invoices ?? []);
let showUploadModal = $state(false);
let isUploading = $state(false);
let uploadError = $state<string | null>(null);
let openInvoiceStatusIndex = $state<number | null>(null);

function formatInvoiceDate(dateStr: string | null): string {
	if (!dateStr) return '';
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return dateStr;
	const month = date.getMonth() + 1;
	const day = date.getDate();
	return `${month}/${day}`;
}

function formatAmount(amount: number | null): string {
	if (amount === null) return '—';
	return `$${amount.toFixed(2)}`;
}

function invoiceStatusStyles(status: InvoiceStatus): string {
	if (status === 'Pending') return 'bg-amber-100 text-amber-800';
	if (status === 'Approved') return 'bg-blue-100 text-blue-800';
	return 'bg-emerald-100 text-emerald-800';
}

function invoiceStatusDotStyles(status: InvoiceStatus): string {
	if (status === 'Pending') return 'bg-amber-500';
	if (status === 'Approved') return 'bg-blue-500';
	return 'bg-emerald-500';
}

function getLinkedIssueDescription(issueId: string | null): string {
	if (!issueId) return '—';
	const issue = entries.find((e) => e.id === issueId);
	return issue?.description || '—';
}

async function handleFileUpload(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;

	if (file.type !== 'application/pdf') {
		uploadError = 'Only PDF files are allowed';
		return;
	}

	isUploading = true;
	uploadError = null;

	try {
		const formData = new FormData();
		formData.append('file', file);

		const response = await fetch('/api/invoices', {
			method: 'POST',
			body: formData
		});

		const result = await response.json();
		if (!response.ok) {
			throw new Error(result.error ?? 'Upload failed');
		}

		invoices = [result.invoice, ...invoices];
		showUploadModal = false;
		input.value = '';
	} catch (error) {
		console.error('Upload failed:', error);
		uploadError = error instanceof Error ? error.message : 'Upload failed';
	} finally {
		isUploading = false;
	}
}

async function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
	const response = await fetch('/api/invoices', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ id: invoiceId, status })
	});

	if (response.ok) {
		const result = await response.json();
		invoices = invoices.map((inv) =>
			inv.id === invoiceId ? result.invoice : inv
		);
	}
	openInvoiceStatusIndex = null;
}

function toggleInvoiceStatusMenu(index: number) {
	openInvoiceStatusIndex = openInvoiceStatusIndex === index ? null : index;
}

function isBuildingTab(tab: Tab): tab is BuildingTab {
	return tab !== 'inbox' && tab !== 'payables';
}

	let conversation = $state<ChatMessage[]>(
		(props.data.chatMessages ?? []).length > 0
			? props.data.chatMessages
			: [
					{
						id: 'welcome',
						role: 'assistant',
						content: 'Paste an email or SMS and I will summarize it and create an issue for you.'
					}
				]
	);

	let chatInput = $state('');
	let chatSessionId = $state<string | null>(props.data.chatSessionId ?? null);
	let isSendingMessage = $state(false);
	let chatError = $state<string | null>(null);

	function toggleStatusMenu(index: number) {
		openStatusIndex = openStatusIndex === index ? null : index;
		openBuildingIndex = null;
		closeUnitMenu();
	}

	function updateStatus(targetIndex: number, status: TableEntry['status']) {
		const targetId = entries[targetIndex]?.id;
		const updated = entries.map((entry, index) =>
			index === targetIndex ? { ...entry, status } : entry
		);
		entries = sortEntries(updated);
		persistEntryById(targetId);
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

	function handleDraftInput(index: number, event: Event) {
		const target = event.target as HTMLTextAreaElement;
		entries[index].draft = target.value;
	}

	function toggleBuildingMenu(index: number) {
		openBuildingIndex = openBuildingIndex === index ? null : index;
		openStatusIndex = null;
		closeUnitMenu();
	}

	function toggleUnitMenu(index: number) {
		if (openUnitIndex === index) {
			closeUnitMenu();
		} else {
			closeUnitMenu();
			openUnitIndex = index;
		}
		openBuildingIndex = null;
		openStatusIndex = null;
	}

	function getUnitOptions(building: string): string[] {
		return buildingUnits[building] ?? [];
	}

	function setUnitFilter(index: number, value: string) {
		entries = entries.map((entry, entryIndex) =>
			entryIndex === index ? { ...entry, unitFilter: value } : entry
		);
	}

	function clearUnitFilter(index: number) {
		entries = entries.map((entry, entryIndex) =>
			entryIndex === index ? { ...entry, unitFilter: undefined } : entry
		);
	}

	function getUnitDisplay(entry: TableEntry): string {
		const filterValue = entry.unitFilter;
		if (filterValue && filterValue.length > 0) return filterValue;
		return entry.unit;
	}

	function getFilteredUnits(entry: TableEntry): string[] {
		const filterValue = (entry.unitFilter ?? '').toLowerCase();
		const units = getUnitOptions(entry.building);
		if (!filterValue) return units;
		return units.filter((unit) => unit.toLowerCase().includes(filterValue));
	}

	function closeUnitMenu() {
		if (openUnitIndex !== null) {
			clearUnitFilter(openUnitIndex);
			openUnitIndex = null;
		}
	}

	function selectBuilding(index: number, label: string) {
		const targetId = entries[index]?.id;
		const units = getUnitOptions(label);
		const updated = entries.map((entry, entryIndex) =>
			entryIndex === index
				? { ...entry, building: label, unit: units.length > 0 ? units[0] : '', unitFilter: undefined }
				: entry
		);
		entries = updated;
		openBuildingIndex = null;
		persistEntryById(targetId);
	}

	function selectUnit(index: number, unitValue: string) {
		const targetId = entries[index]?.id;
		const updated = entries.map((entry, entryIndex) =>
			entryIndex === index ? { ...entry, unit: unitValue, unitFilter: undefined } : entry
		);
		entries = updated;
		closeUnitMenu();
		persistEntryById(targetId);
	}


	function statusStyles(status: TableEntry['status']): string {
		if (status === 'Needs Approval') return 'bg-purple-100 text-purple-800';
		if (status === 'Review') return 'bg-rose-100 text-rose-800';
		if (status === 'Pending') return 'bg-amber-100 text-amber-800';
		if (status === 'In Progress') return 'bg-blue-100 text-blue-800';
		return 'bg-emerald-100 text-emerald-800';
	}

	function statusDotStyles(status: TableEntry['status']): string {
		if (status === 'Needs Approval') return 'bg-purple-500';
		if (status === 'Review') return 'bg-rose-500';
		if (status === 'Pending') return 'bg-amber-500';
		if (status === 'In Progress') return 'bg-blue-500';
		return 'bg-emerald-500';
	}

	function formatTimestamp(date: Date): string {
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		return `${month}/${day} ${hours}:${minutes}`;
	}

	function addNewIssue() {
		if (hasIncompleteDraft()) {
			return;
		}
		const now = new Date();
		const draftEntry: TableEntry = {
			id: createEntryId(),
			reportedAt: now.toISOString(),
			time: formatTimestamp(now),
			building: '',
			unit: '',
			description: '',
			action: '',
			status: 'Needs Approval',
			isDraft: true
		};
		entries = sortEntries([...entries, draftEntry]);
	}

	async function sendChatMessage() {
		const messageText = chatInput.trim();
		if (!messageText || isSendingMessage) return;

		chatError = null;
		chatInput = '';
		const localMessage: ChatMessage = {
			id: createEntryId(),
			role: 'user',
			content: messageText
		};
		conversation = [...conversation, localMessage];
		isSendingMessage = true;

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId: chatSessionId,
					text: messageText
				})
			});

			const result = await response.json();
			if (!response.ok) {
				throw new Error(result?.error ?? 'Assistant request failed');
			}

			if (result.sessionId) {
				chatSessionId = result.sessionId;
			}

			if (result.issue) {
				upsertEntryFromIssue(result.issue as IssueRecord);
			}

			if (result.updatedIssue) {
				upsertEntryFromIssue(result.updatedIssue as IssueRecord);
			}

			const assistantMessage: ChatMessage = {
				id: (result.messageId as string | undefined) ?? createEntryId(),
				role: 'assistant',
				content: (result.message as string | undefined) ?? 'Issue updated.'
			};
			conversation = [...conversation, assistantMessage];
		} catch (error) {
			console.error('Failed to send chat message', error);
			chatError = 'Unable to reach Hermes. Please try again.';
		} finally {
			isSendingMessage = false;
		}
	}

	function handleSend(event: SubmitEvent) {
		event.preventDefault();
		void sendChatMessage();
	}

	$effect(() => {
			function handleClick() {
				openStatusIndex = null;
				openBuildingIndex = null;
				openInvoiceStatusIndex = null;
				closeUnitMenu();
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
						<div class="flex items-center gap-2">
							{#if selectedIds.size > 0}
								<button
									type="button"
									class="flex items-center gap-2 rounded-md bg-red-600 px-2 py-1 text-xs text-white transition hover:bg-red-700"
									onclick={deleteSelected}
								>
									Delete ({selectedIds.size})
								</button>
							{/if}
							<button
								type="button"
								class="flex items-center gap-2 rounded-md bg-stone-800 px-2 py-1 text-xs text-stone-50 transition"
								onclick={addNewIssue}
							>
								New issue
							</button>
						</div>
					</div>

					<div class="flex-1 overflow-hidden rounded-lg border border-stone-200">
						<div
							class="grid grid-cols-[40px_100px_0.9fr_0.75fr_2fr_1.4fr_1fr] border-b border-stone-200 bg-stone-50 text-xs font-semibold tracking-wide text-stone-500 uppercase"
						>
							<div class="flex items-center justify-center py-2">
								<input
									type="checkbox"
									class="h-4 w-4 rounded border-stone-300 text-stone-800 focus:ring-stone-500"
									checked={selectedIds.size === entries.length && entries.length > 0}
									onchange={toggleSelectAll}
								/>
							</div>
							<div class="py-2 text-left">Time</div>
							<div class="py-2">Building</div>
							<div class="py-2">Unit</div>
							<div class="py-2">Description</div>
							<div class="py-2">Action</div>
							<div class="py-2">Status</div>
						</div>
						<div class="relative">
							<div
								class="pointer-events-none absolute inset-0 z-0 grid grid-cols-[40px_100px_0.9fr_0.75fr_2fr_1.4fr_1fr]"
							>
								{#each Array(7) as _, index}
									<div
										class={`border-r border-stone-200 ${index === 6 ? 'border-r-0' : ''}`}
										aria-hidden="true"
									></div>
								{/each}
							</div>
							<div class="relative">
								{#each entries as entry, index (index)}
									<div
										class="grid grid-cols-[40px_100px_0.9fr_0.75fr_2fr_1.4fr_1fr] border-b border-stone-200 text-sm text-stone-800"
									>
										<div class="flex items-center justify-center gap-1 py-2">
											<button
												class="text-stone-400 hover:text-stone-600 focus:outline-none"
												onclick={() => toggleExpand(entry.id)}
												aria-label="Expand details"
											>
												{expandedId === entry.id ? '▼' : '▶'}
											</button>
											<input
												type="checkbox"
												class="h-4 w-4 rounded border-stone-300 text-stone-800 focus:ring-stone-500"
												checked={selectedIds.has(entry.id)}
												onchange={() => toggleSelection(entry.id)}
											/>
										</div>
										<div class="flex items-center px-2 py-2 font-mono text-xs text-stone-500">
											{entry.time}
										</div>
										<div class="relative px-0">
											<button
												class="flex h-full w-full items-center justify-between rounded-md border border-transparent bg-transparent px-2 py-2 text-sm font-medium text-stone-800 outline-none transition hover:border-stone-300 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
												onclick={(event) => {
													event.stopPropagation();
													toggleBuildingMenu(index);
												}}
											>
												{entry.building}
											</button>
											{#if openBuildingIndex === index}
												<div
													class="absolute top-full left-0 z-10 mt-2 w-full min-w-40 rounded-md border border-stone-200 bg-white shadow-lg"
												>
													{#each buildingOptions as option}
														<button
															class={`flex w-full items-center justify-between px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 ${
																option.label === entry.building
																	? 'font-semibold text-stone-900'
																	: ''
															}`}
															onclick={(event) => {
																event.stopPropagation();
																selectBuilding(index, option.label);
															}}
														>
															<span>{option.label}</span>
															{#if option.label === entry.building}
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
										<div class="relative px-0">
											<input
												class="h-full w-full rounded-md border border-transparent bg-transparent px-2 py-2 text-sm text-stone-800 outline-none transition hover:border-stone-300 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
												placeholder=""
												value={getUnitDisplay(entry)}
												onfocus={(event) => {
													event.stopPropagation();
													if (openUnitIndex !== index) {
														closeUnitMenu();
													}
													openUnitIndex = index;
												}}
												onclick={(event) => {
													event.stopPropagation();
													if (openUnitIndex !== index) {
														closeUnitMenu();
													}
													openUnitIndex = index;
												}}
												oninput={(event) => {
													event.stopPropagation();
													if (openUnitIndex !== index) {
														closeUnitMenu();
													}
													setUnitFilter(index, event.currentTarget.value);
													openUnitIndex = index;
												}}
											/>
											{#if openUnitIndex === index}
												{@const filteredUnits = getFilteredUnits(entry)}
												<div
													class="absolute top-full left-0 z-10 mt-2 flex max-h-56 w-full min-w-32 flex-col rounded-md border border-stone-200 bg-white text-sm shadow-lg"
												>
													<div class="max-h-40 overflow-y-auto">
														{#each filteredUnits as unitOption}
															<button
																class={`flex w-full items-center justify-between px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 ${
																	unitOption === entry.unit ? 'font-semibold text-stone-900' : ''
																}`}
																onclick={(event) => {
																	event.stopPropagation();
																	selectUnit(index, unitOption);
																}}
															>
																<span>{unitOption}</span>
																{#if unitOption === entry.unit}
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
													<div class="border-t border-stone-100 px-3 py-2 text-right text-[11px] uppercase tracking-wide text-stone-400">
														{filteredUnits.length} units
													</div>
												</div>
											{/if}
										</div>
										<div class="px-0 text-stone-600">
											<input
												class="h-full w-full rounded-md border border-transparent bg-transparent px-2 py-2 text-sm text-stone-800 outline-none transition hover:border-stone-300 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
												value={entry.description}
												oninput={(event) => handleFieldInput(index, 'description', event)}
												onblur={() => handleFieldBlur(index)}
											/>
										</div>
										<div class="px-0">
											<input
												class="h-full w-full rounded-md border border-transparent bg-transparent px-2 py-2 text-sm text-stone-800 outline-none transition hover:border-stone-300 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
												value={entry.action}
												oninput={(event) => handleFieldInput(index, 'action', event)}
												onblur={() => handleFieldBlur(index)}
											/>
										</div>
										<div class="relative flex min-h-[44px] items-center justify-start px-1">
											{#if entry.status === 'Needs Approval'}
												<span
													class={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusStyles(entry.status)}`}
												>
													<span
														class={`h-2 w-2 rounded-full ${statusDotStyles(entry.status)}`}
														aria-hidden="true"
													></span>
													{entry.status}
												</span>
											{:else}
												<button
													class={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusStyles(entry.status)}`}
													onclick={(event) => {
														event.stopPropagation();
														toggleStatusMenu(index);
													}}
												>
													<span
														class={`h-2 w-2 rounded-full ${statusDotStyles(entry.status)}`}
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
											{/if}
										</div>
									</div>
									{#if expandedId === entry.id}
										<div class="border-b border-stone-200 bg-stone-50 p-4">
											<div class="space-y-3">
												<div>
													<label class="text-xs font-medium text-stone-600"
														>Draft Message to {entry.action || 'Contact'}</label
													>
													<textarea
														class="mt-1 w-full rounded-md border border-stone-300 p-2 text-sm text-stone-800 outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
														rows="3"
														value={entry.draft ?? ''}
														oninput={(e) => handleDraftInput(index, e)}
														onblur={() => handleFieldBlur(index)}
														placeholder="Enter a message to {entry.action || 'the contact'}..."
													></textarea>
												</div>
												<div class="text-xs text-stone-400">
													Building: {entry.building || 'N/A'} | Unit: {entry.unit || 'N/A'} | Status: {entry.status}
												</div>
											</div>
										</div>
									{/if}
								{/each}
							</div>
						</div>
					</div>
				</div>
			{:else if activeTab === 'payables'}
				<div class="flex h-full flex-col gap-6">
					<div class="flex items-end justify-between">
						<div>
							<h1 class="text-3xl font-semibold text-stone-900">Payables</h1>
							<p class="text-sm text-stone-500">
								Upload and manage vendor invoices. Invoices are automatically matched to issues.
							</p>
						</div>
						<button
							type="button"
							class="flex items-center gap-2 rounded-md bg-stone-800 px-2 py-1 text-xs text-stone-50 transition"
							onclick={() => (showUploadModal = true)}
						>
							Upload Invoice
						</button>
					</div>

					<div class="flex-1 overflow-hidden rounded-lg border border-stone-200">
						<div
							class="grid grid-cols-[80px_0.8fr_0.6fr_2fr_100px_1fr_1fr] border-b border-stone-200 bg-stone-50 text-xs font-semibold tracking-wide text-stone-500 uppercase"
						>
							<div class="py-2 px-2 text-left">Date</div>
							<div class="py-2">Building</div>
							<div class="py-2">Unit</div>
							<div class="py-2">Description</div>
							<div class="py-2">Amount</div>
							<div class="py-2">Linked Issue</div>
							<div class="py-2">Status</div>
						</div>
						<div class="relative overflow-y-auto" style="max-height: calc(100vh - 280px);">
							{#if invoices.length === 0}
								<div class="flex flex-col items-center justify-center py-12 text-sm text-stone-500">
									No invoices yet. Upload your first invoice to get started.
								</div>
							{:else}
								{#each invoices as invoice, index}
									<div
										class="grid grid-cols-[80px_0.8fr_0.6fr_2fr_100px_1fr_1fr] border-b border-stone-200 text-sm text-stone-800"
									>
										<div class="flex items-center px-2 py-3 font-mono text-xs text-stone-500">
											{formatInvoiceDate(invoice.uploaded_at)}
										</div>
										<div class="flex items-center px-2 py-3">
											{#if invoice.processing_status === 'processing'}
												<span class="text-stone-400 italic">Processing...</span>
											{:else}
												{invoice.building ?? '—'}
											{/if}
										</div>
										<div class="flex items-center px-2 py-3">
											{#if invoice.processing_status === 'processing'}
												<span class="text-stone-400 italic">—</span>
											{:else}
												{invoice.unit ?? '—'}
											{/if}
										</div>
										<div class="flex items-center px-2 py-3 text-stone-600">
											{#if invoice.processing_status === 'processing'}
												<span class="text-stone-400 italic">Extracting data...</span>
											{:else if invoice.processing_status === 'failed'}
												<span class="text-red-600">{invoice.error_message ?? 'Processing failed'}</span>
											{:else}
												{invoice.description ?? '—'}
											{/if}
										</div>
										<div class="flex items-center px-2 py-3 font-mono">
											{#if invoice.processing_status === 'completed'}
												{formatAmount(invoice.amount)}
											{:else}
												<span class="text-stone-400">—</span>
											{/if}
										</div>
										<div class="flex items-center px-2 py-3 text-xs text-stone-500 truncate">
											{getLinkedIssueDescription(invoice.issue_id)}
										</div>
										<div class="relative flex items-center px-2 py-3">
											<button
												class={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${invoiceStatusStyles(invoice.status)}`}
												onclick={(event) => {
													event.stopPropagation();
													toggleInvoiceStatusMenu(index);
												}}
											>
												<span
													class={`h-2 w-2 rounded-full ${invoiceStatusDotStyles(invoice.status)}`}
													aria-hidden="true"
												></span>
												{invoice.status}
											</button>
											{#if openInvoiceStatusIndex === index}
												<div
													class="absolute top-full right-0 z-10 mt-2 w-36 rounded-md border border-stone-200 bg-white shadow-lg"
												>
													{#each invoiceStatusOptions as option}
														<button
															class={`flex w-full items-center justify-between px-3 py-2 text-xs text-stone-700 hover:bg-stone-100 ${
																option === invoice.status ? 'font-semibold text-stone-900' : ''
															}`}
															onclick={(event) => {
																event.stopPropagation();
																updateInvoiceStatus(invoice.id, option);
															}}
														>
															<span>{option}</span>
															{#if option === invoice.status}
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
							{/if}
						</div>
					</div>
				</div>

				<!-- Upload Modal -->
				{#if showUploadModal}
					<div
						class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
						onclick={() => (showUploadModal = false)}
					>
						<div
							class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
							onclick={(e) => e.stopPropagation()}
						>
							<h2 class="text-lg font-semibold text-stone-900 mb-4">Upload Invoice</h2>
							<p class="text-sm text-stone-500 mb-4">
								Select a PDF invoice to upload. The invoice will be processed automatically to extract details.
							</p>
							<input
								type="file"
								accept="application/pdf"
								class="w-full rounded-md border border-stone-300 px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-stone-800 file:px-4 file:py-2 file:text-xs file:text-white"
								onchange={handleFileUpload}
								disabled={isUploading}
							/>
							{#if uploadError}
								<p class="mt-2 text-xs text-red-600">{uploadError}</p>
							{/if}
							{#if isUploading}
								<p class="mt-2 text-xs text-stone-500">Uploading...</p>
							{/if}
							<div class="mt-4 flex justify-end gap-2">
								<button
									type="button"
									class="rounded-md px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
									onclick={() => (showUploadModal = false)}
									disabled={isUploading}
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				{/if}
			{:else if isBuildingTab(activeTab)}
				{@const profile = buildingProfiles[activeTab]}
				<div class="flex h-full flex-col gap-6">
					<div class="flex flex-col">
						<div class="flex items-center justify-between">
							<div>
								<h1 class="text-3xl font-semibold text-stone-900">{profile.name}</h1>
							</div>
						</div>
						<p class="text-sm text-stone-600">{profile.address}</p>
					</div>

					<div class="flex h-full flex-1 flex-col overflow-hidden rounded-lg border border-stone-200">
						<div
							class="grid grid-cols-1 border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500"
						>
							<div class="px-3 py-2">Units</div>
						</div>
						{#if profile.units.length > 0}
							<div class="flex-1 overflow-y-auto divide-y divide-stone-200">
								{#each profile.units as unitNumber}
									<div class="px-3 py-3 font-mono text-xs text-stone-600">{unitNumber}</div>
								{/each}
							</div>
						{:else}
							<div class="flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center text-sm text-stone-500">
								No units available yet for {profile.name}.
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</main>
	</div>
	<section class="flex w-1/4 flex-col border-l border-stone-200 bg-white overflow-hidden">
		<div class="flex flex-1 flex-col px-3 py-4 overflow-hidden">
			<div class="flex-1 space-y-3 overflow-y-auto pr-1">
				{#each conversation as message}
					<div class={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
						<div
							class={`w-full rounded-xl py-3 text-sm ${
								message.role === 'assistant'
									? 'bg-transparent text-stone-700'
									: 'bg-stone-100 text-stone-900 px-4'
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
					class="w-full resize-none rounded-2xl border border-stone-200 bg-white px-3 py-3 pr-14 text-sm text-xs text-stone-800 shadow-sm transition outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
					rows="3"
					placeholder="Paste an email or SMS conversation, e.g. This is from unit 401 Mariposa"
					bind:value={chatInput}
					disabled={isSendingMessage}
				></textarea>
				<button
					type="submit"
					class={`absolute right-2 bottom-3 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm transition ${
						isSendingMessage || chatInput.trim().length === 0
							? 'cursor-not-allowed bg-stone-400'
							: 'bg-black hover:bg-white hover:text-black'
					}`}
					aria-label="Send message"
					disabled={isSendingMessage || chatInput.trim().length === 0}
				>
					{#if isSendingMessage}
						<svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke-width="4"></circle>
							<path class="opacity-75" d="M4 12a8 8 0 0 1 8-8" stroke-width="4" stroke-linecap="round"></path>
						</svg>
					{:else}
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
					{/if}
				</button>
			</form>
			{#if chatError}
				<p class="mt-2 text-xs text-rose-600">{chatError}</p>
			{/if}
		</div>
	</section>
</div>

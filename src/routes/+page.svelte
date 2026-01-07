<script lang="ts">
	import {
		invoiceStore,
		approveTrusted,
		queueChecks,
		approveIssue,
		updateAndApproveIssue,
		rejectIssue
	} from '$lib/stores';
	import type { Invoice } from '$lib/types';
	import InvoiceDetail from '$lib/components/InvoiceDetail.svelte';
	import nexus from '$lib/assets/nexus.svg';

	let activeTab = $state('inbox' as 'inbox' | 'check-queue' | 'approved' | 'rejected');

	// NOTE: removed "queued" from the inbox filter because inbox view excludes Queued/Approved/Rejected
	let filter = $state('all' as 'all' | 'trusted' | 'check' | 'issue' | 'approved');
	let searchQuery = $state('');

	let suggestionStep = $state<'approve-trusted' | 'queue-checks' | 'handle-issues' | 'done'>(
		'approve-trusted'
	);

	let storeData = $state({
		invoices: [] as Invoice[],
		approvedCount: 0,
		queuedCount: 0,
		issueCount: 0,
		rejectedCount: 0
	});

	let selectedInvoice = $state<Invoice | null>(null);
	let isDrawerOpen = $state(false);

	// Shared grid layout for "table"
	const gridStyle = 'grid-template-columns: 180px 1.6fr 120px 140px 120px 120px 120px 2fr;';

	function formatAmount(amount: any) {
		const n = typeof amount === 'number' ? amount : Number(amount);
		if (Number.isFinite(n)) return `$${n.toFixed(2)}`;
		return `$${amount ?? ''}`;
	}

	function badgeClass(status: string) {
		if (status === 'Trusted') return 'bg-green-100';
		if (status === 'Issue') return 'bg-red-100';
		if (status === 'Approved') return 'bg-green-100';
		if (status === 'Rejected') return 'bg-gray-100';
		if (status === 'Queued') return 'bg-blue-100';
		return 'bg-blue-100';
	}

	let filteredInvoices = $derived.by(() => {
		let invoices = storeData.invoices.filter(
			(inv) => inv.status !== 'Approved' && inv.status !== 'Queued' && inv.status !== 'Rejected'
		);

		if (filter !== 'all') {
			invoices = invoices.filter((inv) => inv.status.toLowerCase() === filter);
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			invoices = invoices.filter(
				(inv) =>
					inv.vendor.toLowerCase().includes(query) ||
					inv.description.toLowerCase().includes(query) ||
					inv.date.includes(query) ||
					inv.invoiceNumber.toLowerCase().includes(query)
			);
		}

		return invoices;
	});

	// Subscribe to store
	invoiceStore.subscribe((data) => {
		storeData = data;

		const trustedCount = data.invoices.filter((inv) => inv.status === 'Trusted').length;
		const checkCount = data.invoices.filter((inv) => inv.status === 'Check').length;
		const issueCount = data.invoices.filter((inv) => inv.status === 'Issue').length;

		if (trustedCount > 0 && suggestionStep === 'approve-trusted') {
			// stay
		} else if (
			checkCount > 0 &&
			(suggestionStep === 'approve-trusted' || suggestionStep === 'queue-checks')
		) {
			suggestionStep = 'queue-checks';
		} else if (issueCount > 0 && suggestionStep !== 'done') {
			suggestionStep = 'handle-issues';
		} else {
			suggestionStep = 'done';
		}
	});

	let currentSuggestion = $derived.by(() => {
		const trustedCount = storeData.invoices.filter((inv) => inv.status === 'Trusted').length;
		const checkCount = storeData.invoices.filter((inv) => inv.status === 'Check').length;
		const issueCount = storeData.invoices.filter((inv) => inv.status === 'Issue').length;

		if (suggestionStep === 'approve-trusted' && trustedCount > 0) {
			return {
				action: `Approve all ${trustedCount} trusted invoices.`,
				reasoning:
					'These vendors are in the approved list and amounts are under the $500 threshold.'
			};
		} else if (suggestionStep === 'queue-checks' && checkCount > 0) {
			return {
				action: `Queue all ${checkCount} check invoices.`,
				reasoning:
					'These vendors require check payment processing. You can print the checks in the Check Queue tab.'
			};
		} else if (suggestionStep === 'handle-issues' && issueCount > 0) {
			const issues = storeData.invoices.filter((inv) => inv.status === 'Issue');
			const currentIssue = issues[0];

			if (currentIssue.reason === 'New vendor not in trusted list') {
				return {
					action: `Add ${currentIssue.vendor} to trusted list and approve invoice.`,
					reasoning:
						'This appears to be a legitimate new vendor that should be added to the approved list.'
				};
			} else if (currentIssue.reason === 'Missing date') {
				return {
					action: 'Use date from email attachment and approve invoice.',
					reasoning: 'The invoice date can be found in the attached email document.'
				};
			} else if (currentIssue.reason === 'Missing invoice number') {
				return {
					action: 'Use invoice number from email and approve invoice.',
					reasoning: 'The invoice number is available in the email content.'
				};
			} else if (currentIssue.reason === 'Duplicate invoice number') {
				return {
					action: 'Send confirmation email to Green Gardens and reject for now.',
					reasoning:
						'This invoice number matches an existing record. Contact vendor for clarification.'
				};
			} else if (currentIssue.reason === 'Amount exceeds typical') {
				return {
					action: 'Approve high-value invoice after review.',
					reasoning:
						'Amount is 3x higher than typical but appears legitimate based on vendor history.'
				};
			} else if (currentIssue.reason === 'Check vendor with electronic payment') {
				return {
					action: 'Change payment type to check and approve invoice.',
					reasoning: 'This vendor requires check payment despite electronic request.'
				};
			} else {
				return {
					action: `Review exception for ${currentIssue.vendor} - ${currentIssue.description}: ${currentIssue.reason}. Approve anyway?`,
					reasoning: 'Manual review required for this exception case.'
				};
			}
		} else {
			return null;
		}
	});

	function handleSuggestionYes() {
		if (suggestionStep === 'approve-trusted') {
			approveTrusted();
		} else if (suggestionStep === 'queue-checks') {
			queueChecks();
		} else if (suggestionStep === 'handle-issues') {
			const currentIssues = storeData.invoices.filter((inv) => inv.status === 'Issue');
			if (currentIssues.length > 0) {
				const issue = currentIssues[0];

				if (issue.reason === 'New vendor not in trusted list') {
					updateAndApproveIssue(issue.id, {});
				} else if (issue.reason === 'Missing date') {
					updateAndApproveIssue(issue.id, { date: new Date().toISOString().split('T')[0] });
				} else if (issue.reason === 'Missing invoice number') {
					updateAndApproveIssue(issue.id, { invoiceNumber: `AI-${issue.id}` });
				} else if (issue.reason === 'Check vendor with electronic payment') {
					updateAndApproveIssue(issue.id, { paymentType: 'Check' });
				} else if (issue.reason === 'Duplicate invoice number') {
					rejectIssue(issue.id, 'Sent confirmation email to Green Gardens');
				} else {
					approveIssue(issue.id);
				}
			}
		}
	}

	function handleSuggestionNo() {
		if (suggestionStep === 'approve-trusted') {
			suggestionStep = 'queue-checks';
		} else if (suggestionStep === 'queue-checks') {
			suggestionStep = 'handle-issues';
		}
	}

	function openInvoiceDetail(invoice: Invoice) {
		selectedInvoice = invoice;
		isDrawerOpen = true;
	}

	function closeInvoiceDetail() {
		isDrawerOpen = false;
		selectedInvoice = null;
	}
</script>

<div class="flex h-screen flex-col bg-white text-black">
	<header class="flex items-center gap-4 p-4 mb-1">
		<img src={nexus} alt="Nexus" class="h-8 w-8" />
		<svg width="1" height="24" class="rotate-20 transform text-stone-300">
			<line x1="0.5" y1="0" x2="0.5" y2="24" stroke="currentColor" stroke-width="1" />
		</svg>
		<div class="text-lg">NBK Property Management</div>
	</header>

	<nav class="border-b border-stone-200">
		<div class="mx-4 mb-2 flex">
			<button
				class="px-4 py-2 {activeTab === 'inbox' ? 'rounded-md bg-stone-100' : ''}"
				onclick={() => (activeTab = 'inbox')}
			>
				Inbox
				<span class="ml-2 rounded bg-stone-700 px-2 py-1 text-xs text-white">
					{storeData.invoices.length -
						storeData.approvedCount -
						storeData.queuedCount -
						storeData.rejectedCount}
				</span>
			</button>
			<button
				class="px-4 py-2 {activeTab === 'check-queue' ? 'rounded-md bg-stone-100' : ''}"
				onclick={() => (activeTab = 'check-queue')}
			>
				Check Queue
			</button>
			<button
				class="px-4 py-2 {activeTab === 'approved' ? 'rounded-md bg-stone-100' : ''}"
				onclick={() => (activeTab = 'approved')}
			>
				Approved
			</button>
			<button
				class="px-4 py-2 {activeTab === 'rejected' ? 'rounded-md bg-stone-100' : ''}"
				onclick={() => (activeTab = 'rejected')}
			>
				Rejected
			</button>
		</div>
	</nav>

	<main class="flex-1 overflow-hidden p-4 px-20">
		{#if activeTab === 'inbox'}
			<div class="flex h-full flex-col space-y-4">
				<div class="flex items-center gap-4">
					<div class="relative flex w-1/4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							fill="currentColor"
							class="bi bi-search absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400"
							viewBox="0 0 16 16"
						>
							<path
								d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"
							/>
						</svg>
						<input
							type="text"
							placeholder="Search invoices..."
							class="text-md w-full rounded-md border border-stone-300 p-4 pl-10 focus:outline-none"
							bind:value={searchQuery}
						/>
					</div>
					{#if currentSuggestion}
						<div
							class="flex w-3/4 items-center gap-2 rounded-md border border-blue-700 bg-blue-50 p-4"
						>
							<span class="font-semibold text-blue-900"
								>AI Suggestion: {currentSuggestion.action}</span
							>
							<div class="ml-auto flex gap-2">
								<button
									class="rounded bg-green-600 px-2 py-1 text-sm text-white transition hover:bg-green-700 focus:outline-none"
									onclick={handleSuggestionYes}
								>
									Yes
								</button>
								<button
									class="rounded bg-gray-600 px-2 py-1 text-sm text-white hover:bg-gray-700 focus:outline-none"
									onclick={handleSuggestionNo}
								>
									Review Later
								</button>
							</div>
						</div>
					{/if}
				</div>

				<!-- GRID-BASED "TABLE" (header is separate, no sticky-table bugs) -->
				<div class="flex-1 overflow-hidden rounded border border-stone-300">
					<div class="h-full overflow-x-auto">
						<div class="flex h-full min-w-[1200px] flex-col">
							<div
								class="grid border-b border-stone-300 bg-white text-sm font-medium"
								style={gridStyle}
							>
								<div class="p-2">Vendor</div>
								<div class="p-2">Description</div>
								<div class="p-2">Date</div>
								<div class="p-2">Invoice #</div>
								<div class="p-2 text-right">Amount</div>
								<div class="p-2">Payment</div>
								<div class="p-2">Status</div>
								<div class="p-2">Reason</div>
							</div>

							<div class="flex-1 overflow-y-auto">
								{#each filteredInvoices as invoice (invoice.id)}
									<div
										class="grid cursor-pointer border-b border-stone-300 hover:bg-gray-50"
										style={gridStyle}
										onclick={() => openInvoiceDetail(invoice)}
									>
										<div class="p-2">{invoice.vendor}</div>
										<div class="p-2">{invoice.description}</div>
										<div class="p-2">{invoice.date}</div>
										<div class="p-2">{invoice.invoiceNumber}</div>
										<div class="p-2 text-right">{formatAmount(invoice.amount)}</div>
										<div class="p-2">{invoice.paymentType}</div>
										<div class="p-2">
											<span class="rounded px-2 py-1 text-sm {badgeClass(invoice.status)}">
												{invoice.status}
											</span>
										</div>
										<div class="p-2">{invoice.reason}</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		{:else if activeTab === 'check-queue'}
			<div class="flex h-full flex-col space-y-4">
				<div class="flex items-center gap-4">
					<button class="border px-4 py-2">Print Checks</button>
					<p class="text-sm">Check Queue: {storeData.queuedCount} invoices</p>
				</div>

				<div class="flex-1 overflow-hidden rounded border">
					<div class="h-full overflow-x-auto">
						<div class="flex h-full min-w-[1200px] flex-col">
							<div class="grid border-b bg-white text-sm font-medium" style={gridStyle}>
								<div class="p-2">Vendor</div>
								<div class="p-2">Description</div>
								<div class="p-2">Date</div>
								<div class="p-2">Invoice #</div>
								<div class="p-2 text-right">Amount</div>
								<div class="p-2">Payment</div>
								<div class="p-2">Status</div>
								<div class="p-2">Reason</div>
							</div>

							<div class="flex-1 overflow-y-auto">
								{#each storeData.invoices.filter((inv) => inv.status === 'Queued') as invoice (invoice.id)}
									<div
										class="grid cursor-pointer border-b hover:bg-gray-50"
										style={gridStyle}
										onclick={() => openInvoiceDetail(invoice)}
									>
										<div class="p-2">{invoice.vendor}</div>
										<div class="p-2">{invoice.description}</div>
										<div class="p-2">{invoice.date}</div>
										<div class="p-2">{invoice.invoiceNumber}</div>
										<div class="p-2 text-right">{formatAmount(invoice.amount)}</div>
										<div class="p-2">{invoice.paymentType}</div>
										<div class="p-2">
											<span class="rounded px-2 py-1 text-sm {badgeClass(invoice.status)}">
												{invoice.status}
											</span>
										</div>
										<div class="p-2">{invoice.reason}</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		{:else if activeTab === 'approved'}
			<div class="flex h-full flex-col space-y-4">
				<div>
					<h2 class="mb-2 text-xl">Approved Invoices</h2>
					<p class="text-sm">Approved: {storeData.approvedCount} invoices</p>
				</div>

				<div class="flex-1 overflow-hidden rounded border">
					<div class="h-full overflow-x-auto">
						<div class="flex h-full min-w-[1200px] flex-col">
							<div class="grid border-b bg-white text-sm font-medium" style={gridStyle}>
								<div class="p-2">Vendor</div>
								<div class="p-2">Description</div>
								<div class="p-2">Date</div>
								<div class="p-2">Invoice #</div>
								<div class="p-2 text-right">Amount</div>
								<div class="p-2">Payment</div>
								<div class="p-2">Status</div>
								<div class="p-2">Reason</div>
							</div>

							<div class="flex-1 overflow-y-auto">
								{#each storeData.invoices.filter((inv) => inv.status === 'Approved') as invoice (invoice.id)}
									<div
										class="grid cursor-pointer border-b hover:bg-gray-50"
										style={gridStyle}
										onclick={() => openInvoiceDetail(invoice)}
									>
										<div class="p-2">{invoice.vendor}</div>
										<div class="p-2">{invoice.description}</div>
										<div class="p-2">{invoice.date}</div>
										<div class="p-2">{invoice.invoiceNumber}</div>
										<div class="p-2 text-right">{formatAmount(invoice.amount)}</div>
										<div class="p-2">{invoice.paymentType}</div>
										<div class="p-2">
											<span class="rounded px-2 py-1 text-sm {badgeClass(invoice.status)}">
												{invoice.status}
											</span>
										</div>
										<div class="p-2">{invoice.reason}</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		{:else if activeTab === 'rejected'}
			<div class="flex h-full flex-col space-y-4">
				<div>
					<h2 class="mb-2 text-xl">Rejected Invoices</h2>
					<p class="text-sm">
						Rejected: {storeData.invoices.filter((inv) => inv.status === 'Rejected').length} invoices
					</p>
				</div>

				<div class="flex-1 overflow-hidden rounded border">
					<div class="h-full overflow-x-auto">
						<div class="flex h-full min-w-[1200px] flex-col">
							<div class="grid border-b bg-white text-sm font-medium" style={gridStyle}>
								<div class="p-2">Vendor</div>
								<div class="p-2">Description</div>
								<div class="p-2">Date</div>
								<div class="p-2">Invoice #</div>
								<div class="p-2 text-right">Amount</div>
								<div class="p-2">Payment</div>
								<div class="p-2">Status</div>
								<div class="p-2">Reason</div>
							</div>

							<div class="flex-1 overflow-y-auto">
								{#each storeData.invoices.filter((inv) => inv.status === 'Rejected') as invoice (invoice.id)}
									<div
										class="grid cursor-pointer border-b hover:bg-gray-50"
										style={gridStyle}
										onclick={() => openInvoiceDetail(invoice)}
									>
										<div class="p-2">{invoice.vendor}</div>
										<div class="p-2">{invoice.description}</div>
										<div class="p-2">{invoice.date}</div>
										<div class="p-2">{invoice.invoiceNumber}</div>
										<div class="p-2 text-right">{formatAmount(invoice.amount)}</div>
										<div class="p-2">{invoice.paymentType}</div>
										<div class="p-2">
											<span class="rounded px-2 py-1 text-sm {badgeClass(invoice.status)}">
												{invoice.status}
											</span>
										</div>
										<div class="p-2">{invoice.reason}</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</main>

	<InvoiceDetail invoice={selectedInvoice} open={isDrawerOpen} onClose={closeInvoiceDetail} />
</div>

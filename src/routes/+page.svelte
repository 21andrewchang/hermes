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
					'These vendors are in the approved list and amounts are under the $500 threshold.',
				showNoButton: false
			};
		} else if (suggestionStep === 'queue-checks' && checkCount > 0) {
			return {
				action: `Queue all ${checkCount} check invoices.`,
				reasoning:
					'These vendors require check payment processing. You can print the checks in the Check Queue tab.',
				showNoButton: false
			};
		} else if (suggestionStep === 'handle-issues' && issueCount > 0) {
			const issues = storeData.invoices.filter((inv) => inv.status === 'Issue');
			const currentIssue = issues[0];

			if (currentIssue.reason === 'New vendor not in trusted list') {
				return {
					action: `Add ${currentIssue.vendor} to trusted list and approve invoice.`,
					reasoning:
						'This appears to be a legitimate new vendor that should be added to the approved list.',
					showNoButton: true
				};
			} else if (currentIssue.reason === 'Missing date') {
				return {
					action: 'Use date from email attachment and approve invoice.',
					reasoning: 'The invoice date can be found in the attached email document.',
					showNoButton: true
				};
			} else if (currentIssue.reason === 'Missing invoice number') {
				return {
					action: 'Use invoice number from email and approve invoice.',
					reasoning: 'The invoice number is available in the email content.',
					showNoButton: true
				};
			} else if (currentIssue.reason === 'Duplicate invoice number') {
				return {
					action: 'Send confirmation email to Green Gardens and reject for now.',
					reasoning:
						'This invoice number matches an existing record. Contact vendor for clarification.',
					showNoButton: true
				};
			} else if (currentIssue.reason === 'Amount exceeds typical') {
				return {
					action: 'Approve high-value invoice after review.',
					reasoning:
						'Amount is 3x higher than typical but appears legitimate based on vendor history.',
					showNoButton: true
				};
			} else if (currentIssue.reason === 'Check vendor with electronic payment') {
				return {
					action: 'Change payment type to check and approve invoice.',
					reasoning: 'This vendor requires check payment despite electronic request.',
					showNoButton: true
				};
			} else {
				return {
					action: `Review exception for ${currentIssue.vendor} - ${currentIssue.description}: ${currentIssue.reason}. Approve anyway?`,
					reasoning: 'Manual review required for this exception case.',
					showNoButton: true
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
	<header class="p-4">
		NBK Property Management
	</header>

	<nav class="border-b border-stone-200">
		<div class="flex mb-2 mx-4">
			<button
				class="px-4 py-2 {activeTab === 'inbox' ? 'bg-stone-100 rounded-md' : ''}"
				onclick={() => (activeTab = 'inbox')}
			>
				Inbox
				<span class="text-xs ml-2 rounded bg-stone-800 px-2 py-1 text-white">
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
				<span class="ml-2 rounded bg-stone-800 px-2 text-xs py-1 text-white">{storeData.queuedCount}</span>
			</button>
			<button
				class="px-4 py-2 {activeTab === 'approved' ? 'rounded-md bg-stone-100' : ''}"
				onclick={() => (activeTab = 'approved')}
			>
				Approved
				<span class="text-xs ml-2 rounded bg-stone-800 px-2 py-1 text-white">{storeData.approvedCount}</span>
			</button>
			<button
				class="px-4 py-2 {activeTab === 'rejected' ? 'rounded-md bg-stone-100' : ''}"
				onclick={() => (activeTab = 'rejected')}
			>
				Rejected
				<span class="text-xs ml-2 rounded bg-red-500 px-2 py-1 text-white">
					{storeData.invoices.filter((inv) => inv.status === 'Rejected').length}
				</span>
			</button>
		</div>
	</nav>

	<main class="flex-1 overflow-hidden p-4 px-20">
		{#if activeTab === 'inbox'}
			<div class="flex h-full flex-col space-y-4">
				{#if currentSuggestion}
					<div class="rounded border border-blue-200 bg-blue-50 p-4">
						<h3 class="font-semibold text-blue-900">AI Suggestion: {currentSuggestion.action}</h3>
						<div class="mt-2 space-y-2">
							<p class="text-sm text-blue-700">{currentSuggestion.reasoning}</p>
							<div class="mt-3 flex gap-2">
								<button
									class="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
									onclick={handleSuggestionYes}
								>
									Yes
								</button>
								{#if currentSuggestion.showNoButton}
									<button
										class="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
										onclick={handleSuggestionNo}
									>
										No
									</button>
								{:else}
									<button
										class="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
									>
										Review Later
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				<div class="flex items-center gap-4">
					<input
						type="text"
						placeholder="Search invoices..."
						class="rounded border p-2"
						bind:value={searchQuery}
					/>
					<label for="status-filter" class="text-sm font-medium">Filter:</label>
					<select id="status-filter" class="rounded border p-2" bind:value={filter}>
						<option value="all">All</option>
						<option value="trusted">Trusted</option>
						<option value="check">Check</option>
						<option value="issue">Issue</option>
					</select>
				</div>

				<!-- GRID-BASED "TABLE" (header is separate, no sticky-table bugs) -->
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
								{#each filteredInvoices as invoice (invoice.id)}
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

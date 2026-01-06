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

	let activeTab = $state('inbox' as 'inbox' | 'check-queue' | 'approved' | 'rejected');
	let filter = $state('all' as 'all' | 'trusted' | 'check' | 'issue' | 'approved' | 'queued');
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
			return `Approve all ${trustedCount} trusted invoices?`;
		} else if (suggestionStep === 'queue-checks' && checkCount > 0) {
			return `Queue all ${checkCount} check invoices?`;
		} else if (suggestionStep === 'handle-issues' && issueCount > 0) {
			const issues = storeData.invoices.filter((inv) => inv.status === 'Issue');
			const currentIssue = issues[0];
			if (currentIssue.reason === 'New vendor not in trusted list') {
				return `Add ${currentIssue.vendor} to trusted list and approve invoice.`;
			} else if (currentIssue.reason === 'Missing date') {
				return `Use date from email attachment and approve invoice.`;
			} else if (currentIssue.reason === 'Missing invoice number') {
				return `Use invoice number from email and approve invoice.`;
			} else if (currentIssue.reason === 'Duplicate invoice number') {
				return `Send confirmation email to Green Gardens and reject for now.`;
			} else if (currentIssue.reason === 'Amount exceeds typical') {
				return `Approve high-value invoice after review.`;
			} else if (currentIssue.reason === 'Check vendor with electronic payment') {
				return `Change payment type to check and approve invoice.`;
			} else {
				return `Review exception for ${currentIssue.vendor} - ${currentIssue.description}: ${currentIssue.reason}. Approve anyway?`;
			}
		} else {
			return null;
		}
	});

	function handleApproveTrusted() {
		approveTrusted();
	}

	function handleQueueChecks() {
		queueChecks();
	}

	function handleSuggestionYes() {
		if (suggestionStep === 'approve-trusted') {
			handleApproveTrusted();
		} else if (suggestionStep === 'queue-checks') {
			handleQueueChecks();
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
		} else if (suggestionStep === 'handle-issues') {
			// Do nothing for no, stays on the first issue
		}
	}
</script>

<div class="min-h-screen bg-white text-black">
	<header class="border-b p-4">
		<h1 class="text-2xl font-bold">Invoice Automation Demo</h1>
		<div class="mt-2 flex gap-4">
			<span>Total: {storeData.invoices.length}</span>
			<span>Approved: {storeData.approvedCount}</span>
			<span>Queued: {storeData.queuedCount}</span>
			<span>Issues: {storeData.issueCount}</span>
		</div>
	</header>

	<nav class="border-b">
		<div class="flex">
			<button
				class="px-4 py-2 {activeTab === 'inbox' ? 'border-b-2 border-black' : ''}"
				onclick={() => (activeTab = 'inbox')}
			>
				Inbox <span class="ml-2 rounded bg-black px-2 py-1 text-white"
					>{storeData.invoices.length -
						storeData.approvedCount -
						storeData.queuedCount -
						storeData.rejectedCount}</span
				>
			</button>
			<button
				class="px-4 py-2 {activeTab === 'check-queue' ? 'border-b-2 border-black' : ''}"
				onclick={() => (activeTab = 'check-queue')}
			>
				Check Queue <span class="ml-2 rounded bg-black px-2 py-1 text-white"
					>{storeData.queuedCount}</span
				>
			</button>
			<button
				class="px-4 py-2 {activeTab === 'approved' ? 'border-b-2 border-black' : ''}"
				onclick={() => (activeTab = 'approved')}
			>
				Approved <span class="ml-2 rounded bg-black px-2 py-1 text-white"
					>{storeData.approvedCount}</span
				>
			</button>
			<button
				class="px-4 py-2 {activeTab === 'rejected' ? 'border-b-2 border-black' : ''}"
				onclick={() => (activeTab = 'rejected')}
			>
				Rejected <span class="ml-2 rounded bg-red-600 px-2 py-1 text-white"
					>{storeData.invoices.filter((inv) => inv.status === 'Rejected').length}</span
				>
			</button>
		</div>
	</nav>

	<main class="p-4">
		{#if activeTab === 'inbox'}
			<div class="space-y-4">
				<div class="sticky top-0 flex items-center gap-4 bg-white pb-4">
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
						<option value="queued">Queued</option>
					</select>
					<button class="border px-4 py-2" onclick={handleApproveTrusted}>
						Approve all Trusted ({storeData.invoices.filter((inv) => inv.status === 'Trusted')
							.length})
					</button>
					<button class="border px-4 py-2" onclick={handleQueueChecks}>
						Queue all Checks ({storeData.invoices.filter((inv) => inv.status === 'Check').length})
					</button>
				</div>
				{#if currentSuggestion}
					<div class="rounded border bg-blue-50 p-4">
						<h3 class="font-semibold text-blue-900">AI Suggestion</h3>
						<p class="mt-2 text-blue-800">{currentSuggestion}</p>
						<div class="mt-4 flex gap-2">
							<button
								class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
								onclick={handleSuggestionYes}
							>
								Yes
							</button>
							<button
								class="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
								onclick={handleSuggestionNo}
							>
								No
							</button>
						</div>
					</div>
				{/if}

				<div class="overflow-y-auto" style="height: calc(100vh - 200px);">
					<!-- Placeholder for invoice table -->
					<p>Inbox: {filteredInvoices.length} invoices</p>
					<table class="w-full border-collapse border">
						<thead>
							<tr class="border-b">
								<th class="p-2 text-left">Vendor</th>
								<th class="p-2 text-left">Description</th>
								<th class="p-2 text-left">Date</th>
								<th class="p-2 text-left">Invoice #</th>
								<th class="p-2 text-right">Amount</th>
								<th class="p-2 text-left">Payment</th>
								<th class="p-2 text-left">Status</th>
								<th class="p-2 text-left">Reason</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredInvoices as invoice (invoice.id)}
								<tr class="border-b hover:bg-gray-50">
									<td class="p-2">{invoice.vendor}</td>
									<td class="p-2">{invoice.description}</td>
									<td class="p-2">{invoice.date}</td>
									<td class="p-2">{invoice.invoiceNumber}</td>
									<td class="p-2 text-right">${invoice.amount}</td>
									<td class="p-2">{invoice.paymentType}</td>
									<td class="p-2">
										<span
											class="rounded px-2 py-1 text-sm {invoice.status === 'Trusted'
												? 'bg-green-100'
												: invoice.status === 'Issue'
													? 'bg-red-100'
													: 'bg-blue-100'}"
										>
											{invoice.status}
										</span>
									</td>
									<td class="p-2">{invoice.reason}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else if activeTab === 'check-queue'}
			<div class="space-y-4">
				<div class="flex items-center gap-4">
					<button class="border px-4 py-2">Print Checks</button>
				</div>
				<div>
					<p>Check Queue: {storeData.queuedCount} invoices</p>
					<table class="w-full border-collapse border">
						<thead>
							<tr class="border-b">
								<th class="p-2 text-left">Vendor</th>
								<th class="p-2 text-left">Description</th>
								<th class="p-2 text-left">Date</th>
								<th class="p-2 text-left">Invoice #</th>
								<th class="p-2 text-right">Amount</th>
								<th class="p-2 text-left">Payment</th>
								<th class="p-2 text-left">Status</th>
								<th class="p-2 text-left">Reason</th>
							</tr>
						</thead>
						<tbody>
							{#each storeData.invoices.filter((inv) => inv.status === 'Queued') as invoice (invoice.id)}
								<tr class="border-b hover:bg-gray-50">
									<td class="p-2">{invoice.vendor}</td>
									<td class="p-2">{invoice.description}</td>
									<td class="p-2">{invoice.date}</td>
									<td class="p-2">{invoice.invoiceNumber}</td>
									<td class="p-2 text-right">${invoice.amount}</td>
									<td class="p-2">{invoice.paymentType}</td>
									<td class="p-2">
										<span class="rounded bg-blue-100 px-2 py-1 text-sm">{invoice.status}</span>
									</td>
									<td class="p-2">{invoice.reason}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else if activeTab === 'approved'}
			<div>
				<!-- Approved invoices -->
				<h2 class="mb-4 text-xl">Approved Invoices</h2>
				<p>Approved: {storeData.approvedCount} invoices</p>
				<table class="w-full border-collapse border">
					<thead>
						<tr class="border-b">
							<th class="p-2 text-left">Vendor</th>
							<th class="p-2 text-left">Description</th>
							<th class="p-2 text-left">Date</th>
							<th class="p-2 text-left">Invoice #</th>
							<th class="p-2 text-right">Amount</th>
							<th class="p-2 text-left">Payment</th>
							<th class="p-2 text-left">Status</th>
							<th class="p-2 text-left">Reason</th>
							<th class="p-2 text-left">AI Suggestion</th>
						</tr>
					</thead>
					<tbody>
						{#each storeData.invoices.filter((inv) => inv.status === 'Approved') as invoice (invoice.id)}
							<tr class="border-b hover:bg-gray-50">
								<td class="p-2">{invoice.vendor}</td>
								<td class="p-2">{invoice.description}</td>
								<td class="p-2">{invoice.date}</td>
								<td class="p-2">{invoice.invoiceNumber}</td>
								<td class="p-2 text-right">${invoice.amount}</td>
								<td class="p-2">{invoice.paymentType}</td>
								<td class="p-2">
									<span class="rounded bg-green-100 px-2 py-1 text-sm">{invoice.status}</span>
								</td>
								<td class="p-2">{invoice.reason}</td>
								<td class="p-2">
									{#if invoice.status === 'Issue'}
										<div class="flex flex-col gap-1">
											<p class="text-sm">
												{#if invoice.reason === 'New vendor not in trusted list'}
													Add to trusted list & approve
												{:else if invoice.reason === 'Missing date'}
													Use date from email & approve
												{:else if invoice.reason === 'Missing invoice number'}
													Use number from email & approve
												{:else if invoice.reason === 'Duplicate invoice number'}
													Send email & reject
												{:else if invoice.reason === 'Amount exceeds typical'}
													Approve high amount
												{:else if invoice.reason === 'Check vendor with electronic payment'}
													Change to check & approve
												{:else}
													Approve anyway?
												{/if}
											</p>
											<div class="flex gap-1">
												<button
													class="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
													onclick={() => {
														if (invoice.reason === 'New vendor not in trusted list') {
															updateAndApproveIssue(invoice.id, {});
														} else if (invoice.reason === 'Missing date') {
															updateAndApproveIssue(invoice.id, {
																date: new Date().toISOString().split('T')[0]
															});
														} else if (invoice.reason === 'Missing invoice number') {
															updateAndApproveIssue(invoice.id, {
																invoiceNumber: `AI-${invoice.id}`
															});
														} else if (invoice.reason === 'Check vendor with electronic payment') {
															updateAndApproveIssue(invoice.id, { paymentType: 'Check' });
														} else if (invoice.reason === 'Duplicate invoice number') {
															rejectIssue(invoice.id, 'Sent confirmation email to Green Gardens');
														} else {
															approveIssue(invoice.id);
														}
													}}
												>
													Yes
												</button>
												<button
													class="rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700"
												>
													No
												</button>
											</div>
										</div>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if activeTab === 'rejected'}
			<div>
				<h2 class="mb-4 text-xl">Rejected Invoices</h2>
				<p>
					Rejected: {storeData.invoices.filter((inv) => inv.status === 'Rejected').length} invoices
				</p>
				<table class="w-full border-collapse border">
					<thead>
						<tr class="border-b">
							<th class="p-2 text-left">Vendor</th>
							<th class="p-2 text-left">Description</th>
							<th class="p-2 text-left">Date</th>
							<th class="p-2 text-left">Invoice #</th>
							<th class="p-2 text-right">Amount</th>
							<th class="p-2 text-left">Payment</th>
							<th class="p-2 text-left">Status</th>
							<th class="p-2 text-left">Reason</th>
						</tr>
					</thead>
					<tbody>
						{#each storeData.invoices.filter((inv) => inv.status === 'Rejected') as invoice (invoice.id)}
							<tr class="border-b hover:bg-gray-50">
								<td class="p-2">{invoice.vendor}</td>
								<td class="p-2">{invoice.description}</td>
								<td class="p-2">{invoice.date}</td>
								<td class="p-2">{invoice.invoiceNumber}</td>
								<td class="p-2 text-right">${invoice.amount}</td>
								<td class="p-2">{invoice.paymentType}</td>
								<td class="p-2">
									<span class="rounded bg-gray-100 px-2 py-1 text-sm">{invoice.status}</span>
								</td>
								<td class="p-2">{invoice.reason}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</main>
</div>

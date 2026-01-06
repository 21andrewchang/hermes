<script lang="ts">
	import { invoiceStore, approveTrusted, queueChecks, approveException } from '$lib/stores';
	import type { Invoice } from '$lib/types';

	let activeTab = $state('inbox' as 'inbox' | 'check-queue' | 'digest');
	let filter = $state('all' as 'all' | 'trusted' | 'check' | 'exception' | 'approved' | 'queued');
	let storeData = $state({
		invoices: [] as Invoice[],
		approvedCount: 0,
		queuedCount: 0,
		exceptionCount: 0
	});

	let filteredInvoices = $derived(
		filter === 'all'
			? storeData.invoices
			: storeData.invoices.filter((inv) => inv.status.toLowerCase() === filter)
	);

	// Subscribe to store
	invoiceStore.subscribe((data) => {
		storeData = data;
	});

	function handleApproveTrusted() {
		approveTrusted();
	}

	function handleQueueChecks() {
		queueChecks();
	}

	function handleApproveException(id: string) {
		approveException(id);
	}
</script>

<div class="min-h-screen bg-white text-black">
	<header class="border-b p-4">
		<h1 class="text-2xl font-bold">Invoice Automation Demo</h1>
		<div class="mt-2 flex gap-4">
			<span>Total: {storeData.invoices.length}</span>
			<span>Approved: {storeData.approvedCount}</span>
			<span>Queued: {storeData.queuedCount}</span>
			<span>Exceptions: {storeData.exceptionCount}</span>
		</div>
	</header>

	<nav class="border-b">
		<div class="flex">
			<button
				class="px-4 py-2 {activeTab === 'inbox' ? 'border-b-2 border-black' : ''}"
				onclick={() => (activeTab = 'inbox')}
			>
				Inbox
			</button>
			<button
				class="px-4 py-2 {activeTab === 'check-queue' ? 'border-b-2 border-black' : ''}"
				onclick={() => (activeTab = 'check-queue')}
			>
				Check Run Queue
			</button>
			<button
				class="px-4 py-2 {activeTab === 'digest' ? 'border-b-2 border-black' : ''}"
				onclick={() => (activeTab = 'digest')}
			>
				Digest
			</button>
		</div>
	</nav>

	<main class="p-4">
		{#if activeTab === 'inbox'}
			<div class="space-y-4">
				<div class="flex items-center gap-4">
					<label for="status-filter" class="text-sm font-medium">Filter:</label>
					<select id="status-filter" class="rounded border p-2" bind:value={filter}>
						<option value="all">All</option>
						<option value="trusted">Trusted</option>
						<option value="check">Check</option>
						<option value="exception">Exception</option>
						<option value="approved">Approved</option>
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
				<div>
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
							{#each filteredInvoices as invoice}
								<tr class="border-b hover:bg-gray-50" onclick={() => (activeTab = 'digest')}>
									<!-- placeholder click -->
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
												: invoice.status === 'Exception'
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
			<div>
				<!-- Placeholder for check queue -->
				<p>Check Run Queue: {storeData.queuedCount} invoices</p>
				<table class="w-full border-collapse border">
					<thead>
						<tr class="border-b">
							<th class="p-2 text-left">Vendor</th>
							<th class="p-2 text-left">Amount</th>
							<th class="p-2 text-left">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each storeData.invoices.filter((inv) => inv.status === 'Queued') as invoice}
							<tr class="border-b">
								<td class="p-2">{invoice.vendor}</td>
								<td class="p-2">${invoice.amount}</td>
								<td class="p-2">{invoice.status}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if activeTab === 'digest'}
			<div>
				<!-- Placeholder for digest -->
				<h2 class="mb-4 text-xl">Digest Summary</h2>
				<p>Approved electronically: {storeData.approvedCount}</p>
				<p>Checks queued: {storeData.queuedCount}</p>
				<p>Exceptions remaining: {storeData.exceptionCount}</p>
				<h3 class="mt-4">Top 10 exceptions:</h3>
				<ul>
					{#each storeData.invoices
						.filter((inv) => inv.status === 'Exception')
						.slice(0, 10) as exception}
						<li>{exception.reason} - {exception.vendor}</li>
					{/each}
				</ul>
			</div>
		{/if}
	</main>
</div>

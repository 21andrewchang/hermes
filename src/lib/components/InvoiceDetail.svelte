<script lang="ts">
	import type { Invoice } from '$lib/types';

	interface Props {
		invoice: Invoice | null;
		open: boolean;
		onClose: () => void;
	}

	let { invoice, open, onClose }: Props = $props();
</script>

{#if open && invoice}
	<!-- Backdrop -->
	<div class="fixed inset-0 z-40 bg-black/10" onclick={onClose}></div>

	<!-- Drawer -->
	<div class="fixed top-0 right-0 z-50 h-full w-1/2 bg-white shadow-lg transition-transform">
		<!-- Header -->
		<div class="flex items-center justify-between border-b p-4">
			<div class="flex flex-row gap-2">
				<p class="text-lg text-gray-900 font-semibold">{invoice.vendor}</p>
				<p class="text-lg text-gray-900">{invoice.invoiceNumber}</p>
			</div>
			<button
				class="rounded-full p-1 text-stone-700 hover:text-stone-950"
				onclick={onClose}
				aria-label="Close drawer"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					></path>
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="space-y-4 p-6">
			<div class="rounded border bg-blue-50 p-4">
				<h3 class="font-semibold text-blue-900">AI Suggestion</h3>
				<div class="mt-2 space-y-2">
					{#if invoice.status === 'Trusted'}
						<p class="font-medium text-blue-800">Approve this trusted invoice?</p>
						<p class="text-sm text-blue-700">
							This vendor is in the approved list and the amount is under the $500 threshold.
						</p>
						<div class="mt-3 flex gap-2">
							<button class="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">
								Yes, Approve
							</button>
							<button class="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700">
								Review Later
							</button>
						</div>
					{:else if invoice.status === 'Check'}
						<p class="font-medium text-blue-800">Queue this check invoice?</p>
						<p class="text-sm text-blue-700">This vendor requires check payment processing.</p>
						<div class="mt-3 flex gap-2">
							<button class="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">
								Yes, Queue
							</button>
							<button class="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700">
								Review Later
							</button>
						</div>
					{:else if invoice.status === 'Issue'}
						{#if invoice.reason === 'New vendor not in trusted list'}
							<p class="font-medium text-blue-800">
								Add {invoice.vendor} to trusted list and approve invoice.
							</p>
							<p class="text-sm text-blue-700">
								This appears to be a legitimate new vendor that should be added to the approved
								list.
							</p>
						{:else if invoice.reason === 'Missing date'}
							<p class="font-medium text-blue-800">
								Use date from email attachment and approve invoice.
							</p>
							<p class="text-sm text-blue-700">
								The invoice date can be found in the attached email document.
							</p>
						{:else if invoice.reason === 'Missing invoice number'}
							<p class="font-medium text-blue-800">
								Use invoice number from email and approve invoice.
							</p>
							<p class="text-sm text-blue-700">
								The invoice number is available in the email content.
							</p>
						{:else if invoice.reason === 'Duplicate invoice number'}
							<p class="font-medium text-blue-800">
								Send confirmation email to Green Gardens and reject for now.
							</p>
							<p class="text-sm text-blue-700">
								This invoice number matches an existing record. Contact vendor for clarification.
							</p>
						{:else if invoice.reason === 'Amount exceeds typical'}
							<p class="font-medium text-blue-800">Approve high-value invoice after review.</p>
							<p class="text-sm text-blue-700">
								Amount is 3x higher than typical but appears legitimate based on vendor history.
							</p>
						{:else if invoice.reason === 'Check vendor with electronic payment'}
							<p class="font-medium text-blue-800">
								Change payment type to check and approve invoice.
							</p>
							<p class="text-sm text-blue-700">
								This vendor requires check payment despite electronic request.
							</p>
						{:else}
							<p class="font-medium text-blue-800">
								Review exception for {invoice.vendor} - {invoice.description}: {invoice.reason}.
								Approve anyway?
							</p>
							<p class="text-sm text-blue-700">Manual review required for this exception case.</p>
						{/if}
						<div class="mt-3 flex gap-2">
							<button class="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">
								Yes
							</button>
							<button class="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
								No
							</button>
						</div>
					{:else if invoice.status === 'Approved'}
						<p class="text-blue-800">
							This invoice has been approved and is ready for payment processing.
						</p>
					{:else if invoice.status === 'Queued'}
						<p class="text-blue-800">This invoice is queued for check processing.</p>
					{:else if invoice.status === 'Rejected'}
						<p class="text-blue-800">
							This invoice has been rejected. Check the audit trail for details.
						</p>
					{:else}
						<p class="text-blue-800">Review this invoice for processing.</p>
					{/if}
				</div>
			</div>
			<!-- Basic Info -->
			<div class="grid grid-cols-3 gap-3">
				<div>
					<label class="block text-sm font-bold text-gray-700">Vendor</label>
					<p class="mt-1 text-sm text-gray-900">{invoice.vendor}</p>
				</div>
				<div>
					<label class="block text-sm font-bold text-gray-700">Invoice Number</label>
					<p class="mt-1 text-sm text-gray-900">{invoice.invoiceNumber}</p>
				</div>
				<div>
					<label class="block text-sm font-bold text-gray-700">Status</label>
					<p class="mt-1 text-sm text-gray-900">
						<span
							class="inline-block rounded px-2 py-1 text-xs font-medium {invoice.status ===
							'Trusted'
								? 'bg-green-100 text-green-800'
								: invoice.status === 'Issue'
									? 'bg-red-100 text-red-800'
									: invoice.status === 'Approved'
										? 'bg-green-100 text-green-800'
										: invoice.status === 'Queued'
											? 'bg-blue-100 text-blue-800'
											: invoice.status === 'Rejected'
												? 'bg-gray-100 text-gray-800'
												: 'bg-blue-100 text-blue-800'}"
						>
							{invoice.status}
						</span>
					</p>
				</div>
				<div>
					<label class="block text-sm font-bold text-gray-700">Date</label>
					<p class="mt-1 text-sm text-gray-900">{invoice.date}</p>
				</div>
				<div>
					<label class="block text-sm font-bold text-gray-700">Amount</label>
					<p class="mt-1 text-sm text-gray-900">${invoice.amount}</p>
				</div>
				<div>
					<label class="block text-sm font-bold text-gray-700">Payment Type</label>
					<p class="mt-1 text-sm text-gray-900">{invoice.paymentType}</p>
				</div>
			</div>

			<!-- Description -->
			<div>
				<label class="block text-sm font-bold text-gray-700">Description</label>
				<p class="mt-1 text-sm text-gray-900">{invoice.description}</p>
			</div>

			<!-- Reason -->
			{#if invoice.reason}
				<div>
					<label class="block text-sm font-bold text-gray-700">Reason</label>
					<p class="mt-1 text-sm text-gray-900">{invoice.reason}</p>
				</div>
			{/if}

			<!-- Source Information -->
			<div>
				<div class="mb-3 flex items-center justify-between">
					<label class="text-sm font-bold text-gray-700">Source</label>
					<span
						class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
					>
						<svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
							{#if invoice.source === 'email'}
								<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
								<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
							{:else}
								<path
									fill-rule="evenodd"
									d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
									clip-rule="evenodd"
								/>
							{/if}
						</svg>
						{invoice.source}
					</span>
				</div>
				<div class="rounded-lg border bg-gray-50 p-4">
					<label class="mb-2 block text-sm font-bold text-gray-700">Original Message</label>
					<div class="font-mono text-sm whitespace-pre-line text-gray-900">
						{invoice.sourceMessage}
					</div>
				</div>
			</div>

			<!-- Audit Trail -->
			{#if invoice.auditTrail && invoice.auditTrail.length > 0}
				<div>
					<label class="block text-sm font-bold text-gray-700">Audit Trail</label>
					<ul class="mt-2 space-y-2">
						{#each invoice.auditTrail as entry (entry)}
							<li class="rounded bg-gray-50 p-3 text-sm text-gray-700">
								{entry}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Additional Fields for Issues -->
			{#if invoice.status === 'Issue'}
				{#if invoice.duplicateId}
					<div>
						<label class="block text-sm font-bold text-gray-700">Duplicate Invoice ID</label>
						<p class="mt-1 text-sm text-gray-900">{invoice.duplicateId}</p>
					</div>
				{/if}
				{#if invoice.typicalAmount}
					<div>
						<label class="block text-sm font-bold text-gray-700">Typical Amount</label>
						<p class="mt-1 text-sm text-gray-900">${invoice.typicalAmount}</p>
					</div>
				{/if}
			{/if}

			<!-- PDF Placeholder -->
			<div>
				<label class="mb-2 block text-sm font-bold text-gray-700">Invoice Document</label>
				<div class="flex h-96 items-center justify-center rounded-lg bg-gray-200">
					<div class="text-center text-gray-500">
						<svg
							class="mx-auto h-12 w-12 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							></path>
						</svg>
						<p class="mt-2 text-sm">PDF Preview</p>
						<p class="text-xs">Document viewer will be implemented</p>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

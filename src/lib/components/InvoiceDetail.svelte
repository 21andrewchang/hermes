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
			<h2 class="text-xl font-semibold">Invoice Details</h2>
			<button
				class="rounded-full p-2 hover:bg-gray-100"
				onclick={onClose}
				aria-label="Close drawer"
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
			<!-- Basic Info -->
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-700">Vendor</label>
					<p class="mt-1 text-sm text-gray-900">{invoice.vendor}</p>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700">Invoice Number</label>
					<p class="mt-1 text-sm text-gray-900">{invoice.invoiceNumber}</p>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700">Date</label>
					<p class="mt-1 text-sm text-gray-900">{invoice.date}</p>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700">Amount</label>
					<p class="mt-1 text-sm text-gray-900">${invoice.amount}</p>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700">Payment Type</label>
					<p class="mt-1 text-sm text-gray-900">{invoice.paymentType}</p>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700">Status</label>
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
			</div>

			<!-- Description -->
			<div>
				<label class="block text-sm font-medium text-gray-700">Description</label>
				<p class="mt-1 text-sm text-gray-900">{invoice.description}</p>
			</div>

			<!-- Reason -->
			{#if invoice.reason}
				<div>
					<label class="block text-sm font-medium text-gray-700">Reason</label>
					<p class="mt-1 text-sm text-gray-900">{invoice.reason}</p>
				</div>
			{/if}

			<!-- Audit Trail -->
			{#if invoice.auditTrail && invoice.auditTrail.length > 0}
				<div>
					<label class="block text-sm font-medium text-gray-700">Audit Trail</label>
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
						<label class="block text-sm font-medium text-gray-700">Duplicate Invoice ID</label>
						<p class="mt-1 text-sm text-gray-900">{invoice.duplicateId}</p>
					</div>
				{/if}
				{#if invoice.typicalAmount}
					<div>
						<label class="block text-sm font-medium text-gray-700">Typical Amount</label>
						<p class="mt-1 text-sm text-gray-900">${invoice.typicalAmount}</p>
					</div>
				{/if}
			{/if}

			<!-- AI Suggestion -->
			<div class="rounded border bg-blue-50 p-4">
				<h3 class="font-semibold text-blue-900">AI Suggestion</h3>
				<p class="mt-2 text-blue-800">
					{#if invoice.status === 'Trusted'}
						This invoice appears to be from a trusted vendor with typical payment amounts. Ready for
						approval.
					{:else if invoice.status === 'Issue'}
						{#if invoice.reason === 'New vendor not in trusted list'}
							Consider adding {invoice.vendor} to the trusted vendor list and approving this invoice.
						{:else if invoice.reason === 'Missing date'}
							The invoice date appears to be missing. Check the email attachment for the correct
							date.
						{:else if invoice.reason === 'Duplicate invoice number'}
							This appears to be a duplicate invoice. Contact the vendor to confirm before
							rejecting.
						{:else if invoice.reason === 'Amount exceeds typical'}
							The amount is significantly higher than typical for this vendor. Review carefully
							before approval.
						{:else if invoice.reason === 'Check vendor with electronic payment'}
							This vendor typically uses check payments but this invoice specifies electronic.
							Change to check payment.
						{:else}
							This invoice has issues that need manual review before processing.
						{/if}
					{:else if invoice.status === 'Approved'}
						This invoice has been approved and is ready for payment processing.
					{:else if invoice.status === 'Queued'}
						This invoice is queued for check processing.
					{:else if invoice.status === 'Rejected'}
						This invoice has been rejected. Check the audit trail for details.
					{:else}
						Review this invoice for processing.
					{/if}
				</p>
			</div>

			<!-- PDF Placeholder -->
			<div>
				<label class="mb-2 block text-sm font-medium text-gray-700">Invoice Document</label>
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

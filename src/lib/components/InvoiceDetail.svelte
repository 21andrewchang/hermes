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
		</div>
	</div>
{/if}

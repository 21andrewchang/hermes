import { writable } from 'svelte/store';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Invoice } from './types';
import { invoices as initialInvoices } from './data';

export const invoiceStore = writable({
	invoices: initialInvoices,
	approvedCount: 0,
	queuedCount: 0,
	issueCount: initialInvoices.filter((inv) => inv.status === 'Issue').length
});

export function approveTrusted() {
	invoiceStore.update((store) => {
		store.invoices.forEach((inv) => {
			if (inv.status === 'Trusted') {
				inv.status = 'Approved';
				inv.auditTrail.push('Batch approved as trusted');
			}
		});
		store.approvedCount = store.invoices.filter((inv) => inv.status === 'Approved').length;
		return store;
	});
}

export function queueChecks() {
	invoiceStore.update((store) => {
		store.invoices.forEach((inv) => {
			if (inv.status === 'Check') {
				inv.status = 'Queued';
				inv.auditTrail.push('Queued for check run');
			}
		});
		store.queuedCount = store.invoices.filter((inv) => inv.status === 'Queued').length;
		return store;
	});
}

export function approveIssue(id: string) {
	invoiceStore.update((store) => {
		const inv = store.invoices.find((i) => i.id === id);
		if (inv && inv.status === 'Issue') {
			inv.status = 'Approved';
			inv.auditTrail.push('Manually approved despite issue');
			store.approvedCount = store.invoices.filter((i) => i.status === 'Approved').length;
			store.issueCount = store.invoices.filter((i) => i.status === 'Issue').length;
		}
		return store;
	});
}

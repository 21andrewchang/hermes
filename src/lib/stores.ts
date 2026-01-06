import { writable } from 'svelte/store';
import type { Invoice } from './types';
import { invoices as initialInvoices } from './data';

export const invoiceStore = writable({
	invoices: initialInvoices,
	approvedCount: 0,
	queuedCount: 0,
	issueCount: initialInvoices.filter((inv) => inv.status === 'Issue').length,
	rejectedCount: 0
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

export function updateAndApproveIssue(id: string, updates: Partial<Invoice>) {
	invoiceStore.update((store) => {
		const inv = store.invoices.find((i) => i.id === id);
		if (inv && inv.status === 'Issue') {
			Object.assign(inv, updates);
			inv.status = 'Approved';
			inv.auditTrail.push(`AI resolved: ${Object.keys(updates).join(', ')} updated and approved`);
			store.approvedCount = store.invoices.filter((i) => i.status === 'Approved').length;
			store.issueCount = store.invoices.filter((i) => i.status === 'Issue').length;
		}
		return store;
	});
}

export function rejectIssue(id: string, reason: string) {
	invoiceStore.update((store) => {
		const inv = store.invoices.find((i) => i.id === id);
		if (inv && inv.status === 'Issue') {
			inv.status = 'Rejected';
			inv.auditTrail.push(`Rejected: ${reason}`);
			store.issueCount = store.invoices.filter((i) => i.status === 'Issue').length;
			store.rejectedCount = store.invoices.filter((i) => i.status === 'Rejected').length;
		}
		return store;
	});
}

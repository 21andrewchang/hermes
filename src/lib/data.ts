import type { Invoice } from './types';

const trustedVendors = [
	'Green Gardens',
	'Pest Control Co',
	'Maintenance Pros',
	'Cleaning Services Inc.'
];
const checkVendors = ['Utility Services', 'Insurance Co', 'Legal Services'];

function generateInvoices(): Invoice[] {
	const invoices: Invoice[] = [];

	// Generate 700 Trusted electronic invoices
	for (let i = 0; i < 700; i++) {
		const vendor = trustedVendors[i % trustedVendors.length];
		const amount = 200 + (i % 201); // 200-400
		const date = new Date(2024, 10, 1 + (i % 30)).toISOString().split('T')[0]; // Nov 1-30
		invoices.push({
			id: `trusted-${i}`,
			vendor,
			description: `Monthly ${vendor.toLowerCase()} service`,
			date,
			invoiceNumber: `INV-T-${i.toString().padStart(4, '0')}`,
			amount,
			paymentType: 'Electronic',
			status: 'Trusted',
			reason: 'Trusted Vendor + under threshold',
			auditTrail: ['Vendor in trusted list', 'Amount under $500 threshold']
		});
	}

	// Generate 200 Check invoices
	for (let i = 0; i < 200; i++) {
		const vendor = checkVendors[i % checkVendors.length];
		const amount = 100 + (i % 901); // 100-1000
		const date = new Date(2024, 10, 1 + (i % 30)).toISOString().split('T')[0];
		invoices.push({
			id: `check-${i}`,
			vendor,
			description: `Monthly ${vendor.toLowerCase()} bill`,
			date,
			invoiceNumber: `INV-C-${i.toString().padStart(4, '0')}`,
			amount,
			paymentType: 'Check',
			status: 'Check',
			reason: 'Check-only vendor',
			auditTrail: ['Vendor requires check payment']
		});
	}

	// Generate 6 Issues (1 per reason)
	// Duplicate invoice
	for (let i = 0; i < 1; i++) {
		const base = invoices[i];
		invoices.push({
			id: `dup-${i}`,
			vendor: base.vendor,
			description: base.description,
			date: base.date,
			invoiceNumber: base.invoiceNumber, // same number
			amount: base.amount,
			paymentType: 'Electronic',
			status: 'Issue',
			reason: 'Duplicate invoice number',
			auditTrail: ['Duplicate invoice number detected'],
			duplicateId: base.id
		});
	}

	// New vendor
	for (let i = 0; i < 1; i++) {
		invoices.push({
			id: `new-${i}`,
			vendor: `New Vendor ${i}`,
			description: 'New service',
			date: new Date(2024, 10, 15).toISOString().split('T')[0],
			invoiceNumber: `INV-N-${i.toString().padStart(4, '0')}`,
			amount: 300,
			paymentType: 'Electronic',
			status: 'Issue',
			reason: 'New vendor not in trusted list',
			auditTrail: ['Vendor not in approved list']
		});
	}

	// High amount
	for (let i = 0; i < 1; i++) {
		const vendor = trustedVendors[i % trustedVendors.length];
		const typical = 300;
		const amount = typical * 3 + i * 10; // >3x
		invoices.push({
			id: `high-${i}`,
			vendor,
			description: 'Emergency service',
			date: new Date(2024, 10, 20).toISOString().split('T')[0],
			invoiceNumber: `INV-H-${i.toString().padStart(4, '0')}`,
			amount,
			paymentType: 'Electronic',
			status: 'Issue',
			reason: 'Amount exceeds typical',
			auditTrail: ['Amount 3x higher than typical'],
			typicalAmount: typical
		});
	}

	// Missing fields (date or invoice number)
	for (let i = 0; i < 2; i++) {
		const hasDate = i % 2 === 0;
		invoices.push({
			id: `missing-${i}`,
			vendor: trustedVendors[i % trustedVendors.length],
			description: 'Service',
			date: hasDate ? new Date(2024, 10, 10).toISOString().split('T')[0] : '',
			invoiceNumber: hasDate ? '' : `INV-M-${i.toString().padStart(4, '0')}`,
			amount: 250,
			paymentType: 'Electronic',
			status: 'Issue',
			reason: `Missing ${hasDate ? 'invoice number' : 'date'}`,
			auditTrail: [`Missing required field: ${hasDate ? 'invoice number' : 'date'}`]
		});
	}

	// Check-only vendor with electronic (edge case)
	for (let i = 0; i < 1; i++) {
		const vendor = checkVendors[i % checkVendors.length];
		invoices.push({
			id: `edge-${i}`,
			vendor,
			description: 'Service',
			date: new Date(2024, 10, 25).toISOString().split('T')[0],
			invoiceNumber: `INV-E-${i.toString().padStart(4, '0')}`,
			amount: 400,
			paymentType: 'Electronic', // but check vendor
			status: 'Issue',
			reason: 'Check vendor with electronic payment',
			auditTrail: ['Vendor requires check, but payment type electronic']
		});
	}

	return invoices;
}

export const invoices = generateInvoices();

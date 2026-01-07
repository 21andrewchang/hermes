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
		const isEmail = Math.random() > 0.3; // 70% Emails, 30% Texts
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
			source: isEmail ? 'Email' : 'Text',
			sourceMessage: isEmail
				? `Subject: Invoice ${`INV-T-${i.toString().padStart(4, '0')}`} from ${vendor}\n\nDear Accounting Team,\n\nPlease find attached our monthly invoice for $${amount.toFixed(2)} for our landscaping services.\n\nBest regards,\n${vendor} Team\naccounting@${vendor.toLowerCase().replace(/\s+/g, '')}.com`
				: `${vendor}: Hi, here's our monthly invoice for $${amount.toFixed(2)}. Details attached. Thanks! 📄💰`,
			auditTrail: ['Vendor in trusted list', 'Amount under $500 threshold']
		});
	}

	// Generate 200 Check invoices
	for (let i = 0; i < 200; i++) {
		const vendor = checkVendors[i % checkVendors.length];
		const amount = 100 + (i % 901); // 100-1000
		const date = new Date(2024, 10, 1 + (i % 30)).toISOString().split('T')[0];
		const isEmail = Math.random() > 0.5; // 50/50 emails vs texts
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
			source: isEmail ? 'Email' : 'Text',
			sourceMessage: isEmail
				? `Subject: Monthly Bill Payment Due\n\nDear Customer,\n\nYour monthly bill for ${vendor.toLowerCase()} services is $${amount.toFixed(2)}. Please remit payment by check.\n\nThank you,\n${vendor} Billing Department\nbilling@${vendor.toLowerCase().replace(/\s+/g, '')}.com`
				: `${vendor}: Your monthly bill of $${amount.toFixed(2)} is ready. Please send check payment. 📧💳`,
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
			source: 'Email',
			sourceMessage: `Subject: Invoice ${base.invoiceNumber} - DUPLICATE?\n\nHi Team,\n\nI'm sending this invoice again as I didn't receive confirmation of payment. Please review.\n\nThanks,\n${base.vendor}\nbilling@${base.vendor.toLowerCase().replace(/\s+/g, '')}.com`,
			auditTrail: ['Duplicate invoice number detected'],
			duplicateId: base.id
		});
	}

	// New vendor
	for (let i = 0; i < 1; i++) {
		const vendor = `New Vendor ${i}`;
		invoices.push({
			id: `new-${i}`,
			vendor,
			description: 'New service',
			date: new Date(2024, 10, 15).toISOString().split('T')[0],
			invoiceNumber: `INV-N-${i.toString().padStart(4, '0')}`,
			amount: 300,
			paymentType: 'Electronic',
			status: 'Issue',
			reason: 'New vendor not in trusted list',
			source: 'Text',
			sourceMessage: `${vendor}: Hi! We're a new landscaping company in your area. Here's our first invoice for the initial consultation and setup. Looking forward to working with you! 🌿✂️`,
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
			source: 'Email',
			sourceMessage: `Subject: URGENT: Emergency Maintenance Service Invoice\n\nDear Accounting,\n\nWe had to perform emergency maintenance service this month due to unexpected equipment failure. The total cost was $${amount.toFixed(2)}, which is higher than our typical monthly rate.\n\nPlease review and approve urgently.\n\nBest,\n${vendor} Emergency Response Team\nurgent@${vendor.toLowerCase().replace(/\s+/g, '')}.com`,
			auditTrail: ['Amount 3x higher than typical'],
			typicalAmount: typical
		});
	}

	// Missing fields (date or invoice number)
	for (let i = 0; i < 2; i++) {
		const hasDate = i % 2 === 0;
		const vendor = trustedVendors[i % trustedVendors.length];
		invoices.push({
			id: `missing-${i}`,
			vendor,
			description: 'Service',
			date: hasDate ? new Date(2024, 10, 10).toISOString().split('T')[0] : '',
			invoiceNumber: hasDate ? '' : `INV-M-${i.toString().padStart(4, '0')}`,
			amount: 250,
			paymentType: 'Electronic',
			status: 'Issue',
			reason: `Missing ${hasDate ? 'invoice number' : 'date'}`,
			source: hasDate ? 'Email' : 'Text',
			sourceMessage: hasDate
				? `Subject: Monthly Service Invoice\n\nHello,\n\nHere's our invoice for this month's services. The amount is $250.00.\n\nPlease let me know if you need anything else.\n\nRegards,\n${vendor}\nsupport@${vendor.toLowerCase().replace(/\s+/g, '')}.com\n\n[Attachment: invoice.pdf]`
				: `${vendor}: Hey, we did some work for you this month. Invoice attached, amount is $250. Total due by end of month. Thanks! 📎`,
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
			source: 'Email',
			sourceMessage: `Subject: Monthly Service Invoice - Payment Instructions\n\nDear Valued Customer,\n\nThank you for your business. Your invoice for this month is $400.00.\n\nIMPORTANT: We require payment by CHECK only. Please do not send electronic payments.\n\nMail check to: ${vendor}, PO Box 123, City, State 12345\n\nThank you,\n${vendor} Accounts Receivable\nar@${vendor.toLowerCase().replace(/\s+/g, '')}.com`,
			auditTrail: ['Vendor requires check, but payment type electronic']
		});
	}

	return invoices;
}

export const invoices = generateInvoices();

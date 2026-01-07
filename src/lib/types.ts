export interface Invoice {
	id: string;
	vendor: string;
	description: string;
	date: string; // ISO format
	invoiceNumber: string;
	amount: number;
	paymentType: 'Electronic' | 'Check';
	status: 'Trusted' | 'Check' | 'Issue' | 'Approved' | 'Queued' | 'Rejected';
	reason: string; // One-line explanation for status
	auditTrail: string[]; // Array of decision strings
	source: 'email' | 'text'; // How the invoice was received
	sourceMessage: string; // The original message content
	// Additional fields for issues
	duplicateId?: string;
	typicalAmount?: number;
}

export interface InvoiceStore {
	invoices: Invoice[];
	approvedCount: number;
	queuedCount: number;
	issueCount: number;
	rejectedCount: number;
}

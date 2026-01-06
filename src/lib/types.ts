export interface Invoice {
	id: string;
	vendor: string;
	description: string;
	date: string; // ISO format
	invoiceNumber: string;
	amount: number;
	paymentType: 'Electronic' | 'Check';
	status: 'Trusted' | 'Check' | 'Exception' | 'Approved' | 'Queued';
	reason: string; // One-line explanation for status
	auditTrail: string[]; // Array of decision strings
	// Additional fields for exceptions
	duplicateId?: string;
	typicalAmount?: number;
}

export interface InvoiceStore {
	invoices: Invoice[];
	approvedCount: number;
	queuedCount: number;
	exceptionCount: number;
}

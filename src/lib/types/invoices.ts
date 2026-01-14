export type InvoiceStatus = 'Pending' | 'Approved' | 'Paid';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface InvoiceRow {
	id: string;
	issue_id: string | null;
	uploaded_at: string;
	file_path: string;
	file_name: string;
	building: string | null;
	unit: string | null;
	description: string | null;
	amount: number | null;
	status: InvoiceStatus;
	processing_status: ProcessingStatus;
	error_message: string | null;
}

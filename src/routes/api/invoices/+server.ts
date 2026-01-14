import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { openai } from '$lib/server/openai';
import type { InvoiceRow, InvoiceStatus } from '$lib/types/invoices';
import type { IssueRow } from '$lib/types/issues';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_LOCATION } from '$env/static/private';
import { parseReceiverAddress } from '$lib/server/addressParser';

// Uses Application Default Credentials (ADC) automatically
// Run `gcloud auth application-default login` to authenticate locally
const documentAIClient = new DocumentProcessorServiceClient();

const PROCESSOR_ID = '4e8f9ad29dee7796';

export const GET: RequestHandler = async () => {
	const { data, error } = await supabase
		.from('invoices')
		.select('*')
		.order('uploaded_at', { ascending: false });

	if (error) {
		console.error('Failed to fetch invoices:', error);
		return json({ error: 'Failed to fetch invoices' }, { status: 500 });
	}

	return json({ invoices: data as InvoiceRow[] });
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		if (file.type !== 'application/pdf') {
			return json({ error: 'Only PDF files are allowed' }, { status: 400 });
		}

		// Generate unique file path
		const timestamp = Date.now();
		const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
		const filePath = `${timestamp}_${fileName}`;

		// Upload to Supabase Storage
		const arrayBuffer = await file.arrayBuffer();
		const { error: uploadError } = await supabase.storage
			.from('invoices')
			.upload(filePath, arrayBuffer, {
				contentType: 'application/pdf',
				upsert: false
			});

		if (uploadError) {
			console.error('Failed to upload file:', uploadError);
			return json({ error: 'Failed to upload file' }, { status: 500 });
		}

		// Create invoice record with processing status
		const { data: invoice, error: insertError } = await supabase
			.from('invoices')
			.insert({
				file_path: filePath,
				file_name: file.name,
				status: 'Pending',
				processing_status: 'processing'
			})
			.select('*')
			.single();

		if (insertError || !invoice) {
			console.error('Failed to create invoice record:', insertError);
			return json({ error: 'Failed to create invoice record' }, { status: 500 });
		}

		// Process the invoice asynchronously (don't await)
		processInvoice(invoice.id, filePath).catch((err) => {
			console.error('Background invoice processing failed:', err);
		});

		return json({ invoice: invoice as InvoiceRow });
	} catch (error) {
		console.error('Invoice upload failed:', error);
		return json({ error: 'Failed to process upload' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { id, status } = body as { id: string; status: InvoiceStatus };

		if (!id || !status) {
			return json({ error: 'Missing id or status' }, { status: 400 });
		}

		const validStatuses: InvoiceStatus[] = ['Pending', 'Approved', 'Paid'];
		if (!validStatuses.includes(status)) {
			return json({ error: 'Invalid status' }, { status: 400 });
		}

		const { data, error } = await supabase
			.from('invoices')
			.update({ status })
			.eq('id', id)
			.select('*')
			.single();

		if (error) {
			console.error('Failed to update invoice:', error);
			return json({ error: 'Failed to update invoice' }, { status: 500 });
		}

		return json({ invoice: data as InvoiceRow });
	} catch (error) {
		console.error('Invoice update failed:', error);
		return json({ error: 'Failed to update invoice' }, { status: 500 });
	}
};

async function processInvoice(invoiceId: string, filePath: string): Promise<void> {
	try {
		// Get the file from storage
		const { data: fileData, error: downloadError } = await supabase.storage
			.from('invoices')
			.download(filePath);

		if (downloadError || !fileData) {
			throw new Error(`Failed to download file: ${downloadError?.message}`);
		}

		// Convert file to base64
		const arrayBuffer = await fileData.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const encodedPdf = buffer.toString('base64');

		// Process with Google Document AI
		const processorName = `projects/${GOOGLE_CLOUD_PROJECT_ID}/locations/${GOOGLE_CLOUD_LOCATION}/processors/${PROCESSOR_ID}`;

		const [result] = await documentAIClient.processDocument({
			name: processorName,
			rawDocument: {
				content: encodedPdf,
				mimeType: 'application/pdf'
			}
		});

		const { document } = result;
		if (!document) {
			throw new Error('No document returned from Document AI');
		}

		// Extract entities from Document AI response
		const entities = document.entities || [];
		const entityTypes = entities.map(e => e.type).filter(Boolean);
		console.log('Document AI entity types found:', entityTypes);

		// Helper function to get property text from line item
		function getPropText(lineItem: any, propType: string): string | null {
			const p = (lineItem.properties ?? []).find((x: any) => x.type === propType);
			return (p?.mentionText ?? null) as string | null;
		}

		// Extract line items and their descriptions
		const lineItems = entities
			.filter((e: any) => e.type === 'line_item')
			.map((li: any) => {
				const description =
					getPropText(li, 'line_item/description') ??
					getPropText(li, 'description');

				const amountText = getPropText(li, 'line_item/amount') ?? getPropText(li, 'amount');
				const qtyText = getPropText(li, 'line_item/quantity') ?? getPropText(li, 'quantity');

				return {
					description: description ?? '',
					amountText: amountText ?? null,
					qtyText: qtyText ?? null
				};
			});

		console.log('Parsed line items:', lineItems);

		// Combine all line item descriptions into a semicolon-separated string
		const lineItemDescriptions = lineItems
			.map((li) => li.description)
			.filter(Boolean)
			.join('; ');

		let extracted: { building?: string; unit?: string; description?: string; amount?: number } = {};
		let receiverAddress: string | undefined;

		for (const entity of entities) {
			const type = entity.type;
			const value = entity.mentionText || '';

			// Map Document AI entity types to our fields
			if (type === 'building' || type === 'property' || type === 'property_name') {
				extracted.building = value;
			} else if (type === 'unit' || type === 'unit_number') {
				extracted.unit = value;
			} else if (type === 'total_amount' || type === 'amount' || type === 'invoice_total') {
				// Parse amount - remove currency symbols and convert to number
				const amountStr = value.replace(/[$,]/g, '');
				const amountNum = parseFloat(amountStr);
				if (!isNaN(amountNum)) {
					extracted.amount = amountNum;
				}
			} else if (type === 'receiver_address') {
				receiverAddress = value;
			}
		}

		// Use line item descriptions if available
		if (lineItemDescriptions) {
			extracted.description = lineItemDescriptions;
		}

		console.log('Receiver address:', receiverAddress);

		// Parse receiver address to extract building and unit
		if (receiverAddress) {
			const parsed = parseReceiverAddress(receiverAddress);
			console.log('Parsed address:', parsed);

			if (parsed.streetAddress && !extracted.building) {
				extracted.building = parsed.streetAddress;
			}
			if (parsed.unit && !extracted.unit) {
				extracted.unit = parsed.unit;
			}
		}

		console.log('Extracted data from Document AI:', JSON.stringify(extracted, null, 2));

		// If Document AI didn't extract everything, try using the raw text with OpenAI as fallback
		if (!extracted.building || !extracted.unit || !extracted.description || !extracted.amount) {
			console.log('Using OpenAI to fill missing fields');
			const rawText = document.text || '';
			const completion = await openai.chat.completions.create({
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'user',
						content: `Extract missing invoice fields from this text. Current data: ${JSON.stringify(extracted)}

Text:
${rawText.substring(0, 3000)}

Return JSON with: building, unit, description, amount (fill in any null/missing fields)`
					}
				],
				max_tokens: 300
			});

			const aiResponse = completion.choices[0]?.message?.content?.trim();
			if (aiResponse) {
				try {
					const aiExtracted = JSON.parse(aiResponse);
					extracted = { ...extracted, ...aiExtracted };
				} catch {
					console.warn('Failed to parse OpenAI fallback response');
				}
			}
		}

		console.log('Final extracted data:', JSON.stringify(extracted, null, 2));

		// Fetch all issues for matching
		const { data: issues } = await supabase
			.from('issues')
			.select('id, building, unit, description');

		let matchedIssueId: string | null = null;

		if (issues && extracted.building && extracted.unit) {
			// Find matching issues by building and unit (case-insensitive)
			const matches = issues.filter(
				(issue: IssueRow) =>
					issue.building?.toLowerCase() === extracted.building?.toLowerCase() &&
					issue.unit?.toLowerCase() === extracted.unit?.toLowerCase()
			);

			if (matches.length === 1) {
				matchedIssueId = matches[0].id;
			} else if (matches.length > 1 && extracted.description) {
				// Multiple matches - use OpenAI to find best match by description
				const matchResult = await openai.chat.completions.create({
					model: 'gpt-4o-mini',
					messages: [
						{
							role: 'user',
							content: `Given this invoice description: "${extracted.description}"

Which of these issues is the best match? Respond with ONLY the issue ID number (1, 2, 3, etc.) or "none" if no good match.

${matches.map((m: IssueRow, i: number) => `${i + 1}. ${m.description}`).join('\n')}`
						}
					],
					max_tokens: 10
				});

				const matchIndex = parseInt(matchResult.choices[0]?.message?.content?.trim() ?? '', 10);
				if (!isNaN(matchIndex) && matchIndex >= 1 && matchIndex <= matches.length) {
					matchedIssueId = matches[matchIndex - 1].id;
				}
			}
		}

		// Update the invoice with extracted data
		await supabase
			.from('invoices')
			.update({
				building: extracted.building ?? null,
				unit: extracted.unit ?? null,
				description: extracted.description ?? null,
				amount: extracted.amount ?? null,
				issue_id: matchedIssueId,
				processing_status: 'completed'
			})
			.eq('id', invoiceId);

	} catch (error) {
		console.error('Invoice processing error:', error);

		// Update invoice with error status
		await supabase
			.from('invoices')
			.update({
				processing_status: 'failed',
				error_message: error instanceof Error ? error.message : 'Unknown error'
			})
			.eq('id', invoiceId);
	}
}

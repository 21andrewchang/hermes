import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type {
	ChatCompletionMessageParam,
	ChatCompletionTool
} from 'openai/resources/chat/completions';
import { openai } from '$lib/server/openai';
import { supabase } from '$lib/supabase';
import type { IssueRow, IssueStatus } from '$lib/types/issues';

const MODEL = 'gpt-4o-mini';
const ISSUE_STATUSES: IssueStatus[] = ['Needs Approval', 'Review', 'Pending', 'In Progress', 'Complete'];

const SYSTEM_PROMPT = `You are Hermes, a property-operations copilot. You read pasted tenant emails or SMS transcripts and turn them into Inbox issues.

Rules (current mode: issue creation only):
1. Your sole job is to create issues. Do not offer to send messages or do other work. When you have enough info, call the create_issue tool immediately.

2. **Generate descriptions from the incoming message**. Extract and summarize the problem from the email/SMS text. Only ask follow-up questions if the incoming message truly lacks sufficient detail to understand the issue.

3. When you know building, unit, and can generate a concise description, call the create_issue tool. Default status to Needs Approval.

4. Every issue must include an Action (who to contact). Choose based on the issue type:
   - **Esther**: Property manager. For easy work, general property management, tenant requests, onsite coordination, or non-specialized maintenance.
   - **Erick**: AC technician. For all air conditioning and HVAC issues.
   - **Justin**: General handyman. For most repair and maintenance issues (drywall, doors, fixtures, etc).
   - **Rufino**: Plumber. For all plumbing issues (leaks, clogs, water heaters, etc).
   - **Magic Fix**: Appliance technician. For appliance repairs (dishwasher, washer/dryer, stove, refrigerator, etc).

5. Summarize the issue, note who to contact, and state whether a ticket was created.`;

const tools: ChatCompletionTool[] = [
	{
		type: 'function',
		function: {
			name: 'create_issue',
			description:
				'Create a new property issue in the Inbox when you know the building, unit, and summary of the problem.',
			parameters: {
				type: 'object',
				properties: {
					building: {
						type: 'string',
						description: 'Building name exactly as used in the Inbox (e.g. Mariposa, Willoughby).'
					},
					unit: {
						type: 'string',
						description: 'Unit identifier (e.g. 401, 5, 407).'
					},
					description: {
						type: 'string',
						description: 'One-line description of the problem.'
					},
					action: {
						type: 'string',
						description: 'Who to contact: "Esther" (property manager for easy work/general management), "Erick" (AC technician), "Justin" (general handyman), "Rufino" (plumber), or "Magic Fix" (appliance tech).'
					},
					status: {
						type: 'string',
						enum: ISSUE_STATUSES,
						description: 'Workflow status if known.'
					},
					reported_at: {
						type: 'string',
						description: 'ISO timestamp for when the issue was reported.'
					}
				},
				required: ['building', 'unit', 'description']
			}
		}
	}
];

interface ChatRequestBody {
	sessionId?: string;
	text: string;
	context?: {
		building?: string;
		unit?: string;
	};
}

interface ChatMessageRow {
	id: string;
	role: 'user' | 'assistant' | 'tool';
	content: string;
	tool_name: string | null;
	tool_args: string | null;
	created_at: string;
}

interface ToolCallResult {
	success: boolean;
	error?: string;
	issue?: IssueRow;
	missingFields?: string[];
}

async function ensureSession(sessionId?: string): Promise<string> {
	if (sessionId) return sessionId;

	const { data: existing, error: existingError } = await supabase
		.from('chat_sessions')
		.select('id')
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();

	if (existingError && existingError.code !== 'PGRST116') {
		throw new Error(`Failed to lookup chat session: ${existingError.message}`);
	}

	if (existing?.id) {
		return existing.id;
	}

	const { data: created, error: insertError } = await supabase
		.from('chat_sessions')
		.insert({ title: 'Inbox Assistant' })
		.select('id')
		.single();

	if (insertError || !created?.id) {
		throw new Error(`Failed to create chat session: ${insertError?.message ?? 'unknown error'}`);
	}

	return created.id;
}

async function insertMessage(sessionId: string, role: 'user' | 'assistant' | 'tool', content: string, toolName?: string | null, toolArgs?: string | null) {
	const { data, error } = await supabase
		.from('chat_messages')
		.insert({
			session_id: sessionId,
			role,
			content,
			tool_name: toolName ?? null,
			tool_args: toolArgs ?? null
		})
		.select('id')
		.single();

	if (error || !data?.id) {
		throw new Error(`Failed to persist ${role} message: ${error?.message ?? 'unknown error'}`);
	}

	return data.id as string;
}

async function fetchChatHistory(sessionId: string): Promise<ChatMessageRow[]> {
	const { data, error } = await supabase
		.from('chat_messages')
		.select('id, role, content, tool_name, tool_args, created_at')
		.eq('session_id', sessionId)
		.order('created_at', { ascending: true });

	if (error) {
		throw new Error(`Failed to load chat history: ${error.message}`);
	}

	return data as ChatMessageRow[];
}

function normalizeUserContent(text: string, context?: ChatRequestBody['context']): string {
	const segments: string[] = [];
	const trimmed = text.trim();
	if (trimmed.length) segments.push(trimmed);

	const contextHints = [];
	if (context?.building) contextHints.push(`Building: ${context.building}`);
	if (context?.unit) contextHints.push(`Unit: ${context.unit}`);

	if (contextHints.length) {
		segments.push(`Context:\n${contextHints.join('\n')}`);
	}

	return segments.join('\n\n');
}

function buildHistoryMessages(rows: ChatMessageRow[]): ChatCompletionMessageParam[] {
	return rows
		.filter((row) => row.role === 'user' || row.role === 'assistant')
		.map((row) => ({
			role: row.role,
			content: row.content
		})) as ChatCompletionMessageParam[];
}

function normalizeStatus(value?: string | null): IssueStatus {
	if (!value) return 'Needs Approval';
	return ISSUE_STATUSES.includes(value as IssueStatus) ? (value as IssueStatus) : 'Needs Approval';
}

interface CreateIssueArgs {
	building?: string;
	unit?: string;
	description?: string;
	action?: string;
	status?: IssueStatus | string;
	reported_at?: string;
}

async function createIssueFromArgs(args: CreateIssueArgs): Promise<ToolCallResult> {
	const building = args.building?.trim() ?? '';
	const unit = args.unit?.trim() ?? '';
	const description = args.description?.trim() ?? '';

	const payload = {
		building,
		unit,
		description,
		action: args.action?.trim() ?? '',
		status: normalizeStatus(args.status),
		reported_at: args.reported_at ?? new Date().toISOString(),
		is_draft: false
	};

	const { data, error } = await supabase
		.from('issues')
		.insert(payload)
		.select('id, reported_at, building, unit, description, action, status, is_draft')
		.single();

	if (error || !data) {
		return {
			success: false,
			error: `Failed to create issue: ${error?.message ?? 'unknown error'}`
		};
	}

	return {
		success: true,
		issue: data as IssueRow
	};
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as ChatRequestBody;

		if (!body?.text || !body.text.trim()) {
			return json({ error: 'Message text is required' }, { status: 400 });
		}

		const sessionId = await ensureSession(body.sessionId);
		const userContent = normalizeUserContent(body.text, body.context);
		await insertMessage(sessionId, 'user', userContent);

		const history = await fetchChatHistory(sessionId);
		const messages: ChatCompletionMessageParam[] = [
			{ role: 'system', content: SYSTEM_PROMPT },
			...buildHistoryMessages(history)
		];

		let assistantMessage = await runChatCompletion(messages);
		const toolCalls = assistantMessage.tool_calls ?? [];
		let createdIssue: IssueRow | null = null;

		if (toolCalls.length > 0) {
			messages.push({
				role: 'assistant',
				content: assistantMessage.content ?? '',
				tool_calls: toolCalls
			});

			for (const toolCall of toolCalls) {
				if (toolCall.type !== 'function') continue;
				if (toolCall.function.name !== 'create_issue') continue;

				let parsedArgs: CreateIssueArgs = {};
				try {
					parsedArgs = JSON.parse(toolCall.function.arguments ?? '{}');
				} catch (parseError) {
					console.error('Failed to parse tool args', parseError);
				}

				const result = await createIssueFromArgs(parsedArgs);
				if (result.success && result.issue) {
					createdIssue = result.issue;
				}

				const toolContent = JSON.stringify(result);
				await insertMessage(
					sessionId,
					'tool',
					toolContent,
					toolCall.function.name,
					toolCall.function.arguments ?? null
				);

				messages.push({
					role: 'tool',
					tool_call_id: toolCall.id,
					content: toolContent
				});
			}

			assistantMessage = await runChatCompletion(messages);
		}

		const finalContent = assistantMessage.content?.trim() ?? 'Let me know how else I can help.';
		const assistantMessageId = await insertMessage(
			sessionId,
			'assistant',
			finalContent,
			createdIssue ? 'create_issue' : null,
			createdIssue ? JSON.stringify({ issueId: createdIssue.id }) : null
		);

		return json({
			sessionId,
			messageId: assistantMessageId,
			message: finalContent,
			issue: createdIssue
		});
	} catch (error) {
		console.error('Chat handler failed', error);
		return json({ error: 'Unable to process your request right now.' }, { status: 500 });
	}
};

async function runChatCompletion(messages: ChatCompletionMessageParam[]) {
	const completion = await openai.chat.completions.create({
		model: MODEL,
		messages,
		tools,
		tool_choice: 'auto'
	});

	const assistantMessage = completion.choices[0]?.message;
	if (!assistantMessage) {
		throw new Error('No assistant response from OpenAI');
	}

	return assistantMessage;
}

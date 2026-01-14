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

const BASE_SYSTEM_PROMPT = `You are Hermes, a property-operations copilot. You help with:

1. **Create Issues**: Turn tenant emails/SMS into Inbox issues
2. **Draft Messages**: Create or rewrite messages for existing issues

## Creating Issues
When user pastes an email/SMS about a property issue:
- Extract building, unit, and description from the text
- Only ask follow-up questions if truly insufficient detail
- Call create_issue with appropriate action (who to contact)
- Generate a draft message to the contact person

**Contact options (choose based on issue type):**
- **Esther**: Property manager. For easy work, general management, tenant requests, onsite coordination.
- **Erick**: AC technician. For all air conditioning and HVAC issues.
- **Justin**: General handyman. For repairs (drywall, doors, fixtures, etc).
- **Rufino**: Plumber. For plumbing issues (leaks, clogs, water heaters, etc).
- **Magic Fix**: Appliance technician. For appliance repairs (dishwasher, washer/dryer, stove, refrigerator, etc).

## Drafting Messages for Existing Issues
When user asks to draft a message for an existing issue, use the draft_message tool:

**By status:**
- **Pending** (no draft): Create initial outreach to the assigned contact explaining the issue
- **Review** (has draft): Rewrite/improve the existing draft based on feedback
- **In Progress**: Draft follow-up asking about progress, ETA, or blockers
- **Complete**: Draft invoice request or thank you message

**Guidelines for all messages:**
- 2-4 sentences, professional but friendly
- Address the recipient by name (e.g., "Hi Erick,")
- Reference the specific issue (building, unit, problem)
- Match tone to status: urgent for new issues, polite for follow-ups`;

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
					},
					draft: {
						type: 'string',
						description: 'Short draft message to the contact person (2-3 sentences, professional but friendly).'
					}
				},
				required: ['building', 'unit', 'description']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'draft_message',
			description:
				'Draft or rewrite a message for an existing issue. Use for initial outreach (Pending), rewrites (Review), follow-ups (In Progress), or invoice requests (Complete).',
			parameters: {
				type: 'object',
				properties: {
					issue_id: {
						type: 'string',
						description: 'The ID of the issue (from the recent issues list)'
					},
					message_type: {
						type: 'string',
						enum: ['initial_outreach', 'rewrite', 'follow_up', 'invoice_request'],
						description:
							'Type of message: initial_outreach (Pending - no draft yet), rewrite (Review - fix existing draft), follow_up (In Progress - check on status), invoice_request (Complete - ask for invoice)'
					},
					recipient: {
						type: 'string',
						description: 'Who the message is for (e.g., Esther, Erick, Justin, Rufino, Magic Fix)'
					},
					draft_content: {
						type: 'string',
						description: 'The drafted message (2-4 sentences, professional but friendly)'
					}
				},
				required: ['issue_id', 'message_type', 'draft_content']
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
	draft?: string;
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
		is_draft: false,
		draft: args.draft?.trim() ?? null
	};

	const { data, error } = await supabase
		.from('issues')
		.insert(payload)
		.select('id, reported_at, building, unit, description, action, status, is_draft, draft')
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

interface DraftMessageArgs {
	issue_id?: string;
	message_type?: 'initial_outreach' | 'rewrite' | 'follow_up' | 'invoice_request';
	recipient?: string;
	draft_content?: string;
}

async function handleDraftMessage(args: DraftMessageArgs): Promise<ToolCallResult> {
	const issueId = args.issue_id?.trim();
	const draftContent = args.draft_content?.trim();

	if (!issueId) {
		return { success: false, error: 'Missing issue_id' };
	}
	if (!draftContent) {
		return { success: false, error: 'Missing draft_content' };
	}

	const { data, error } = await supabase
		.from('issues')
		.update({ draft: draftContent })
		.eq('id', issueId)
		.select('id, reported_at, building, unit, description, action, status, is_draft, draft')
		.single();

	if (error || !data) {
		return { success: false, error: error?.message ?? 'Failed to update draft' };
	}

	return { success: true, issue: data as IssueRow };
}

async function fetchRecentIssues(): Promise<string> {
	const { data: recentIssues } = await supabase
		.from('issues')
		.select('id, building, unit, description, action, status, draft')
		.order('reported_at', { ascending: false })
		.limit(20);

	if (!recentIssues?.length) return '';

	const issueLines = recentIssues.map((i) => {
		const draftStatus = i.draft ? 'has draft' : 'no draft';
		return `- [${i.id.slice(0, 8)}] ${i.building} Unit ${i.unit}: "${i.description}" (Status: ${i.status}, Action: ${i.action}, ${draftStatus})`;
	});

	return `\n\n## Recent Issues\n${issueLines.join('\n')}`;
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

		// Build dynamic system prompt with recent issues context
		const issueContext = await fetchRecentIssues();
		const systemPrompt = BASE_SYSTEM_PROMPT + issueContext;

		const history = await fetchChatHistory(sessionId);
		const messages: ChatCompletionMessageParam[] = [
			{ role: 'system', content: systemPrompt },
			...buildHistoryMessages(history)
		];

		let assistantMessage = await runChatCompletion(messages);
		const toolCalls = assistantMessage.tool_calls ?? [];
		let createdIssue: IssueRow | null = null;
		let updatedIssue: IssueRow | null = null;

		if (toolCalls.length > 0) {
			messages.push({
				role: 'assistant',
				content: assistantMessage.content ?? '',
				tool_calls: toolCalls
			});

			for (const toolCall of toolCalls) {
				if (toolCall.type !== 'function') continue;

				const toolName = toolCall.function.name;
				let parsedArgs: CreateIssueArgs | DraftMessageArgs = {};
				try {
					parsedArgs = JSON.parse(toolCall.function.arguments ?? '{}');
				} catch (parseError) {
					console.error('Failed to parse tool args', parseError);
				}

				let result: ToolCallResult;

				switch (toolName) {
					case 'create_issue':
						result = await createIssueFromArgs(parsedArgs as CreateIssueArgs);
						if (result.success && result.issue) {
							createdIssue = result.issue;
						}
						break;
					case 'draft_message':
						result = await handleDraftMessage(parsedArgs as DraftMessageArgs);
						if (result.success && result.issue) {
							updatedIssue = result.issue;
						}
						break;
					default:
						result = { success: false, error: `Unknown tool: ${toolName}` };
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
		const toolUsed = createdIssue ? 'create_issue' : updatedIssue ? 'draft_message' : null;
		const toolArgs = createdIssue
			? JSON.stringify({ issueId: createdIssue.id })
			: updatedIssue
				? JSON.stringify({ issueId: updatedIssue.id })
				: null;

		const assistantMessageId = await insertMessage(
			sessionId,
			'assistant',
			finalContent,
			toolUsed,
			toolArgs
		);

		return json({
			sessionId,
			messageId: assistantMessageId,
			message: finalContent,
			issue: createdIssue,
			updatedIssue: updatedIssue
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

import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { OPENAI_API_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

const buildPrompt = ({
	messages,
	profile,
	activeIssue,
	openIssues
}: {
	messages: Array<{ sender_type: string; content: string }>;
	profile: {
		id: string;
		name: string | null;
		mood_score: number | null;
		mood_confidence: number | null;
	};
	activeIssue: Record<string, unknown> | null;
	openIssues: Array<Record<string, unknown>>;
}) => {
	const history = messages
		.map((message) => `${message.sender_type === 'user' ? 'User' : 'Hermes'}: ${message.content}`)
		.join('\n');

	const profileContext = JSON.stringify(profile);
	const activeContext = activeIssue ? JSON.stringify(activeIssue) : 'null';
	const issuesContext = JSON.stringify(openIssues);

	return `You are Hermes, an internal mediator for cofounder conflict.\n\nReturn JSON only with this shape:\n{\n  "reply": "...",\n  "issue_action": "create|update|none",\n  "issue_id": "uuid-or-null",\n  "issue_title": "...",\n    "issue_context": "...",
\n  "issue_stage": "detected|clarified|self_improvement|surfaced_soft|escalated_detail|scheduled|resolved",\n  "issue_severity": "low|med|high",\n  "set_active": true|false\n}\n\nRules:\n- Reply should acknowledge the user's situation and ask a clarifying question.\n- The goal is the cofounders' relationship health + company productivity.\n- Always consider the active issue first; update it if this is the same situation.\n- If the user raises a distinct issue, decide whether it should become the new active issue (set_active true).\n- Use issue_action "update" to extend existing issues; do not create duplicates.\n- Issue titles must be concrete and situation-specific (2-6 words), naming the exact object/event.\n- Avoid generic titles like "Conflict", "Misunderstanding", "Issue", or "Problem".\n- Prefer noun phrases tied to the trigger (e.g., "Tissues on counter", "Mom yelled about dishes", "Missed standup update").\n- Bad: "Conflict Over Misunderstanding". Good: "Tissues on counter".\n- If you cannot name a specific object/event, set issue_action to "none".\n\nUser profile:\n${profileContext}\n\nActive issue:\n${activeContext}\n\nOpen issues (stage != resolved):\n${issuesContext}\n\nConversation:\n${history}`;
};

export const POST: RequestHandler = async ({ request }) => {
	const { userId, sessionId, content } = (await request.json()) as {
		userId: string;
		sessionId: string;
		content: string;
	};

	const { data: history } = await supabase
		.from('chat_messages')
		.select('sender_type, content')
		.eq('session_id', sessionId)
		.order('created_at', { ascending: true });

	const { data: profileData } = await supabase
		.from('profiles')
		.select('id, name, mood_score, mood_confidence')
		.eq('id', userId)
		.single();

	const { data: activeIssue } = await supabase
		.from('issues')
		.select('id, title, context, stage, severity, active, created_by_user_id')
		.eq('active', true)
		.maybeSingle();

	const { data: openIssues } = await supabase
		.from('issues')
		.select('id, title, context, stage, severity, active, created_by_user_id')
		.or('stage.is.null,stage.neq.resolved');

	const prompt = buildPrompt({
		messages: [...(history ?? []), { sender_type: 'user', content }],
		profile:
			profileData ??
			({ id: userId, name: null, mood_score: null, mood_confidence: null } as {
				id: string;
				name: string | null;
				mood_score: number | null;
				mood_confidence: number | null;
			}),
		activeIssue: (activeIssue as Record<string, unknown>) ?? null,
		openIssues: (openIssues as Array<Record<string, unknown>>) ?? []
	});

	let replyText = "Thanks for sharing. What's the biggest part of this that's weighing on you?";
	let issueAction: 'create' | 'update' | 'none' = 'none';
	let issueId: string | null = null;
	let issueTitle: string | null = null;
	let issueContext: string | null = null;
	let issueStage: string | null = null;
	let issueSeverity: string | null = null;
	let setActive = false;
	let responseMeta: Record<string, unknown> | null = null;
	let responseRaw: string | null = null;

	if (OPENAI_API_KEY) {
		const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${OPENAI_API_KEY}`
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				response_format: { type: 'json_object' },
				messages: [
					{ role: 'system', content: 'Respond strictly with JSON.' },
					{ role: 'user', content: prompt }
				]
			})
		});

		responseMeta = {
			status: openAiResponse.status
		};

		if (openAiResponse.ok) {
			const payload = (await openAiResponse.json()) as {
				choices: Array<{ message: { content: string } }>;
				usage?: Record<string, unknown>;
				model?: string;
			};
			responseMeta = { ...responseMeta, usage: payload.usage, model: payload.model };
			responseRaw = payload.choices?.[0]?.message?.content ?? null;
			if (responseRaw) {
				try {
					const parsed = JSON.parse(responseRaw) as {
						reply?: string;
						issue_action?: 'create' | 'update' | 'none';
						issue_id?: string | null;
						issue_title?: string;
						issue_context?: string;
						issue_stage?: string;
						issue_severity?: string;
						set_active?: boolean;
					};
					if (parsed.reply) {
						replyText = parsed.reply;
					}
					if (parsed.issue_action) {
						issueAction = parsed.issue_action;
					}
					issueId = parsed.issue_id ?? null;
					issueTitle = parsed.issue_title ?? null;
					issueContext = parsed.issue_context ?? null;
					issueStage = parsed.issue_stage ?? null;
					issueSeverity = parsed.issue_severity ?? null;
					setActive = parsed.set_active ?? false;
				} catch (error) {
					// fall back to defaults
				}
			}
		}
	}

	let issueResult = null as Record<string, unknown> | null;
	let logAction = 'response only';

	if (issueAction === 'create' && issueTitle) {
		if (setActive) {
			await supabase.from('issues').update({ active: false }).eq('active', true);
		}
		const { data } = await supabase
			.from('issues')
			.insert({
				created_by_user_id: userId,
				title: issueTitle,
				context: issueContext,
				stage: issueStage ?? 'detected',
				severity: issueSeverity ?? 'med',
				active: setActive
			})
			.select()
			.single();
		issueResult = data ?? null;
		logAction = 'created issue + response';
	} else if (issueAction === 'update' && issueId) {
		const updatePayload: Record<string, unknown> = {};
		if (issueTitle) updatePayload.title = issueTitle;
		if (issueContext) updatePayload.context = issueContext;
		if (issueStage) updatePayload.stage = issueStage;
		if (issueSeverity) updatePayload.severity = issueSeverity;
		if (setActive) updatePayload.active = true;

		if (setActive) {
			await supabase.from('issues').update({ active: false }).eq('active', true);
		}

		if (Object.keys(updatePayload).length > 0) {
			const { data } = await supabase
				.from('issues')
				.update(updatePayload)
				.eq('id', issueId)
				.select()
				.single();
			issueResult = data ?? null;
			logAction = 'update issue + response';
		}
	}

	const { data: aiMessage } = await supabase
		.from('chat_messages')
		.insert({ session_id: sessionId, sender_type: 'ai', content: replyText })
		.select()
		.single();

	await supabase.from('logs').insert({
		user_id: userId,
		reason: 'assistant_response',
		action: logAction,
		response_raw: responseRaw,
		response_meta: responseMeta
	});

	return json({ reply: aiMessage, issue: issueResult });
};

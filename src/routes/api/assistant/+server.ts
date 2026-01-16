import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { OPENAI_API_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

const buildPrompt = (messages: Array<{ sender_type: string; content: string }>) => {
	const history = messages
		.map((message) => `${message.sender_type === 'user' ? 'User' : 'Hermes'}: ${message.content}`)
		.join('\n');

	return `You are Hermes, an internal mediator for cofounder conflict.\n\nReturn JSON only with this shape:\n{\n  "reply": "...",\n  "issue": {\n    "title": "...",\n    "stage": "detected|clarified|self_improvement|surfaced_soft|escalated_detail|scheduled|resolved",\n    "severity": "low|med|high"\n  } | null\n}\n\nRules:\n- Reply should acknowledge the user's situation and ask a clarifying question.\n- If the user expresses a concrete issue or conflict, create an issue object with a short title.\n- Issue titles must be concrete and situation-specific (2-6 words), describing the exact object/event.\n- Avoid generic titles like "Conflict", "Misunderstanding", "Issue", or "Problem".\n- Examples: "Tissues on counter", "Mom yelled about dishes", "Missed standup update".\n- If there is no clear issue, set issue to null.\n\nConversation:\n${history}`;
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

	const prompt = buildPrompt([...(history ?? []), { sender_type: 'user', content }]);

	let replyText = "Thanks for sharing. What's the biggest part of this that's weighing on you?";
	let issuePayload: { title: string; stage?: string; severity?: string } | null = null;
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
						issue?: { title?: string; stage?: string; severity?: string } | null;
					};
					if (parsed.reply) {
						replyText = parsed.reply;
					}
					if (parsed.issue?.title) {
						issuePayload = {
							title: parsed.issue.title,
							stage: parsed.issue.stage ?? 'detected',
							severity: parsed.issue.severity ?? 'med'
						};
					}
				} catch (error) {
					// fall back to defaults
				}
			}
		}
	}

	let createdIssue = null as Record<string, unknown> | null;
	if (issuePayload) {
		await supabase.from('issues').update({ active: false }).eq('active', true);
		const { data } = await supabase
			.from('issues')
			.insert({
				created_by_user_id: userId,
				title: issuePayload.title,
				stage: issuePayload.stage,
				severity: issuePayload.severity,
				active: true
			})
			.select()
			.single();
		createdIssue = data ?? null;
	}

	const { data: aiMessage } = await supabase
		.from('chat_messages')
		.insert({ session_id: sessionId, sender_type: 'ai', content: replyText })
		.select()
		.single();

	await supabase.from('logs').insert({
		user_id: userId,
		reason: 'assistant_response',
		action: issuePayload ? 'created issue + response' : 'response only',
		response_raw: responseRaw,
		response_meta: responseMeta
	});

	return json({ reply: aiMessage, issue: createdIssue });
};

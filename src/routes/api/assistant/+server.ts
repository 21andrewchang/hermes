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
	openIssues,
	otherProfiles
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
	otherProfiles: Array<{ id: string; name: string | null }>;
}) => {
	const history = messages
		.map((message) => `${message.sender_type === 'user' ? 'User' : 'Hermes'}: ${message.content}`)
		.join('\n');

	const profileContext = JSON.stringify(profile);
	const activeContext = activeIssue ? JSON.stringify(activeIssue) : 'null';
	const issuesContext = JSON.stringify(openIssues);
	const otherProfilesContext = JSON.stringify(otherProfiles);

	return (
		`You are Hermes, an internal mediator for cofounder conflict.\n` +
		`\n` +
		`Return JSON that matches the schema exactly.\n` +
		`- Always include arrays: create_issues, update_issues, stage_changes, notify_others, update_moods (empty if none).\n` +
		`\n` +
		`Rules:\n` +
		`- Every user message gets a normal response (reply).\n` +
		`- Act like a concerned founder-friend; concise, grounded, and high-EQ.\n` +
		`- The goal is maximizing the cofounders' relationship health + company productivity.\n` +
		`- Never mention internal stages, issues, actions, tracking, or \"triggers\".\n` +
		`- Keep replies short (1-3 sentences).\n` +
		`- During clarification, ask exactly 1 direct question at a time.\n` +
		`- If a new issue is created, the first reply must be a clarifying question about what happened, impact, or feelings.\n` +
		`- Never ask to bring it up to the other founder in the same reply as issue creation.\n` +
		`- Only ask to bring it up after at least one prior clarification reply has happened.\n` +
		`- If the user consents to surface, reply simply: "Okay — I’ll bring it up." (optionally: "Anything else bothering you lately?").\n` +
		`- Never mention checkins, notifications, payloads, or neutrality in normal replies.\n` +
		`- Avoid making plans unless the user asks; if offering a suggestion, ask permission first.\n` +
		`- Never mention checkins or internal workflows.\n` +
		`- Checkin payloads must be neutral, single-question prompts that hide the origin and never reference the other founder.\n` +
		`- Checkin payloads should feel like normal checkins: mental state, work wellbeing, or self-reflection.\n` +
		`- Avoid mirroring the user's exact complaint or using near-term phrasing (no meetings, deadlines, decisions, "sync", or direct collaboration language).\n` +
		`- Backlog follow-ups can reference events ("How did the big meeting go?"), but never mention who requested it or why.\n` +
		`- Payload must be a single question only; do not add labels like "Quick check-in" or "Check-in".\n` +
		`- Example good payload: "How are you feeling about your energy and focus today?"\n` +
		`- Always consider the active issue first; update it if this is the same situation.\n` +
		`- If the user raises a distinct issue, decide whether it should become the new active issue.\n` +
		`- Use update_issue to extend existing issues; do not create duplicates.\n` +
		`- New issues must start at stage "clarification".\n` +
		`- Stage gating: never advance stages unless criteria are satisfied; log every stage change.\n` +
		`- Before moving from clarification to surface, explicitly ask if Hermes should bring this up to the other founder.\n` +
		`- If the user declines, stay in clarification and offer reflection/self-improvement prompts.\n` +
		`- Issue titles must be concrete and situation-specific (2-6 words), naming the exact object/event.\n` +
		`- If only one founder has mentioned it, include the other founder's name in the title (use Other profiles to pick the name).\n` +
		`- If both founders have mentioned it, you may generalize the title (e.g., "Silence during decisions").\n` +
		`- Avoid generic titles like "Conflict", "Misunderstanding", "Issue", or "Problem".\n` +
		`- Prefer noun phrases tied to the specific event (e.g., "Tissues on counter", "Mom yelled about dishes", "Missed standup update").\n` +
		`- Bad: "Conflict Over Misunderstanding". Good: "Tissues on counter".\n` +
		`- Use notify_others only after the user consents to surfacing; payload must be a neutral, concise check-in question with no mention of the issue.\n` +
		`- Never ask for surfacing consent inside a notification payload; that question only appears in normal replies after clarification.\n` +
		`- Use only UUIDs from Other profiles for target_user_id. Never use names.\n` +
		`- Use only UUIDs from Other profiles for target_user_id. Never use names.\n` +
		`- Use update_moods to adjust the current user's mood based on the conversation (partial updates allowed).\n` +
		`- Mood scale: mood_score is -1.0 (very negative) to 1.0 (very positive); mood_confidence is 0.0 to 1.0.\n` +
		`- Try to estimate mood each call, only updating when reasonably confident.\n` +
		`\n` +
		`- If you cannot name a specific object/event, do not create a new issue.\n` +
		`\n` +
		`User profile:\n${profileContext}\n` +
		`\n` +
		`Other profiles:\n${otherProfilesContext}\n` +
		`\n` +
		`Other profiles:\n${otherProfilesContext}\n` +
		`\n` +
		`Active issue:\n${activeContext}\n` +
		`\n` +
		`Open issues (stage != resolved):\n${issuesContext}\n` +
		`\n` +
		`Conversation:\n${history}`
	);
};

type Action =
	| {
			type: 'create_issue';
			issue_id?: string | null;
			title?: string;
			context?: string | null;
			severity?: 'low' | 'med' | 'high';
			stage?: 'clarification' | 'surface' | 'resolved';
			set_active?: boolean;
	  }
	| {
			type: 'update_issue';
			issue_id?: string | null;
			title?: string | null;
			context?: string | null;
			severity?: 'low' | 'med' | 'high' | null;
			stage?: 'clarification' | 'surface' | 'resolved' | null;
			set_active?: boolean | null;
	  }
	| {
			type: 'stage_change';
			issue_id?: string | null;
			from?: string;
			to?: string;
			reason?: string;
	  }
	| {
			type: 'notify_other';
			issue_id?: string | null;
			target_user_id?: string;
			channel?: 'checkin';
			reason?: string;
			payload?: string;
	  }
	| {
			type: 'update_mood';
			mood_score?: number | null;
			mood_confidence?: number | null;
			reason?: string;
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
		.eq('created_by_user_id', userId)
		.eq('active', true)
		.maybeSingle();

	const { data: openIssues } = await supabase
		.from('issues')
		.select('id, title, context, stage, severity, active, created_by_user_id')
		.eq('created_by_user_id', userId)
		.or('stage.is.null,stage.neq.resolved');

	const { data: otherProfiles } = await supabase
		.from('profiles')
		.select('id, name')
		.neq('id', userId);

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
		openIssues: (openIssues as Array<Record<string, unknown>>) ?? [],
		otherProfiles: (otherProfiles as Array<{ id: string; name: string | null }>) ?? []
	});

	let replyText = "Thanks for sharing. What's the biggest part of this that's weighing on you?";
	let actions: Action[] = [];
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
				model: 'gpt-5-mini-2025-08-07',
				response_format: {
					type: 'json_schema',
					json_schema: {
						name: 'hermes_actions',
						strict: true,
						schema: {
							type: 'object',
							additionalProperties: false,
							properties: {
								reply: { type: 'string' },
								create_issues: {
									type: 'array',
									items: {
										type: 'object',
										additionalProperties: false,
										properties: {
											title: { type: 'string' },
											context: { type: ['string', 'null'] },
											severity: { enum: ['low', 'med', 'high'] },
											stage: { enum: ['clarification', 'surface', 'resolved'] },
											set_active: { type: 'boolean' }
										},
										required: ['title', 'context', 'severity', 'stage', 'set_active']
									}
								},
								update_issues: {
									type: 'array',
									items: {
										type: 'object',
										additionalProperties: false,
										properties: {
											issue_id: { type: 'string' },
											title: { type: ['string', 'null'] },
											context: { type: ['string', 'null'] },
											severity: { type: ['string', 'null'] },
											stage: { type: ['string', 'null'] },
											set_active: { type: ['boolean', 'null'] }
										},
										required: ['issue_id', 'title', 'context', 'severity', 'stage', 'set_active']
									}
								},
								stage_changes: {
									type: 'array',
									items: {
										type: 'object',
										additionalProperties: false,
										properties: {
											issue_id: { type: 'string' },
											from: { type: 'string' },
											to: { type: 'string' },
											reason: { type: 'string' }
										},
										required: ['issue_id', 'from', 'to', 'reason']
									}
								},
								notify_others: {
									type: 'array',
									items: {
										type: 'object',
										additionalProperties: false,
										properties: {
											issue_id: { type: ['string', 'null'] },
											target_user_id: { type: 'string' },
											channel: { type: 'string', enum: ['checkin'] },
											reason: { type: 'string' },
											payload: { type: 'string' }
										},
										required: ['issue_id', 'target_user_id', 'channel', 'reason', 'payload']
									}
								},

								update_moods: {
									type: 'array',
									items: {
										type: 'object',
										additionalProperties: false,
										properties: {
											mood_score: { type: ['number', 'null'] },
											mood_confidence: { type: ['number', 'null'] },
											reason: { type: ['string', 'null'] }
										},
										required: ['mood_score', 'mood_confidence', 'reason']
									}
								}
							},
							required: [
								'reply',
								'create_issues',
								'update_issues',
								'stage_changes',
								'notify_others',
								'update_moods'
							]
						}
					}
				},
				messages: [
					{ role: 'system', content: 'Respond strictly with JSON that matches the schema.' },
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
						create_issues?: Array<{
							title: string;
							context: string | null;
							severity: 'low' | 'med' | 'high';
							stage: 'clarification' | 'surface' | 'resolved';
							set_active: boolean;
						}>;
						update_issues?: Array<{
							issue_id: string;
							title: string | null;
							context: string | null;
							severity: 'low' | 'med' | 'high' | null;
							stage: 'clarification' | 'surface' | 'resolved' | null;
							set_active: boolean | null;
						}>;
						stage_changes?: Array<{ issue_id: string; from: string; to: string; reason: string }>;
						notify_others?: Array<{
							issue_id: string | null;
							target_user_id: string;
							channel: 'checkin';
							reason: string;
							payload: string;
						}>;
						update_moods?: Array<{
							mood_score: number | null;
							mood_confidence: number | null;
							reason: string | null;
						}>;
					};
					if (parsed.reply) {
						replyText = parsed.reply;
					}
					const nextActions: Action[] = [];
					(parsed.create_issues ?? []).forEach((item) => {
						nextActions.push({
							type: 'create_issue',
							title: item.title,
							context: item.context,
							severity: item.severity,
							stage: item.stage,
							set_active: item.set_active
						});
					});
					(parsed.update_issues ?? []).forEach((item) => {
						nextActions.push({
							type: 'update_issue',
							issue_id: item.issue_id,
							title: item.title ?? undefined,
							context: item.context ?? undefined,
							severity: item.severity ?? undefined,
							stage: item.stage ?? undefined,
							set_active: item.set_active ?? undefined
						});
					});
					(parsed.stage_changes ?? []).forEach((item) => {
						nextActions.push({
							type: 'stage_change',
							issue_id: item.issue_id,
							from: item.from,
							to: item.to,
							reason: item.reason
						});
					});
					(parsed.notify_others ?? []).forEach((item) => {
						nextActions.push({
							type: 'notify_other',
							issue_id: item.issue_id,
							target_user_id: item.target_user_id,
							channel: item.channel,
							reason: item.reason,
							payload: item.payload
						});
					});
					(parsed.update_moods ?? []).forEach((item) => {
						nextActions.push({
							type: 'update_mood',
							mood_score: item.mood_score,
							mood_confidence: item.mood_confidence,
							reason: item.reason ?? undefined
						});
					});
					actions = nextActions;
				} catch (error) {
					// fall back to defaults
				}
			}
		} else {
			const errorText = await openAiResponse.text();
			responseMeta = { ...responseMeta, error: errorText };
			responseRaw = errorText;
			console.error('OpenAI error:', openAiResponse.status, errorText);
		}
	}

	const actionSummaries: string[] = [];
	const loggedActions: Action[] = [];
	let issueResult = null as Record<string, unknown> | null;

	for (const action of actions) {
		if (action.type === 'create_issue') {
			if (!action.title) continue;
			if (action.set_active) {
				await supabase.from('issues').update({ active: false }).eq('active', true);
			}
			const { data } = await supabase
				.from('issues')
				.insert({
					created_by_user_id: userId,
					title: action.title,
					context: action.context,
					stage: action.stage ?? 'clarification',
					severity: action.severity ?? 'med',
					active: action.set_active ?? false
				})
				.select()
				.single();
			issueResult = data ?? null;
			loggedActions.push({ ...action, issue_id: data?.id ?? action.issue_id ?? null });
			actionSummaries.push('created issue');
			continue;
		}

		if (action.type === 'update_issue') {
			const targetIssueId = action.issue_id ?? (activeIssue as { id?: string } | null)?.id ?? null;
			if (!targetIssueId) continue;
			const updatePayload: Record<string, unknown> = {};
			if (action.title) updatePayload.title = action.title;
			if (action.context) updatePayload.context = action.context;
			if (action.severity) updatePayload.severity = action.severity;
			if (action.set_active) updatePayload.active = true;

			if (action.set_active) {
				await supabase.from('issues').update({ active: false }).eq('active', true);
			}

			if (Object.keys(updatePayload).length > 0) {
				const { data } = await supabase
					.from('issues')
					.update(updatePayload)
					.eq('id', targetIssueId)
					.select()
					.single();
				issueResult = data ?? null;
				loggedActions.push({ ...action, issue_id: targetIssueId });
				actionSummaries.push('update issue');
			}
			continue;
		}

		if (action.type === 'stage_change') {
			if (!action.issue_id || !action.to) continue;
			const { data } = await supabase
				.from('issues')
				.update({ stage: action.to })
				.eq('id', action.issue_id)
				.select()
				.single();
			issueResult = data ?? issueResult;
			loggedActions.push(action);
			actionSummaries.push(`stage: ${action.from ?? '?'} → ${action.to}`);
			continue;
		}

		if (action.type === 'notify_other') {
			if (!action.target_user_id) continue;
			const { data: targetProfile } = await supabase
				.from('profiles')
				.select('id, mood_score')
				.eq('id', action.target_user_id)
				.single();

			const moodScore = targetProfile?.mood_score ?? 0;
			const sendNow = moodScore >= 0.6;
			const payload = action.payload ?? 'Quick check-in: how are you feeling today?';
			const reason = action.reason ?? 'checkin';
			const scheduledFor = sendNow
				? new Date().toISOString()
				: new Date(Date.now() + 60 * 60 * 1000).toISOString();

			const { error: checkinError } = await supabase.from('checkins').insert({
				target_user_id: action.target_user_id,
				issue_id: action.issue_id,
				channel: 'checkin',
				payload,
				reason,
				scheduled_for: scheduledFor,
				sent_at: sendNow ? new Date().toISOString() : null
			});
			if (checkinError) {
				console.error('Checkin insert error:', checkinError.message);
			}

			loggedActions.push({ ...action, channel: 'checkin' });
			actionSummaries.push('checkin queued');
			continue;
		}

		if (action.type === 'update_mood') {
			const moodPayload: Record<string, unknown> = {};
			if (action.mood_score !== undefined) moodPayload.mood_score = action.mood_score;
			if (action.mood_confidence !== undefined)
				moodPayload.mood_confidence = action.mood_confidence;

			if (Object.keys(moodPayload).length > 0) {
				await supabase.from('profiles').update(moodPayload).eq('id', userId);
				loggedActions.push(action);
				actionSummaries.push('update mood');
			}
			continue;
		}
	}

	const { data: aiMessage } = await supabase
		.from('chat_messages')
		.insert({
			session_id: sessionId,
			sender_type: 'ai',
			content: replyText,
			message_type: 'response'
		})
		.select()
		.single();

	const logAction = (() => {
		if (actionSummaries.length === 0) return 'response only';
		if (actionSummaries.length === 1 && actionSummaries[0].includes('issue')) {
			return `${actionSummaries[0]} + response`;
		}
		return `${actionSummaries.join(' | ')} | response`;
	})();

	await supabase.from('logs').insert({
		user_id: userId,
		reason: 'assistant_response',
		action: logAction,
		actions: loggedActions.length > 0 ? loggedActions : null,
		response_raw: responseRaw,
		response_meta: responseMeta
	});

	return json({ reply: aiMessage, issue: issueResult });
};

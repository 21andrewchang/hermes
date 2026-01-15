import { json } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { fileMap, readJson, writeJson } from '$lib/server/storage';

type ConversationTopic = {
	id: string;
	created_by_user_id: string;
	title: string;
	stage: string;
	blame: number;
	split_confidence_internal: number;
	severity: string;
	evidence_json: Record<string, unknown> | null;
	latest_summary: string | null;
	blocked_by_mood: boolean;
	blocked_reason: string | null;
	next_checkin_at: string | null;
	last_surfaced_at: string | null;
	created_at: string;
	updated_at: string;
};

const seedTopics: ConversationTopic[] = [];

export const GET = async () => {
	const topics = await readJson<ConversationTopic[]>(fileMap.conversationTopics, seedTopics);
	return json(topics);
};

export const POST = async ({ request }) => {
	const body = (await request.json()) as Partial<ConversationTopic>;
	if (!body.created_by_user_id) {
		return json({ error: 'created_by_user_id is required.' }, { status: 400 });
	}

	const topics = await readJson<ConversationTopic[]>(fileMap.conversationTopics, seedTopics);
	const now = new Date().toISOString();
	const topic: ConversationTopic = {
		id: randomUUID(),
		created_by_user_id: body.created_by_user_id,
		title: body.title ?? 'New topic',
		stage: body.stage ?? 'detected',
		blame: body.blame ?? 50,
		split_confidence_internal: body.split_confidence_internal ?? 0,
		severity: body.severity ?? 'low',
		evidence_json: body.evidence_json ?? null,
		latest_summary: body.latest_summary ?? null,
		blocked_by_mood: body.blocked_by_mood ?? false,
		blocked_reason: body.blocked_reason ?? null,
		next_checkin_at: body.next_checkin_at ?? null,
		last_surfaced_at: body.last_surfaced_at ?? null,
		created_at: now,
		updated_at: now
	};
	topics.push(topic);
	await writeJson(fileMap.conversationTopics, topics);
	return json(topic);
};

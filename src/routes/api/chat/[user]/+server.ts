import { json } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { fileMap, readJson, writeJson } from '$lib/server/storage';

type ChatMessage = {
	id: string;
	sender_id: string;
	sender_type: 'user' | 'ai';
	content: string;
	timestamp: string;
};

const seedMessage = (name: string): ChatMessage[] => [
	{
		id: randomUUID(),
		sender_id: 'hermes',
		sender_type: 'ai',
		content: `Hi ${name}. Dump anything on your mind. No pressure to solve it.`,
		timestamp: new Date().toISOString()
	}
];

const resolveFile = (user: string) => {
	if (user === 'andrew') return fileMap.chatAndrew;
	if (user === 'nico') return fileMap.chatNico;
	return null;
};

export const GET = async ({ params }) => {
	const file = resolveFile(params.user);
	if (!file) {
		return json({ error: 'Unknown user.' }, { status: 400 });
	}
	const fallback = params.user === 'andrew' ? seedMessage('Andrew') : seedMessage('Nico');
	const messages = await readJson<ChatMessage[]>(file, fallback);
	return json(messages);
};

export const POST = async ({ params, request }) => {
	const file = resolveFile(params.user);
	if (!file) {
		return json({ error: 'Unknown user.' }, { status: 400 });
	}

	const body = (await request.json()) as { content?: string };
	const content = body.content?.trim();
	if (!content) {
		return json({ error: 'Message content required.' }, { status: 400 });
	}

	const messages = await readJson<ChatMessage[]>(
		file,
		params.user === 'andrew' ? seedMessage('Andrew') : seedMessage('Nico')
	);
	const message: ChatMessage = {
		id: randomUUID(),
		sender_id: params.user,
		sender_type: 'user',
		content,
		timestamp: new Date().toISOString()
	};
	messages.push(message);
	await writeJson(file, messages);
	return json(message);
};

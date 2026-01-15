import { promises as fs } from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');

const ensureDir = async () => {
	await fs.mkdir(dataDir, { recursive: true });
};

export const readJson = async <T>(filename: string, fallback: T): Promise<T> => {
	await ensureDir();
	const filePath = path.join(dataDir, filename);
	try {
		const raw = await fs.readFile(filePath, 'utf-8');
		return JSON.parse(raw) as T;
	} catch (error) {
		await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
		return fallback;
	}
};

export const writeJson = async <T>(filename: string, data: T) => {
	await ensureDir();
	const filePath = path.join(dataDir, filename);
	await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

export const fileMap = {
	profiles: 'profiles.json',
	chatAndrew: 'chat_andrew.json',
	chatNico: 'chat_nico.json',
	conversationTopics: 'conversation_topics.json'
};

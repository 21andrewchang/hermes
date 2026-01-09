import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabase';
import type { IssueRow } from '$lib/types/issues';

interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	created_at: string;
}

interface LoadData {
	issues: IssueRow[];
	chatSessionId: string | null;
	chatMessages: ChatMessage[];
}

async function getOrCreateSession(): Promise<string> {
	const { data, error } = await supabase
		.from('chat_sessions')
		.select('id')
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();

	if (error && error.code !== 'PGRST116') {
		throw new Error(`Failed to fetch chat session: ${error.message}`);
	}

	if (data?.id) return data.id;

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

export const load: PageServerLoad<LoadData> = async () => {
	const issuesPromise = supabase
		.from('issues')
		.select('id, reported_at, building, unit, description, action, status, is_draft')
		.order('reported_at', { ascending: false });

	const sessionId = await getOrCreateSession();

	const messagesPromise = supabase
		.from('chat_messages')
		.select('id, role, content, created_at')
		.eq('session_id', sessionId)
		.in('role', ['user', 'assistant'])
		.order('created_at', { ascending: true });

	const [{ data: issues, error: issuesError }, { data: messages, error: messagesError }] =
		await Promise.all([issuesPromise, messagesPromise]);

	if (issuesError) {
		console.error('Failed to load issues from Supabase:', issuesError);
	}

	if (messagesError) {
		console.error('Failed to load chat messages:', messagesError);
	}

	return {
		issues: issues ?? [],
		chatSessionId: sessionId,
		chatMessages: (messages ?? []) as ChatMessage[]
	};
};

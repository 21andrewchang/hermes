import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

export const POST: RequestHandler = async () => {
	const errors: string[] = [];

	const deleteAll = async (table: string) => {
		const { error } = await supabase
			.from(table)
			.delete()
			.neq('id', '00000000-0000-0000-0000-000000000000');
		if (error) errors.push(`${table}: ${error.message}`);
	};

	await deleteAll('chat_messages');
	await deleteAll('issues');
	await deleteAll('logs');
	await deleteAll('chat_sessions');

	const { error: profileError } = await supabase
		.from('profiles')
		.update({ mood_score: null, mood_confidence: null })
		.neq('id', '00000000-0000-0000-0000-000000000000');
	if (profileError) errors.push(`profiles: ${profileError.message}`);

	if (errors.length > 0) {
		return json({ ok: false, errors }, { status: 500 });
	}

	return json({ ok: true });
};

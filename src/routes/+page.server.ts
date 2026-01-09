import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabase';
import type { IssueRow } from '$lib/types/issues';

export const load: PageServerLoad<{ issues: IssueRow[] }> = async () => {
	const { data, error } = await supabase
		.from('issues')
		.select(
			'id, reported_at, building, unit, description, action, status, is_draft'
		)
		.order('reported_at', { ascending: false });

	if (error) {
		console.error('Failed to load issues from Supabase:', error);
		return { issues: [] };
	}

	return { issues: data ?? [] };
};

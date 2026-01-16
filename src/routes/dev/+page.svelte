<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';

	type Profile = {
		id: string;
		email: string | null;
		name: string | null;
		mood_score: number | null;
		mood_confidence: number | null;
	};

	type Issue = {
		id: string;
		created_by_user_id: string | null;
		title: string;
		stage: string | null;
		severity: string | null;
		active: boolean;
		created_at: string;
	};

	type LogEntry = {
		id: string;
		user_id: string | null;
		reason: string | null;
		action: string | null;
		created_at: string;
	};

	let profiles = $state<Profile[]>([]);
	let issues = $state<Issue[]>([]);
	let logs = $state<LogEntry[]>([]);
	let errorMessage = $state<string | null>(null);

	const loadData = async () => {
		const { data: sessionData } = await supabase.auth.getSession();
		if (!sessionData.session) {
			goto('/');
			return;
		}

		const [profilesResult, issuesResult, logsResult] = await Promise.all([
			supabase.from('profiles').select('*').order('created_at', { ascending: true }),
			supabase.from('issues').select('*').order('created_at', { ascending: false }),
			supabase.from('logs').select('*').order('created_at', { ascending: false })
		]);

		if (profilesResult.error || issuesResult.error || logsResult.error) {
			errorMessage =
				profilesResult.error?.message ||
				issuesResult.error?.message ||
				logsResult.error?.message ||
				'Failed to load dev data.';
			return;
		}

		profiles = (profilesResult.data ?? []) as Profile[];
		issues = (issuesResult.data ?? []) as Issue[];
		logs = (logsResult.data ?? []) as LogEntry[];
	};

	onMount(loadData);
</script>

<main class="min-h-screen bg-white px-6 py-10 text-stone-900">
	<div class="mx-auto w-full max-w-6xl space-y-10">
		<header class="space-y-2">
			<p class="text-xs uppercase tracking-[0.3em] text-stone-500">Hermes Dev</p>
			<h1 class="text-2xl font-semibold">Supabase snapshot</h1>
		</header>

		{#if errorMessage}
			<p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
				{errorMessage}
			</p>
		{/if}

		<section class="space-y-3">
			<h2 class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Profiles</h2>
			<div class="overflow-x-auto rounded-2xl border border-stone-200">
				<table class="min-w-full border-collapse text-left text-xs text-stone-700">
					<thead class="bg-stone-50 text-[11px] uppercase tracking-[0.2em] text-stone-500">
						<tr>
							<th class="border-b border-stone-200 px-4 py-3">Name</th>
							<th class="border-b border-stone-200 px-4 py-3">Email</th>
							<th class="border-b border-stone-200 px-4 py-3">Mood</th>
							<th class="border-b border-stone-200 px-4 py-3">Confidence</th>
						</tr>
					</thead>
					<tbody>
						{#each profiles as profile (profile.id)}
							<tr class="odd:bg-white even:bg-stone-50">
								<td class="border-b border-stone-100 px-4 py-3">
									{profile.name ?? '-'}
								</td>
								<td class="border-b border-stone-100 px-4 py-3">
									{profile.email ?? '-'}
								</td>
								<td class="border-b border-stone-100 px-4 py-3">
									{profile.mood_score ?? '-'}
								</td>
								<td class="border-b border-stone-100 px-4 py-3">
									{profile.mood_confidence ?? '-'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="space-y-3">
			<h2 class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Issues</h2>
			<div class="overflow-x-auto rounded-2xl border border-stone-200">
				<table class="min-w-full border-collapse text-left text-xs text-stone-700">
					<thead class="bg-stone-50 text-[11px] uppercase tracking-[0.2em] text-stone-500">
						<tr>
							<th class="border-b border-stone-200 px-4 py-3">Title</th>
							<th class="border-b border-stone-200 px-4 py-3">Stage</th>
							<th class="border-b border-stone-200 px-4 py-3">Severity</th>
							<th class="border-b border-stone-200 px-4 py-3">Active</th>
							<th class="border-b border-stone-200 px-4 py-3">Created By</th>
						</tr>
					</thead>
					<tbody>
						{#each issues as issue (issue.id)}
							<tr class="odd:bg-white even:bg-stone-50">
								<td class="border-b border-stone-100 px-4 py-3">{issue.title}</td>
								<td class="border-b border-stone-100 px-4 py-3">{issue.stage ?? '-'}</td>
								<td class="border-b border-stone-100 px-4 py-3">{issue.severity ?? '-'}</td>
								<td class="border-b border-stone-100 px-4 py-3">{issue.active ? 'Yes' : 'No'}</td>
								<td class="border-b border-stone-100 px-4 py-3">
									{issue.created_by_user_id ?? '-'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="space-y-3">
			<h2 class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Logs</h2>
			<div class="overflow-x-auto rounded-2xl border border-stone-200">
				<table class="min-w-full border-collapse text-left text-xs text-stone-700">
					<thead class="bg-stone-50 text-[11px] uppercase tracking-[0.2em] text-stone-500">
						<tr>
							<th class="border-b border-stone-200 px-4 py-3">User</th>
							<th class="border-b border-stone-200 px-4 py-3">Reason</th>
							<th class="border-b border-stone-200 px-4 py-3">Action</th>
							<th class="border-b border-stone-200 px-4 py-3">Created</th>
						</tr>
					</thead>
					<tbody>
						{#each logs as log (log.id)}
							<tr class="odd:bg-white even:bg-stone-50">
								<td class="border-b border-stone-100 px-4 py-3">{log.user_id ?? '-'}</td>
								<td class="border-b border-stone-100 px-4 py-3">{log.reason ?? '-'}</td>
								<td class="border-b border-stone-100 px-4 py-3">{log.action ?? '-'}</td>
								<td class="border-b border-stone-100 px-4 py-3">
									{new Date(log.created_at).toLocaleString()}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	</div>
</main>

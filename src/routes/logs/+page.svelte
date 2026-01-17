<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';

	type Profile = {
		id: string;
		name: string | null;
		email: string | null;
		mood_score: number | null;
		mood_confidence: number | null;
	};

	type Issue = {
		id: string;
		created_by_user_id: string | null;
		title: string;
		context: string | null;
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
		actions: Record<string, unknown>[] | null;
		created_at: string;
	};

	type Checkin = {
		id: string;
		target_user_id: string;
		issue_id: string | null;
		channel: string;
		payload: string | null;
		reason: string | null;
		scheduled_for: string | null;
		sent_at: string | null;
		created_at: string;
	};

	type ChatMessage = {
		id: string;
		session_id: string;
		sender_type: string;
		message_type: string | null;
		content: string;
		created_at: string;
	};

	let profiles = $state<Profile[]>([]);
	let issues = $state<Issue[]>([]);
	let logs = $state<LogEntry[]>([]);
	let checkins = $state<Checkin[]>([]);
	let messages = $state<ChatMessage[]>([]);
	let errorMessage = $state<string | null>(null);
	let copyMessage = $state<string | null>(null);

	const loadData = async () => {
		const [profilesResult, issuesResult, logsResult, checkinsResult, messagesResult] =
			await Promise.all([
				supabase.from('profiles').select('*').order('created_at', { ascending: true }),
				supabase.from('issues').select('*').order('created_at', { ascending: false }),
				supabase
					.from('logs')
					.select('id, user_id, reason, action, actions, created_at')
					.order('created_at', { ascending: false }),
				supabase.from('checkins').select('*').order('created_at', { ascending: false }),
				supabase.from('chat_messages').select('*').order('created_at', { ascending: false })
			]);

		if (
			profilesResult.error ||
			issuesResult.error ||
			logsResult.error ||
			checkinsResult.error ||
			messagesResult.error
		) {
			errorMessage =
				profilesResult.error?.message ||
				issuesResult.error?.message ||
				logsResult.error?.message ||
				checkinsResult.error?.message ||
				messagesResult.error?.message ||
				'Failed to load logs.';
			return;
		}

		profiles = (profilesResult.data ?? []) as Profile[];
		issues = (issuesResult.data ?? []) as Issue[];
		logs = (logsResult.data ?? []) as LogEntry[];
		checkins = (checkinsResult.data ?? []) as Checkin[];
		messages = (messagesResult.data ?? []) as ChatMessage[];
	};

	const formatSection = (label: string, rows: unknown[]) => {
		return `${label}:\n${rows.map((row) => JSON.stringify(row)).join('\n')}`;
	};

	const formatPst = (value: string | null) => {
		if (!value) return '-';
		const date = new Date(value);
		return date.toLocaleString('en-US', {
			timeZone: 'America/Los_Angeles',
			year: 'numeric',
			month: 'short',
			day: '2-digit',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			weekday: 'short'
		});
	};

	const copyLogs = async () => {
		const text = [
			formatSection('profiles', profiles),
			formatSection('issues', issues),
			formatSection('checkins', checkins),
			formatSection('logs', logs),
			formatSection('messages', messages)
		].join('\n\n');

		await navigator.clipboard.writeText(text);
		copyMessage = 'Copied.';
		setTimeout(() => {
			copyMessage = null;
		}, 1500);
	};

	onMount(loadData);
</script>

<main class="min-h-screen bg-white px-6 py-10 text-stone-900">
	<div class="mx-auto w-full max-w-6xl space-y-10">
		<header class="flex flex-wrap items-center justify-between gap-4">
			<div class="space-y-2">
				<p class="text-xs uppercase tracking-[0.3em] text-stone-500">Hermes Logs</p>
				<h1 class="text-2xl font-semibold">Dev logs</h1>
			</div>
			<div class="flex items-center gap-3">
				<button
					type="button"
					class="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-700"
					on:click={copyLogs}
				>
					Copy logs
				</button>
				<button
					type="button"
					class="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-700"
					on:click={() => goto('/dev')}
				>
					Switch user
				</button>
			</div>
		</header>

		{#if copyMessage}
			<p class="text-xs text-stone-500">{copyMessage}</p>
		{/if}

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
								<td class="border-b border-stone-100 px-4 py-3">{profile.name ?? '-'}</td>
								<td class="border-b border-stone-100 px-4 py-3">{profile.email ?? '-'}</td>
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
								<td class="border-b border-stone-100 px-4 py-3"
									>{issue.created_by_user_id ?? '-'}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="space-y-3">
			<h2 class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Checkins</h2>
			<div class="overflow-x-auto rounded-2xl border border-stone-200">
				<table class="min-w-full border-collapse text-left text-xs text-stone-700">
					<thead class="bg-stone-50 text-[11px] uppercase tracking-[0.2em] text-stone-500">
						<tr>
							<th class="border-b border-stone-200 px-4 py-3">Target</th>
							<th class="border-b border-stone-200 px-4 py-3">Payload</th>
							<th class="border-b border-stone-200 px-4 py-3">Reason</th>
							<th class="border-b border-stone-200 px-4 py-3">Scheduled</th>
							<th class="border-b border-stone-200 px-4 py-3">Sent</th>
						</tr>
					</thead>
					<tbody>
						{#each checkins as checkin (checkin.id)}
							<tr class="odd:bg-white even:bg-stone-50">
								<td class="border-b border-stone-100 px-4 py-3">{checkin.target_user_id}</td>
								<td class="border-b border-stone-100 px-4 py-3">{checkin.payload ?? '-'}</td>
								<td class="border-b border-stone-100 px-4 py-3">{checkin.reason ?? '-'}</td>
								<td class="border-b border-stone-100 px-4 py-3">
									{formatPst(checkin.scheduled_for)}
								</td>
								<td class="border-b border-stone-100 px-4 py-3">
									{formatPst(checkin.sent_at)}
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

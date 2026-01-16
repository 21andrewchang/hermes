<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';

	let email = $state('');
	let password = $state('');
	let errorMessage = $state<string | null>(null);
	let isLoading = $state(false);

	onMount(async () => {
		const { data } = await supabase.auth.getSession();
		if (data.session) {
			goto('/chat');
		}
	});

	const handleAuth = async () => {
		errorMessage = null;
		isLoading = true;

		const signInResult = await supabase.auth.signInWithPassword({ email, password });
		if (!signInResult.error) {
			goto('/chat');
			return;
		} else {
			console.log(signInResult.error);
		}

		const signUpResult = await supabase.auth.signUp({ email, password });
		if (signUpResult.error) {
			if (signUpResult.error.message.toLowerCase().includes('user already registered')) {
				errorMessage = signInResult.error.message;
			} else {
				errorMessage = signUpResult.error.message;
			}
			isLoading = false;
			return;
		}

		goto('/chat');
	};
</script>

<main class="min-h-screen bg-white text-stone-900">
	<div class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
		<header class="mb-10 space-y-2 text-center">
			<p class="text-xs uppercase tracking-[0.3em] text-stone-500">Hermes</p>
			<h1 class="text-3xl font-semibold">Welcome back</h1>
			<p class="text-sm text-stone-500">Sign in with your email and password.</p>
		</header>

		<form class="space-y-4" on:submit|preventDefault={handleAuth}>
			<div class="space-y-2">
				<label class="text-xs uppercase tracking-[0.2em] text-stone-500" for="email">Email</label>
				<input
					id="email"
					type="email"
					required
					class="h-11 w-full rounded-md border border-stone-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
					bind:value={email}
					placeholder="you@company.com"
				/>
			</div>

			<div class="space-y-2">
				<label class="text-xs uppercase tracking-[0.2em] text-stone-500" for="password"
					>Password</label
				>
				<input
					id="password"
					type="password"
					required
					class="h-11 w-full rounded-md border border-stone-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
					bind:value={password}
					placeholder="••••••••"
				/>
			</div>

			{#if errorMessage}
				<p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
					{errorMessage}
				</p>
			{/if}

			<button
				type="submit"
				disabled={isLoading}
				class="flex h-11 w-full items-center justify-center rounded-md bg-black text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
			>
				{isLoading ? 'Signing in...' : 'Sign in'}
			</button>
		</form>
	</div>
</main>

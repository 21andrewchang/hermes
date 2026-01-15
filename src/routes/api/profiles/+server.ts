import { json } from '@sveltejs/kit';
import { fileMap, readJson } from '$lib/server/storage';

type Profile = {
	id: string;
	name: string;
	role: 'a' | 'b';
};

const seedProfiles: Profile[] = [
	{ id: 'andrew', name: 'Andrew', role: 'a' },
	{ id: 'nico', name: 'Nico', role: 'b' }
];

export const GET = async () => {
	const profiles = await readJson<Profile[]>(fileMap.profiles, seedProfiles);
	return json(profiles);
};

import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

if (!OPENAI_API_KEY) {
	throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
});

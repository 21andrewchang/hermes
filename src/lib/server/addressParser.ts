import { addressParse } from '@zerodep/address-parse';

interface ParsedAddress {
	streetAddress: string | null; // "1038 S Mariposa Ave"
	unit: string | null; // "501"
	city: string | null; // "LA" or "Los Angeles"
	state: string | null;
	zip: string | null;
}

// Regex patterns for unit extraction (fallback)
const UNIT_PATTERNS = [
	/\b(?:unit|apt|apartment|suite|ste|#)\s*[#.]?\s*(\w+)/i,
	/\n\s*(?:unit|apt|apartment|suite|ste|#)\s*[#.]?\s*(\w+)/i,
	/\n\s*(\d+[a-z]?)\s*$/i // Just a number on its own line
];

export function parseReceiverAddress(address: string): ParsedAddress {
	// Normalize: replace carriage returns with spaces for library parsing
	const normalized = address.replace(/[\r\n]+/g, ' ').trim();

	// Try library parsing first
	const parsed = addressParse(normalized);

	console.log('Parsed addr raw: ', parsed);

	let unit: string | null = null;

	// Extract unit from library result
	if (parsed.secondary) {
		// Library found a secondary unit
		unit = parsed.secondary.replace(/^(unit|apt|apartment|suite|ste|#)\s*/i, '').trim();
	}

	// Fallback: regex extraction from original address (preserves line breaks)
	if (!unit) {
		for (const pattern of UNIT_PATTERNS) {
			const match = address.match(pattern);
			if (match && match[1]) {
				unit = match[1].trim();
				break;
			}
		}
	}

	// Use street address from parsed result
	const streetAddress = parsed.street || null;

	return {
		streetAddress,
		unit,
		city: parsed.city || null,
		state: parsed.stateAbbr || null,
		zip: parsed.zip || null
	};
}

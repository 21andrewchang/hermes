<script lang="ts">
	import type { PageData } from './$types';
	import { supabase } from '$lib/supabase';
	import type { IssueRow } from '$lib/types/issues';

	type Tab =
		| 'inbox'
		| 'mariposa'
		| 'willoughby'
		| 'stanford'
		| 'sycamore'
		| 'pickford'
		| '18th'
		| '17th';
	type BuildingTab = Exclude<Tab, 'inbox'>;

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'inbox', label: 'Inbox' },
		{ id: 'mariposa', label: 'Mariposa' },
		{ id: 'willoughby', label: 'Willoughby' },
		{ id: 'stanford', label: 'Stanford' },
		{ id: 'sycamore', label: 'Sycamore' },
		{ id: 'pickford', label: 'Pickford' },
		{ id: '18th', label: '18th' },
		{ id: '17th', label: '17th' }
	];

	const tabLabels: Record<Tab, string> = tabs.reduce(
		(acc, tab) => {
			acc[tab.id] = tab.label;
			return acc;
		},
		{} as Record<Tab, string>
	);

	let activeTab = $state<Tab>('inbox');
	const props = $props<{ data: PageData }>();

	interface TableEntry {
		id: string;
		time: string;
		reportedAt: string;
		building: string;
		unit: string;
		description: string;
		action: string;
		status: 'Approval' | 'Review' | 'Pending' | 'In Progress' | 'Complete';
		isDraft?: boolean;
		unitFilter?: string;
	}

	const statusOptions: TableEntry['status'][] = [
		'Approval',
		'Review',
		'Pending',
		'In Progress',
		'Complete'
	];
	const buildingOptions = tabs.filter((tab) => tab.id !== 'inbox');
	interface TenantRecord {
		unit: string;
		tenants: string[];
		phones: string[];
		emails: string[];
		outstandingBalance: number | null;
	}

	interface BuildingProfile {
		name: string;
		address: string;
		description: string;
		records: TenantRecord[];
	}
	const buildingUnits: Record<string, string[]> = {
		Mariposa: [
			'101',
			'201',
			'202',
			'203',
			'204',
			'205',
			'206',
			'207',
			'301',
			'302',
			'303',
			'304',
			'305',
			'306',
			'307',
			'308',
			'401',
			'402',
			'403',
			'404',
			'405',
			'406',
			'407',
			'408',
			'501',
			'502',
			'503',
			'504',
			'505',
			'506',
			'507',
			'508'
		],
		Willoughby: ['1', '2', '3', '4', '5', '6', '7'],
		Stanford: ['1', '2', '3', '4', '5', '6'],
		Sycamore: ['836', '836 1/2', '838', '838 1/2'],
		Pickford: ['4637', '4637 1/2', '4639', '4639 1/2'],
		'18th': ['1', '2', '3', '4'],
		'17th': ['4723', '4725']
	};
	type EditableField = 'building' | 'unit' | 'description' | 'action';

	interface ChatMessage {
		id: string;
		role: 'user' | 'assistant';
		content: string;
		isPending?: boolean;
	}

const mariposaRecords: TenantRecord[] = [
		{
			unit: '101',
			tenants: ['James Lim'],
			phones: ['(213) 249-5473'],
			emails: ['jameslim082762@gmail.com'],
			outstandingBalance: 2431.45
		},
		{
			unit: '201',
			tenants: ['Jonghui Kim', 'Sulim Ji'],
			phones: [],
			emails: ['whdgnl4615@gmail.com', 'wltnwkzzz@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '202',
			tenants: ['Hwan Joon Huh', 'Ye Jin Lee'],
			phones: ['(213) 841-3328', '(213) 700-1250'],
			emails: ['dleft81@yahoo.com', 'djhuh10941@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '203',
			tenants: ['Kyungmin Lee', 'Minjung Park'],
			phones: [],
			emails: ['mylovelullu0317@gmail.com', 'pmjmj960902@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '204',
			tenants: ['Rhayme Spencer', 'Ronnelle Copes'],
			phones: ['(321) 482-2757', '(720) 975-6425'],
			emails: ['rhaymespencer@gmail.com', 'ronnelleacopes@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '205',
			tenants: ['Moonsool Park', 'Shenhwa Hong'],
			phones: ['(213) 454-9048', '(213) 454-9048'],
			emails: ['mrtjpark@gmail.com'],
			outstandingBalance: 4753.77
		},
		{
			unit: '206',
			tenants: ['Yareli Morales', 'Jacob Kwasiborski'],
			phones: ['(619) 410-7482', '(630) 989-0812'],
			emails: ['yarelimorales@gmail.com', 'jakekwas@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '207',
			tenants: ['Jung Sun Yoon', 'Seo-Yeon An', 'Yongmi An'],
			phones: [],
			emails: ['yoonjungsun31@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '301',
			tenants: ['Jiah Kim', 'Jino Kim', 'Meung Si Ji'],
			phones: ['(213) 377-4222', '(213) 215-8336', '(213) 235-8191'],
			emails: ['topniveau.jiah@gmail.com', 'zino0802@gmail.com', 'order@msjtrim.com'],
			outstandingBalance: null
		},
		{
			unit: '302',
			tenants: ['Catherine Pham', 'Ryan Feng', 'Xin Chen'],
			phones: ['(408) 230-0592'],
			emails: ['pham.uyen.catherine@gmail.com', 'feng.ryanfeng@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '303',
			tenants: ['John Moon Ky Kim', 'Lisa Soo Hee Kim'],
			phones: ['(213) 392-1333'],
			emails: ['johnmkim878@gmail.com', 'powermom.min@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '304',
			tenants: ['Heesuk Kim', 'In Seon Na'],
			phones: ['(213) 399-0806'],
			emails: ['heesukkim78@gmail.com', 'supernain@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '305',
			tenants: ['Dennis Kuang', 'Chen Zheng'],
			phones: ['(917) 628-7603', '(415) 806-1618'],
			emails: ['tkuang25@gmail.com', 'chen.c.zheng86@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '306',
			tenants: ['Jinsun Choi', 'Kiwook Uhm'],
			phones: ['(213) 222-5666'],
			emails: ['black8182@gmail.com', 'uhmk@hotmail.com'],
			outstandingBalance: null
		},
		{
			unit: '307',
			tenants: ['Stacey Han', 'Paul Han'],
			phones: ['(847) 977-5474'],
			emails: ['staceyk1101@gmail.com', 'paul.i.han@gmail.com'],
			outstandingBalance: 5657.78
		},
		{
			unit: '308',
			tenants: ['Jongok Lee', 'Junga Yoo'],
			phones: ['(213) 700-0863'],
			emails: ['mylovelullu0317@gmail.com', 'livemylife2020@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '401',
			tenants: ['Jeffrey Kim', 'Joo Won Park'],
			phones: ['(310) 266-3022'],
			emails: ['danielajwpark@gmail.com'],
			outstandingBalance: 75
		},
		{
			unit: '402',
			tenants: ['Grace Choe', 'Alexandra Boyd'],
			phones: [],
			emails: ['gracedchoe@gmail.com', 'alexandrakayboyd@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '403',
			tenants: ['Alice Cage', 'Yong Kim'],
			phones: ['(213) 800-3159'],
			emails: ['kimc0422@gmail.com', 'pjeeyou@gmail.com'],
			outstandingBalance: 7519.75
		},
		{
			unit: '404',
			tenants: ['Albee Zhang', 'Winnie Liu', 'Melody Huang'],
			phones: ['(415) 671-9781', '(626) 620-5765'],
			emails: ['albee1008@gmail.com', 'winnieliu0@gmail.com', 'melody94128@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '405',
			tenants: ['Jake Kim', 'Sara Hansen'],
			phones: ['(213) 544-2025'],
			emails: ['jakeinwonderland@protonmail.com', 'sarahansen315@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '406',
			tenants: ['Sangmi Lee', 'Dong Min Bang'],
			phones: ['(213) 222-3533'],
			emails: ['model232@gmail.com', 'dongminbang@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '407',
			tenants: ['Yung Une Shin', 'Sang Kung Ham'],
			phones: ['(213) 985-8849'],
			emails: ['sharonyungshin@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '408',
			tenants: ['Sodam Park', 'Ian Park'],
			phones: ['(213) 779-3474'],
			emails: ['yoodam0418@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '501',
			tenants: ['Ted Kim'],
			phones: ['(213) 200-9485'],
			emails: ['tskim83tskim83@gmail.com'],
			outstandingBalance: 3648.45
		},
		{
			unit: '502',
			tenants: ['Vajra Hodges', 'Anita Hodges'],
			phones: ['(213) 447-4085', '(323) 687-3778'],
			emails: ['waldorf2k1@gmail.com', 'hodges.anita.b@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '503',
			tenants: ['Herbert Wei', 'Natasha Nguyen'],
			phones: ['(832) 366-3983'],
			emails: ['herbie.wei@gmail.com', 'natashadnguyen@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '504',
			tenants: ['Brittany Sheets'],
			phones: ['(310) 869-5461'],
			emails: ['brittanyalexandria@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '505',
			tenants: ['Taeyeong Jeong'],
			phones: [],
			emails: ['tedjeong8@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '506',
			tenants: ['Hyunjae Jung', 'Kye Han', 'John Jung'],
			phones: [],
			emails: ['ehrckato9109@gmail.com', 'han0908@gmail.com', 'hello@iller.studio'],
			outstandingBalance: null
		},
		{
			unit: '507',
			tenants: ['Michael Henderson', 'Lauren Parsons'],
			phones: ['(310) 254-0493', '(805) 895-0706'],
			emails: ['michaeljhenderson.comedy@gmail.com', 'lauren.m.parsons@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '508',
			tenants: ['Rickey Moody', 'Stephanie Vong'],
			phones: [],
			emails: ['rickey.moody@gmail.com', 'stephanievong55@gmail.com'],
			outstandingBalance: null
		}
	];

	type IssueRecord = IssueRow;

	function formatIssueTimestamp(value: string | null): string {
		if (!value) return '';
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return value;
		return formatTimestamp(parsed);
	}

	function issueToEntry(issue: IssueRecord): TableEntry {
		return {
			id: issue.id,
			reportedAt: issue.reported_at ?? new Date().toISOString(),
			time: formatIssueTimestamp(issue.reported_at),
			building: issue.building ?? '',
			unit: issue.unit ?? '',
			description: issue.description ?? '',
			action: issue.action ?? '',
			status: issue.status ?? 'Pending',
			isDraft: issue.is_draft ?? false
		};
	}

	function mapIssuesToEntries(issues: IssueRecord[]): TableEntry[] {
		return issues.map(issueToEntry);
	}

	const initialEntries: TableEntry[] = mapIssuesToEntries(props.data.issues ?? []);

	function upsertEntryFromIssue(issue: IssueRecord) {
		const entry = issueToEntry(issue);
		const index = entries.findIndex((item) => item.id === entry.id);
		if (index >= 0) {
			const updated = [...entries];
			updated[index] = { ...entry, unitFilter: entries[index].unitFilter };
			entries = sortEntries(updated);
		} else {
			entries = sortEntries([...entries, entry]);
		}
	}

const statusRank: Record<TableEntry['status'], number> = {
	Approval: 0,
	Review: 1,
	Pending: 2,
	'In Progress': 3,
	Complete: 4
};

	const willoughbyRecords: TenantRecord[] = [
		{
			unit: '1',
			tenants: ['Gleb Krivulin', 'John Lombardo'],
			phones: ['(323) 616-9635', '(323) 363-9087'],
			emails: ['glebby78@gmail.com', 'dushes2005@yahoo.com'],
			outstandingBalance: null
		},
		{
			unit: '2',
			tenants: ['Brandon Piper', 'Jamison Scala'],
			phones: ['(812) 457-6001', '(973) 903-1417'],
			emails: [],
			outstandingBalance: null
		},
		{
			unit: '3',
			tenants: ['Esi Impraim'],
			phones: ['(310) 866-9493'],
			emails: [],
			outstandingBalance: null
		},
		{
			unit: '4',
			tenants: ['Alexander Novak', 'Jessica Sanchez'],
			phones: ['(858) 353-3213'],
			emails: ['alexnovak776@gmail.com', 'sanchezj_11@yahoo.com'],
			outstandingBalance: null
		},
		{
			unit: '5',
			tenants: ['Marisa Truitt', 'Talia Pepe'],
			phones: [],
			emails: ['mtruitt@bu.edu', 'taliabella.co@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '6',
			tenants: [],
			phones: [],
			emails: [],
			outstandingBalance: null
		},
		{
			unit: '7',
			tenants: ['Codie Lavoie', 'Keepa Karmacharya'],
			phones: ['(672) 514-2382', '(672) 515-1617'],
			emails: [],
			outstandingBalance: null
		}
	];

	const stanfordRecords: TenantRecord[] = [
		{
			unit: '1',
			tenants: [],
			phones: [],
			emails: [],
			outstandingBalance: null
		},
		{
			unit: '2',
			tenants: ['Frank Pizzurro'],
			phones: ['(646) 286-4790'],
			emails: ['frankpnyc@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '3',
			tenants: ['Taylor Taxin'],
			phones: ['(516) 205-4345'],
			emails: ['taylorjtaxin@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '4',
			tenants: ['Michael Gaspar'],
			phones: ['(301) 704-6616'],
			emails: ['gpar89@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '5',
			tenants: ['Lauren Fisher'],
			phones: ['(917) 692-9411'],
			emails: ['laurenhealthcoach1@gmail.com'],
			outstandingBalance: null
		},
		{
			unit: '6',
			tenants: ['Adrian Swartz'],
			phones: ['(310) 748-6031'],
			emails: ['adrianetschwartz@gmail.com'],
			outstandingBalance: null
		}
	];

	const buildingProfiles: Record<BuildingTab, BuildingProfile> = {
		mariposa: {
			name: 'Mariposa',
			address: '1234 W Mariposa Ave, Los Angeles, CA 90006',
			description: 'Live ledger of tenants, contact info, and outstanding balances for Mariposa.',
			records: mariposaRecords
		},
		willoughby: {
			name: 'Willoughby',
			address: '200 Willoughby Blvd, Los Angeles, CA 90010',
			description: 'Tenant roster for Willoughby units with contact details and balances.',
			records: willoughbyRecords
		},
		stanford: {
			name: 'Stanford',
			address: '855 Stanford Dr, Los Angeles, CA 90036',
			description: 'Tenant roster for Stanford building with quick contacts for each unit.',
			records: stanfordRecords
		},
		sycamore: {
			name: 'Sycamore',
			address: '480 Sycamore Ave, Los Angeles, CA 90036',
			description: 'Tenant roster for Sycamore with quick contact and balance info.',
			records: [
				{
					unit: '836',
					tenants: ['Gabrielle Mazaltarim', 'Brianna Saavedra'],
					phones: ['(925) 413-9679', '(209) 576-5317'],
					emails: ['gabriellemazaltarim@gmail.com', 'briannasaavedra@gmail.com'],
					outstandingBalance: null
				},
				{
					unit: '836 1/2',
					tenants: ['Margaux Snell'],
					phones: [],
					emails: ['gomargaux@gmail.com'],
					outstandingBalance: null
				},
				{
					unit: '838',
					tenants: ['Tessa Lukosky'],
					phones: ['(360) 566-7201'],
					emails: ['tessa.lukosky@yahoo.com'],
					outstandingBalance: null
				},
				{
					unit: '838 1/2',
					tenants: ['Alexandria Hopper'],
					phones: ['(832) 689-6693'],
					emails: ['alexnhopper@gmail.com'],
					outstandingBalance: null
				}
			]
		},
		pickford: {
			name: 'Pickford',
			address: '1801 Pickford St, Los Angeles, CA 90035',
			description: 'Tenant roster for Pickford units with contact information.',
			records: [
				{
					unit: '4637',
					tenants: ['Patricia Jones'],
					phones: ['(323) 600-3219'],
					emails: [],
					outstandingBalance: null
				},
				{
					unit: '4637 1/2',
					tenants: ['Jade Watermiller', 'Andrew Trimbach'],
					phones: ['(972) 816-2667'],
					emails: ['andytrimbach@gmail.com'],
					outstandingBalance: null
				},
				{
					unit: '4639',
					tenants: ['Leslie Betancourth'],
					phones: [],
					emails: ['lesli872008@gmail.com'],
					outstandingBalance: null
				},
				{
					unit: '4639 1/2',
					tenants: ['Carolyn Hill'],
					phones: [],
					emails: ['cchill1125@gmail.com'],
					outstandingBalance: null
				}
			]
		},
		'18th': {
			name: '18th Street',
			address: '350 W 18th St, Los Angeles, CA 90015',
			description: 'Tenant roster for 18th Street with contacts per unit.',
			records: [
				{
					unit: '1',
					tenants: ['Delfino San Juan'],
					phones: ['(323) 568-9833'],
					emails: ['monkey_loks@yahoo.com'],
					outstandingBalance: null
				},
				{
					unit: '2',
					tenants: ['Marleny Urrutia'],
					phones: [],
					emails: ['clarionrentals@gmail.com'],
					outstandingBalance: null
				},
				{
					unit: '3',
					tenants: ['Marla Bradley'],
					phones: ['(213) 361-6400'],
					emails: ['marlabradley93@yahoo.com'],
					outstandingBalance: null
				},
				{
					unit: '4',
					tenants: ['Jesus Rivera'],
					phones: ['(323) 498-8886'],
					emails: ['jesus_rivera21@yahoo.com'],
					outstandingBalance: null
				}
			]
		},
		'17th': {
			name: '17th Street',
			address: '4725 W 17th St, Los Angeles, CA 90019',
			description: 'Tenant roster for 17th Street with tenant contacts.',
			records: [
				{
					unit: '4723',
					tenants: ['Jonathan Kim', 'Hyun Woo Kang'],
					phones: [],
					emails: ['jonathanbkim97@gmail.com', 'hkang912@gmail.com'],
					outstandingBalance: null
				},
				{
					unit: '4725',
					tenants: ['Gabriel Sampedro', 'Ben Reingold'],
					phones: ['(617) 913-1858'],
					emails: ['gabesampedro@gmail.com', 'benreingold@yahoo.com'],
					outstandingBalance: null
				}
			]
		}
	};

	function sortEntries(list: TableEntry[]): TableEntry[] {
		return [...list].sort((a, b) => {
			if (a.isDraft && !b.isDraft) return -1;
			if (!a.isDraft && b.isDraft) return 1;
			return statusRank[a.status] - statusRank[b.status];
		});
	}

	function isEntryComplete(entry: TableEntry): boolean {
		return (
			entry.building.trim().length > 0 && entry.unit.trim().length > 0 && entry.description.trim().length > 0
		);
	}

	function entryToPayload(entry: TableEntry) {
		return {
			id: entry.id,
			reported_at: entry.reportedAt ?? new Date().toISOString(),
			building: entry.building,
			unit: entry.unit,
			description: entry.description,
			action: entry.action,
			status: entry.status,
			is_draft: entry.isDraft ?? false
		};
	}

	async function saveIssue(entry: TableEntry): Promise<void> {
		const { data, error } = await supabase
			.from('issues')
			.upsert(entryToPayload(entry))
			.select('id, reported_at, building, unit, description, action, status, is_draft')
			.single();

		if (error) {
			console.error('Failed to save issue:', error);
			return;
		}

		if (!data) return;

		const updatedEntry = issueToEntry(data as IssueRecord);
		entries = entries.map((current) =>
			current.id === updatedEntry.id ? { ...updatedEntry, unitFilter: current.unitFilter } : current
		);
	}

	function persistEntryById(id?: string) {
		if (!id) return;
		const target = entries.find((entry) => entry.id === id);
		if (!target || !isEntryComplete(target)) return;
		const cleanEntry = { ...target, isDraft: false };
		entries = entries.map((entry) => (entry.id === id ? cleanEntry : entry));
		void saveIssue(cleanEntry);
	}

	function handleFieldBlur(index: number) {
		const target = entries[index];
		persistEntryById(target?.id);
	}

	function createEntryId(): string {
		if (typeof crypto.randomUUID === 'function') {
			return crypto.randomUUID();
		}
		const bytes = crypto.getRandomValues(new Uint8Array(16));
		return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
	}

let entries = $state(sortEntries(initialEntries));
function hasIncompleteDraft(): boolean {
	return entries.some((entry) => entry.isDraft && !isEntryComplete(entry));
}
let openStatusIndex = $state<number | null>(null);
let openBuildingIndex = $state<number | null>(null);
let openUnitIndex = $state<number | null>(null);
function isBuildingTab(tab: Tab): tab is BuildingTab {
	return tab !== 'inbox';
}

	let conversation = $state<ChatMessage[]>(
		(props.data.chatMessages ?? []).length > 0
			? props.data.chatMessages
			: [
					{
						id: 'welcome',
						role: 'assistant',
						content: 'Paste an email or SMS and I will summarize it and create an issue for you.'
					}
				]
	);

	let chatInput = $state('');
	let chatSessionId = $state<string | null>(props.data.chatSessionId ?? null);
	let isSendingMessage = $state(false);
	let chatError = $state<string | null>(null);

	function toggleStatusMenu(index: number) {
		openStatusIndex = openStatusIndex === index ? null : index;
		openBuildingIndex = null;
		closeUnitMenu();
	}

	function updateStatus(targetIndex: number, status: TableEntry['status']) {
		const targetId = entries[targetIndex]?.id;
		const updated = entries.map((entry, index) =>
			index === targetIndex ? { ...entry, status } : entry
		);
		entries = sortEntries(updated);
		persistEntryById(targetId);
	}

	function updateEntryField(index: number, field: EditableField, value: string) {
		const updated = entries.map((entry, entryIndex) =>
			entryIndex === index ? { ...entry, [field]: value } : entry
		);
		entries = updated;
	}

	function handleFieldInput(index: number, field: EditableField, event: Event) {
		const target = event.currentTarget as HTMLInputElement | HTMLTextAreaElement;
		updateEntryField(index, field, target.value);
	}

	function toggleBuildingMenu(index: number) {
		openBuildingIndex = openBuildingIndex === index ? null : index;
		openStatusIndex = null;
		closeUnitMenu();
	}

	function toggleUnitMenu(index: number) {
		if (openUnitIndex === index) {
			closeUnitMenu();
		} else {
			closeUnitMenu();
			openUnitIndex = index;
		}
		openBuildingIndex = null;
		openStatusIndex = null;
	}

	function getUnitOptions(building: string): string[] {
		return buildingUnits[building] ?? [];
	}

	function setUnitFilter(index: number, value: string) {
		entries = entries.map((entry, entryIndex) =>
			entryIndex === index ? { ...entry, unitFilter: value } : entry
		);
	}

	function clearUnitFilter(index: number) {
		entries = entries.map((entry, entryIndex) =>
			entryIndex === index ? { ...entry, unitFilter: undefined } : entry
		);
	}

	function getUnitDisplay(entry: TableEntry): string {
		const filterValue = entry.unitFilter;
		if (filterValue && filterValue.length > 0) return filterValue;
		return entry.unit;
	}

	function getFilteredUnits(entry: TableEntry): string[] {
		const filterValue = (entry.unitFilter ?? '').toLowerCase();
		const units = getUnitOptions(entry.building);
		if (!filterValue) return units;
		return units.filter((unit) => unit.toLowerCase().includes(filterValue));
	}

	function closeUnitMenu() {
		if (openUnitIndex !== null) {
			clearUnitFilter(openUnitIndex);
			openUnitIndex = null;
		}
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
	}

	function formatBalance(value: number | null): string {
		return value === null ? '—' : formatCurrency(value);
	}

	function totalOutstanding(records: TenantRecord[]): number {
		return records.reduce((sum, record) => sum + (record.outstandingBalance ?? 0), 0);
	}

	function selectBuilding(index: number, label: string) {
		const targetId = entries[index]?.id;
		const units = getUnitOptions(label);
		const updated = entries.map((entry, entryIndex) =>
			entryIndex === index
				? { ...entry, building: label, unit: units.length > 0 ? units[0] : '', unitFilter: undefined }
				: entry
		);
		entries = updated;
		openBuildingIndex = null;
		persistEntryById(targetId);
	}

	function selectUnit(index: number, unitValue: string) {
		const targetId = entries[index]?.id;
		const updated = entries.map((entry, entryIndex) =>
			entryIndex === index ? { ...entry, unit: unitValue, unitFilter: undefined } : entry
		);
		entries = updated;
		closeUnitMenu();
		persistEntryById(targetId);
	}

	function approveFromApproval(index: number) {
		const targetId = entries[index]?.id;
		const updated = entries.map((entry, entryIndex): TableEntry =>
			entryIndex === index ? { ...entry, status: 'Pending' } : entry
		);
		entries = sortEntries(updated);
		persistEntryById(targetId);
	}

	function moveToReview(index: number) {
		const targetId = entries[index]?.id;
		const updated = entries.map((entry, entryIndex): TableEntry =>
			entryIndex === index ? { ...entry, status: 'Review' } : entry
		);
		entries = sortEntries(updated);
		persistEntryById(targetId);
	}

	function statusStyles(status: TableEntry['status']): string {
		if (status === 'Approval') return 'bg-purple-100 text-purple-800';
		if (status === 'Review') return 'bg-rose-100 text-rose-800';
		if (status === 'Pending') return 'bg-amber-100 text-amber-800';
		if (status === 'In Progress') return 'bg-blue-100 text-blue-800';
		return 'bg-emerald-100 text-emerald-800';
	}

	function statusDotStyles(status: TableEntry['status']): string {
		if (status === 'Approval') return 'bg-purple-500';
		if (status === 'Review') return 'bg-rose-500';
		if (status === 'Pending') return 'bg-amber-500';
		if (status === 'In Progress') return 'bg-blue-500';
		return 'bg-emerald-500';
	}

	function formatTimestamp(date: Date): string {
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		return `${month}/${day} ${hours}:${minutes}`;
	}

	function addNewIssue() {
		if (hasIncompleteDraft()) {
			return;
		}
		const now = new Date();
		const draftEntry: TableEntry = {
			id: createEntryId(),
			reportedAt: now.toISOString(),
			time: formatTimestamp(now),
			building: '',
			unit: '',
			description: '',
			action: '',
			status: 'Approval',
			isDraft: true
		};
		entries = sortEntries([...entries, draftEntry]);
	}

	async function sendChatMessage() {
		const messageText = chatInput.trim();
		if (!messageText || isSendingMessage) return;

		chatError = null;
		chatInput = '';
		const localMessage: ChatMessage = {
			id: createEntryId(),
			role: 'user',
			content: messageText
		};
		conversation = [...conversation, localMessage];
		isSendingMessage = true;

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId: chatSessionId,
					text: messageText
				})
			});

			const result = await response.json();
			if (!response.ok) {
				throw new Error(result?.error ?? 'Assistant request failed');
			}

			if (result.sessionId) {
				chatSessionId = result.sessionId;
			}

			if (result.issue) {
				upsertEntryFromIssue(result.issue as IssueRecord);
			}

			const assistantMessage: ChatMessage = {
				id: (result.messageId as string | undefined) ?? createEntryId(),
				role: 'assistant',
				content: (result.message as string | undefined) ?? 'Issue updated.'
			};
			conversation = [...conversation, assistantMessage];
		} catch (error) {
			console.error('Failed to send chat message', error);
			chatError = 'Unable to reach Hermes. Please try again.';
		} finally {
			isSendingMessage = false;
		}
	}

	function handleSend(event: SubmitEvent) {
		event.preventDefault();
		void sendChatMessage();
	}

	$effect(() => {
			function handleClick() {
				openStatusIndex = null;
				openBuildingIndex = null;
				closeUnitMenu();
			}
		window.addEventListener('click', handleClick);
		return () => {
			window.removeEventListener('click', handleClick);
		};
	});
</script>

<div class="flex h-screen bg-white text-black">
	<div class="flex w-3/4 flex-col">
		<header class="flex items-center justify-between border-b border-stone-200 px-2 py-2">
			<div class="flex flex-wrap items-center gap-2">
				{#each tabs as tab}
					<button
						class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-stone-600 transition hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500"
						onclick={() => (activeTab = tab.id)}
					>
						{tab.label}
						{#if tab.id === 'inbox'}
							<span class="rounded bg-stone-700 px-2 py-0.5 text-xs text-white"
								>{entries.length}</span
							>
						{/if}
					</button>
				{/each}
			</div>
		</header>

		<main class="flex-1 overflow-hidden px-6 py-4">
			{#if activeTab === 'inbox'}
				<div class="flex h-full flex-col gap-6">
					<div class="flex items-end justify-between">
						<div>
							<h1 class="text-3xl font-semibold text-stone-900">Inbox</h1>
							<p class="text-sm text-stone-500">
								This inbox lists open property issues that need human approval before work can
								proceed.
							</p>
						</div>
						<button
							type="button"
							class="flex items-center gap-2 rounded-md bg-stone-800 px-2 py-1 text-xs text-stone-50 transition"
							onclick={addNewIssue}
						>
							New issue
						</button>
					</div>

					<div class="flex-1 overflow-hidden rounded-lg border border-stone-200">
						<div
							class="pl-2 grid grid-cols-[100px_0.9fr_0.75fr_2fr_1.4fr_1fr] border-b border-stone-200 bg-stone-50 text-xs font-semibold tracking-wide text-stone-500 uppercase"
						>
							<div class="py-2 text-left">Time</div>
							<div class="py-2">Building</div>
							<div class="py-2">Unit</div>
							<div class="py-2">Description</div>
							<div class="py-2">Action</div>
							<div class="py-2">Status</div>
						</div>
						<div class="relative">
							<div
								class="pointer-events-none absolute inset-0 z-0 grid grid-cols-[100px_0.9fr_0.75fr_2fr_1.4fr_1fr]"
							>
								{#each Array(6) as _, index}
									<div
										class={`border-r border-stone-200 ${index === 5 ? 'border-r-0' : ''}`}
										aria-hidden="true"
									></div>
								{/each}
							</div>
							<div class="relative">
								{#each entries as entry, index (index)}
									<div
										class="grid grid-cols-[100px_0.9fr_0.75fr_2fr_1.4fr_1fr] border-b border-stone-200 text-sm text-stone-800"
									>
										<div class="flex items-center px-2 py-2 font-mono text-xs text-stone-500">
											{entry.time}
										</div>
										<div class="relative px-0">
											<button
												class="flex h-full w-full items-center justify-between rounded-md border border-transparent bg-transparent px-2 py-2 text-sm font-medium text-stone-800 outline-none transition hover:border-stone-300 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
												onclick={(event) => {
													event.stopPropagation();
													toggleBuildingMenu(index);
												}}
											>
												{entry.building}
											</button>
											{#if openBuildingIndex === index}
												<div
													class="absolute top-full left-0 z-10 mt-2 w-full min-w-40 rounded-md border border-stone-200 bg-white shadow-lg"
												>
													{#each buildingOptions as option}
														<button
															class={`flex w-full items-center justify-between px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 ${
																option.label === entry.building
																	? 'font-semibold text-stone-900'
																	: ''
															}`}
															onclick={(event) => {
																event.stopPropagation();
																selectBuilding(index, option.label);
															}}
														>
															<span>{option.label}</span>
															{#if option.label === entry.building}
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	width="12"
																	height="12"
																	fill="currentColor"
																	viewBox="0 0 16 16"
																>
																	<path
																		d="M13.485 1.929a.75.75 0 0 1 0 1.06L6.486 9.99a.75.75 0 0 1-1.06 0L2.515 7.08a.75.75 0 0 1 1.06-1.06L6 8.445l6.425-6.515a.75.75 0 0 1 1.06 0"
																	/>
																</svg>
															{/if}
														</button>
													{/each}
												</div>
											{/if}
										</div>
										<div class="relative px-0">
											<input
												class="h-full w-full rounded-md border border-transparent bg-transparent px-2 py-2 text-sm text-stone-800 outline-none transition hover:border-stone-300 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
												placeholder=""
												value={getUnitDisplay(entry)}
												onfocus={(event) => {
													event.stopPropagation();
													if (openUnitIndex !== index) {
														closeUnitMenu();
													}
													openUnitIndex = index;
												}}
												onclick={(event) => {
													event.stopPropagation();
													if (openUnitIndex !== index) {
														closeUnitMenu();
													}
													openUnitIndex = index;
												}}
												oninput={(event) => {
													event.stopPropagation();
													if (openUnitIndex !== index) {
														closeUnitMenu();
													}
													setUnitFilter(index, event.currentTarget.value);
													openUnitIndex = index;
												}}
											/>
											{#if openUnitIndex === index}
												{@const filteredUnits = getFilteredUnits(entry)}
												<div
													class="absolute top-full left-0 z-10 mt-2 flex max-h-56 w-full min-w-32 flex-col rounded-md border border-stone-200 bg-white text-sm shadow-lg"
												>
													<div class="max-h-40 overflow-y-auto">
														{#each filteredUnits as unitOption}
															<button
																class={`flex w-full items-center justify-between px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 ${
																	unitOption === entry.unit ? 'font-semibold text-stone-900' : ''
																}`}
																onclick={(event) => {
																	event.stopPropagation();
																	selectUnit(index, unitOption);
																}}
															>
																<span>{unitOption}</span>
																{#if unitOption === entry.unit}
																	<svg
																		xmlns="http://www.w3.org/2000/svg"
																		width="12"
																		height="12"
																		fill="currentColor"
																		viewBox="0 0 16 16"
																	>
																		<path
																			d="M13.485 1.929a.75.75 0 0 1 0 1.06L6.486 9.99a.75.75 0 0 1-1.06 0L2.515 7.08a.75.75 0 0 1 1.06-1.06L6 8.445l6.425-6.515a.75.75 0 0 1 1.06 0"
																		/>
																	</svg>
																{/if}
															</button>
														{/each}
													</div>
													<div class="border-t border-stone-100 px-3 py-2 text-right text-[11px] uppercase tracking-wide text-stone-400">
														{filteredUnits.length} units
													</div>
												</div>
											{/if}
										</div>
										<div class="px-0 text-stone-600">
											<input
												class="h-full w-full rounded-md border border-transparent bg-transparent px-2 py-2 text-sm text-stone-800 outline-none transition hover:border-stone-300 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
												value={entry.description}
												oninput={(event) => handleFieldInput(index, 'description', event)}
												onblur={() => handleFieldBlur(index)}
											/>
										</div>
										<div class="px-0">
											<input
												class="h-full w-full rounded-md border border-transparent bg-transparent px-2 py-2 text-sm text-stone-800 outline-none transition hover:border-stone-300 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
												value={entry.action}
												oninput={(event) => handleFieldInput(index, 'action', event)}
												onblur={() => handleFieldBlur(index)}
											/>
										</div>
										<div class="relative flex min-h-[44px] items-center justify-start px-1">
											{#if entry.status === 'Approval'}
												<div class="flex items-center justify-start gap-2">
													<button
														class="flex items-center gap-1 rounded-full border border-stone-800 bg-stone-800 px-2 py-1 text-xs font-medium text-stone-100 transition hover:bg-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-stone-800"
														onclick={(event) => {
															event.stopPropagation();
															approveFromApproval(index);
														}}
													>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															width="16"
															height="16"
															fill="currentColor"
															viewBox="0 0 16 16"
														>
															<path
																fill="#34d399"
																d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"
															/>
														</svg>
														Yes
													</button>
													<button
														class="flex items-center gap-1 rounded-full border border-stone-800 bg-stone-800 px-2 py-1 text-xs font-medium text-stone-100 transition hover:bg-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-stone-800"
														onclick={(event) => {
															event.stopPropagation();
															moveToReview(index);
														}}
													>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															width="16"
															height="16"
															fill="currentColor"
															viewBox="0 0 16 16"
														>
															<path
																fill="#f87171"
																d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 0 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06"
															/>
														</svg>
														No
													</button>
												</div>
											{:else}
												<button
													class={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusStyles(entry.status)}`}
													onclick={(event) => {
														event.stopPropagation();
														toggleStatusMenu(index);
													}}
												>
													<span
														class={`h-2 w-2 rounded-full ${statusDotStyles(entry.status)}`}
														aria-hidden="true"
													></span>
													{entry.status}
												</button>
												{#if openStatusIndex === index}
													<div
														class="absolute top-full right-0 z-10 mt-2 w-44 rounded-md border border-stone-200 bg-white shadow-lg"
													>
														{#each statusOptions as option}
															<button
																class={`flex w-full items-center justify-between px-3 py-2 text-xs text-stone-700 hover:bg-stone-100 ${
																	option === entry.status ? 'font-semibold text-stone-900' : ''
																}`}
																onclick={(event) => {
																	event.stopPropagation();
																	updateStatus(index, option);
																	openStatusIndex = null;
																}}
															>
																<span>{option}</span>
																{#if option === entry.status}
																	<svg
																		xmlns="http://www.w3.org/2000/svg"
																		width="12"
																		height="12"
																		fill="currentColor"
																		viewBox="0 0 16 16"
																	>
																		<path
																			d="M13.485 1.929a.75.75 0 0 1 0 1.06L6.486 9.99a.75.75 0 0 1-1.06 0L2.515 7.08a.75.75 0 0 1 1.06-1.06L6 8.445l6.425-6.515a.75.75 0 0 1 1.06 0"
																		/>
																	</svg>
																{/if}
															</button>
														{/each}
													</div>
												{/if}
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			{:else if isBuildingTab(activeTab)}
				{@const profile = buildingProfiles[activeTab]}
				<div class="flex h-full flex-col gap-6">
					<div class="flex flex-col">
						<div class="flex items-center justify-between">
							<div>
								<h1 class="text-3xl font-semibold text-stone-900">{profile.name}</h1>
							</div>
						</div>
						<p class="text-sm text-stone-600">{profile.address}</p>
					</div>

					<div class="flex h-full flex-1 flex-col overflow-hidden rounded-lg border border-stone-200">
						<div
							class="grid grid-cols-[0.6fr_1.5fr_1.2fr_1.8fr_0.8fr] border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500"
						>
							<div class="px-3 py-2">Unit</div>
							<div class="px-3 py-2">Tenant(s)</div>
							<div class="px-3 py-2">Phone Number(s)</div>
							<div class="px-3 py-2">Email</div>
							<div class="px-3 py-2">Outstanding</div>
						</div>
						{#if profile.records.length > 0}
							<div class="flex-1 overflow-y-auto divide-y divide-stone-200">
								{#each profile.records as record}
									<div class="grid grid-cols-[0.6fr_1.5fr_1.2fr_1.8fr_0.8fr] text-sm text-stone-800">
										<div class="px-3 py-3 font-mono text-xs text-stone-500">{record.unit}</div>
										<div class="px-3 py-3 pr-1 text-stone-900">
											{#if record.tenants.length === 0}
												<span class="text-stone-400">—</span>
											{:else}
												{#each record.tenants as tenant}
													<span class="block">{tenant}</span>
												{/each}
											{/if}
										</div>
										<div class="px-3 py-3 text-stone-600">
											{#if record.phones.length === 0}
												<span class="text-stone-400">—</span>
											{:else}
												{#each record.phones as phone}
													<span class="block">{phone}</span>
												{/each}
											{/if}
										</div>
										<div class="px-3 py-3 text-stone-600">
											{#if record.emails.length === 0}
												<span class="text-stone-400">—</span>
											{:else}
												{#each record.emails as email}
													<span class="block">{email}</span>
												{/each}
											{/if}
										</div>
										<div class="px-3 py-3 font-semibold text-stone-900">
											{formatBalance(record.outstandingBalance)}
										</div>
									</div>
								{/each}
							</div>
							<div class="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700">
								<span>Total Outstanding Balance</span>
								<span>{formatCurrency(totalOutstanding(profile.records))}</span>
							</div>
						{:else}
							<div class="flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center">
								<p class="text-sm uppercase tracking-wide text-stone-400">No tenant data yet</p>
								<p class="text-sm text-stone-600">
									Add the roster for {profile.name} to populate this directory with contact details and balances.
								</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</main>
	</div>
	<section class="flex w-1/4 flex-col border-l border-stone-200 bg-white">
		<div class="flex flex-1 flex-col px-4 py-4">
			<div class="flex-1 space-y-4 overflow-y-auto pr-1">
				{#each conversation as message}
					<div class={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
						<div
							class={`w-full rounded-xl px-4 py-3 text-sm ${
								message.role === 'assistant'
									? 'bg-transparent text-stone-700'
									: 'bg-stone-100 text-stone-900'
							}`}
						>
							<p>{message.content}</p>
						</div>
					</div>
				{/each}
			</div>
			<form class="relative mt-4" onsubmit={handleSend}>
				<label class="sr-only" for="copilot-input">Ask Hermes</label>
				<textarea
					id="copilot-input"
					class="w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 pr-16 text-sm text-xs text-stone-800 shadow-sm transition outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
					rows="3"
					placeholder="Paste an email or SMS conversation, e.g. This is from unit 401 Mariposa"
					bind:value={chatInput}
					disabled={isSendingMessage}
				></textarea>
				<button
					type="submit"
					class={`absolute right-2 bottom-3 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm transition ${
						isSendingMessage || chatInput.trim().length === 0
							? 'cursor-not-allowed bg-stone-400'
							: 'bg-black hover:bg-white hover:text-black'
					}`}
					aria-label="Send message"
					disabled={isSendingMessage || chatInput.trim().length === 0}
				>
					{#if isSendingMessage}
						<svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke-width="4"></circle>
							<path class="opacity-75" d="M4 12a8 8 0 0 1 8-8" stroke-width="4" stroke-linecap="round"></path>
						</svg>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							fill="none"
							viewBox="0 0 16 16"
						>
							<path
								fill="currentColor"
								d="M8 12.75a.75.75 0 0 1-.75-.75V5.81l-2.22 2.22a.75.75 0 0 1-1.06-1.06l3.5-3.5a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 1 1-1.06 1.06L8.75 5.81V12a.75.75 0 0 1-.75.75Z"
							/>
						</svg>
					{/if}
				</button>
			</form>
			{#if chatError}
				<p class="mt-2 text-xs text-rose-600">{chatError}</p>
			{/if}
		</div>
	</section>
</div>

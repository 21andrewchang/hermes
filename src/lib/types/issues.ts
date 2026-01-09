export type IssueStatus = 'Approval' | 'Review' | 'Pending' | 'In Progress' | 'Complete';

export interface IssueRow {
	id: string;
	reported_at: string | null;
	building: string | null;
	unit: string | null;
	description: string | null;
	action: string | null;
	status: IssueStatus;
	is_draft: boolean | null;
}

export type PersonStatus = "onboarding" | "active" | "leave" | "former";

export interface OnboardingItem {
	done: boolean;
	id: string;
	title: string;
}

export interface Person {
	email: string;
	id: string;
	name: string;
	notes: string;
	onboarding: OnboardingItem[];
	role: string;
	startDate: string;
	status: PersonStatus;
	team: string;
}

export interface PeopleState {
	people: Person[];
	schemaVersion: 1;
}

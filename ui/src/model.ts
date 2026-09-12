import type {
	OnboardingItem,
	PeopleState,
	Person,
	PersonStatus,
} from "./types.ts";

const PERSON_STATUSES: PersonStatus[] = [
	"onboarding",
	"active",
	"leave",
	"former",
];

function record(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function personStatus(value: unknown): PersonStatus {
	return typeof value === "string" &&
		PERSON_STATUSES.includes(value as PersonStatus)
		? (value as PersonStatus)
		: "active";
}

function onboardingItem(value: unknown, index: number): OnboardingItem | null {
	if (!record(value)) {
		return null;
	}
	const title = stringValue(value.title).trim();
	return title
		? {
				done: value.done === true,
				id:
					stringValue(value.id, `onboarding-${index}`).trim() ||
					`onboarding-${index}`,
				title,
			}
		: null;
}

function person(value: unknown, index: number): Person | null {
	if (!record(value)) {
		return null;
	}
	const name = stringValue(value.name).trim();
	if (!name) {
		return null;
	}
	const rawOnboarding = Array.isArray(value.onboarding) ? value.onboarding : [];
	return {
		email: stringValue(value.email).trim().toLowerCase(),
		id: stringValue(value.id, `person-${index}`).trim() || `person-${index}`,
		name,
		notes: stringValue(value.notes).trim(),
		role: stringValue(value.role, "Team member").trim() || "Team member",
		startDate: stringValue(value.startDate),
		status: personStatus(value.status),
		team: stringValue(value.team, "General").trim() || "General",
		onboarding: rawOnboarding
			.map((item, itemIndex) => onboardingItem(item, itemIndex))
			.filter((item): item is OnboardingItem => item !== null)
			.slice(0, 100),
	};
}

export function emptyState(): PeopleState {
	return { people: [], schemaVersion: 1 };
}

export function normalizeState(value: unknown): PeopleState {
	if (!record(value)) {
		return emptyState();
	}
	const rawPeople = Array.isArray(value.people) ? value.people : [];
	return {
		people: rawPeople
			.map((item, index) => person(item, index))
			.filter((item): item is Person => item !== null)
			.slice(0, 500),
		schemaVersion: 1,
	};
}

function demoPerson(
	id: string,
	name: string,
	role: string,
	team: string,
	status: PersonStatus,
	startDate: string,
	email: string,
	onboarding: OnboardingItem[],
	notes: string
): Person {
	return { email, id, name, notes, role, startDate, status, team, onboarding };
}

export function demoState(): PeopleState {
	return normalizeState({
		people: [
			demoPerson(
				"demo-maya",
				"Maya Chen",
				"Product lead",
				"Product",
				"active",
				"2025-02-03",
				"maya@example.com",
				[],
				"Owns the weekly customer feedback review."
			),
			demoPerson(
				"demo-sam",
				"Sam Rivera",
				"Operations",
				"Operations",
				"onboarding",
				"2026-08-19",
				"sam@example.com",
				[
					{ done: true, id: "sam-access", title: "Confirm workspace access" },
					{
						done: false,
						id: "sam-intro",
						title: "Schedule the team introduction",
					},
					{ done: false, id: "sam-goals", title: "Record first-month goals" },
				],
				"First week focus: make the customer handoff visible."
			),
			demoPerson(
				"demo-lee",
				"Lee Tan",
				"Engineering",
				"Platform",
				"leave",
				"2024-06-10",
				"lee@example.com",
				[],
				"On leave until 2026-09-02."
			),
		],
	});
}

export interface NewPersonInput {
	email: string;
	name: string;
	role: string;
	startDate: string;
	team: string;
}

export function createPerson(input: NewPersonInput): Person {
	return {
		email: input.email.trim().toLowerCase(),
		id: `person-${Date.now()}`,
		name: input.name.trim(),
		notes: "",
		role: input.role.trim() || "Team member",
		startDate: input.startDate,
		status: "onboarding",
		team: input.team.trim() || "General",
		onboarding: [],
	};
}

export function patchPerson(
	state: PeopleState,
	personId: string,
	patch: Partial<Person>
): PeopleState {
	return {
		...state,
		people: state.people.map((item) =>
			item.id === personId ? { ...item, ...patch } : item
		),
	};
}

export function toggleOnboarding(
	state: PeopleState,
	personId: string,
	itemId: string
): PeopleState {
	return {
		...state,
		people: state.people.map((item) =>
			item.id === personId
				? {
						...item,
						onboarding: item.onboarding.map((step) =>
							step.id === itemId ? { ...step, done: !step.done } : step
						),
					}
				: item
		),
	};
}

export function onboardingProgress(person: Person): number {
	if (person.onboarding.length === 0) {
		return person.status === "active" ? 100 : 0;
	}
	return Math.round(
		(person.onboarding.filter((item) => item.done).length /
			person.onboarding.length) *
			100
	);
}

export function peopleStats(people: Person[]): {
	active: number;
	onboarding: number;
	openSteps: number;
} {
	return {
		active: people.filter((item) => item.status === "active").length,
		onboarding: people.filter((item) => item.status === "onboarding").length,
		openSteps: people.reduce(
			(total, item) =>
				total + item.onboarding.filter((step) => !step.done).length,
			0
		),
	};
}

export function formatDate(value: string): string {
	if (!value) {
		return "No start date";
	}
	const date = new Date(`${value}T00:00:00`);
	return Number.isNaN(date.getTime())
		? "No start date"
		: new Intl.DateTimeFormat(undefined, {
				day: "numeric",
				month: "short",
				year: "numeric",
			}).format(date);
}

export function statusLabel(status: PersonStatus): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

import { formatDate as formatDisplayDate } from "@ryu/ui/lib/timezone.ts";
import { z } from "zod";
import type {
	OnboardingItem,
	PeopleState,
	Person,
	PersonStatus,
} from "./types.ts";

const normalizedTextSchema = z
	.string()
	.catch("")
	.transform((text) => text.trim());
const onboardingWireSchema = z
	.object({
		done: z.boolean().catch(false),
		id: normalizedTextSchema,
		title: normalizedTextSchema.pipe(z.string().min(1)),
	})
	.nullable()
	.catch(null);
const personWireSchema = z
	.object({
		email: normalizedTextSchema.transform((email) => email.toLowerCase()),
		id: normalizedTextSchema,
		name: normalizedTextSchema.pipe(z.string().min(1)),
		notes: normalizedTextSchema,
		role: z
			.string()
			.catch("Team member")
			.transform((role) => role.trim() || "Team member"),
		startDate: z.string().catch(""),
		status: z.enum(["onboarding", "active", "leave", "former"]).catch("active"),
		team: z
			.string()
			.catch("General")
			.transform((team) => team.trim() || "General"),
		onboarding: z.array(onboardingWireSchema).catch([]),
	})
	.nullable()
	.catch(null);

export function emptyState(): PeopleState {
	return { people: [], schemaVersion: 1 };
}

const stateFieldsSchema = z.object({
	people: z.array(personWireSchema).catch([]),
});
export const peopleStateSchema = stateFieldsSchema
	.catch({ people: [] })
	.transform(
		(value): PeopleState => ({
			people: value.people
				.flatMap((person, index) =>
					person
						? [
								{
									...person,
									id: person.id || `person-${index}`,
									onboarding: person.onboarding
										.flatMap((item, itemIndex) =>
											item
												? [
														{
															...item,
															id: item.id || `onboarding-${itemIndex}`,
														},
													]
												: []
										)
										.slice(0, 100),
								},
							]
						: []
				)
				.slice(0, 500),
			schemaVersion: 1,
		})
	);
export const normalizeState = peopleStateSchema.parse;
export const persistedPeopleStateSchema = z
	.object({ people: z.array(z.json()) })
	.transform((value) => normalizeState(value));

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

interface PeopleStatsResult {
	active: number;
	onboarding: number;
	openSteps: number;
}

export function peopleStats(people: Person[]): PeopleStatsResult {
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
		: formatDisplayDate(value, {
				day: "numeric",
				month: "short",
				year: "numeric",
			});
}

export function statusLabel(status: PersonStatus): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

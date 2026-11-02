import type { Person, PersonStatus } from "./types.ts";

export type Filter = "all" | PersonStatus;

export const FILTERS: Array<{ id: Filter; label: string }> = [
	{ id: "all", label: "All" },
	{ id: "onboarding", label: "Onboarding" },
	{ id: "active", label: "Active" },
	{ id: "leave", label: "Leave" },
	{ id: "former", label: "Former" },
];

export interface NewPersonForm {
	email: string;
	name: string;
	role: string;
	startDate: string;
	team: string;
}

export const EMPTY_FORM: NewPersonForm = {
	email: "",
	name: "",
	role: "",
	startDate: "",
	team: "",
};

export function errorMessage(cause: unknown): string {
	return cause instanceof Error
		? cause.message
		: "Something went wrong. Try again.";
}

export function matchesFilter(person: Person, filter: Filter): boolean {
	return filter === "all" || person.status === filter;
}

export function statusVariant(
	status: PersonStatus
): "default" | "secondary" | "destructive" | "outline" {
	if (status === "active") {
		return "default";
	}
	if (status === "onboarding") {
		return "outline";
	}
	if (status === "leave") {
		return "secondary";
	}
	return "destructive";
}

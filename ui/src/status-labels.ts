/**
 * A person's status is a wire token (`leave`, `onboarding`, …). Capitalising
 * the token showed "Leave" and "Onboarding", which read as a verb ("leave
 * this page") and a process, and translated in that wrong sense. Each status
 * reads instead as a whole English phrase that names a person's state, so the
 * catalog key carries the sense a translator needs.
 */
import type { PersonStatus } from "./types.ts";

/** Translates one English catalog key (the hook's or the core `tl`). */
export type TranslateLabel = (source: string) => string;

/** English catalog key for each status, in the order the pickers list them. */
export const STATUS_LABELS: Record<PersonStatus, string> = {
	onboarding: "New hire",
	active: "Active employee",
	leave: "On leave",
	former: "Former employee",
};

/** The translated label a badge, filter or picker shows for `status`. */
export function statusLabel(status: PersonStatus, tl: TranslateLabel): string {
	return tl(STATUS_LABELS[status]);
}

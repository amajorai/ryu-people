import { describe, expect, it } from "bun:test";
import {
	demoState,
	normalizeState,
	onboardingProgress,
	peopleStats,
	toggleOnboarding,
} from "./model.ts";

describe("people model", () => {
	it("normalizes malformed people records", () => {
		const state = normalizeState({
			people: [
				{ name: "Maya", status: "active", onboarding: [{ title: "Welcome" }] },
				null,
				{ name: "" },
			],
		});

		expect(state.people).toHaveLength(1);
		expect(state.people[0]?.role).toBe("Team member");
	});

	it("tracks onboarding progress and toggles one step", () => {
		const state = demoState();
		const person = state.people.find((item) => item.id === "demo-sam");
		if (!person) {
			return;
		}
		expect(onboardingProgress(person)).toBe(33);
		const updated = toggleOnboarding(state, person.id, "sam-intro");
		const updatedPerson = updated.people.find((item) => item.id === person.id);
		expect(
			updatedPerson?.onboarding.find((item) => item.id === "sam-intro")?.done
		).toBe(true);
	});

	it("summarizes active, onboarding, and open steps", () => {
		expect(peopleStats(demoState().people)).toEqual({
			active: 1,
			onboarding: 1,
			openSteps: 2,
		});
	});
});

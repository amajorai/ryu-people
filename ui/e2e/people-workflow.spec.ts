import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { normalizeState } from "../src/model.ts";
import type { PeopleState } from "../src/types.ts";

type PeopleHostCall =
	| { method: "storage.get"; input: { key: string; namespace?: string } }
	| {
			method: "storage.set";
			input: { key: string; namespace: string; value: string };
	  };

interface PeopleHostFixture {
	calls: PeopleHostCall[];
	failNextGet: number;
	failNextSet: number;
	holdNextSet: boolean;
	releaseSet?: (accept: boolean) => void;
	stored: string;
}

declare global {
	interface Window {
		__peopleHostFixture?: PeopleHostFixture;
	}
}

async function screenshotPath(
	_testInfo: { outputPath(name: string): string },
	name: string
): Promise<string> {
	const configured = process.env.RYU_APPS_STORE_PROOF_DIR;
	const destination = configured
		? path.join(configured, name)
		: path.join(import.meta.dirname, "evidence", name);
	await mkdir(path.dirname(destination), { recursive: true });
	return destination;
}

async function installPeopleHostFixture(
	page: Page,
	initialState: PeopleState,
	failNextGet = 0
): Promise<void> {
	await page.addInitScript(
		({ initialState: seed, failNextGet: readFailures }) => {
			const fixture: PeopleHostFixture = {
				calls: [],
				failNextGet: readFailures,
				failNextSet: 0,
				stored:
					sessionStorage.getItem("people-proof-state") ?? JSON.stringify(seed),
				holdNextSet: false,
			};
			Object.assign(window, {
				__peopleHostFixture: fixture,
				ryu: {
					storage: {
						get: async (input: { key: string; namespace?: string }) => {
							fixture.calls.push({ input, method: "storage.get" });
							if (
								JSON.stringify(input) !==
								JSON.stringify({ key: "state.v1", namespace: "people" })
							) {
								throw new Error("Unexpected storage.get contract");
							}
							if (fixture.failNextGet > 0) {
								fixture.failNextGet -= 1;
								throw new Error("Fixture rejected storage.get");
							}
							return fixture.stored;
						},
						set: async (input: {
							key: string;
							namespace: string;
							value: string;
						}) => {
							fixture.calls.push({ input, method: "storage.set" });
							if (
								input.key !== "state.v1" ||
								input.namespace !== "people" ||
								Object.keys(input).sort().join(",") !== "key,namespace,value"
							) {
								throw new Error("Unexpected storage.set contract");
							}
							if (fixture.failNextSet > 0) {
								fixture.failNextSet -= 1;
								throw new Error("Fixture rejected storage.set");
							}
							if (fixture.holdNextSet) {
								fixture.holdNextSet = false;
								const accept = await new Promise<boolean>((resolve) => {
									fixture.releaseSet = resolve;
								});
								if (!accept) {
									throw new Error("Fixture rejected held storage.set");
								}
							}
							fixture.stored = input.value;
							sessionStorage.setItem("people-proof-state", input.value);
						},
					},
				},
			});
		},
		{ failNextGet, initialState }
	);
}

test("updates onboarding and adds a local directory record", async ({
	page,
}, testInfo) => {
	/*
	 * Person team field persists the exact team edit in the local People record.
	 * Person start date field persists the exact date edit in the local People record.
	 */
	const browserErrors: string[] = [];
	page.on("pageerror", (error) => browserErrors.push(error.message));
	await page.addInitScript(
		(key) => localStorage.removeItem(key),
		"ryu.people.state.v1"
	);
	await page.goto("/");
	await expect(
		page.getByRole("heading", { name: "Team directory" })
	).toBeVisible();
	await expect(page.getByRole("option", { name: /Sam Rivera/ })).toBeVisible();

	await page.getByRole("option", { name: /Sam Rivera/ }).click();
	await expect(page.getByText("33% complete", { exact: true })).toBeVisible();
	const introStep = page.getByRole("checkbox", {
		name: "Schedule the team introduction",
	});
	await introStep.click();
	await expect(page.getByText("67% complete", { exact: true })).toBeVisible();
	await expect(introStep).toHaveAttribute("aria-checked", "true");
	await page.getByLabel("Person status").selectOption("active");
	await expect(
		page.locator(".people-detail").getByText("Active", { exact: true })
	).toBeVisible();
	const teamInput = page.getByLabel("Person team");
	await teamInput.fill("Customer Operations");
	await expect(teamInput).toHaveValue("Customer Operations");
	const startDateInput = page.getByLabel("Person start date");
	await startDateInput.fill("2026-08-20");
	await expect(startDateInput).toHaveValue("2026-08-20");
	const sam = normalizeState(
		JSON.parse(
			await page.evaluate(
				() => localStorage.getItem("ryu.people.state.v1") ?? "{}"
			)
		)
	).people.find((person) => person.id === "demo-sam");

	expect(sam).toMatchObject({
		name: "Sam Rivera",
		startDate: "2026-08-20",
		status: "active",
		team: "Customer Operations",
		onboarding: [
			expect.objectContaining({ done: true, id: "sam-access" }),
			expect.objectContaining({ done: true, id: "sam-intro" }),
			expect.objectContaining({ done: false, id: "sam-goals" }),
		],
	});

	await page.getByRole("button", { name: "Add person", exact: true }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel("Name").fill("Alex Morgan");
	await dialog.getByLabel("Role").fill("Design partner");
	await dialog.getByLabel("Team").fill("Research");
	await dialog.getByLabel("Start date").fill("2026-09-22");
	await dialog.getByLabel("Email (optional)").fill("ALEX@EXAMPLE.TEST");
	await dialog.getByRole("button", { name: "Add person" }).click();
	await expect(dialog).toBeHidden();
	await expect(
		page.getByRole("heading", { name: "Alex Morgan" })
	).toBeVisible();
	await expect(
		page.locator(".people-detail").getByText("Design partner · Research", {
			exact: true,
		})
	).toBeVisible();
	const added = normalizeState(
		JSON.parse(
			await page.evaluate(
				() => localStorage.getItem("ryu.people.state.v1") ?? "{}"
			)
		)
	).people.find((person) => person.name === "Alex Morgan");

	expect(added).toMatchObject({
		email: "alex@example.test",
		role: "Design partner",
		status: "onboarding",
		team: "Research",
	});
	await page.screenshot({
		animations: "disabled",
		fullPage: true,
		path: await screenshotPath(
			testInfo,
			"people-onboarding-and-new-record.png"
		),
	});
	expect(browserErrors).toEqual([]);
});

test("filters the directory and detail together without exposing a hidden record", async ({
	page,
}) => {
	await page.addInitScript(
		(key) => localStorage.removeItem(key),
		"ryu.people.state.v1"
	);
	await page.goto("/");
	await expect(page.getByRole("heading", { name: "Maya Chen" })).toBeVisible();

	await page.getByLabel("People filter").selectOption("onboarding");
	await expect(page.getByRole("option", { name: /Sam Rivera/ })).toBeVisible();
	await expect(page.getByRole("option", { name: /Maya Chen/ })).toHaveCount(0);
	await expect(page.getByRole("heading", { name: "Sam Rivera" })).toBeVisible();
	await expect(page.getByLabel("Person status")).toHaveValue("onboarding");

	await page.getByLabel("People filter").selectOption("former");
	await expect(
		page.getByRole("heading", { name: "No one here" })
	).toBeVisible();
	await expect(page.getByLabel("Person status")).toHaveCount(0);
	await expect(page.getByRole("heading", { name: "Sam Rivera" })).toHaveCount(
		0
	);

	await page.getByLabel("People filter").selectOption("leave");
	await expect(page.getByRole("option", { name: /Lee Tan/ })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Lee Tan" })).toBeVisible();
});

test("retries a refused People load and creates a person from the empty-state action", async ({
	page,
}, testInfo) => {
	/*
	 * Retry keeps editing unavailable until People storage is read without issuing a write.
	 * The empty-state Add person action opens the form and writes a complete person record.
	 */
	await installPeopleHostFixture(page, { people: [], schemaVersion: 1 }, 3);
	await page.goto("/");
	await expect(
		page.getByText("People storage unavailable", { exact: true })
	).toBeVisible();
	await expect(
		page.getByText("Fixture rejected storage.get", { exact: true })
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Dismiss" })).toHaveCount(0);
	await expect(
		page.getByRole("button", { name: "Add person", exact: true })
	).toHaveCount(0);
	const hostCalls = () =>
		page.evaluate(() => window.__peopleHostFixture?.calls ?? []);
	expect(await hostCalls()).toEqual(
		Array.from({ length: 2 }, () => ({
			method: "storage.get",
			input: { key: "state.v1", namespace: "people" },
		}))
	);
	await page.getByRole("button", { name: "Retry", exact: true }).click();
	await expect(
		page.getByText("People storage unavailable", { exact: true })
	).toBeVisible();
	await expect(
		page.getByText("Fixture rejected storage.get", { exact: true })
	).toBeVisible();
	await expect.poll(async () => (await hostCalls()).length).toBe(3);
	expect((await hostCalls()).map((call) => call.method)).toEqual([
		"storage.get",
		"storage.get",
		"storage.get",
	]);
	expect(await page.evaluate(() => window.__peopleHostFixture?.stored)).toBe(
		JSON.stringify({ people: [], schemaVersion: 1 })
	);
	await page.getByRole("button", { name: "Retry", exact: true }).click();
	await expect(
		page.getByText("People storage unavailable", { exact: true })
	).toHaveCount(0);
	await expect(
		page.getByRole("button", { name: "Retry", exact: true })
	).toHaveCount(0);
	expect(await hostCalls()).toEqual(
		Array.from({ length: 4 }, () => ({
			method: "storage.get",
			input: { key: "state.v1", namespace: "people" },
		}))
	);
	await expect(
		page.getByRole("heading", { name: "Add someone to the team" })
	).toBeVisible();

	await page
		.locator(".people-detail")
		.getByRole("button", { name: "Add person" })
		.click();
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel("Name").fill("Riley Jordan");
	await dialog.getByLabel("Role").fill("Research lead");
	await dialog.getByLabel("Team").fill("Insights");
	await dialog.getByLabel("Start date").fill("2026-09-05");
	await dialog.getByLabel("Email (optional)").fill("RILEY@EXAMPLE.TEST");
	await dialog.getByRole("button", { name: "Add person" }).click();
	await expect(dialog).toBeHidden();
	await expect(
		page.getByRole("heading", { name: "Riley Jordan" })
	).toBeVisible();
	const persisted = normalizeState(
		JSON.parse(
			await page.evaluate(() => {
				const fixture = window.__peopleHostFixture;
				if (!fixture) {
					throw new Error("The local People storage fixture is missing.");
				}
				return fixture.stored;
			})
		)
	);
	expect(persisted.people).toContainEqual(
		expect.objectContaining({
			email: "riley@example.test",
			name: "Riley Jordan",
			role: "Research lead",
			startDate: "2026-09-05",
			status: "onboarding",
			team: "Insights",
		})
	);
	expect(persisted.schemaVersion).toBe(1);
	const calls = await page.evaluate(
		() => window.__peopleHostFixture?.calls ?? []
	);
	expect(calls.filter((call) => call.method === "storage.get")).toHaveLength(4);
	expect(calls.filter((call) => call.method === "storage.set")).toHaveLength(1);
	expect(
		calls
			.filter((call) => call.method === "storage.set")
			.map((call) => call.input)
	).toEqual([
		{ key: "state.v1", namespace: "people", value: JSON.stringify(persisted) },
	]);
	await page.screenshot({
		animations: "disabled",
		fullPage: true,
		path: await screenshotPath(testInfo, "people-empty-state-create.png"),
	});
});

test("storage refusal preserves existing records and Retry reads them before editing", async ({
	page,
}, testInfo) => {
	const seed: PeopleState = {
		people: [
			{
				id: "retained-person",
				name: "Retained teammate",
				email: "retained@example.test",
				role: "Operator",
				team: "Existing team",
				startDate: "2026-09-01",
				status: "active",
				notes: "Must survive refusal",
				onboarding: [],
			},
		],
		schemaVersion: 1,
	};
	await installPeopleHostFixture(page, seed, 2);
	await page.goto("/");
	await expect(
		page.getByText("People storage unavailable", { exact: true })
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Retained teammate", exact: true })
	).toHaveCount(0);
	expect(await page.evaluate(() => window.__peopleHostFixture?.stored)).toBe(
		JSON.stringify(seed)
	);
	expect(await page.evaluate(() => window.__peopleHostFixture?.calls)).toEqual(
		Array.from({ length: 2 }, () => ({
			method: "storage.get",
			input: { key: "state.v1", namespace: "people" },
		}))
	);
	await page.getByRole("button", { name: "Retry", exact: true }).click();
	await expect(
		page.getByRole("heading", { name: "Retained teammate", exact: true })
	).toBeVisible();
	await expect(page.getByLabel("Person team")).toHaveValue("Existing team");
	expect(await page.evaluate(() => window.__peopleHostFixture?.stored)).toBe(
		JSON.stringify(seed)
	);
	expect(await page.evaluate(() => window.__peopleHostFixture?.calls)).toEqual(
		Array.from({ length: 3 }, () => ({
			method: "storage.get",
			input: { key: "state.v1", namespace: "people" },
		}))
	);
	await page.screenshot({
		animations: "disabled",
		fullPage: true,
		path: await screenshotPath(
			testInfo,
			"people-storage-retry-retained-record.png"
		),
	});
});

const WRITE_SEED: PeopleState = {
	schemaVersion: 1,
	people: [
		{
			id: "write-person",
			name: "Write teammate",
			email: "write@example.test",
			role: "Operator",
			team: "Existing team",
			startDate: "2026-09-01",
			status: "onboarding",
			notes: "Keep all fields",
			onboarding: [{ id: "intro", title: "Meet the team", done: false }],
		},
		{
			id: "unrelated-person",
			name: "Unrelated teammate",
			email: "other@example.test",
			role: "Designer",
			team: "Research",
			startDate: "2026-08-01",
			status: "active",
			notes: "Untouched",
			onboarding: [],
		},
	],
};

for (const queued of [false, true]) {
	test(
		queued
			? "queued People write refusal cannot undo later acknowledged edit"
			: "refused People status write preserves original and exact retry readback",
		async ({ page }, testInfo) => {
			const errors: string[] = [];
			page.on("pageerror", (error) => errors.push(error.message));
			await installPeopleHostFixture(page, WRITE_SEED);
			await page.goto("/");
			await expect(
				page.getByRole("heading", { name: "Write teammate", exact: true })
			).toBeVisible();
			await page.evaluate((hold) => {
				const fixture = window.__peopleHostFixture;
				if (!fixture) {
					throw new Error("Missing People fixture");
				}
				if (hold) {
					fixture.holdNextSet = true;
				} else {
					fixture.failNextSet = 1;
				}
			}, queued);
			await page.getByLabel("Person status").selectOption("active");
			const first = {
				...WRITE_SEED,
				people: WRITE_SEED.people.map((person, index) =>
					index === 0 ? { ...person, status: "active" } : person
				),
			};
			const final = queued
				? {
						...first,
						people: first.people.map((person, index) =>
							index === 0 ? { ...person, startDate: "2026-10-05" } : person
						),
					}
				: first;
			if (queued) {
				await expect
					.poll(() =>
						page.evaluate(() => Boolean(window.__peopleHostFixture?.releaseSet))
					)
					.toBe(true);
				await page.getByLabel("Person start date").fill("2026-10-05");
				expect(
					await page.evaluate(() => window.__peopleHostFixture?.stored)
				).toBe(JSON.stringify(WRITE_SEED));
				await page.evaluate(() =>
					window.__peopleHostFixture?.releaseSet?.(false)
				);
			} else {
				await expect(page.getByText(/Changes were not saved/)).toBeVisible();
				await expect(page.getByLabel("Person status")).toHaveValue(
					"onboarding"
				);
				expect(
					await page.evaluate(() => window.__peopleHostFixture?.stored)
				).toBe(JSON.stringify(WRITE_SEED));
				await page.getByLabel("Person status").selectOption("active");
			}
			await expect
				.poll(() =>
					page.evaluate(() =>
						JSON.parse(window.__peopleHostFixture?.stored ?? "null")
					)
				)
				.toEqual(final);
			const writes = await page.evaluate(() =>
				window.__peopleHostFixture?.calls
					.filter((call) => call.method === "storage.set")
					.map((call) => {
						const input = call.input;
						return {
							...call,
							input: { ...input, value: JSON.parse(input.value) },
						};
					})
			);
			expect(writes).toEqual(
				[first, final].map((state) => ({
					method: "storage.set",
					input: { key: "state.v1", namespace: "people", value: state },
				}))
			);
			await page.reload();
			await expect(page.getByLabel("Person status")).toHaveValue("active");
			await expect(page.getByLabel("Person start date")).toHaveValue(
				queued ? "2026-10-05" : "2026-09-01"
			);
			expect(
				await page.evaluate(() =>
					JSON.parse(window.__peopleHostFixture?.stored ?? "null")
				)
			).toEqual(final);
			await page.screenshot({
				animations: "disabled",
				fullPage: true,
				path: await screenshotPath(
					testInfo,
					queued
						? "people-queued-write-refusal-readback.png"
						: "people-status-refusal-retry-readback.png"
				),
			});
			expect(errors).toEqual([]);
		}
	);
}

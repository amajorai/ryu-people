import { afterEach, expect, test } from "bun:test";
import { loadPeopleState, savePeopleState } from "./bridge.ts";
import { emptyState } from "./model.ts";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalStorage = Object.getOwnPropertyDescriptor(
	globalThis,
	"localStorage"
);

afterEach(() => {
	for (const [key, descriptor] of [
		["window", originalWindow],
		["localStorage", originalStorage],
	] as const) {
		if (descriptor) {
			Object.defineProperty(globalThis, key, descriptor);
		} else {
			Reflect.deleteProperty(globalThis, key);
		}
	}
});

function host(value: string | null) {
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: { ryu: { storage: { get: async () => value } } },
	});
}

test("missing storage is a fresh directory, while unreadable storage blocks editing", async () => {
	host(null);
	expect(await loadPeopleState()).toEqual({
		mode: "live",
		state: emptyState(),
	});
	for (const value of ["", "not-json", "null", "[]", "{}", '{"people":{}}']) {
		host(value);
		await expect(loadPeopleState()).rejects.toThrow("Reload before editing");
	}
});

test("saved people remain available after a storage read", async () => {
	host(
		JSON.stringify({ people: [{ id: "p1", name: "Alex", team: "Support" }] })
	);
	const loaded = await loadPeopleState();
	expect(loaded.state.people[0]).toMatchObject({
		id: "p1",
		name: "Alex",
		team: "Support",
	});
});

test("preview persistence failures reject instead of reporting a saved person", async () => {
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: {},
	});
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: {
			setItem: () => {
				throw new Error("quota exceeded");
			},
		},
	});
	await expect(savePeopleState(emptyState(), "demo")).rejects.toThrow(
		"not saved"
	);
});

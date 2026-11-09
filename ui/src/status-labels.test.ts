import { describe, expect, test } from "bun:test";
import {
	formatMessage,
	type MessageValuesInput,
	translate,
} from "@ryu/i18n/core";
// The provider registers its runtime here; a test registers a stand-in.
import {
	registerActiveI18nRuntime,
	unregisterActiveI18nRuntime,
} from "../../../../packages/i18n/src/active-locale.ts";
import { FILTERS } from "./App-filters.ts";
import { STATUS_LABELS, statusLabel } from "./status-labels.ts";
import type { PersonStatus } from "./types.ts";

const STATUSES: PersonStatus[] = ["onboarding", "active", "leave", "former"];

// Stand-in ja rows for the catalog rows the extractor adds for the labels.
const JA: Record<string, string> = {
	"Active employee": "在籍中",
	"Former employee": "退職者",
	"New hire": "新入社員",
	"On leave": "休職中",
};

function inJapanese<T>(read: () => T): T {
	const runtime = {
		direction: "ltr" as const,
		locale: "ja",
		translate(_id: string, values?: MessageValuesInput, fallback = "") {
			return formatMessage(JA[fallback] ?? fallback, values, "ja");
		},
	};
	registerActiveI18nRuntime(runtime);
	try {
		return read();
	} finally {
		unregisterActiveI18nRuntime(runtime);
	}
}

const english = (source: string) => source;

describe("person status labels", () => {
	test("every status reads as a state phrase, not the capitalised token", () => {
		for (const status of STATUSES) {
			const label = statusLabel(status, english);
			expect(label).not.toBe(status.charAt(0).toUpperCase() + status.slice(1));
			expect(label).toBe(STATUS_LABELS[status]);
		}
		expect(statusLabel("leave", english)).toBe("On leave");
		expect(statusLabel("onboarding", english)).toBe("New hire");
	});

	test("the filter options reuse the same labels and ids", () => {
		expect(FILTERS.map((filter) => filter.id)).toEqual(["all", ...STATUSES]);
		for (const status of STATUSES) {
			const filter = FILTERS.find((option) => option.id === status);
			expect(filter?.label).toBe(STATUS_LABELS[status]);
		}
	});

	test("under ja the label is translated, not the English word", () => {
		for (const status of STATUSES) {
			const label = inJapanese(() => statusLabel(status, (s) => translate(s)));
			expect(label).not.toBe(STATUS_LABELS[status]);
			expect(label).toBe(JA[STATUS_LABELS[status]] ?? "");
		}
		expect(inJapanese(() => statusLabel("leave", (s) => translate(s)))).toBe(
			"休職中"
		);
	});
});

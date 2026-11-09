import { afterEach, describe, expect, test } from "bun:test";
import { registerLiteralCatalogLoader } from "@ryu/i18n/core";
import { I18nProvider } from "@ryu/i18n/react";
import { renderToStaticMarkup } from "react-dom/server";
import { PeopleSummaryCounts } from "./App-people-summary.tsx";

const COUNTER =
	"{count, plural, one {<b>#</b> person} other {<b>#</b> people}}";

function render(locale: string, count: number): string {
	return renderToStaticMarkup(
		<I18nProvider
			autoLocalizeDom={false}
			initialLocale={locale}
			initialPackId={null}
		>
			<PeopleSummaryCounts
				active={count}
				onboarding={count}
				openSteps={count}
				people={count}
			/>
		</I18nProvider>
	);
}

afterEach(() => registerLiteralCatalogLoader(null));

describe("PeopleSummaryCounts", () => {
	test("keeps each number inside its counter in English", () => {
		expect(render("en", 1)).toContain("<strong>1</strong> person<");
		const html = render("en", 2);
		expect(html).toContain("<strong>2</strong> people");
		expect(html).toContain("<strong>2</strong> open steps");
	});

	test("lets Russian pick the plural form for the count", () => {
		registerLiteralCatalogLoader(() => ({
			[COUNTER]:
				"{count, plural, one {<b>#</b> человек} few {<b>#</b> человека} other {<b>#</b> человек}}",
		}));
		expect(render("ru", 3)).toContain("<strong>3</strong> человека");
		expect(render("ru", 5)).toContain("<strong>5</strong> человек");
	});
});

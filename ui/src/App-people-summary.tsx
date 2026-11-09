import { useRichLiteralMessages } from "@ryu/i18n/react";
import type { ReactNode } from "react";

const bold = { b: (chunks: ReactNode) => <strong>{chunks}</strong> };

/**
 * The People header counters. Each counter is one whole message with the number
 * inside it, so a language can inflect the noun for the count ("1 человек",
 * "3 человека") and place the number where its grammar wants.
 */
export function PeopleSummaryCounts({
	active,
	onboarding,
	openSteps,
	people,
}: {
	active: number;
	onboarding: number;
	openSteps: number;
	people: number;
}) {
	const tlRich = useRichLiteralMessages();
	return (
		<>
			<span>
				{tlRich(
					"{count, plural, one {<b>#</b> person} other {<b>#</b> people}}",
					{ count: people },
					bold
				)}
			</span>
			<span>
				{tlRich(
					"{count, plural, one {<b>#</b> active} other {<b>#</b> active}}",
					{ count: active },
					bold
				)}
			</span>
			<span>
				{tlRich(
					"{count, plural, one {<b>#</b> onboarding} other {<b>#</b> onboarding}}",
					{ count: onboarding },
					bold
				)}
			</span>
			<span>
				{tlRich(
					"{count, plural, one {<b>#</b> open step} other {<b>#</b> open steps}}",
					{ count: openSteps },
					bold
				)}
			</span>
		</>
	);
}

import {
	RyuAppActions,
	RyuAppDetail,
	RyuAppField,
} from "@ryu/blocks/companion/app-ui";
import { Badge } from "@ryu/ui/components/badge.tsx";
import { Input } from "@ryu/ui/components/input.tsx";
import {
	NativeSelect,
	NativeSelectOption,
} from "@ryu/ui/components/native-select.tsx";
import type { AppMode } from "./bridge.ts";
import { statusLabel } from "./model.ts";
import type { Person, PersonStatus } from "./types.ts";

interface PersonInspectorProps {
	mode: AppMode;
	person: Person;
	updateSelectedPerson: (patch: Partial<Person>) => void;
}

export function PersonInspector({
	mode,
	person,
	updateSelectedPerson,
}: PersonInspectorProps) {
	return (
		<RyuAppDetail className="people-panel people-inspector">
			<div className="people-inspector-heading">
				<p className="people-label">Person controls</p>
				<h2>Keep the record current.</h2>
				<p className="people-muted">
					Internal notes and status stay on this Ryu node.
				</p>
			</div>
			<div className="people-inspector-block">
				<RyuAppField label="Status">
					<NativeSelect
						aria-label="Person status"
						onChange={(event) =>
							updateSelectedPerson({
								status:
									/* SAFETY: The rendered select options use only values from this domain union. */ event
										.target.value as PersonStatus,
							})
						}
						value={person.status}
					>
						{(
							[
								"onboarding",
								"active",
								"leave",
								"former",
							] satisfies PersonStatus[]
						).map((status) => (
							<NativeSelectOption key={status} value={status}>
								{statusLabel(status)}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</RyuAppField>
				<RyuAppField label="Team">
					<Input
						aria-label="Person team"
						autoComplete="off"
						name="person-team"
						onChange={(event) =>
							updateSelectedPerson({ team: event.target.value })
						}
						value={person.team}
					/>
				</RyuAppField>
				<RyuAppField label="Start date">
					<Input
						aria-label="Person start date"
						name="person-start-date"
						onChange={(event) =>
							updateSelectedPerson({ startDate: event.target.value })
						}
						type="date"
						value={person.startDate}
					/>
				</RyuAppField>
			</div>
			<RyuAppActions className="people-inspector-actions">
				<Badge variant="outline">
					{mode === "demo" ? "Preview data" : "Node-owned data"}
				</Badge>
			</RyuAppActions>
		</RyuAppDetail>
	);
}

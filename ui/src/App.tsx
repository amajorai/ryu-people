import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	RyuAppEmpty,
	RyuAppList,
	RyuAppListItem,
	RyuAppMain,
	RyuAppSection,
	RyuAppToolbar,
} from "@ryu/blocks/companion/app-ui";
import { useLiteralMessages } from "@ryu/i18n/react";
import { Badge } from "@ryu/ui/components/badge.tsx";
import { Button } from "@ryu/ui/components/button.tsx";
import { Checkbox } from "@ryu/ui/components/checkbox.tsx";
import {
	NativeSelect,
	NativeSelectOption,
} from "@ryu/ui/components/native-select.tsx";
import {
	type SubmitEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	EMPTY_FORM,
	errorMessage,
	FILTERS,
	type Filter,
	matchesFilter,
	type NewPersonForm,
	statusVariant,
} from "./App-filters.ts";
import { NewPersonDialog } from "./App-new-person-dialog.tsx";
import { PersonInspector } from "./App-person-inspector.tsx";
import {
	type AppMode,
	loadPeopleState,
	notify,
	savePeopleState,
} from "./bridge.ts";
import {
	createPerson,
	formatDate,
	onboardingProgress,
	patchPerson,
	peopleStats,
	statusLabel,
	toggleOnboarding,
} from "./model.ts";
import type { PeopleState, Person } from "./types.ts";

export function App() {
	const tl = useLiteralMessages();
	const [state, setState] = useState<PeopleState | null>(null);
	const [mode, setMode] = useState<AppMode>(() =>
		window.ryu ? "live" : "demo"
	);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [filter, setFilter] = useState<Filter>("all");
	const [newOpen, setNewOpen] = useState(false);
	const [newForm, setNewForm] = useState<NewPersonForm>(EMPTY_FORM);
	const [formError, setFormError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const saveQueue = useRef(Promise.resolve());
	const savedState = useRef<PeopleState | null>(null);

	const visiblePeople = useMemo(
		() => state?.people.filter((item) => matchesFilter(item, filter)) ?? [],
		[state, filter]
	);
	const person = useMemo(
		() =>
			visiblePeople.find((item) => item.id === selectedId) ??
			visiblePeople[0] ??
			null,
		[visiblePeople, selectedId]
	);
	const stats = useMemo(() => peopleStats(state?.people ?? []), [state]);

	const commit = useCallback(
		(next: PeopleState) => {
			setState(next);
			const save = saveQueue.current.then(() => savePeopleState(next, mode));
			saveQueue.current = save.catch(() => undefined);
			return save.then(
				() => {
					savedState.current = next;
					setError(null);
					return true;
				},
				(cause: unknown) => {
					setError(
						tl("Changes were not saved. {error}", {
							error: errorMessage(cause),
						})
					);
					setState((current) =>
						current === next ? savedState.current : current
					);
					return false;
				}
			);
		},
		[mode, tl]
	);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const loaded = await loadPeopleState();
			setMode(loaded.mode);
			setState(loaded.state);
			savedState.current = loaded.state;
			setSelectedId(loaded.state.people[0]?.id ?? null);
		} catch (cause) {
			setError(errorMessage(cause));
			setState(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	function updateSelectedPerson(patch: Partial<Person>) {
		if (!(state && person)) {
			return;
		}
		commit(patchPerson(state, person.id, patch));
	}

	async function createNewPerson(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (creating) {
			return;
		}
		const name = newForm.name.trim();
		if (!name) {
			setFormError("Give this person a name.");
			return;
		}
		if (!state) {
			return;
		}
		const nextPerson = createPerson({ ...newForm, name });
		setCreating(true);
		const saved = await commit({
			...state,
			people: [nextPerson, ...state.people],
		});
		setCreating(false);
		if (!saved) {
			setFormError("The person was not saved. Try again.");
			return;
		}
		setSelectedId(nextPerson.id);
		setNewOpen(false);
		setNewForm(EMPTY_FORM);
		setFormError(null);
		notify({
			title: "Person added",
			description: nextPerson.name,
			variant: "success",
		});
	}

	function toggleStep(itemId: string) {
		if (!(state && person)) {
			return;
		}
		commit(toggleOnboarding(state, person.id, itemId));
	}

	if (loading) {
		return (
			<div className="people-loading" role="status">
				Opening People…
			</div>
		);
	}
	if (!state) {
		return (
			<RyuAppMain>
				<RyuAppEmpty
					actions={<Button onClick={() => void load()}>Retry</Button>}
					description={error ?? "People data could not be loaded."}
					title="People storage unavailable"
				/>
			</RyuAppMain>
		);
	}

	return (
		<div className="people-root">
			<RyuAppToolbar
				actions={
					<Button onClick={() => setNewOpen(true)} size="sm">
						<HugeiconsIcon aria-hidden="true" icon={Add01Icon} />
						Add person
					</Button>
				}
				title="People"
			/>
			<RyuAppMain className="people-main">
				{error ? (
					<div aria-live="polite" className="people-alert" role="alert">
						<span>{error}</span>
						<Button
							onClick={() => setError(null)}
							size="xs"
							variant="ghost-muted"
						>
							Dismiss
						</Button>
					</div>
				) : null}
				<div className="people-overview">
					<div>
						<h2>Team directory</h2>
						<p>Roles, onboarding, and leave status kept on this node.</p>
					</div>
					<div aria-label="People summary" className="people-summary">
						<span>
							<strong>{state.people.length}</strong> people
						</span>
						<span>
							<strong>{stats.active}</strong> active
						</span>
						<span>
							<strong>{stats.onboarding}</strong> onboarding
						</span>
						<span>
							<strong>{stats.openSteps}</strong> open steps
						</span>
					</div>
				</div>

				<div className="people-layout">
					<RyuAppSection className="people-panel people-list" title="People">
						<div className="people-filters">
							<NativeSelect
								aria-label="People filter"
								onChange={(event) =>
									setFilter(
										/* SAFETY: The rendered select options use only values from this domain union. */ event
											.target.value as Filter
									)
								}
								value={filter}
							>
								{FILTERS.map((item) => (
									<NativeSelectOption key={item.id} value={item.id}>
										{item.id === "all" ? "All people" : item.label}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</div>
						{visiblePeople.length > 0 ? (
							<RyuAppList
								aria-label="People directory"
								className="people-listbox"
							>
								{visiblePeople.map((item) => (
									<RyuAppListItem
										accessories={
											<Badge variant={statusVariant(item.status)}>
												{statusLabel(item.status)}
											</Badge>
										}
										key={item.id}
										onClick={() => setSelectedId(item.id)}
										selected={person?.id === item.id}
										subtitle={`${item.role} · ${item.team}`}
										title={item.name}
									/>
								))}
							</RyuAppList>
						) : (
							<RyuAppEmpty
								description="Add a person when you need to keep an internal handoff visible."
								title="No one here"
							/>
						)}
					</RyuAppSection>

					{person ? (
						<RyuAppSection className="people-panel people-detail">
							<div className="people-detail-heading">
								<div>
									<p className="people-label">Person</p>
									<h2>{person.name}</h2>
									<p className="people-muted">
										{person.role} · {person.team}
									</p>
								</div>
								<Badge variant={statusVariant(person.status)}>
									{statusLabel(person.status)}
								</Badge>
							</div>
							<div className="people-detail-meta">
								<div>
									<p className="people-label">Email</p>
									<strong>{person.email || "No email"}</strong>
								</div>
								<div>
									<p className="people-label">Start date</p>
									<strong>{formatDate(person.startDate)}</strong>
								</div>
							</div>

							<div className="people-onboarding">
								<div className="people-section-heading">
									<div>
										<h3>Onboarding</h3>
										<p className="people-muted">
											{tl("{progress}% complete", {
												progress: onboardingProgress(person),
											})}
										</p>
									</div>
									<Badge variant="outline">
										{tl("{length} steps", {
											length: person.onboarding.length,
										})}
									</Badge>
								</div>
								{person.onboarding.length > 0 ? (
									<div
										aria-label="Onboarding steps"
										className="people-step-list"
										role="list"
									>
										{person.onboarding.map((step) => (
											<label className="people-step" key={step.id}>
												<Checkbox
													checked={step.done}
													onCheckedChange={() => toggleStep(step.id)}
												/>
												<span>{step.title}</span>
											</label>
										))}
									</div>
								) : (
									<p className="people-empty-steps">
										No onboarding steps added.
									</p>
								)}
							</div>
							<div className="people-notes">
								<p className="people-label">Notes</p>
								<p>{person.notes || "No notes yet."}</p>
							</div>
						</RyuAppSection>
					) : (
						<RyuAppSection className="people-panel people-detail">
							<RyuAppEmpty
								actions={
									<Button onClick={() => setNewOpen(true)}>
										<HugeiconsIcon aria-hidden="true" icon={Add01Icon} />
										Add person
									</Button>
								}
								description="Keep the directory small enough to stay current."
								title="Add someone to the team"
							/>
						</RyuAppSection>
					)}

					{person ? (
						<PersonInspector
							mode={mode}
							person={person}
							updateSelectedPerson={updateSelectedPerson}
						/>
					) : null}
				</div>
			</RyuAppMain>

			<NewPersonDialog
				createNewPerson={createNewPerson}
				creating={creating}
				formError={formError}
				newForm={newForm}
				newOpen={newOpen}
				setFormError={setFormError}
				setNewForm={setNewForm}
				setNewOpen={setNewOpen}
			/>
		</div>
	);
}

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	RyuAppActions,
	RyuAppDetail,
	RyuAppEmpty,
	RyuAppField,
	RyuAppList,
	RyuAppListItem,
	RyuAppMain,
	RyuAppSection,
	RyuAppToolbar,
} from "@ryu/blocks/companion/app-ui";
import { Badge } from "@ryu/ui/components/badge.tsx";
import { Button } from "@ryu/ui/components/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ryu/ui/components/dialog.tsx";
import { Input } from "@ryu/ui/components/input.tsx";
import { Label } from "@ryu/ui/components/label.tsx";
import {
	NativeSelect,
	NativeSelectOption,
} from "@ryu/ui/components/native-select.tsx";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	type AppMode,
	loadPeopleState,
	notify,
	savePeopleState,
} from "./bridge.ts";
import {
	createPerson,
	formatDate,
	normalizeState,
	onboardingProgress,
	patchPerson,
	peopleStats,
	statusLabel,
	toggleOnboarding,
} from "./model.ts";
import type { PeopleState, Person, PersonStatus } from "./types.ts";

type Filter = "all" | PersonStatus;

const FILTERS: Array<{ id: Filter; label: string }> = [
	{ id: "all", label: "All" },
	{ id: "onboarding", label: "Onboarding" },
	{ id: "active", label: "Active" },
	{ id: "leave", label: "Leave" },
	{ id: "former", label: "Former" },
];

interface NewPersonForm {
	email: string;
	name: string;
	role: string;
	startDate: string;
	team: string;
}

const EMPTY_FORM: NewPersonForm = {
	email: "",
	name: "",
	role: "",
	startDate: "",
	team: "",
};

function errorMessage(cause: unknown): string {
	return cause instanceof Error
		? cause.message
		: "Something went wrong. Try again.";
}

function matchesFilter(person: Person, filter: Filter): boolean {
	return filter === "all" || person.status === filter;
}

function statusVariant(
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

export function App() {
	const [state, setState] = useState<PeopleState | null>(null);
	const [mode, setMode] = useState<AppMode>("demo");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [filter, setFilter] = useState<Filter>("all");
	const [newOpen, setNewOpen] = useState(false);
	const [newForm, setNewForm] = useState<NewPersonForm>(EMPTY_FORM);
	const [formError, setFormError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const person = useMemo(
		() =>
			state?.people.find((item) => item.id === selectedId) ??
			state?.people[0] ??
			null,
		[state, selectedId]
	);
	const visiblePeople = useMemo(
		() => state?.people.filter((item) => matchesFilter(item, filter)) ?? [],
		[state, filter]
	);
	const stats = useMemo(() => peopleStats(state?.people ?? []), [state]);

	const commit = useCallback(
		(next: PeopleState) => {
			setState(next);
			void savePeopleState(next, mode).catch((cause) =>
				setError(errorMessage(cause))
			);
		},
		[mode]
	);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const loaded = await loadPeopleState();
			setMode(loaded.mode);
			setState(loaded.state);
			setSelectedId(loaded.state.people[0]?.id ?? null);
		} catch (cause) {
			setError(errorMessage(cause));
			setState(normalizeState(null));
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

	function createNewPerson(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const name = newForm.name.trim();
		if (!name) {
			setFormError("Give this person a name.");
			return;
		}
		if (!state) {
			return;
		}
		const nextPerson = createPerson({ ...newForm, name });
		commit({ ...state, people: [nextPerson, ...state.people] });
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

	if (loading || !state) {
		return (
			<div className="people-loading" role="status">
				Opening People…
			</div>
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
								onChange={(event) => setFilter(event.target.value as Filter)}
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
											{onboardingProgress(person)}% complete
										</p>
									</div>
									<Badge variant="outline">
										{person.onboarding.length} steps
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
												<input
													checked={step.done}
													onChange={() => toggleStep(step.id)}
													type="checkbox"
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
												status: event.target.value as PersonStatus,
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
											] as PersonStatus[]
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
					) : null}
				</div>
			</RyuAppMain>

			<Dialog
				onOpenChange={(open) => {
					setNewOpen(open);
					if (!open) {
						setFormError(null);
					}
				}}
				open={newOpen}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Add person</DialogTitle>
						<DialogDescription>
							Keep internal people records on this node. Payroll and HRIS
							systems remain separate.
						</DialogDescription>
					</DialogHeader>
					<form className="people-form" onSubmit={createNewPerson}>
						<div className="people-form-fields">
							<div>
								<Label htmlFor="new-person-name">Name</Label>
								<Input
									autoComplete="off"
									id="new-person-name"
									name="new-person-name"
									onChange={(event) =>
										setNewForm((current) => ({
											...current,
											name: event.target.value,
										}))
									}
									placeholder="e.g. Maya Chen…"
									value={newForm.name}
								/>
							</div>
							<div>
								<Label htmlFor="new-person-role">Role</Label>
								<Input
									autoComplete="off"
									id="new-person-role"
									name="new-person-role"
									onChange={(event) =>
										setNewForm((current) => ({
											...current,
											role: event.target.value,
										}))
									}
									placeholder="e.g. Operations…"
									value={newForm.role}
								/>
							</div>
							<div>
								<Label htmlFor="new-person-team">Team</Label>
								<Input
									autoComplete="off"
									id="new-person-team"
									name="new-person-team"
									onChange={(event) =>
										setNewForm((current) => ({
											...current,
											team: event.target.value,
										}))
									}
									placeholder="e.g. Product…"
									value={newForm.team}
								/>
							</div>
							<div>
								<Label htmlFor="new-person-start-date">Start date</Label>
								<Input
									id="new-person-start-date"
									name="new-person-start-date"
									onChange={(event) =>
										setNewForm((current) => ({
											...current,
											startDate: event.target.value,
										}))
									}
									type="date"
									value={newForm.startDate}
								/>
							</div>
							<div className="people-form-wide">
								<Label htmlFor="new-person-email">Email (optional)</Label>
								<Input
									autoComplete="off"
									id="new-person-email"
									name="new-person-email"
									onChange={(event) =>
										setNewForm((current) => ({
											...current,
											email: event.target.value,
										}))
									}
									placeholder="name@example.com…"
									type="email"
									value={newForm.email}
								/>
							</div>
						</div>
						{formError ? (
							<p aria-live="polite" className="people-form-error" role="alert">
								{formError}
							</p>
						) : null}
						<DialogFooter>
							<Button type="submit">Add person</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}

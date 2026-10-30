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
import type { Dispatch, SetStateAction, SubmitEvent } from "react";
import type { NewPersonForm } from "./App-filters.ts";

interface NewPersonDialogProps {
	createNewPerson: (event: SubmitEvent<HTMLFormElement>) => void;
	creating: boolean;
	formError: string | null;
	newForm: NewPersonForm;
	newOpen: boolean;
	setFormError: Dispatch<SetStateAction<string | null>>;
	setNewForm: Dispatch<SetStateAction<NewPersonForm>>;
	setNewOpen: Dispatch<SetStateAction<boolean>>;
}

export function NewPersonDialog({
	createNewPerson,
	creating,
	formError,
	newForm,
	newOpen,
	setFormError,
	setNewForm,
	setNewOpen,
}: NewPersonDialogProps) {
	return (
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
						Keep internal people records on this node. Payroll and HRIS systems
						remain separate.
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
						<Button disabled={creating} type="submit">
							{creating ? "Saving…" : "Add person"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

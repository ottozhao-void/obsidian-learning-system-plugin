import {App, Modal, Setting} from "obsidian";
import {CentralProcessor, Observer} from "../CentralProcessor";
import {EXERCISE_STATUSES, EXERCISE_STATUSES_OPTION, EXERCISE_SUBJECT} from "./constants";
import {observer} from "obsidian-excalidraw-plugin/lib/MarkdownPostProcessor";


export class BaseModal extends Modal implements Partial<Observer>{
	cpu: CentralProcessor;
	choice:string;
	private _selected: boolean;

	constructor(app: App, cpu:CentralProcessor){
		super(app);
		this.cpu = cpu;
	}

	react(message: string) {
		if (message == "BaseSelect") {
			this.open();
		}
	}

	notify(message: string) {this.observers.forEach(ob => ob.react(message))};

	// Observers
	// BaseSelected
		// BaseInterface
	observers: Observer[];

	set selected(value: boolean) {
		value? this.notify("BaseChoiceMade") : null
	}

	onOpen() {
		this.contentEl.createEl("h1",{text:"Exercise Base Selection"})

		new Setting(this.contentEl)
			.addDropdown((dp => {
				this.cv = dp
					.addOptions(Object.values(EXERCISE_SUBJECT).reduce<Record<string, string>>(
						(acc,item)=>{
							acc[item] = item;
							return acc;
						}, {})).getValue();

				dp
					.onChange(choice => {
						this.choice	 = choice
					})
			}))

		new Setting(this.contentEl)
			.addButton(bt => {
				bt
					.setCta()
					.setButtonText("Confirm")
					.onClick(()=>{
						// this.cpu.activeBase = this.cpu.bases[this.cv];
						this.selected
						this.close();
					})
			})
	}

	onClose() {
		this.contentEl.empty();
	}
}


export class AssessModal extends Modal {
	status: EXERCISE_STATUSES;
	cpu: CentralProcessor
	remark: string;

	constructor(app:App,cpu: CentralProcessor) {
		super(app);
		this.cpu = cpu;
	}

	onOpen() {

		this.contentEl.createEl("h1",{text:"Assess"})

		// Set Status
		new Setting(this.contentEl)
			.addDropdown(dp => {
				dp.addOptions(EXERCISE_STATUSES_OPTION);
				this.status = dp.getValue() as EXERCISE_STATUSES;
				dp
					.onChange(v => {
						this.status = v as EXERCISE_STATUSES;
					})

			});

		// Set Remark
		new Setting(this.contentEl)
			.setName("Exercise Summary")
			.setDesc("You can write down your brilliant ideas about this exercise")
			.addTextArea(ta => {
				ta
					.onChange(v => {
						this.remark = v
					})
			})

		// Close Button
		new Setting(this.contentEl)
			.addButton(bt => {
				bt
					.setButtonText("Confirm")
					.setCta()
					.onClick(()=>{
						if (this.cpu.activeExercise){
							this.cpu.activeExercise?.setStatus(this.status);
							this.cpu.activeExercise?.setRemark(this.remark);
							this.cpu.closeUpCurrentExercise();
							this.close();
						}
					})
			})

		new Setting(this.contentEl)
			.addButton(bt => {
				bt
					.setButtonText("Quit Exercise Without Saving")
					.setCta()
					.onClick(() => {
						this.cpu.closeUpCurrentExercise(true);
						this.close();
					})
			})

	}

	onClose() {
		this.contentEl.empty();
	}
}

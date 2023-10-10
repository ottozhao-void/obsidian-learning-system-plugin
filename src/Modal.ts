import {App, Modal, Notice, Setting} from "obsidian";
import {
	EXERCISE_STATUSES,
	EXERCISE_STATUSES_OPTION,
	EXERCISE_SUBJECT,
	QUERY_STRATEGY,
	QUERY_STRATEGY_SWAPPED
} from "./constants";
import {DataProcessor} from "../DataProcessor";
import MyPlugin from "../main";
import {ExerciseBase} from "../ExerciseBase";


export class AssessModal extends Modal {
	status: EXERCISE_STATUSES;
	cpu: DataProcessor
	remark: string;

	constructor(app:App,cpu: DataProcessor) {
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

export class BaseModal extends Modal {
	cpu: DataProcessor;
	cv:string;
	strategy: QUERY_STRATEGY;

	constructor(app: App, cpu:DataProcessor){
		super(app);
		this.cpu = cpu;
	}

	onOpen() {
		this.contentEl.createEl("h1",{text:"Exercise Base Selection"})

		new Setting(this.contentEl)
			.setName("Query Strategy")
			.addDropdown(dp=>{
				this.strategy = dp.addOptions(QUERY_STRATEGY_SWAPPED).getValue() as QUERY_STRATEGY
				dp
					.onChange(async (value:QUERY_STRATEGY) => {
						this.strategy = value
					})
			})

		new Setting(this.contentEl)
			.addDropdown((dp => {
				this.cv = dp
					.addOptions(Object.values(EXERCISE_SUBJECT).reduce<Record<string, string>>(
						(acc,item)=>{
							acc[item] = item;
							return acc;
						}, {})).getValue();

				dp
					.onChange(v => {
						this.cv	 = v
					})
			}))

		new Setting(this.contentEl)
			.addButton(bt => {
				bt
					.setCta()
					.setButtonText("Confirm")
					.onClick(()=>{
						this.cpu.activeBase = this.cpu.bases[this.cv];
						this.cpu.activeBase.strategy = this.strategy
						this.close();
					})
			})
	}
	onClose() {
		this.contentEl.empty();
	}
}

export class DeleteExerciseModal extends Modal {
	result: string
	plugin: MyPlugin
	option:string

	constructor(app:App, plugin:MyPlugin) {
		super(app);
		this.plugin = plugin
	}

	onOpen() {
		this.contentEl.createEl("h1",{text:"Assess"})

		new Setting(this.contentEl)
			.addDropdown((dp => {
				this.option = dp
					.addOptions(Object.values(EXERCISE_SUBJECT).reduce<Record<string, string>>(
						(acc,item)=>{
							acc[item] = item;
							return acc;
						}, {})).getValue();

				dp
					.onChange(v => {
						this.option	 = v
					})
			}))

		new Setting(this.contentEl)
			.addTextArea(cb => {
				cb.onChange((value)=>{
					this.result = value
				})
			})

		new Setting(this.contentEl)
			.addButton(bt => {
				bt
					.setCta()
					.setButtonText("Confirm")
					.onClick(async ()=>{
						await ExerciseBase.deleteExerciseFromBaseFile(this.plugin.cpu.bases[this.option], this.result)
						this.close();
					})
			})
	}

	onClose() {
		this.contentEl.empty();
	}


}

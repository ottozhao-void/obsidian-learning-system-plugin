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

// export class BaseModal extends Modal {
// 	cpu: DataProcessor;
// 	cv:string;
// 	strategy: QUERY_STRATEGY;
//
// 	constructor(app: App, cpu:DataProcessor){
// 		super(app);
// 		this.cpu = cpu;
// 	}
//
// 	onOpen() {
// 		this.contentEl.createEl("h1",{text:"Exercise Base Selection"})
//
// 		new Setting(this.contentEl)
// 			.setName("Active Base")
// 			.setDesc(`${this.cpu.activeBase ? `${this.cpu.activeBase?.subject}` : "No Running Base"}`)
// 			.addTextArea(cb => {
// 				cb.setValue(`${this.cpu.activeBase ? `${this.cpu.activeBase?.subject}` : "No Running Base"}`)
// 			})
//
// 		new Setting(this.contentEl)
// 			.setName("Active Exercise")
// 			.setDesc(`${this.cpu.activeExercise ?
// 				`Active Exercise id: ${this.cpu.activeExercise?.id}` :
// 				"No Running Exercise"}`)
// 			.addTextArea(cb => {
// 				cb.setValue(`${this.cpu.activeExercise ?
// 					`Active Exercise id: ${this.cpu.activeExercise?.id}` :
// 				"No Running Exercise"}`)
// 			})
//
//
// 		new Setting(this.contentEl)
// 			.setName("Query Strategy")
// 			.addDropdown(dp=>{
// 				this.strategy = dp.addOptions(QUERY_STRATEGY_SWAPPED).getValue() as QUERY_STRATEGY
// 				dp
// 					.onChange(async (value:QUERY_STRATEGY) => {
// 						this.strategy = value
// 					})
// 			})
//
// 		new Setting(this.contentEl)
// 			.addDropdown((dp => {
// 				this.cv = dp
// 					.addOptions(Object.values(EXERCISE_SUBJECT).reduce<Record<string, string>>(
// 						(acc,item)=>{
// 							acc[item] = item;
// 							return acc;
// 						}, {})).getValue();
//
// 				dp
// 					.onChange(v => {
// 						this.cv	 = v
// 					})
// 			}))
//
//
// 		new Setting(this.contentEl)
// 			.addButton(bt => {
// 				bt
// 					.setCta()
// 					.setButtonText("Confirm")
// 					.onClick(()=>{
// 						this.cpu.activeBase = this.cpu.bases[this.cv];
// 						this.cpu.activeBase.strategy = this.strategy
// 						this.close();
// 					})
// 			})
// 		new Setting(this.contentEl)
// 			.addButton(bt => {
// 				bt
// 					.setWarning()
// 					.setButtonText("Quit Exercising")
// 					.onClick(()=>{
// 						this.cpu.activeBase = undefined;
// 						this.close();
//
// 					})
// 			})
// 	}
// 	onClose() {
// 		this.contentEl.empty();
// 	}
// }
export class BaseModal extends Modal {
	cpu: DataProcessor;
	subjectOption: string;

	constructor(app: App, cpu: DataProcessor) {
		super(app);
		this.cpu = cpu;
	}

	onOpen() {
		// Modal Header
		const modalHeader = this.contentEl.createEl('div', { cls: 'modal-header' });
		modalHeader.createEl('h1', { text: "Exercise Base" });

		// Modal Content
		const subjectDiv = this.contentEl.createEl('div');
		subjectDiv.createEl("h2", {text: "Subject", cls: "h2-div"})
		const baseConfig = this.contentEl.createEl('div');

		const settingExerciseSubject = subjectDiv.createEl('div', { cls: 'setting' });
		settingExerciseSubject.createEl('label', { cls: 'setting-label', text: 'Exercise Subject' });
		new Setting(settingExerciseSubject)
			.setClass("btn-subject")
			.addDropdown(dp => {
				this.subjectOption = dp.addOptions(["null"].concat(Object.values(EXERCISE_SUBJECT)).reduce<Record<string, string>>(
					(acc, item) => {
						acc[item] = item;
						return acc;
					}, {})).getValue();
				dp.onChange(option => {
					this.subjectOption = option;
					this.cpu.activeBase = this.cpu.bases[this.subjectOption];
					baseConfig.empty();
					this.initializeBaseConfig(baseConfig);
				})

				this.cpu.activeBase = this.cpu.bases[this.subjectOption];

			})



		//
		//
		// // Exercise Information Header
		// const exerciseInfo = this.contentEl.createEl("div")
		//
		// exerciseInfo
		// 	.createEl("div", {cls: "exerciseInfoHeader"})
		// 	.createEl("h1", {text: "Active Exercise Information"});
		//
		// const settingBase = exerciseInfo.createEl('div', { cls: 'setting' });
		// settingBase.createEl('label', { cls: 'setting-label', text: 'Active Base' });
		// settingBase.createEl('p', { cls: 'setting-description', text: this.cpu.activeBase ? `${this.cpu.activeBase?.subject}` : "No Running Base" });
		//
		// const settingExercise = exerciseInfo.createEl('div', { cls: 'setting' });
		// settingExercise.createEl('label', { cls: 'setting-label', text: 'Active Exercise' });
		// settingExercise.createEl('p', { cls: 'setting-description', text: this.cpu.activeExercise ? `${this.cpu.activeExercise?.id}` : "No Running Exercise" });



		// Modal Footer
		const modalFooter = this.contentEl.createEl('div', { cls: 'modal-footer' });

		new Setting(modalFooter)
			.setClass("btn")
			.addButton(bt => {
				bt.setWarning()
					.setButtonText("Quit Exercising")
					.onClick(() => {
						this.cpu.activeBase = undefined;
						this.close();
					});
			});

		new Setting(modalFooter)
			.setClass("btn")
			.addButton(bt => {
				bt.setCta()
					.setButtonText("Confirm")
					.onClick(() => {
						this.close();
					});
			});

	}

	onClose() {
		this.contentEl.empty();
	}

	initializeBaseConfig(baseConfig: HTMLDivElement) {
		baseConfig.createEl("h2", {text: "Base Configuration", cls: "h2-div"})
		// Setting: Query Strategy
		const settingQueryStrategy = baseConfig.createEl('div', { cls: 'setting' });
		settingQueryStrategy.createEl('label', { cls: 'setting-label', text: 'Query Strategy' });
		new Setting(settingQueryStrategy)
			.setClass("btn-exerciseBase")
			.addDropdown(dp => {
				if (this.cpu.activeBase){
					const activeBase = this.cpu.activeBase;
					activeBase.strategy = dp.addOptions(QUERY_STRATEGY_SWAPPED).getValue() as QUERY_STRATEGY;
					dp.onChange(async (value: QUERY_STRATEGY) => {
						activeBase.strategy = value;
					});
				}
			});

		const settingContext = baseConfig.createEl("div", {cls: "setting"});
		settingContext.createEl(`label`, { cls: 'setting-label', text: 'Context' })
		const contextOptions = new Setting(settingContext)
			.setClass("btn-exerciseBase")
			.addDropdown(dp => {
				if (this.cpu.activeBase){
					const activeBase = this.cpu.activeBase;
					dp.addOptions(this.cpu.activeBase.contextOptions_)
						.onChange(value => {
							activeBase.activeContext_ = value;
						})
					activeBase.activeContext_ = dp.getValue();
				}
				else dp.addOption("null", "null");
			});
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

import {App, EventRef, Modal, Notice, Plugin, Setting, TAbstractFile} from 'obsidian';
import {
	EXERCISE_BASE,
	EXERCISE_STATUSES,
	EXERCISE_STATUSES_SWAPPED,
	EXERCISE_SUBJECT,
	ExerciseBase
} from "./ExerciseBase";
import {ExcalidrawFile} from "./Excalidraw";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {getAPI} from "obsidian-dataview";
import {DataProcessor} from "./DataProcessor";
import {parseJSON} from "./src/utility/parser";

// Remember to rename these classes and interfaces!

interface HelloWorldPlugin {
	mySetting: string;
}

export default class MyPlugin extends Plugin {
	settings: HelloWorldPlugin;

	cpu: DataProcessor;

	baseModal: BaseModal;

	onExFileChangeRef: EventRef;

	dataviewAPI: DataviewApi | undefined = getAPI(this.app);


	async onload() {
		// await this.loadSettings();
		this.cpu = await DataProcessor.init(this.app);
		this.baseModal = new BaseModal(this.app,this.cpu)
		this.onExFileChangeRef =  this.app.vault.on("modify", this.onExcalidrawFileChange, this);


		this.addCommand({
			id: "switch-base",
			name: "Switch Base",
			callback: () => {
				this.baseModal.open();
			}
		})

		this.addCommand({
			id: "close-base",
			name: "Close Base",
			callback: () => {
				this.cpu.activeBase = undefined;
			}
		})

		// this.addCommand({
		// 	id: "reload-all-bases",
		// 	name: "Reload All Bases",
		// 	callback: async () => {
		// 		ExerciseBase.reloadAll(this.app);
		// 	}
		// })

		// If the plugin hooks up any global DOM events (on parts of the app_ that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'keydown', (ev) => {
			if (ev.ctrlKey && ev.shiftKey && ev.key == "A") {
				if(!this.cpu.activeBase) {
					new Notice("No Base is selected!")
					this.baseModal.open();
				}
				else {
					if (this.cpu.activeExercise) {
						new Notice("An active exercise is running!")
					}
					else {
						this.cpu.run();
					}
				}

			}
		});

		this.registerDomEvent(document, 'keydown', (ev) => {
			if (ev.ctrlKey && ev.shiftKey && ev.key == "S") {
				if(!this.cpu.activeExercise) new Notice("Currently, No Exercise is active!")
				else {
					new AssessModal(this.app,this.cpu).open()
					new Notice("Successfully closed the active exercise")

				}
			}
		});
		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(async () => {console.log(this.activeBase)}, 3 * 1000));
	}

	// private async initStatFile() {
	// 	const sfn = getDailyDfNameTemplate();
	// 	const sfExists: boolean = this.app.metadataCache.getFirstLinkpathDest(sfn, sfn) !== null;
	// 	if (!sfExists) {
	// 		this.statFile = new StatFile(this.app, sfn);
	// 		await this.statFile.create()
	// 	}
	// 	else {
	// 		// Read the data from the existing file and create a new SF object
	// 		const dailyData = StatFile.parseFrontmatter(await this.dataviewAPI?.io.load(sfn) as string);
	// 		this.statFile = new StatFile(this.app,sfn,dailyData);
	// 	}
	// 	Object.values(this.planner.exerciseBases).forEach(eb => eb.dataProcessor = new DataProcessor(this.statFile,eb))
	//
	// }

	private async onExcalidrawFileChange(file: TAbstractFile): Promise<void> {
		console.log(`${file.name} Changed!`);
		new Notice(`${file.name} Changed!`, 3000);
		const tFile = this.app.metadataCache.getFirstLinkpathDest(file.path,file.path);
		const fileName = tFile?.basename ? tFile?.basename : "";
		const excalidrawFile: ExcalidrawFile | undefined = this.cpu.bases[EXERCISE_SUBJECT.MATH]
			.excalidraws_[fileName] || this.cpu.bases[EXERCISE_SUBJECT.DSP]
			.excalidraws_[fileName] || this.cpu.bases[EXERCISE_SUBJECT.POLITICS]
			.excalidraws_[fileName];
		// if (excalidrawFile) excalidrawFile.checkAndUpdateForNewExercise()
		if (excalidrawFile) {
			excalidrawFile.currentContent = await excalidrawFile.read()
			excalidrawFile.elements = parseJSON(excalidrawFile.currentContent).elements;
			new Notice(`Previous number of exercises in excalidrawFile file: ${excalidrawFile.previeousExerciseArray.size}\n\nCurrent number of exercises in excalidrawFile file: ${excalidrawFile.exerciseArray.size}`, 2000);

			const newLTArray = excalidrawFile.filterForNewExercise();
			const deletedLTArray = excalidrawFile.filterForDeletedExercise();
			if (newLTArray.length > 0 || deletedLTArray.length > 0) {
				this.cpu.bases[excalidrawFile.subject].update("delete", deletedLTArray);
				this.cpu.bases[excalidrawFile.subject].update("create",newLTArray);
				excalidrawFile.previeousExerciseArray = new Set(excalidrawFile.exerciseArray);
			}
		}
	}

	onunload() {
		this.app.vault.offref(this.onExFileChangeRef);
	}

	async update(){
		for (let subject of Object.keys(EXERCISE_BASE)) {
			let n = 0;
			const nb = await ExerciseBase.migrateFromOBtoNB(this.app, EXERCISE_BASE[subject]);
			nb.size = nb.exercises.length;
			nb.exercises.forEach((ex)=>{ex.state === EXERCISE_STATUSES.Laser? n++ : -1})
			nb.items_completed = n;
			await nb.save(nb.jsonify());
		}
	}

	// async loadSettings() {
	// 	this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	// }
	//
	// async saveSettings() {
	// 	await this.saveData(this.settings);
	// }

}

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
				dp.addOptions(EXERCISE_STATUSES_SWAPPED);
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

		// new Setting(this.contentEl)
		// 	.addButton(bt => {
		// 		bt
		// 			.setButtonText("Quit Exercise Without Saving")
		// 			.setCta()
		// 			.onClick(() => {
		// 				this.cpu.activeBase?.earlyExerciseCLose();
		// 				this.close();
		// 			})
		// 	})

	}

	onClose() {
		this.contentEl.empty();
	}
}
export class BaseModal extends Modal {
	cpu: DataProcessor;
	cv:string;

	constructor(app: App, cpu:DataProcessor){
		super(app);
		this.cpu = cpu;
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
						this.close();
					})
			})
	}
	onClose() {
		this.contentEl.empty();
	}
}

// class SampleSettingTab extends PluginSettingTab {
// 	plugin: MyPlugin;
//
// 	constructor(app_: App, plugin: MyPlugin) {
// 		super(app_, plugin);
// 		this.plugin = plugin;
// 	}
//
// 	display(): void {
// 		const {containerEl} = this;
//
// 		containerEl.empty();
//
// 		new Setting(containerEl)
// 			.setName('Setting #1')
// 			.setDesc('It\'s a secret')
// 			.addText(text => text
// 				.setPlaceholder('Enter your secret')
// 				.setValue(this.plugin.settings.mySetting)
// 				.onChange(async (value) => {
// 					this.plugin.settings.mySetting = value;
// 					await this.plugin.saveSettings();
// 				}));
// 	}
// }

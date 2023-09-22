import {
	App,
	Editor,
	EventRef,
	MarkdownView,
	Modal,
	moment,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	Menu,
	View, TAbstractFile, TFile
} from 'obsidian';
import {Exercise} from 'Exercise'
import {ExerciseBase, EXERCISE_STATUSES, EXERCISE_STATUSES_SWAPPED, EXERCISE_SUBJECT} from "./ExerciseBase";
import {ExcalidrawElement, ExcalidrawFile} from "./Excalidraw";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {getAPI} from "obsidian-dataview";
import {Planner} from "./Planner";
import {DAILY_DF_NAME_TEMPLATE, StatFile} from "./DataProcessor";


// Remember to rename these classes and interfaces!

interface HelloWorldPlugin {
	mySetting: string;
}

const DEFAULT_SETTINGS: HelloWorldPlugin = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: HelloWorldPlugin;
	planner = new Planner(this.app);
	baseModal = new BaseModal(this.app,this);
	activeBase: ExerciseBase | undefined;
	onExFileChangeRef: EventRef;
	statFile: StatFile;



	async onload() {
		await this.loadSettings();
		this.onExFileChangeRef =  this.app.vault.on("modify", this.onExcalidrawFileChange, this);
		setTimeout(async () => {await this.planner.initialize()}, 1000);
		this.initStatFile();

		this.addCommand({
			id: "switch-base",
			name: "Switch Base",
			callback: () => {
				new BaseModal(this.app,this).open();
				this.planner.loadAllBases();
			}
		})

		this.addCommand({
			id: "close-base",
			name: "Close Base",
			callback: () => {
				this.activeBase = undefined;
			}
		})

		this.addCommand({
			id: "reload-all-bases",
			name: "Reload All Bases",
			callback: async () => {
				this.planner.loadAllBases();
			}
		})

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'keydown', (ev) => {
			if (ev.ctrlKey && ev.shiftKey && ev.key == "A") {
				if(!this.activeBase) {
					new Notice("No Base is selected!")
					this.baseModal.open();
				}
				else {
					if (this.activeBase.activeExercise) {
						new Notice("An active exercise is running!")
					}
					else {
						this.activeBase.query();
					}
				}

			}
		});

		this.registerDomEvent(document, 'keydown', (ev) => {
			if (ev.ctrlKey && ev.shiftKey && ev.key == "S") {
				if(!this.activeBase?.activeExercise) new Notice("Currently, No Exercise is active!")
				else {
					new AssessModal(this.app,this).open()
					new Notice("Successfully closed the active exercise")

				}
			}
		});
		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(async () => {console.log(this.activeBase)}, 3 * 1000));
	}

	private async onExcalidrawFileChange(file: TAbstractFile): Promise<void> {
		console.log(`${file.name} Changed!`);
		new Notice(`${file.name} Changed!`, 3000);
		const tFile = this.app.metadataCache.getFirstLinkpathDest(file.path,file.path);
		const fileName = tFile?.basename ? tFile?.basename : "";
		const excalidrawFile: ExcalidrawFile | undefined = this.planner.exerciseBases[EXERCISE_SUBJECT.MATH]
			.excalidrawFiles[fileName] || this.planner.exerciseBases[EXERCISE_SUBJECT.DSP]
			.excalidrawFiles[fileName] || this.planner.exerciseBases[EXERCISE_SUBJECT.POLITICS]
			.excalidrawFiles[fileName];
		if (excalidrawFile) excalidrawFile.checkAndUpdateForNewExercise()
	}

	onunload() {
		this.app.vault.offref(this.onExFileChangeRef);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	//TODO Don't forget to implement this method
	// - 如果当日的StatFile 不存在，那么创建一个新的StatFile, 并将其初始值写入一个新的Obsidian文件
	// - 如果当日的StatFile 存在， 直接读取数据，并创建一个runtime StatFile Object, 用于数据的动态更新
	// - 再创建一个DataProcessor
	// - 将创建的 DataProcessor 挂在 this 上面
	private async initStatFile() {
		const sfn = DAILY_DF_NAME_TEMPLATE();
		const sfExists: boolean = this.app.metadataCache.getFirstLinkpathDest(sfn, sfn) !== null;
		if (!sfExists) {
			this.statFile = new StatFile(sfn);
			await this.statFile.create()
		}
		else {
			// Read the data from the existing file and create a new SF object
			const dailyData =
			this.statFile = new StatFile(sfn)
		}
	}
}
export class AssessModal extends Modal {
	option: string;
	plugin: MyPlugin
	remark: string;

	constructor(app:App,plugin:MyPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {

		this.contentEl.createEl("h1",{text:"Hello World"})

		new Setting(this.contentEl)
			.addDropdown(dp => {
				dp.addOptions(EXERCISE_STATUSES_SWAPPED);
				this.option = dp.getValue();
				dp
					.onChange(v => {
					this.option = v;
				})

			});

		new Setting(this.contentEl)
			.setName("Exercise Summary")
			.setDesc("You can write down your brilliant ideas about this exercise")
			.addTextArea(ta => {
				ta
					.onChange(v => {
						this.remark = v
					})
			})

		new Setting(this.contentEl)
			.addButton(bt => {
				bt
					.setButtonText("Confirm")
					.setCta()
					.onClick(()=>{
						if (this.plugin.activeBase?.activeExercise){
							this.plugin.activeBase.activeExercise.setStatus(this.option);
							this.plugin.activeBase.activeExercise.setRemark(this.remark);
							this.plugin.activeBase.closeExercise();
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
						this.plugin.activeBase?.earlyExerciseCLose();
						this.close();
					})
			})

	}

	onClose() {
		this.contentEl.empty();
	}
}
export class BaseModal extends Modal {
	plugin: MyPlugin;
	cv:string;

	constructor(app: App, plugin:MyPlugin){
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		this.contentEl.createEl("h1",{text:"Hello World"})

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
						this.plugin.activeBase = this.plugin.planner.exerciseBases[this.cv];
						this.close();
					})
			})
	}
	onClose() {
		this.contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

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
	View, TAbstractFile
} from 'obsidian';
import {Exercise, BaseMaintainer} from 'Exercise'
import {ExerciseBase} from "./ExerciseBase";
import {ExcalidrawElement, ExcalidrawFile} from "./Excalidraw";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {getAPI} from "obsidian-dataview";


// Remember to rename these classes and interfaces!

interface HelloWorldPlugin {
	mySetting: string;
}

const DEFAULT_SETTINGS: HelloWorldPlugin = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: HelloWorldPlugin;
	mechanism = new BaseMaintainer(this.app);
	baseModal = new BaseModal(this.app,this);
	activeBase: ExerciseBase;
	onExFileChangeRef: EventRef;



	async onload() {
		await this.loadSettings();
		this.onExFileChangeRef =  this.app.vault.on("modify", this.onExcalidrawFileChange, this);


		this.addCommand({
			id: "change-allExercises",
			name: "Change to another exercise allExercises",
			callback: () => {
				new BaseModal(this.app,this).open();
				this.mechanism.initialize()
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
		setTimeout(async () => {await this.mechanism.initialize()}, 1000);
		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(async () => {console.log(this.activeBase)}, 3 * 1000));
	}

	private async onExcalidrawFileChange(file: TAbstractFile): Promise<void> {
		// console.log(this.mechanism);
		console.log(`${file.name} Changed!`);
		const fileName = file.name.split(".").slice(0,file.name.split(".").length-1).join(".");
		const changedExFile: ExcalidrawFile | undefined = this.mechanism.exerciseBases["math"]
			.excalidrawFiles[fileName] || this.mechanism.exerciseBases["DSP"]
			.excalidrawFiles[fileName];
		if (changedExFile) changedExFile.checkAndUpdateForNewExercise();
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
				dp.addOptions({
					"laser": "Laser",
					"stumble": "Stumble",
					"drifter":"Drifter",
				});
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
						if (this.plugin.activeBase.activeExercise){
							this.plugin.activeBase.activeExercise.setStatus(this.option);
							this.plugin.activeBase.activeExercise.setRemark(this.remark);
							this.plugin.activeBase.closeExercise();
							this.close();
						}
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
					.addOptions(
						{
							"math": "math",
							"DSP": "DSP"
						}
					).getValue();

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
						this.plugin.activeBase = this.plugin.mechanism.exerciseBases[this.cv];
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

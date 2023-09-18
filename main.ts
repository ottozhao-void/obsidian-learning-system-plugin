import {
	App,
	Editor,
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
	exerciseModal = new ExerciseModal(this.app,this);
	activeBase: ExerciseBase;


	async onload() {
		await this.loadSettings();
		this.app.vault.on("modify", this.onExcalidrawFileChange, this);


		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'keydown', (ev) => {
			if (ev.ctrlKey && ev.shiftKey && ev.key == "A") {
				if(!this.activeBase) {
					new Notice("No Base is selected!")
					this.exerciseModal.open();
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
		const fileName = file.name.split(".")[0];
		const changedExFile: ExcalidrawFile | undefined = this.mechanism.exerciseBases["math"]
			.excalidrawFiles[fileName] || this.mechanism.exerciseBases["DSP"]
			.excalidrawFiles[fileName];

		if (changedExFile) {
			const previous: ExcalidrawElement[] = changedExFile.getJSON(changedExFile.currentContent).elements;
			changedExFile.currentContent = await changedExFile.read();
			changedExFile.elements = changedExFile.getJSON(changedExFile.currentContent).elements;
			if (changedExFile.elements.length > previous.length) {
				const newElement: ExcalidrawElement = changedExFile.elements[changedExFile.elements.length - 1];

				const eLinkText = changedExFile.getExerciseLinkText(newElement);

				if (eLinkText) changedExFile.base.update(eLinkText); // 假如增加了元素，且符合 EXERCISE_BOX 的才会被更新
			}
			console.log(this.mechanism.exerciseBases[changedExFile.base.type].size);
		}
	}
	onunload() {

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
export class ExerciseModal extends Modal {
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

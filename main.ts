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

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('lucide-file', 'Sample Plugin', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.

			this.exerciseModal.open();
			new Notice('This is a notice!');
		});
		const ribbonHello = this.addRibbonIcon('dice','Greet',()=>{
			new Notice('Hello,World');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
			}
		});
		// This adds a command that replaces the selection withe the current time
		this.addCommand({
			id: "insert-current-date",
			name:"Insert current date at cursor",
			editorCallback: (editor:Editor,view:MarkdownView) => {
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("1");
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'keydown', (ev) => {
			if (ev.ctrlKey && ev.shiftKey && ev.key == "A") {
				this.activeBase.query();
			}
		});

		this.registerDomEvent(document, 'keydown', (ev) => {
			if (ev.ctrlKey && ev.shiftKey && ev.key == "S") {
				this.activeBase.closeExercise();
			}
		});
		setTimeout(async () => {await this.mechanism.initialize()}, 3000);
		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(async () => {console.log(this.activeBase)}, 3 * 1000));
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

export class ExampleModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "What's your name?" });

		new Setting(contentEl)
			.setName("Name")
			.addText((text) =>
				text.onChange((value) => {
					this.result = value
				}));

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.result);
					}));
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('hhhhh');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
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

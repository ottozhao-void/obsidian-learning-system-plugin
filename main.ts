import {App, EventRef, Modal, normalizePath, Notice, Plugin, Setting, TAbstractFile} from 'obsidian';
import {
	BaseInterface
} from "./BaseInterface";
import {ExcalidrawFile} from "./Excalidraw";
import {CentralProcessor} from "./CentralProcessor";
import {parseJSON} from "./src/utility/parser";
import {SBaseMetadata} from "./src/base_version";
import {
	EXERCISE_BASE,
	EXERCISE_STATUSES,
	EXERCISE_STATUSES_OPTION,
	EXERCISE_SUBJECT
} from "./src/constants";

// Remember to rename these classes and interfaces!

interface HelloWorldPlugin {
	mySetting: string;
}

export default class MyPlugin extends Plugin {
	settings: HelloWorldPlugin;

	cpu: CentralProcessor;

	baseModal: BaseModal;

	onExFileChangeRef: EventRef;


	async onload() {
		// await this.loadSettings();
		this.cpu = await CentralProcessor.init(this.app);
		this.baseModal = new BaseModal(this.app,this.cpu)
		this.onExFileChangeRef =  this.app.vault.on("modify", this.onExcalidrawFileChange, this);
		BaseInterface.reSetExercisesIndex(this.cpu.bases[EXERCISE_SUBJECT.MATH]);


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

		this.addCommand({
			id: "reload-all-bases",
			name: "Reload All Bases",
			callback: async () => {
				for (let subject of Object.keys(EXERCISE_BASE)) {
					const path = EXERCISE_BASE[subject].path;
					let baseJSON: SBaseMetadata = parseJSON(await this.app.vault.adapter.read(normalizePath(path)))
					this.cpu.bases[subject] = await BaseInterface.fromJSON(this.app,baseJSON);
				}
			}
		})

		// If the plugin hooks up any global DOM events (on parts of the app_ that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'keydown', (ev) => {
			if (ev.ctrlKey && ev.shiftKey && ev.key == "A") {
				this.cpu.activeBase ? (() => {
					new Notice("No Base is selected!");
					this.baseModal.open();
				})() : this.cpu.running ? new Notice("An running exercise is running!") : this.cpu.run();
			}
		});

		// this.registerDomEvent(window, "beforeunload", async ()=> {await this.app.vault.adapter.write(normalizePath("OnObsidianCloseFile.md"),"Success!")})

		this.registerDomEvent(document, 'keydown', (ev) => {
			if (ev.ctrlKey && ev.shiftKey && ev.key == "S") {
				if(!this.cpu.activeExercise) new Notice("Currently, No Exercise is running!")
				else {
					new AssessModal(this.app,this.cpu).open()
					new Notice("Successfully closed the running exercise")

				}
			}
		});

	}

	private async onExcalidrawFileChange(file: TAbstractFile): Promise<void> {
		// console.log(`${file.name} Changed!`);
		const tFile = this.app.metadataCache.getFirstLinkpathDest(file.path,file.path);
		const fileName = tFile?.basename ? tFile?.basename : "";
		new Notice("picking out changed excalidraw file",3000);
		const excalidrawFile: ExcalidrawFile | undefined = this.cpu.bases[EXERCISE_SUBJECT.MATH]
			.excalidraws_[fileName] || this.cpu.bases[EXERCISE_SUBJECT.DSP]
			.excalidraws_[fileName] || this.cpu.bases[EXERCISE_SUBJECT.POLITICS]
			.excalidraws_[fileName];
		// new Notice(`${excalidrawFile.name} Changed!`, 3000);
		if (!excalidrawFile) new Notice("excalidraw is missing!")
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

	async onunload() {
		this.app.vault.offref(this.onExFileChangeRef);
	}

	async update(){
		for (let subject of Object.keys(EXERCISE_BASE)) {
			let n = 0;
			const nb = await BaseInterface.migrateFromOBtoNB(this.app, EXERCISE_BASE[subject]);
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

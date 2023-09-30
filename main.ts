import {EventRef, Notice, Plugin, TAbstractFile} from 'obsidian';
import {ExcalidrawFile} from "./Excalidraw";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {getAPI} from "obsidian-dataview";
import {DataProcessor} from "./DataProcessor";
import {EXERCISE_SUBJECT} from "./src/constants";
import {AssessModal, BaseModal, DeleteExerciseModal} from "./src/Modal";

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

	deleteExerciseID: string

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

		this.addCommand({
			id: "reindex-allexercises",
			name: "index exercise",
			callback: async () => {
				Object.values(this.cpu.bases).forEach((base) => {base.reIndexExercise()});
				await Promise.all(Object.values(this.cpu.bases).map(base => base.save()));
			}
		})

		this.addCommand({
			id: "delete-exercise",
			name: "Delete Exercise",
			callback: () => {
				new DeleteExerciseModal(this.app, this).open();
			}
		})

		this.addCommand({
			id: "fixture-all-exercises",
			name: "Fixture all exercise",
			callback: async ()=> {
				for (const base of Object.values(this.cpu.bases)) {
					await Promise.all(Object.values(base.excalidraws_).map(excal => ExcalidrawFile.fixureAllExercise(this.app,excal)));
				}
				// await ExcalidrawFile.save(this.app,this.cpu.bases["Math"].excalidraws_["Math"])
		}
		})

		//  这个reload all bases的目的是为了在直接修改了库文件后，保证库文件的修改可以及时
		// 反馈到Runtime Base里面，但这个有必要吗？ 因为，我决定以后只能通过修改Runtime Base，
		// this.addCommand({
		// 	id: "reload-all-bases",
		// 	name: "Reload All Bases",
		// 	callback: async () => {
		// 		for (let subject of Object.keys(EXERCISE_BASE)) {
		// 			const path = EXERCISE_BASE[subject].path;
		// 			let baseJSON: SBaseMetadata = parseJSON(await this.app.vault.adapter.read(normalizePath(path)))
		// 			this.cpu.bases[subject] = await ExerciseBase.fromJSON(this.app,baseJSON);
		// 		}
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
		// this.registerInterval(window.setInterval(async () => {console.log(this.cpu.bases)}, 3 * 1000));
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
		new Notice(`${file.name} Changed!`, 3000);

		if (excalidrawFile) {
			const subject = excalidrawFile.subject;
			excalidrawFile.elements = await ExcalidrawFile.read(this.app, excalidrawFile.path);
			new Notice(`Previous number of exercises in excalidrawFile file: ${excalidrawFile.previeousExerciseArray.size}\n\nCurrent number of exercises in excalidrawFile file: ${excalidrawFile.exerciseArray.size}`, 2000);

			const newLTArray = excalidrawFile.filterForNewExercise();
			const deletedLTArray = excalidrawFile.filterForDeletedExercise().map(linktext => excalidrawFile.linktextIDMapping[linktext]);

			// update the id-link mapping
			ExcalidrawFile.createIDLinktextMapping(excalidrawFile);

			if (newLTArray.length > 0 || deletedLTArray.length > 0) {
				this.cpu.bases[subject].updateRuntimeBase("delete", deletedLTArray);
				this.cpu.bases[subject].updateRuntimeBase("create",newLTArray);
				await this.cpu.bases[subject].save();
				excalidrawFile.previeousExerciseArray = new Set(excalidrawFile.exerciseArray);
			}
		}
	}

	onunload() {
		this.app.vault.offref(this.onExFileChangeRef);
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

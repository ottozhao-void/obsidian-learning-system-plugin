import {EventRef, moment, normalizePath, Notice, Plugin, TAbstractFile} from 'obsidian';
import {ExcalidrawFile} from "./Excalidraw";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {getAPI} from "obsidian-dataview";
import {DataProcessor} from "./DataProcessor";
import {DATE_FORMAT, EXERCISE_BASE, EXERCISE_SUBJECT, SUBJECTS} from "./src/constants";
import {AssessModal, BaseModal, DeleteExerciseModal} from "./src/Modal";
import {DEFAULT_SETTINGS, LearningSystemSetting, SystemSetting} from "./SystemSetting"

// Remember to rename these classes and interfaces!

export default class MyPlugin extends Plugin {
	settings: SystemSetting;

	cpu: DataProcessor;

	baseModal: BaseModal;

	onExFileModifyRef: EventRef;

	onExFileRenameRef: EventRef;

	dataviewAPI: DataviewApi | undefined = getAPI(this.app);

	deleteExerciseID: string

	async onload() {
		await this.loadSettings();
		this.onExFileModifyRef =  this.app.vault.on("modify", this.onExcalidrawFileModify, this);
		this.onExFileRenameRef = this.app.vault.on("rename",this.onExcalidrawFileRename,this);
		setTimeout(async ()=>{
			this.cpu = await DataProcessor.init(this.app);
			this.baseModal = new BaseModal(this.app,this.cpu)
		},1500);
		this.addSettingTab(new LearningSystemSetting(this.app,this))

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
			id: "show-debug-info",
			name: "Show Debug Information",
			callback: () => {
				console.log(this.cpu.activeBase);
				console.log(this.cpu.activeExercise);
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
	}

	private async onExcalidrawFileModify(file: TAbstractFile): Promise<void> {
		// console.log(`${file.name} Changed!`);
		const tFile = this.app.metadataCache.getFirstLinkpathDest(file.path,file.path);
		const fileName = tFile?.basename ? tFile?.basename : "";
		// new Notice("picking out changed excalidraw file",3000);
		const excalidrawFile: ExcalidrawFile | undefined = this.cpu.bases[EXERCISE_SUBJECT.MATH]
			.excalidraws_[fileName] || this.cpu.bases[EXERCISE_SUBJECT.DSP]
			.excalidraws_[fileName] || this.cpu.bases[EXERCISE_SUBJECT.POLITICS]
			.excalidraws_[fileName];
		// new Notice(`${file.name} Changed!`, 3000);
		new Notice(`Type of the excalidraw file being pulled out is ${typeof excalidrawFile}`);
		if (excalidrawFile) {
			const subject: SUBJECTS = excalidrawFile.subject;
			excalidrawFile.elements = await ExcalidrawFile.read(this.app, excalidrawFile.path);
			new Notice(`Previous number of exercises in excalidrawFile file: ${excalidrawFile.previeousExerciseArray.size}\n\nCurrent number of exercises in excalidrawFile file: ${excalidrawFile.exerciseArray.size}`, 2000);

			const newLTArray = excalidrawFile.filterForNewExercise();
			const deletedLTArray = excalidrawFile.filterForDeletedExercise().map(linktext => excalidrawFile.linktextIDMapping[linktext]);

			// _update the id-link mapping
			ExcalidrawFile.createIDLinktextMapping(excalidrawFile);

			if (newLTArray.length > 0 || deletedLTArray.length > 0) {
				this.cpu.updateRuntimeBase(subject,"delete", deletedLTArray);
				this.cpu.updateRuntimeBase(subject,"create",newLTArray);
				await this.cpu.bases[subject].save();
				excalidrawFile.previeousExerciseArray = new Set(excalidrawFile.exerciseArray);
			}
		}
	}

	private async onExcalidrawFileRename(file:TAbstractFile) {
		// @ts-ignore
		const page: {tags: string[]} = this.dataviewAPI?.page(file.path)
		if (page.tags.join("-").contains("excalidraw")){
			for (let subject of Object.keys(EXERCISE_BASE)) {
				await this.cpu.bases[subject].indexExcalidraw();
			}
		}
	}

	onunload() {
		this.app.vault.offref(this.onExFileModifyRef);
		this.app.vault.offref(this.onExFileRenameRef);
	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}


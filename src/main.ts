import {EventRef, normalizePath, Notice, Plugin, TAbstractFile} from 'obsidian';
import {ExcalidrawFile} from "./Excalidraw";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {getAPI} from "obsidian-dataview";
import {ControlUnit} from "./ControlUnit";
import {EXERCISE_BASE, EXERCISE_SUBJECT, SUBJECTS} from "./constants";
import {AssessModal, BaseModal, DeleteExerciseModal} from "./Modal";
import {SystemSetting} from "./SystemSetting"
import {ExerciseBase} from "./ExerciseBase";
import {parseJSON} from "./utility/parser";


export default class LearningSystemPlugin extends Plugin {
	settings: SystemSetting;

	cpu: ControlUnit;

	baseModal: BaseModal;

	onExFileModifyRef: EventRef;

	onExFileRenameRef: EventRef;

	dataviewAPI: DataviewApi | undefined = getAPI(this.app);


	async onload() {

		this.onExFileModifyRef =  this.app.vault.on("modify", this.onExcalidrawFileModify, this);

		this.onExFileRenameRef = this.app.vault.on("rename",this.onExcalidrawFileRename,this);

		setTimeout(async ()=>{
			this.cpu = await ControlUnit.init(this.app);
			this.baseModal = new BaseModal(this.app,this.cpu)
		},1500);

		this.addCommand({
			id: "open-control-panel",
			name: "Open Control Panel",
			callback: () => {
				this.baseModal.open();
			}
		})

		// this.addCommand({
		// 	id: "close-base",
		// 	name: "Close Base",
		// 	callback: () => {
		// 		this.cpu.activeBase = undefined;
		// 	}
		// })

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

		// this.addCommand({
		// 	id: "show-debug-info",
		// 	name: "Show Debug Information",
		// 	callback: () => {
		// 		console.log(this.cpu.activeBase);
		// 		console.log(this.cpu.activeExercise);
		// 	}
		// })

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

		this.addCommand({
			id: "reload-all-bases",
			name: "Reload All Bases",
			callback: async () => {
				for (let subject of Object.keys(EXERCISE_BASE)) {
					const path = EXERCISE_BASE[subject].path;
					let baseJSON = parseJSON(await this.app.vault.adapter.read(normalizePath(path)))
					this.cpu.bases[subject] = await ExerciseBase.fromJSON(this.app,baseJSON);
				}
			}
		})

		// this.addCommand({
		// 	id: "check-for-duplicate",
		// 	name:"Check-For-Duplicates",
		// 	callback: () => {
		// 		for (let subject of Object.keys(EXERCISE_BASE)) {
		// 			console.log(`Checking for ${subject}`)
		// 			ExerciseBase.checkForDuplicate(this.cpu.bases[subject]);
		// 		}
		// 	}
		// })


		// Register Keyboard Event
		this.registerDomEvent(document, 'keydown', (ev) => {
			// Select Next Exercise
			if (ev.ctrlKey && ev.shiftKey && ev.key == "A") {
				this.cpu.activeBase ?
					this.cpu.activeExercise ?
						new Notice(`Exercise: ${this.cpu.activeExercise.id} is running.`) :
						this.cpu.run() :
					this.baseModal.open()
			}
			// Exercise Assessment
			else if (ev.ctrlKey && ev.shiftKey && ev.key == "S") {
				this.cpu.activeExercise ?
					new AssessModal(this.app,this.cpu).open() :
					new Notice("Currently, No Exercise is active!")
			}
		});
	}

	onunload() {
		this.app.vault.offref(this.onExFileModifyRef);
		this.app.vault.offref(this.onExFileRenameRef);
	}

	private async onExcalidrawFileModify(file: TAbstractFile): Promise<void> {
		// Attempt to get the changed excalidraw file name
		const tFile = this.app.metadataCache.getFirstLinkpathDest(file.path,file.path);
		const fileName = tFile?.basename ? tFile?.basename : "";
		const excalidrawFile: ExcalidrawFile | undefined = this.cpu.bases[EXERCISE_SUBJECT.MATH]
			.excalidraws_[fileName] || this.cpu.bases[EXERCISE_SUBJECT.DSP]
			.excalidraws_[fileName] || this.cpu.bases[EXERCISE_SUBJECT.POLITICS]
			.excalidraws_[fileName];

		if (excalidrawFile) {
			// Update excalidraw elements
			excalidrawFile.elements = await ExcalidrawFile.read(this.app, excalidrawFile.path);
			new Notice(`Previous number of exercises in excalidrawFile file: ${excalidrawFile.previousExerciseArray.size}\n\nCurrent number of exercises in excalidrawFile file: ${excalidrawFile.exerciseArray.size}`, 2000);

			const newLTArray = excalidrawFile.filterForNewExercise();
			const deletedLTArray = excalidrawFile.filterForDeletedExercise().map(linktext => excalidrawFile.linktextIDMapping[linktext]);

			// update the id-link mapping
			ExcalidrawFile.createIDLinktextMapping(excalidrawFile);

			const subject: SUBJECTS = excalidrawFile.subject;
			if (newLTArray.length > 0 || deletedLTArray.length > 0) {
				this.cpu.updateRuntimeBase(subject,"delete", deletedLTArray);
				this.cpu.updateRuntimeBase(subject,"create",newLTArray);
				await this.cpu.bases[subject].save();
				excalidrawFile.previousExerciseArray = new Set(excalidrawFile.exerciseArray);
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

}


import { EventRef, normalizePath, Notice, Plugin, TAbstractFile, TFile } from 'obsidian';
import { ExcalidrawFile } from './Excalidraw';
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {getAPI} from "obsidian-dataview";
import {ControlUnit} from "./ControlUnit";
import {EXERCISE_BASE, EXERCISE_SUBJECT, SUBJECTS} from "./constants";
import {AssessModal, BaseModal, DeleteExerciseModal} from "./Modal";
import {SystemSetting} from "./SystemSetting"
import {ExerciseBase} from "./ExerciseBase";
import {parseJSON} from "./utility/parser";
import {getEA, ExcalidrawElement} from "obsidian-excalidraw-plugin";
import { ExcalidrawAutomate } from 'obsidian-excalidraw-plugin/lib/ExcalidrawAutomate';

export default class LearningSystemPlugin extends Plugin {
	settings: SystemSetting;

	cpu: ControlUnit;

	baseModal: BaseModal;

	onExFileModifyRef: EventRef;

	onExFileRenameRef: EventRef;

	dataviewAPI: DataviewApi | undefined = getAPI(this.app);

	ea: ExcalidrawAutomate | undefined;

	eventRefs: EventRef[] = [];

	pathToBase: Map<string, ExerciseBase> = new Map();



	async onload() {

		this.eventRefs.push(this.app.vault.on("modify", this.onExcalidrawFileModify, this));
		this.eventRefs.push(this.app.vault.on("rename",this.onExcalidrawFileRename,this));
 
		setTimeout(async ()=>{
			this.cpu = await ControlUnit.init(this); 
			this.baseModal = new BaseModal(this.app,this.cpu)
		},1500);
		
				// A Command to extract the clipboard conetent and use checkExerciseInBase to check if an exercise is present in the base.
		this.addCommand({
			id: "check-exercise-in-base-clipboard",
			name: "Check Exercise in Base from Clipboard",
			callback: async () => {

				// Get the current active file from the app and
				// then get the excalidraw file corresponding to the active file
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice("No active file");
					return;
				}
				const excalidrawFile = this.getExcalidrawFile(activeFile);
				if (excalidrawFile) {

					const elements = JSON.parse(await navigator.clipboard.readText()).elements;
					const xy = Math.ceil(Math.abs(elements[0].x) + Math.abs(elements[0].y))

					const exerciseID = `${excalidrawFile.name}${ExcalidrawFile.id_separator}${xy}`;
					// Use the xy and search all exercises of the base to see if there is a match
					if (!this.cpu.bases[excalidrawFile.subject].isInBase(exerciseID)) {
					  console.error(`Exercise with xy: ${xy} is not in the base`); 
					}
					else {
						console.log(`Exercise with xy: ${xy} is in the base`);
					}
				}
			}
		})

		// A Command just like the above command, but this time it is checking the active excalidraw file
		// to see if all the exercises of the excalidraw file are in the base, if not, it will print out
		// the missing exercises.
		this.addCommand({
			id: "check-exercise-in-base-excalidraw",
			name: "Check Exercise in Base from the active Excalidraw",
			callback: async () => {
				// Get the current active file from the app and
				// then get the excalidraw file corresponding to the active file
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice("No active file");
					return;
				}
				const excalidrawFile = this.getExcalidrawFile(activeFile);
				if (excalidrawFile) {
									// get base
				const base = this.cpu.bases[excalidrawFile.subject];
				// get id of all exercises of the base
				const idSetForBase = new Set(Object.values(base.exercises).map(ex => ex.id));

				Object.keys(excalidrawFile.idLinktextMapping).forEach(id => {
					if (!idSetForBase.has(id)) {
						console.error(`Exercise with id: ${id} is not in the base`);
					}
					else {
						console.log(`Exercise with id: ${id} is in the base`);
					}
				})
			}
			} 
		}) 

		// A Command that returns a list of selected excalidraw elements
		this.addCommand({ 
			id: "get-selected-elements",
			name: "Get Selected Elements",
			callback:  () => {
				console.log(this.ea);
				const elements = this.ea?.getViewSelectedElements() as  ExcalidrawElement[];
				console.log(this.ea?.onFileOpenHook);
			} 
		})
 
		

		// A Command that does the following things:
		// 1. Get A Exercise Object from a Exercise ID
		// 2. Open the Exercise
		this.addCommand({
			id: "open-exercise-with-id",
			name: "Open Exercise with ID",
			callback: async () => {
				const id = await navigator.clipboard.readText();
				// Test if the id is valid
				// the id should be in the format of "excalidrawFileName@xy"
				if (!id.contains(ExcalidrawFile.id_separator)) {
					new Notice("Invalid ID");
					return;
				}
				const excalidrawFileName = id.split(ExcalidrawFile.id_separator)[0];
				const excalidrawFile = this.getExcalidrawFile(excalidrawFileName);
				if (excalidrawFile) {
					const linkText = excalidrawFile.idLinktextMapping[id];
					if (linkText) {
						await this.app.workspace.openLinkText(linkText,linkText);
					}
					else {
						new Notice(`No Linktext found for exercise with id: ${id}`);
					}
				}

			}}
			)



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
					this.cpu.bases[subject] = await ExerciseBase.fromJSON(this,baseJSON);
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
		// Refine the this part
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
		this.eventRefs.forEach(ref => this.app.vault.offref(ref));
	}
	
	private getExcalidrawFile(fileOrFileName: TAbstractFile | string): ExcalidrawFile | undefined{
		const  fileName = typeof fileOrFileName == "string" ? fileOrFileName : fileOrFileName.name.split(".")[0];
		const excalidrawFile = this.cpu.bases[EXERCISE_SUBJECT.MATH].excalidraws_[fileName] ||
		this.cpu.bases[EXERCISE_SUBJECT.DSP].excalidraws_[fileName] ||
		this.cpu.bases[EXERCISE_SUBJECT.POLITICS].excalidraws_[fileName];
		if (!excalidrawFile) {
			new Notice("No excalidraw file");
			return undefined;
		}
		return excalidrawFile;
	}

	private async onExcalidrawFileModify(file: TAbstractFile): Promise<void> {
		// Attempt to get the changed excalidraw file name
		const excalidrawFile = this.getExcalidrawFile(file); 

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

	reigisterFileForchanges(path: string): EventRef {
		const fileToWatch = this.app.vault.getAbstractFileByPath(path) as TAbstractFile;
		return this.app.vault.on("modify", (file)=>{
			if (file.path == fileToWatch.path){
				const base: ExerciseBase | undefined = this.pathToBase.get(file.path)
				console.log(base?.scanForDuplicateExercise())
			}
		}, this)
	}

}
 
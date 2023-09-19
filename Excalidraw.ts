import {App, EventRef, Notice, TAbstractFile, TFile} from "obsidian";
import {GenericFile} from "./GenericFile";
import {ExerciseBase} from "./ExerciseBase";
import {Exercise, ExerciseLinkText} from "./Exercise";

export interface ExcalidrawElement {
	strokeColor:string;
	type: string;
	id?: string;
	isDeleted?: boolean
}
const EXERCISE_BOX:ExcalidrawElement = {
	strokeColor: "#846358",
	type: "rectangle"
}

interface ExcalidrawFileInfo {
	name: string;
	currentContent?: string;
	elements?: ExcalidrawElement[];
	path: string;
}

export class ExcalidrawFile extends GenericFile implements ExcalidrawFileInfo {
	app:App;
	base: ExerciseBase;
	currentContent: string;
	elements: ExcalidrawElement[];
	name: string;
	path: string;
	exerciseLinkText: Set<ExerciseLinkText>;

	constructor(app:App, base: ExerciseBase, excalidrawFileInfo: ExcalidrawFileInfo) {
		super(app, excalidrawFileInfo.name, excalidrawFileInfo.path)
		this.app = app;
		this.base = base;
		Object.assign(this,excalidrawFileInfo);

	}

	async initilize() {
		try {
			this.currentContent = await this.read();
			this.elements = this.getJSON(this.currentContent).elements;
		} catch (error) {
			console.error('Error during initialization:', error);
		}
	}


	getExerciseLinkText(elementArray?: ExcalidrawElement[] | ExcalidrawElement): string[] {
		const elements = elementArray
			? (Array.isArray(elementArray)
				? elementArray
				: [elementArray])
			: this.elements;

		return elements
			.filter(el => el.strokeColor === EXERCISE_BOX.strokeColor
				&& el.type === EXERCISE_BOX.type && !el.isDeleted)
			.map(el => `${this.name}#^${el.id}`)


	}

	async checkAndUpdateForNewExercise(){
		this.currentContent = await this.read();
		this.elements = this.getJSON(this.currentContent).elements;
		const exes = this.getExerciseLinkText();

		const newLTArray = this.filterForNewExercise(exes);
		const deletedLTArray = this.filterForDeletedExercise(exes);
		this.base.update("delete", deletedLTArray);
		this.base.update("create",newLTArray);
		this.exerciseLinkText = new Set(exes);

		//
		// if (exes.length > this.exerciseLinkText.size) {
		// 	// new Notice("Add Action Detected!");
		// 	// new Notice(`Previous exercise array length is ${this.exerciseLinkText.size}\n
		// 	// Current length is ${exes.length}`);
		// 	const newLTArray = this.filterForNewExercise(exes);
		// 	this.allExercises.update("create",newLTArray);
		// 	this.exerciseLinkText = new Set(exes);
		// }
		// else if (exes.length < this.exerciseLinkText.size) {
		// 	// new Notice("Delete Action Detected!");
		// 	// new Notice(`Previous exercise array length is ${this.exerciseLinkText.size}\n
		// 	// Current length is ${exes.length}`);
		// 	const deletedLTArray = this.filterForDeletedExercise(exes);
		// 	// console.log(deletedLTArray);
		// 	this.allExercises.update("delete", deletedLTArray);
		// 	this.exerciseLinkText = new Set(exes);
		// }
	}

	filterForNewExercise(exes: ExerciseLinkText[]): ExerciseLinkText[] {
		return exes.filter(ex => !this.exerciseLinkText.has(ex));
	}
	filterForDeletedExercise(exes: ExerciseLinkText[]): ExerciseLinkText[] {
		let exeSet = new Set(exes);
		let exerciseLinktTextArray = Array.from(this.exerciseLinkText);
		return exerciseLinktTextArray.filter(ex => !exeSet.has(ex));
	}


	// private async onFileChange(file:TAbstractFile): Promise<void> {
	// 	this.previousContent = this.currentContent;
	// 	console.log(`${file.name} Changed!`);
	//
	// 	this.currentContent = await this.read(file);
	// 	this.elements = this.getJSON(this.currentContent).elements;
	// 	const pElement: ExcalidrawElement[] = this.getJSON(this.previousContent).elements;
	// 	if (this.elements.length > pElement.length) {
	// 		const newElement: ExcalidrawElement = this.elements[this.elements.length - 1];
	//
	// 		const eLinkText = this.getExerciseLinkText(newElement);
	//
	// 		if (eLinkText) this.allExercises.checkAndUpdateForNewExercise(eLinkText); // 假如增加了元素，且符合 EXERCISE_BOX 的才会被更新
	// 	}
	// }

}



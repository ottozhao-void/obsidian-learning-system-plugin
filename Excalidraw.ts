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

	async getCurrentElements() {
		this.currentContent = await this.read();
		this.elements = this.getJSON(this.currentContent).elements;
	}

	async checkAndUpdateForNewExercise(){
		this.getCurrentElements();
		const exes = this.getExerciseLinkText();
		new Notice(`Previous number of exercises in this file: ${this.exerciseLinkText.size}\n\nCurrent number of exercises in this file: ${exes.length}`, 2000);

		const newLTArray = this.filterForNewExercise(exes);
		const deletedLTArray = this.filterForDeletedExercise(exes);
		if (newLTArray.length > 0 || deletedLTArray.length > 0) {
			this.base.update("delete", deletedLTArray);
			this.base.update("create",newLTArray);
			this.exerciseLinkText = new Set(exes);
		}
	}

	filterForNewExercise(exes: ExerciseLinkText[]): ExerciseLinkText[] {
		return exes.filter(ex => !this.exerciseLinkText.has(ex));
	}
	filterForDeletedExercise(exes: ExerciseLinkText[]): ExerciseLinkText[] {
		let exeSet = new Set(exes);
		let exerciseLinktTextArray = Array.from(this.exerciseLinkText);
		return exerciseLinktTextArray.filter(ex => !exeSet.has(ex));
	}
}



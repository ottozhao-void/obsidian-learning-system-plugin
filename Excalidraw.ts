import {App, EventRef, Notice, TAbstractFile, TFile} from "obsidian";
import {GenericFile} from "./GenericFile";
import {ExerciseBase} from "./ExerciseBase";
import {Exercise, ExerciseLinkText} from "./Exercise";
import {getExerciseLinkText, parseJSON} from "./src/utility/parser";

export interface ExcalidrawJSON {
	elements: ExcalidrawElement[];
}

export interface ExcalidrawElement {
	strokeColor:string;
	type: string;
	id?: string;
	isDeleted?: boolean
}
export const EXERCISE_BOX:ExcalidrawElement = {
	strokeColor: "#846358",
	type: "rectangle"
}

interface ExcalidrawMetadata {
	subject: string;
	currentContent?: string;
	elements?: ExcalidrawElement[];
	path: string;
}

export class ExcalidrawFile extends GenericFile implements ExcalidrawMetadata {
	app_:App;

	subject: string;

	name:string

	currentContent: string;

	elements: ExcalidrawElement[];

	path: string;

	previeousExerciseArray: Set<ExerciseLinkText>;


	constructor(app:App, name:string, excalidrawFileInfo: ExcalidrawMetadata) {
		super(app, excalidrawFileInfo.path)
		this.name = name;
		Object.assign(this,excalidrawFileInfo);
	}

	async initilize() {
		try {
			this.currentContent = await this.read();
			this.elements = parseJSON(this.currentContent).elements;
		} catch (error) {
			console.error('Error during initialization:', error);
		}
	}

	filterForNewExercise(): ExerciseLinkText[] {
		return Array.from(this.exerciseArray).filter(ex => !this.previeousExerciseArray.has(ex));
	}
	filterForDeletedExercise(): ExerciseLinkText[] {
		return Array.from(this.previeousExerciseArray).filter(ex => !this.exerciseArray.has(ex));
	}
	get exerciseArray(){
		return new Set(getExerciseLinkText(this))
	}
}



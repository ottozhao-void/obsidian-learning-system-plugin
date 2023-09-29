import {App, EventRef, normalizePath, Notice, TAbstractFile, TFile} from "obsidian";
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
	isDeleted?: boolean;
	x:number;
	y:number;
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

	elements: ExcalidrawElement[];

	path: string;

	previeousExerciseArray: Set<ExerciseLinkText>;

	// 现在读取Excalidraw文件的目的只是读取其内部的Excalidraw Elements
	static async read(app:App, path:string): Promise<ExcalidrawElement[]> {
		// Get Excalidraw Content
		const content = await app.vault.adapter.read(normalizePath(path));
		// Parse the content for elements
		const parsedJSONBlock = parseJSON(content) as ExcalidrawJSON;
		// const elements = parsedJSONBlock.elements;
		// 接下来应该有一个生成ID到linktext映射的函数
		return parsedJSONBlock.elements;
	}

	static createIDLinktextMapping(excalidraw: ExcalidrawFile): Record<string, ExerciseLinkText>{
		const elements = excalidraw.elements;
		return Object.fromEntries(elements
			.filter(el => el.strokeColor === EXERCISE_BOX.strokeColor
				&& el.type === EXERCISE_BOX.type && !el.isDeleted)
			.map(el => {
				const linktext:ExerciseLinkText = `${excalidraw.name}#^${el.id}`;
				const id = `${Math.ceil(Math.abs(el.x) + Math.abs(el.y))}`;
				return [id,linktext]
			}))
	}



	constructor(app:App, name:string, excalidrawFileInfo: ExcalidrawMetadata) {
		super(app, excalidrawFileInfo.path)
		this.name = name;
		Object.assign(this,excalidrawFileInfo);
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



import {App, EventRef, normalizePath, Notice, TAbstractFile, TFile, Workspace} from "obsidian";
import {GenericFile} from "./GenericFile";
import {ExerciseBase} from "./ExerciseBase";
import {Exercise, ExerciseLinkText} from "./Exercise";
import {parseJSON} from "./utility/parser";
import {SUBJECTS} from "./constants";
import { ExcalidrawElement, getEA} from "obsidian-excalidraw-plugin";
import ExcalidrawPlugin from "obsidian-excalidraw-plugin/lib/main";
import { ExcalidrawAutomate } from "obsidian-excalidraw-plugin/lib/ExcalidrawAutomate";

export interface ExcalidrawJSON {
	elements: ExcalidrawElement_[];
}

export interface ExcalidrawElement_ {
	strokeColor:string;
	type: string;
	id?: string;
	isDeleted?: boolean;
	x:number;
	y:number;
}

export const EXERCISE_BOX: Partial<ExcalidrawElement_> = {
	strokeColor: "#846358",
	type: "rectangle"
}

interface ExcalidrawMetadata {
	name: string
	subject: string;
	path: string;
}

export class ExcalidrawFile extends GenericFile implements ExcalidrawMetadata {
	app_:App;

	subject: SUBJECTS;

	name:string

	elements: ExcalidrawElement_[];

	path: string;

	previousExerciseArray: Set<ExerciseLinkText>;

	idLinktextMapping: Record<string, ExerciseLinkText>;
	// linktextIDMapping: ;
	
	ea: ExcalidrawAutomate = getEA();

	static ea: ExcalidrawAutomate = getEA();

	static id_separator = "@"

	get exerciseArray(){
		return new Set(this.exerciseLinkText)
	}

	get exerciseLinkText(){
		return this.elements
			.filter(el => el.strokeColor === EXERCISE_BOX.strokeColor
				&& el.type === EXERCISE_BOX.type && !el.isDeleted)
			.map(el => `${this.name}#^${el.id}`)
	}
	// 现在读取Excalidraw文件的目的只是读取其内部的Excalidraw Elements
	static async read(app:App, path:string): Promise<ExcalidrawElement_[]> {
		// Get Excalidraw Content
		const content = await app.vault.adapter.read(normalizePath(path));
		// Parse the content for elements
		const parsedJSONBlock = parseJSON(content) as ExcalidrawJSON;
		return parsedJSONBlock.elements;
	}

	static createIDLinktextMapping(excalidraw: ExcalidrawFile): Record<string, ExerciseLinkText>{
		const elements = excalidraw.elements;
		excalidraw.idLinktextMapping = Object.fromEntries(elements
			.filter(el => el.strokeColor === EXERCISE_BOX.strokeColor
				&& el.type === EXERCISE_BOX.type && !el.isDeleted)
			.map(el => {
				const linktext:ExerciseLinkText = `${excalidraw.name}#^${el.id}`;
				const id = `${excalidraw.name}${ExcalidrawFile.id_separator}${Math.ceil(Math.abs(el.x) + Math.abs(el.y))}`;
				return [id,linktext]
			}))

		return excalidraw.idLinktextMapping
	}

	static async fixureAllExercise(app:App, excalidraw: ExcalidrawFile){
		const content = await app.vault.adapter.read(normalizePath(excalidraw.path));
		const modifiedData = content.replace(/"locked"\s*:\s*false/g, '"locked": true');
		await app.vault.adapter.write(normalizePath(excalidraw.path), modifiedData);
	}

	constructor(app:App, excalidrawFileMetadata: ExcalidrawMetadata) {
		super(app, excalidrawFileMetadata.path)
		this.name = excalidrawFileMetadata.name;
		Object.assign(this,excalidrawFileMetadata);
	}

	static async fromExcalidrawMetadata(app: App, excalidrawFileMetadata: ExcalidrawMetadata): Promise<ExcalidrawFile>{
		const excalidraw = new ExcalidrawFile(app,excalidrawFileMetadata);
		excalidraw.elements = await ExcalidrawFile.read(app,excalidrawFileMetadata.path);
		excalidraw.previousExerciseArray = excalidraw.exerciseArray;
		excalidraw.idLinktextMapping = ExcalidrawFile.createIDLinktextMapping(excalidraw);
		return excalidraw
	}

	get linktextIDMapping(): Record<ExerciseLinkText, string>{
		return Object.fromEntries(
			Object.entries(this.idLinktextMapping).map(([key, value]) => [value, key])
		)
	}



	filterForNewExercise(): ExerciseLinkText[] {
		return Array.from(this.exerciseArray).filter(ex => !this.previousExerciseArray.has(ex));
	}
	filterForDeletedExercise(): ExerciseLinkText[] {
		return Array.from(this.previousExerciseArray).filter(ex => !this.exerciseArray.has(ex));
	}


}



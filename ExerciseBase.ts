import {Exercise, ExerciseLinkText, ExerciseMetadata} from "./Exercise";
import {DataArray, getAPI, Literal} from "obsidian-dataview";
import {App, Component, FileSystemAdapter, normalizePath, Notice, TFile} from "obsidian";
import {ExcalidrawElement, ExcalidrawFile, ExcalidrawJSON} from "./Excalidraw";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {GenericFile} from "./GenericFile";
import {getExerciseLinkText, parseJSON} from "./src/utility/parser";
import {migrate_mapping, OldBaseStructure} from "./src/migration";

export enum QUERY_STRATEGY {
	"NEW_EXERCISE_FIRST"
}

export enum EXERCISE_STATUSES {
	New = "new",
	Inspiring = "inspiring",
	Laser = "laser",
	Stumble = "stumble",
	Drifter = "drifter"
}

export enum EXERCISE_STATUSES_SWAPPED {
	new = "New",
	inspiring = "Inspiring",
	laser = "Laser",
	stumble = "Stumble",
	drifter = "Drifter"
}

// subject SwapKeyValue<T extends Record<string, string>> = {
// 	[K in keyof T as T[K]]: K
// }


export interface BaseMetadata {
	subject:string;
	path: string;
	size: number;
	tag: string;
	query_strategy:QUERY_STRATEGY;
	items_completed: number
}

export interface SBaseData extends BaseMetadata{
	exercises: Exercise[];
}

export type BaseContent = string;

export enum EXERCISE_SUBJECT {
	MATH = "Math",
	DSP = "DSP",
	POLITICS = "Politics"
}

export type ExerciseInitData = {
	path: string;
	tag: string;
	subject: string;
	query_strategy: QUERY_STRATEGY;

}

export const EXERCISE_BASE: Record<string, ExerciseInitData> = {
	[EXERCISE_SUBJECT.MATH]: {
		path: normalizePath("Exercise Base - Math.md"),
		tag: "#excalidraw/math",
		subject: "Math",
		query_strategy: QUERY_STRATEGY.NEW_EXERCISE_FIRST,
	},
	[EXERCISE_SUBJECT.DSP]: {
		path: normalizePath("Exercise Base - DSP.md"),
		tag:"#excalidraw/signals_and_systems",
		subject: "DSP",
		query_strategy: QUERY_STRATEGY.NEW_EXERCISE_FIRST,
	},
	[EXERCISE_SUBJECT.POLITICS]: {
		path: normalizePath("Exercise Base - Politics.md"),
		tag:"#excalidraw/政治",
		subject: "Politics",
		query_strategy: QUERY_STRATEGY.NEW_EXERCISE_FIRST,
	}
}
// export const EXERCISE_SUBJECT: string[] = Object.keys(EXERCISE_BASE);



export class ExerciseBase extends GenericFile implements SBaseData{
	app_:App;

	dataViewAPI_: DataviewApi = getAPI() as DataviewApi;

	size: number;

	items_completed: number;

	query_strategy: QUERY_STRATEGY = QUERY_STRATEGY.NEW_EXERCISE_FIRST;

	subject: string;

	tag: string;

	path: string;

	excalidraws_: {[eFName: string]: ExcalidrawFile} = {};

	exercises: Exercise[] = [];

	// exists: boolean;


	constructor(app: App, baseMetadata: ExerciseInitData | SBaseData) {
		super(app,baseMetadata.path);
		this.dataViewAPI_ = getAPI() as DataviewApi;
		Object.assign(this, baseMetadata);
	}

	async indexExcalidraw(){
		const targetExcalidrawPages: DataArray<Record<string, Literal>> = this.dataViewAPI_?.pages(this.tag) as DataArray<Record<string, Literal>>;
		for (let page of targetExcalidrawPages){
			const content = await this.app_.vault.adapter.read(normalizePath(page.file.path));
			const parsedJSONBlock = parseJSON(content) as ExcalidrawJSON;
			const elements: ExcalidrawElement[] = parsedJSONBlock.elements;


			this.excalidraws_[page.file.name] = new ExcalidrawFile(this.app_,page.file.name,{
				subject: this.subject,
				path: page.file.path,
				elements,
				currentContent:content
			})
			this.excalidraws_[page.file.name].previeousExerciseArray = this.excalidraws_[page.file.name].exerciseArray;
		}
	}

	async initIndex(){
		// Index Excalidraw Files
		const targetExcalidrawPages: DataArray<Record<string, Literal>> = this.dataViewAPI_?.pages(this.tag) as DataArray<Record<string, Literal>>;
		for (let page of targetExcalidrawPages){
			const content = await this.app_.vault.adapter.read(normalizePath(page.file.path));
			const parsedJSONBlock = parseJSON(content) as ExcalidrawJSON;
			const elements: ExcalidrawElement[] = parsedJSONBlock.elements;


			this.excalidraws_[page.file.name] = new ExcalidrawFile(this.app_,page.file.name,{
				subject: this.subject,
				path: page.file.path,
				elements,
				currentContent:content
			})
			this.excalidraws_[page.file.name].previeousExerciseArray = this.excalidraws_[page.file.name].exerciseArray;
		}


		// Index Exercises
		const exerciseLinkArray = Object.values(this.excalidraws_).flatMap((excal) => getExerciseLinkText(excal))

		this.exercises.push(...exerciseLinkArray.map((el,index) => Exercise.fromJSON(this.app_, {
			source: el,
			subject: this.subject,
			state: EXERCISE_STATUSES.New,
			remark: "",
			index: index,
			history: [],
			id: Exercise.extractIdFromLink(el),
			start_time: 0,
			end_time: 0
		})))

		this.size = this.exercises.length;
		this.items_completed = 0;
	}

	jsonify(): BaseContent {
		// console.log(this);
		// console.log(this.size);
		// console.log(this.items_completed);
		return `\`\`\`json\n${JSON.stringify(this, (k,v) => {
			if (k.endsWith("_")) return undefined;
			return v;
		}, 4)}\n\`\`\``
	}

	async save(content: BaseContent): Promise<void> {
		await this.app_.vault.adapter.write(this.path, content);
	}

	static fromJSON(app:App, obj: SBaseData):ExerciseBase {
		obj.exercises = obj.exercises.map(ex => new Exercise(app,ex))
		return new ExerciseBase(app, obj);
	}

	static parseJSONFromPath: (app:App, path:string) => Promise<SBaseData> = async (app,path) => {
		const content = await app.vault.adapter.read(path);
		return parseJSON(content)
	}

	async update(actionType: "create" | "modify" | "delete",ct: ExerciseLinkText[] | Exercise) {

		switch (actionType) {
			case "modify":
				if (ct instanceof Exercise){
					this.exercises.splice(ct.index,0,ct);
				}
				break
			case "create":
				if (!(ct instanceof Exercise)) this.exercises.push(...this.createNewExercise(ct));
				// console.log(this.exercises);
				break
			case "delete":
				if (Array.isArray(ct)){
					for (let elt of ct) {
						this.exercises.forEach((ex, index) => {
							if (ex.source == elt) this.exercises.splice(index,1);
						})
					}
				}
		};

		// console.log(`length before: ${this.size}`);
		this.size = this.exercises.length;
		// console.log(`length after: ${this.size}`);
		const data = this.jsonify();


		this.app_.vault.adapter.write(this.path,data)

	}

	next(): Exercise | undefined {
		let randomExerciseIndex: number = -1;
		// console.log(this);
		if (this.query_strategy == QUERY_STRATEGY.NEW_EXERCISE_FIRST) {
			const newExercisesIndexes = this.exercises
				.map((ex) => ex.state == EXERCISE_STATUSES.New? ex.index : -1)
				.filter((index) => index !== -1);

			// If no new exercises are found
			if (newExercisesIndexes.length === 0) {
				new Notice("No more new Exercises!");
				return;
			}
			console.log(this.exercises);
			randomExerciseIndex = newExercisesIndexes[Math.floor(Math.random() * newExercisesIndexes.length)];
			new Notice(`Exercise at ${randomExerciseIndex} is being pulled out.`,3000);

		}

		if (randomExerciseIndex != -1){
			const nextExercise: Exercise = this.exercises.splice(randomExerciseIndex,1)[0];
			return nextExercise;
		}
	}

	static async migrateFromOBtoNB(app:App, data: ExerciseInitData): Promise<ExerciseBase>{
		const ob: OldBaseStructure = parseJSON(await app.vault.adapter.read(normalizePath(data.path)));
		const newExercises = ob["exercises"].map((o,index) => migrate_mapping(o, index));
		return ExerciseBase.fromJSON(app, {
			exercises: newExercises.map(ex => new Exercise(app,ex)),
			items_completed: 0,
			query_strategy: QUERY_STRATEGY.NEW_EXERCISE_FIRST,
			size:0,
			tag: data.tag,
			subject:data.subject,
			path: data.path
		})
	}

	createNewExercise(exercisesLinkArray: string[]): Exercise[] {
		return exercisesLinkArray.map((link, index) => {

			return new Exercise(this.app_, {
				source: link,
				subject: this.subject,
				history:[],
				id:"",
				state:EXERCISE_STATUSES["New"],
				index: this.size + index,
				remark: "",
				start_time:0,
				end_time:0
			})
		});
	}


}

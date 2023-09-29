import {Exercise, ExerciseLinkText} from "./Exercise";
import {DataArray, getAPI, Literal} from "obsidian-dataview";
import {App, Component, FileSystemAdapter, normalizePath, Notice, TFile} from "obsidian";
import {ExcalidrawElement, ExcalidrawFile, ExcalidrawJSON} from "./Excalidraw";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {GenericFile} from "./GenericFile";
import {getExerciseLinkText, parseJSON} from "./src/utility/parser";
import {migrate_mapping} from "./src/exercise_version";
import {BaseContent, ExerciseInitData, BaseMetadata_V0, SBaseMetadata} from "./src/base_version";
import {EXERCISE_STATUSES, EXERCISE_SUBJECT, QUERY_STRATEGY} from "./src/constants";




// subject SwapKeyValue<T extends Record<string, string>> = {
// 	[K in keyof T as T[K]]: K
// }



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



export class ExerciseBase extends GenericFile implements SBaseMetadata{
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


	constructor(app: App, baseMetadata: ExerciseInitData | SBaseMetadata) {
		super(app,baseMetadata.path);
		this.dataViewAPI_ = getAPI() as DataviewApi;
		Object.assign(this, baseMetadata);
	}

	async indexExcalidraw(){
		const targetExcalidrawPages: DataArray<Record<string, Literal>> = this.dataViewAPI_?.pages(this.tag) as DataArray<Record<string, Literal>>;
		for (let page of targetExcalidrawPages){

			this.excalidraws_[page.file.name] = new ExcalidrawFile(this.app_,page.file.name,{
				subject: this.subject,
				path: page.file.path,
				elements: await ExcalidrawFile.read(this.app_,page.file.path)
			})
			this.excalidraws_[page.file.name].previeousExerciseArray = this.excalidraws_[page.file.name].exerciseArray;
		}
	}

	async initIndex(){
		// Index Excalidraw Files
		await this.indexExcalidraw();

		// Index Exercises
		const exerciseLinkArray = Object.values(this.excalidraws_).flatMap((excal) => getExerciseLinkText(excal));

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

	async save(): Promise<void> {
		const data = this.jsonify();
		await this.app_.vault.adapter.write(this.path, data);
	}

	static async read(app:App, path:string): Promise<ExerciseBase>{
		let baseJSON: SBaseMetadata = parseJSON(await app.vault.adapter.read(normalizePath(path)))
		return await ExerciseBase.fromJSON(app, baseJSON);
	}

	static async create(app:App, subject: string): Promise<ExerciseBase>{
		const base = new ExerciseBase(app, EXERCISE_BASE[subject])
		await base.initIndex();
		await base.save();
		return base;
	}

	static async fromJSON(app:App, obj: SBaseMetadata): Promise<ExerciseBase> {
		obj.exercises = obj.exercises.map(ex => new Exercise(app,ex))
		let base: ExerciseBase = new ExerciseBase(app, obj);
		await base.indexExcalidraw();
		return base;
	}

	updateRuntimeBase(actionType: "create" | "modify" | "delete", ct: ExerciseLinkText[] | Exercise) {

		// Insert new Exercises into runtime base.exercises
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
		this.size = this.exercises.length;
		this.items_completed = this.calculateItemCompleted();
	}

	calculateItemCompleted(): number{
		let num = 0;
		this.exercises.forEach((ex)=> (ex.state == EXERCISE_STATUSES.Laser ? num++ : -1))
		return  num;
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
			randomExerciseIndex = newExercisesIndexes[Math.floor(Math.random() * newExercisesIndexes.length)];
			new Notice(`Exercise at ${randomExerciseIndex} is being pulled out.`,3000);

		}

		if (randomExerciseIndex != -1){
			const nextExercise: Exercise = this.exercises.splice(randomExerciseIndex,1)[0];
			return nextExercise;
		}
	}

	static async migrateFromOBtoNB(app:App, data: ExerciseInitData): Promise<ExerciseBase>{
		const ob: BaseMetadata_V0 = parseJSON(await app.vault.adapter.read(normalizePath(data.path)));
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

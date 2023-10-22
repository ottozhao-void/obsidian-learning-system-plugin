import {Exercise, ExerciseLinkText} from "./Exercise";
import {DataArray, getAPI, Literal} from "obsidian-dataview";
import {App, normalizePath, Notice} from "obsidian";
import {ExcalidrawFile} from "./Excalidraw";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {GenericFile} from "./GenericFile";
import {parseJSON} from "./utility/parser";
import {BaseContent, ExerciseInitData, SBaseMetadata} from "./version/base_version";
import {EXERCISE_BASE, EXERCISE_STATUSES, QUERY_STRATEGY, SUBJECTS} from "./constants";
import { ExcalidrawAutomate } from "obsidian-excalidraw-plugin/lib/ExcalidrawAutomate";
import { getEA } from 'obsidian-excalidraw-plugin';
import LearningSystemPlugin from "main";


// subject SwapKeyValue<T extends Record<string, string>> = {
// 	[K in keyof T as T[K]]: K
// }

// export const EXERCISE_SUBJECT: string[] = Object.keys(EXERCISE_BASE);



export class ExerciseBase implements SBaseMetadata{

	plugin_: LearningSystemPlugin;

	size: number;

	items_completed: number;

	strategy = QUERY_STRATEGY.NEW_EXERCISE_FIRST;

	subject: SUBJECTS;

	tag: string;

	path: string;

	excalidraws_: {[eFName: string]: ExcalidrawFile} = {};

	exercises: Exercise[] = [];

	activeContext_: string = '';

	UniqueExcalidrawName_: Set<string> = new Set<string>();

	displayUniqueName_: Map<string, string>
	
	ea_: ExcalidrawAutomate = getEA();

	constructor(plugin: LearningSystemPlugin, baseMetadata: ExerciseInitData | SBaseMetadata) {
		this.plugin_ = plugin;
		Object.assign(this, baseMetadata);
	}

	// This function finds all excalidraw files with this.tag and read them
	async indexExcalidraw(){
		const targetExcalidrawPages: DataArray<Record<string, Literal>> = this.plugin_.dataviewAPI?.pages(this.tag) as DataArray<Record<string, Literal>>;
		for (let page of targetExcalidrawPages){
			const name = page.file.name;
			const path = page.file.path;
			this.excalidraws_[name] = await ExcalidrawFile.fromExcalidrawMetadata(this.plugin_.app, {
				name,
				subject: this.subject,
				path
			})
		}
	}

	// This function is invoked when the base files are first created
	async initIndex(){
		// Index Excalidraw Files
		await this.indexExcalidraw();

		// Index Exercises
		const exerciseLinkArray = Object.values(this.excalidraws_).flatMap((excal) => excal.exerciseLinkText);

		this.exercises.push(...exerciseLinkArray.map((el,index) => this.createNewExercise(el,index, 0)))

		this.size = this.exercises.length;
		this.items_completed = 0;
	}

	getExerciseID(linktext: ExerciseLinkText){
		const excalidrawFileName = linktext.split("#")[0];
		const excalidraw = this.excalidraws_[excalidrawFileName]
		return excalidraw.linktextIDMapping[linktext];
	}

	jsonify(): BaseContent {
		// console.log(this);
		// console.log(this.baseSize);
		// console.log(this.items_completed);
		return `\`\`\`json\n${JSON.stringify(this, (k,v) => {
			if (k.endsWith("_")) return undefined;
			return v;
		}, 4)}\n\`\`\``
	}

	// A Function that compares data = this.jsonify() with the actual content of the base file(path=this.path)
	// Report any difference
	// Use diff library to compare the two strings and report the difference
	// async checkIntegrity(){
	// 	const data = this.jsonify();
	// 	const content = await this.app_.vault.adapter.read(this.path);
	// 	if (data !== content) {

	// }


	async save(): Promise<void> {
		const data = this.jsonify();
		await this.plugin_.app.vault.adapter.write(this.path, data);
	}

	reIndexExercise(){
		new Notice(`Indexing Exercise Base - ${this.subject}`);
		this.exercises.forEach((ex,index) => {ex.index = index})
		this.size = this.exercises.length;
	}

	update(actionType: "create" | "modify" | "delete", ct: ExerciseLinkText[] | Exercise) {

		// Insert new Exercises into runtime base.exercises
		switch (actionType) {
			case "modify":
				if (ct instanceof Exercise) {
					new Notice(`Inserting Exercise ${ct.id} into index ${ct.index}`);
					this.exercises.splice(ct.index,0,ct);
				}
				break
			case "create":
				if (!(ct instanceof Exercise)) this.exercises.push(...ct.map((el,index) => this.createNewExercise(el,index, this.size)));
				// console.log(this.exercises);
				break
			case "delete":
				if (Array.isArray(ct)){
					for (let id of ct) {
						this.exercises.forEach((ex, index) => {
							if (ex.id == id) this.exercises.splice(index,1);
						})
					}
				}
		}
		this.size = this.exercises.length;
		this.items_completed = this.calculateItemCompleted();
	}

	static async read(plugin:LearningSystemPlugin, path:string): Promise<ExerciseBase>{
		let baseJSON: SBaseMetadata = parseJSON(await app.vault.adapter.read(normalizePath(path)))
		return ExerciseBase.fromJSON(plugin, baseJSON);
	}

	static async create(plugin:LearningSystemPlugin, subject: string): Promise<ExerciseBase>{
		const base = new ExerciseBase(plugin, EXERCISE_BASE[subject])
		await base.initIndex();
		await base.save();
		return base;
	}

	static async fromJSON(plugin:LearningSystemPlugin, obj: SBaseMetadata): Promise<ExerciseBase> {
		obj.exercises = obj.exercises.map(ex => Exercise.fromJSON(app,ex))
		let base: ExerciseBase = new ExerciseBase(plugin, obj);
		await base.indexExcalidraw();
		base.exercises.forEach(ex => {
			base.UniqueExcalidrawName_.add(ex.id.split(ExcalidrawFile.id_separator)[0]);
		})

		// 提供以file为单元的做题模式，加强上下context的联系
		base.UniqueExcalidrawName_ = new Set(Array.from(base.UniqueExcalidrawName_).sort());
		base.displayUniqueName_ = new Map<string,string>();
		base.UniqueExcalidrawName_.forEach((name, index) => {
			base.displayUniqueName_.set(name, name);
		})
		return base;
	}

	static async deleteExerciseFromBaseFile(base:ExerciseBase, id: string){
		base.exercises = base.exercises.filter(ex => ex.id !== id);
		base.size = base.exercises.length;
		await base.save()
	}

	// static checkForDuplicate(base: ExerciseBase){
	// 	let duplicateItems: string[] = [];
	// 	let uniqueItems = new Set<string>();
	//
	//
	// 	// for (let exercise of base.exercises) {
	// 	// 	if (uniqueItems.has(exercise.id)) base.exercises.splice(exercise.index,1);
	// 	// 	else uniqueItems.add(exercise.id);
	// 	// }
	//
	// 	for (let exercise of base.exercises) {
	// 		if (uniqueItems.has(exercise.id)) duplicateItems.push(exercise.id);
	// 		else uniqueItems.add(exercise.id);
	// 	}
	// 	console.log(duplicateItems);
	// }


	calculateItemCompleted(): number{
		let num = 0;
		this.exercises.forEach((ex)=> (ex.state == EXERCISE_STATUSES.Laser ? num++ : -1))
		return  num;
	}
	// This function checks if a exercise is in the base
	// param: id: string
	// return: boolean
	isInBase(id: string): boolean{
		return this.exercises.some(ex => ex.id == id);
	}


	next(): Exercise | undefined {
		switch (this.strategy) {
			case QUERY_STRATEGY.NEW_EXERCISE_FIRST:
				return this.nextNewExerciseFirst()
			case QUERY_STRATEGY.CLOSE_CONTEXT:
				if (!this.activeContext_) {
					const activeExercise = this.nextNewExerciseFirst();
					activeExercise ?
						this.setActiveContext(activeExercise) :
						null;
					return activeExercise
				}
				else {
					const candidateExercises = this.exercises
						.filter(ex => ex.id.split("@")[0] == this.activeContext_
							&& ex.state == EXERCISE_STATUSES.New)
					if (candidateExercises.length !== 0) {
						const nextExercise = candidateExercises[Math.floor(Math.random() * candidateExercises.length)];
						this.exercises.splice(nextExercise.index,1)
						return nextExercise
					}
				}
		}
	}

	nextNewExerciseFirst():Exercise | undefined{
		let randomExerciseIndex: number = -1;
		const newExercisesIndexes = this.exercises
			.map((ex) => ex.state == EXERCISE_STATUSES.New? ex.index : -1)
			.filter((index) => index !== -1);

		// If no new exercises are found
		if (newExercisesIndexes.length === 0) {
			return;
		}
		randomExerciseIndex = newExercisesIndexes[Math.floor(Math.random() * newExercisesIndexes.length)];
		if (randomExerciseIndex != -1) 	return this.exercises.splice(randomExerciseIndex, 1)[0];
	}

	setActiveContext(exercise: Exercise){
		this.activeContext_ = exercise.id.split("@")[0]
	}

	// static async migrateFromOBtoNB(app:App){
	// 	for (let subject of Object.keys(EXERCISE_BASE)){
	// 		const path = EXERCISE_BASE[subject].path;
	// 		const base = await ExerciseBase.read(,path);
	// 		const exercises = base.exercises;
	// 		base.exercises = exercises.map(ex => {
	// 			const source = ex.source;
	// 			const id = base.getExerciseID(source);
	// 			return Exercise.fromJSON(app, {
	// 				subject: ex.subject,
	// 				state: ex.state,
	// 				remark: ex.remark,
	// 				index: ex.index,
	// 				history: ex.history,
	// 				id,
	// 				start_time: ex.start_time,
	// 				end_time: ex.end_time
	// 			})
	// 		})
	// 		await base.save()
	// 	}
	// }

	createNewExercise(linktext:ExerciseLinkText, index: number,size: number): Exercise {
		return Exercise.fromJSON(this.plugin_.app, {
			subject: this.subject,
			state: EXERCISE_STATUSES.New,
			remark: "",
			index: size + index,
			history: [],
			id: this.getExerciseID(linktext),
			start_time: 0,
			end_time: 0
		})
	}


}

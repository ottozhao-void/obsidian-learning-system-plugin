import {Exercise, ExerciseLinkText} from "./Exercise";
import {DataArray, getAPI, Literal} from "obsidian-dataview";
import {App, Notice, TFile} from "obsidian";
import {ExcalidrawElement, ExcalidrawFile} from "./Excalidraw";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {GenericFile} from "./GenericFile";
import instantiate = WebAssembly.instantiate;
import it from "node:test";

enum QUERY_STRATEGY {
	"NEW_EXERCISE_FIRST"
}

export enum EXERCISE_STATUSES {
	New = "new",
	Laser = "laser",
	Stumble = "stumble",
	Drifter = "drifter"
}


interface ExerciseBaseInfo {
	name?: string;
	path: string;
	size?: number;
	excalidraw_tag: string;
	type?:string;
	strategy?:QUERY_STRATEGY.NEW_EXERCISE_FIRST;
}



export const EXERCISE_BASE: Record<string, ExerciseBaseInfo> = {
	"math":{
		path: "Exercise Base - Math.md",
		excalidraw_tag: "#excalidraw/math"
	},
	"DSP":{
		path: "Exercise Base - DSP.md",
		excalidraw_tag:"#excalidraw/signals_and_systems"
	}
}


export class ExerciseBase extends GenericFile implements ExerciseBaseInfo{
	app:App;

	size: number;

	strategy: QUERY_STRATEGY = QUERY_STRATEGY.NEW_EXERCISE_FIRST;

	type: string;

	excalidraw_tag: string;

	activeExerciseIndex: number = -1;

	dataViewAPI: DataviewApi = getAPI() as DataviewApi;

	activeExercise: Exercise | undefined;

	baseFile: TFile | null;

	excalidrawFiles: {[eFName: string]: ExcalidrawFile};

	allExercises: Exercise[] = [];

	isExist: boolean;

	constructor(app: App, name:string, type: string, path: string, excalidraw_tag: string) {
		super(app, name, path);
		this.app = app;
		this.type = type;
		this.excalidraw_tag = excalidraw_tag
		this.size = this.allExercises.length;
	}

	async initialize(): Promise<void> {
		console.log(this);

		this.isExist = this.path !== undefined &&
			this.app.vault.getAbstractFileByPath(this.path) !== null;
		await this.scan();

		if (!this.isExist) {
			// console.log(`${this.name} entering first branch`)
			this.isExist = true;
			const eLinkTextArray: ExerciseLinkText[] = Object.values(this.excalidrawFiles).flatMap((ef)=>{
				const exes = ef.getExerciseLinkText();
				ef.exerciseLinkText = new Set(exes);
				return exes;
			});

			await this.update("create",eLinkTextArray)
		}
		else {
			// console.log(`${this.name} entering second branch`)

			this.allExercises = this.getJSON(
				await this.read()
			).exercises.map(ex => new Exercise(this.app, ex));
			this.size = this.allExercises.length;
			this.baseFile = this.app.metadataCache.getFirstLinkpathDest(this.path, this.path);

			Object.values(this.excalidrawFiles).forEach((ef)=>ef.exerciseLinkText = new Set(ef.getExerciseLinkText()));
		}
	}

	async update(actionType: "create" | "modify" | "delete",ct: ExerciseLinkText[] | Exercise) {

		switch (actionType) {
			case "modify":
				if (ct instanceof Exercise){
					this.allExercises.splice(this.activeExerciseIndex,0,ct);
				}
				break
			case "create":
				if (!(ct instanceof Exercise)) this.allExercises.push(...this.createNewExercise(ct));
				// console.log(this.allExercises);
				break
			case "delete":
				if (Array.isArray(ct)){
					for (let elt of ct) {
						this.allExercises.forEach((ex, index) => {
							if (ex.link == elt) this.allExercises.splice(index,1);
						})
					}
				}
		};

		// console.log(`length before: ${this.size}`);
		this.size = this.allExercises.length;
		// console.log(`length after: ${this.size}`);
		const baseContent = await this.exercisesToBaseContent()

		if (this.baseFile) {
			this.app.vault.modify(this.baseFile, baseContent);
		}
		else {
			this.baseFile = await this.app.vault.create(this.path, baseContent);
		}
	}

	async exercisesToBaseContent(): Promise<string> {
		return this.generateJSONBlock(
			this.allExercises
				.map(ex => JSON.stringify(ex, (key, value) => {
					if (value instanceof App) {
						return undefined;
					}
					else if (value instanceof ExerciseBase)
						return undefined;
					if (key.startsWith("_")) return undefined;
					return value
				}, 3))
				.join(",\n")
		)
	}

	async scan(): Promise<void> {
		const dvFiles: DataArray<Record<string, Literal>> = this.dataViewAPI?.pages(this.excalidraw_tag);
		if (!dvFiles.length) new Notice(`No Exercises for ${this.type}`);

		this.excalidrawFiles = await this.getExcalidrawFiles(dvFiles);
	}

	async query(): Promise<void> {
		let iteratons = 0;
		switch (this.strategy) {
			case QUERY_STRATEGY.NEW_EXERCISE_FIRST:
				while (this.activeExerciseIndex == -1){
					iteratons++
					this.activeExerciseIndex = this.allExercises.findIndex((ex, index) => ex.lastStatus == EXERCISE_STATUSES.New && index == Math.floor(Math.random()*this.size))
					if (iteratons > this.size) {
						new Notice("No more new Exercises!");
						return;
					}
			}
			this.activeExercise = this.allExercises.splice(this.activeExerciseIndex, 1)[0];
		}
		this.activeExercise.open();
	}

	closeExercise(){
		if (this.activeExercise){

			this.activeExercise.close();
			this.update("modify",this.activeExercise)
			this.activeExerciseIndex = -1;

			new Notice(`Start Time: ${this.activeExercise.getLastStartTime().format("ddd MMM D HH:mm:ss")}\n\nEnd Time: ${this.activeExercise.getLastEndTime().format("ddd MMM D HH:mm:ss")}\n\nDuration: ${this.activeExercise.getLastDuration()}`,10000);

			this.activeExercise = undefined;
		}
	}

	async getExcalidrawFiles(dvFiles:DataArray<Record<string, Literal>>): Promise<{[eFName: string]: ExcalidrawFile}> {
		const excalidrawFiles = dvFiles.map(page => new ExcalidrawFile(
				this.app,
				this,
				{
					name: page.file.name,
					path: page.file.path
				}
			))
			.array()
		await Promise.all(excalidrawFiles.map(ef => ef.initilize()));

		let exca: {[eFName: string]: ExcalidrawFile} = {};
		for (let ef of excalidrawFiles) {
			exca[ef.name] = ef;
		}

		return exca;


	}

	createNewExercise(exercisesArray: string[]): Exercise[] {
		return exercisesArray.map(link => {

			return new Exercise(this.app, {
				link,
				type: this.type,
				lifeline:[],
				id:"",
				lastStatus:EXERCISE_STATUSES["New"],
				base: this
			})
		});
	}


	generateJSONBlock(jsonString:string): string {
		return `\`\`\`json\n{\n"exercises":[\n${jsonString}]\n}\n\`\`\``;
	}

}

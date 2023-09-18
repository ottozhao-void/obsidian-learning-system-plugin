import {Exercise} from "./Exercise";
import {DataArray, getAPI, Literal} from "obsidian-dataview";
import {App, Notice, TFile} from "obsidian";
import {ExcalidrawElement, ExcalidrawFile} from "./Excalidraw";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {GenericFile} from "./GenericFile";
import instantiate = WebAssembly.instantiate;

enum QUERY_STRATEGY {
	"NEW_EXERCISE_FIRST"
}

enum EXERCISE_STATUSES {
	New = "new",
	Laser = "laser",
	Stumble = "stumble",
	Drifter = "drifter"
}

type ExerciseLinkText = string;

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

	dataViewAPI: DataviewApi = getAPI() as DataviewApi;

	activeExercise: Exercise;

	baseFile: TFile | null;

	excalidrawFiles: ExcalidrawFile[];

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
			this.app.metadataCache.getFirstLinkpathDest(this.path,this.path) !== null;

		if (!this.isExist) {
			console.log("Initializing.....")
			this.isExist = true;
			const eLinkTextArray: ExerciseLinkText[] = await this.scan();

			await this.update(eLinkTextArray)
		}
		else {
			this.allExercises = this.getJSON(
				await this.read()
			).exercises;
		}
	}

	async update(ct: ExerciseLinkText[] | ExerciseLinkText) {
		const eLinkTextArray: ExerciseLinkText[] = Array.isArray(ct)? ct : [ct];

		this.allExercises.push(...this.createNewExercise(eLinkTextArray));
		this.size = this.allExercises.length;
		const baseContent = await this.exercisesToBaseContent()

		if (this.baseFile) this.app.vault.modify(this.baseFile, baseContent);
		this.baseFile = await this.app.vault.create(this.path, baseContent);
	}

	async exercisesToBaseContent(): Promise<string> {
		return this.generateJSONBlock(
			this.allExercises
				.map(ex => JSON.stringify(ex, (key, value) => {
					if (value instanceof App) {
						return undefined
					}
					return value
				}, 3))
				.join(",\n")
		)
	}

	async scan(): Promise<ExerciseLinkText[]> {
		const dvFiles: DataArray<Record<string, Literal>> = this.dataViewAPI?.pages(this.excalidraw_tag);
		if (!dvFiles.length) new Notice(`No Exercises for ${this.type}`);

		this.excalidrawFiles = await this.getExcalidrawFiles(dvFiles);
		const exerciseLinkTextArray: ExerciseLinkText[] = this.excalidrawFiles.flatMap((ef)=>ef.getExerciseLinkText());

		return exerciseLinkTextArray;
	}

	// async someFunction() {
	// 	let signal: boolean;
	// 	if (signal){
	// 		const exerciseLinkTextArray: ExerciseLinkText[] = await this.scan();
	// 		if (exerciseLinkTextArray.length > this.size) {
	//             update the base
	//				
	// 		}
	// 	}
	//
	//
	// }

	async query(): Promise<void> {
		switch (this.strategy) {
			case QUERY_STRATEGY.NEW_EXERCISE_FIRST:
				const newExercises = this.allExercises
					.filter((ex) => ex.status == "new");
				const selectedExercise= newExercises[Math.floor(Math.random()*newExercises.length)];
				this.activeExercise = new Exercise(this.app, selectedExercise);
		}
		this.activeExercise.activate();
		this.activeExercise.open();
	}



	async getExcalidrawFiles(dvFiles:DataArray<Record<string, Literal>>): Promise<ExcalidrawFile[]> {
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

		return excalidrawFiles;


	}

	createNewExercise(exercisesArray: string[]): Exercise[] {
		return exercisesArray.map(link => {

			return new Exercise(this.app, {
				link,
				type: this.type,
				lifeline:[],
				id:"",
				status:EXERCISE_STATUSES["New"]
			})
		});
	}

	// async update(): Promise<void> {
	// 	if (this.path) {
	// 		const baseFile = this.app.metadataCache.getFirstLinkpathDest(this.path,this.path) as TFile;
	// 		const exercises: ExerciseStructure[] = await this.getExercises(this.path)
	// 		let newContent = this.generateJSONBlock(
	// 			exercises.filter(ex => ex.id !== this.currentExercise.id)
	// 				.map(ex=>JSON.stringify(ex,null,2))
	// 				.join(",\n") + `,\n${JSON.stringify(this.currentExercise,null,2)}`
	// 		)
	// 		// Convert obtained link[] to Exercise[] and write to corresponding files
	// 		await this.app.vault.modify(
	// 			baseFile,
	// 			newContent
	// 		)
	// 	}
	// }


	generateJSONBlock(jsonString:string): string {
		return `\`\`\`json\n{\n"exercises":[\n${jsonString}]\n}\n\`\`\``;
	}

}

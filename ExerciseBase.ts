import {Exercise, ExerciseLinkText} from "./Exercise";
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

	excalidrawFiles: {[eFName: string]: ExcalidrawFile};

	base: Exercise[] = [];

	isExist: boolean;

	constructor(app: App, name:string, type: string, path: string, excalidraw_tag: string) {
		super(app, name, path);
		this.app = app;
		this.type = type;
		this.excalidraw_tag = excalidraw_tag
		this.size = this.base.length;
	}

	async initialize(): Promise<void> {
		console.log(this);

		this.isExist = this.path !== undefined &&
			this.app.vault.getAbstractFileByPath(this.path) !== null;
		await this.scan();

		if (!this.isExist) {
			// console.log(`${this.name} entering first branch`)
			this.isExist = true;
			const eLinkTextArray: ExerciseLinkText[] = Object.values(this.excalidrawFiles).flatMap((ef)=>ef.getExerciseLinkText());

			await this.update(eLinkTextArray)
		}
		else {
			// console.log(`${this.name} entering second branch`)

			this.base = this.getJSON(
				await this.read()
			).exercises.map(ex => new Exercise(this.app, ex) );
			this.size = this.base.length;
			this.baseFile = this.app.metadataCache.getFirstLinkpathDest(this.path, this.path);
		}
	}

	async update(ct: ExerciseLinkText[] | ExerciseLinkText) {

		const eLinkTextArray: ExerciseLinkText[] = Array.isArray(ct)? ct : [ct];

		this.base.push(...this.createNewExercise(eLinkTextArray));
		console.log(`length before: ${this.size}`);
		this.size = this.base.length;
		console.log(`length after: ${this.size}`);
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
			this.base
				.map(ex => JSON.stringify(ex, (key, value) => {
					if (value instanceof App) {
						return undefined
					}
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
		switch (this.strategy) {
			case QUERY_STRATEGY.NEW_EXERCISE_FIRST:

				let exerciseIndex = -1;
				while (exerciseIndex == -1){
				exerciseIndex = this.base.findIndex((ex, index) => ex.status == EXERCISE_STATUSES.New && index == Math.floor(Math.random()*this.size))
			}
			this.activeExercise = this.base.splice(exerciseIndex, 1)[0];
		}
		this.activeExercise.activate();
		this.activeExercise.open();
	}

	closeExercise(){
		this.activeExercise.close();
		this.update(this.activeExercise.link)
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

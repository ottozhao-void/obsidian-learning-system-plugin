import {Exercise} from "./Exercise";
import {DataArray, getAPI, Literal} from "obsidian-dataview";
import {App, Notice, TFile} from "obsidian";
import {ExcalidrawFile} from "./Excalidraw";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {GenericFile} from "./GenericFile";

enum QUERY_STRATEGY {
	"NEW_EXERCISE_FIRST"
}

enum EXERCISE_STATUSES {
	New = "new",
	Laser = "laser",
	Stumble = "stumble",
	Drifter = "drifter"
}



interface ExerciseBaseInfo_ {
	name: string;
	path: string | undefined;
	size: number;
	excalidraw_tag: string | undefined;
	type:string;
	strategy:QUERY_STRATEGY.NEW_EXERCISE_FIRST;
}

type ExerciseBaseInfo = Partial<ExerciseBaseInfo_>;


export const EXERCISE_BASE: Record<string, ExerciseBaseInfo> = {
	"math":{
		path: "Leaf Base - Math.md",
		excalidraw_tag: "#excalidraw/math"
	},
	"DSP":{
		path: "Leaf Base - DSP.md",
		excalidraw_tag:"#excalidraw/signals_and_systems"
	}
}


export class ExerciseBase extends GenericFile implements ExerciseBaseInfo{
	app:App;

	size: number;

	strategy: QUERY_STRATEGY = QUERY_STRATEGY.NEW_EXERCISE_FIRST;

	type: string | undefined;

	excalidraw_tag: string | undefined;

	dataViewAPI: DataviewApi = getAPI() as DataviewApi;

	activeExercise: Exercise;

	baseFile: TFile | null;

	allExercises: Exercise[];

	isExist: boolean;

	constructor(app: App, name:string, type: string | undefined, path: string | undefined, excalidraw_tag: string | undefined) {
		super(app, name, path);
		this.app = app;
		this.type = type;
		this.excalidraw_tag = excalidraw_tag
	}

	async initialize(): Promise<void> {

		this.isExist = this.path !== undefined &&
			this.app.metadataCache.getFirstLinkpathDest(this.path,this.path) !== null;

		if (!this.isExist) {

			const dvFiles: DataArray<Record<string, Literal>> = this.dataViewAPI?.pages(this.excalidraw_tag);
			if (!dvFiles.length) new Notice(`No Exercises for ${this.type}`);

			// Retrieves the excalidraw files
			const excalidrawFiles: ExcalidrawFile[] = await this.getExcalidrawFiles(dvFiles);
			const exerciseLinkArray: string[] = excalidrawFiles.flatMap((ef)=>ef.getExercise());
			this.allExercises = this.createNewExercise(exerciseLinkArray);
			// console.log(this.allExercises);

			// Convert obtained link[] to Exercise[] and write to corresponding files
			const newContent:string = this.generateJSONBlock(
				this.allExercises
					.map(ex => JSON.stringify(ex,null,3))
					.join(",\n")
			)
			//Create base file with well formated Execise Object
			if (this.path) {
				console.log(this.isExist);
				await this.app.vault.create(this.path, newContent);
			};
		}
		else {
			this.allExercises = this.getJSON(
				await this.read()
			).exercises;
		}
	}

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

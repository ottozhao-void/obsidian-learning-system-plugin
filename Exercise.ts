import {
	App,
	Editor,
	MarkdownView,
	Modal,
	moment,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	Menu,
	View,
	TAbstractFile, TFile,
	MetadataCache
} from 'obsidian';
import {getAPI,DataArray,Literal} from 'obsidian-dataview';
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";


interface ExcalidrawFile {
	fileName: string;
	fileContent: string;
}
interface ExerciseBaseInfo {
	baseFilePath: string;
	baseTag: string;
}

const exerciseBases: Record<string, ExerciseBaseInfo> = {
	"math":{
		baseFilePath: "Leaf Base - Math.md",
		baseTag: "#excalidraw/math"
	},
	"DSP":{
		baseFilePath: "Leaf Base - DSP.md",
		baseTag:"#excalidraw/signals_and_systems"
	}
}

interface ExerciseWindow {
	startTimeStamp?: number;
	endTimeStamp?: number;
	remark?: string;
	status?: string;
}

interface ExerciseStructure {
	link: string;
	type: string;
	lifeline: ExerciseWindow[];
	id:string
}

export class Exercise{
	// private app: App;
	public link:string;
	public type:string;
	public lifeline: ExerciseWindow[];
	public id:string;
	constructor(exerciseInfo:ExerciseStructure) {
		Object.assign(this,exerciseInfo)
		this.lifeline = exerciseInfo?.lifeline || [];
		this.id = this.getId();
	}
	// toString() {
	// 	return `{\n${
	// 		Object.entries(this)
	// 			.map(([key, value]) => {
	// 				if (typeof value === "string") {
	// 					return `"${key}":\"${value}\"`;
	// 				}
	// 				else if(Array.isArray(value)) {
	// 					return `"${key}":[]`;
	// 				}
	// 			})
	// 			.join(",\n")
	// 	}\n}`;
	// }

	creatNewExerciseWindow(){
		let ew: ExerciseWindow = {
			startTimeStamp: moment().valueOf(),
		};
		this.lifeline.push(ew);
	}

	private getId() {
		// With link = "[[Drawing 2023-08-09 20.49.08.excalidraw#^4rGiBzp9xLmXC6p8hENrF]]"
		const match = this.link.match(/\^\s*(\S*?)]]/);
		return match && match[1]? match[1] : "";
	}
}

export class Mechanism {
	private app:App;
	private dataViewAPI = getAPI() as DataviewApi ;
	constructor(app:App) {
		this.app = app;
	}
	async initializeExerciseBase(){
		for (let subject of Object.keys(exerciseBases)){
			const {baseTag:tag, baseFilePath} = exerciseBases[subject];
			if(this.isBaseExist(baseFilePath)){
				return
			}
			const dvPageExcalFiles: DataArray<Record<string, Literal>> = this.dataViewAPI?.pages(tag);

			if (!dvPageExcalFiles.length) {
				new Notice(`No Exercises for ${subject}`);
				continue
			};

			// This code block creates Exercise Object out of each obtained link
			// and convert to JSON format.
			const excalFiles = await this.getExcalidrawFiles(dvPageExcalFiles);
			const exerciseBlocks = this.getExerciseBlocks(excalFiles);
			const exercises: Exercise[] = this.createNewExercise(exerciseBlocks, subject)
			// Convert obtained link[] to Exercise[] and write to corresponding files
			const newContent:string = this.generateJSONBlock(
				exercises
					.map(ex => JSON.stringify(ex,null,3))
					.join(",\n")
			)

			//Create base file with well formated Execise Object
			await this.app.vault.create(baseFilePath, newContent);
		}
	}

	async updateExercise(newExercise:Exercise): Promise<void> {
		const baseFilePath = exerciseBases[newExercise.type].baseFilePath;
		const baseFile = this.app.metadataCache.getFirstLinkpathDest(baseFilePath,baseFilePath) as TFile;
		const exercises: ExerciseStructure[] = await this.getExercises(baseFilePath)
		let newContent = this.generateJSONBlock(
			exercises.filter(ex => ex.id !== newExercise.id)
				.map(ex=>JSON.stringify(ex,null,2))
				.join(",\n") + `,\n${JSON.stringify(newExercise,null,2)}`
		)
		// Convert obtained link[] to Exercise[] and write to corresponding files
		this.app.vault.modify(
			baseFile,
			newContent
		)
	}
	private generateJSONBlock(jsonString:string): string {
		return `\`\`\`json\n{\n"exercises":[\n${jsonString}]\n}\n\`\`\``;
	}
	async writeContentToFile(baseFile: any, baseFilePath: string, content: string) {
		if (baseFile) {
			this.app.vault.modify(baseFile, content);
		} else {
			await this.app.vault.create(baseFilePath, content);
		}
	}
	async getFileContent(targetExFiles: DataArray<Record<string, Literal>> ): Promise<string[]> {
		return Promise.all(
			targetExFiles?.map(file => {
				const currentFile:TFile | null = this.app.metadataCache.getFirstLinkpathDest(file.file.path,file.file.path)
				if (currentFile) return this.app.vault.read(currentFile);
				return "";
			})
		);
	}
	async getExcalidrawFiles(dvPageExcalFiles:DataArray<Record<string, Literal>>): Promise<ExcalidrawFile[]>{
		const fileContents = await this.getFileContent(dvPageExcalFiles);
		const fileNames: DataArray<string> = dvPageExcalFiles.map(file => file.file.name) as DataArray<string>;

		return fileNames.map((name, index) => ({
			fileName: name,
			fileContent: fileContents[index]
		})).array();
	}
	private getExerciseBlocks(excalFiles: ExcalidrawFile[]): string[] {
		return excalFiles.flatMap(ef => {
			const elements: any[] = this.extractJSON(ef.fileContent)?.elements;
			return elements
				.filter(el => el.strokeColor === "#846358" && el.type === "rectangle" && !el.isDeleted)
				.map(el => `[[${ef.fileName}#^${el.id}]]`)
		})
	}

	async select(subject:string): Promise<void> {
		const baseFilePath = exerciseBases[subject]?.baseFilePath;

		const allExercises: Exercise[] = (await this.getExercises(baseFilePath)).map((ex: ExerciseStructure) => new Exercise(ex));
		const exercise = allExercises.filter(ex => this.strategy(ex))[1]

		exercise.creatNewExerciseWindow();
		if (exercise) {
			const link = this.getExerciseLink(exercise);
			if (link) this.app.workspace.openLinkText(link, baseFilePath, true);
			// return allExercises.filter(ex => this.strategy(ex))[0];
		}
		this.updateExercise(exercise);
	}
	async increaseExerciseCount(subject:string):Promise<void>{
		return ;
	}

	async getExercises(baseFilePath:string): Promise<ExerciseStructure[]> {
		const baseTFile = this.app.metadataCache.getFirstLinkpathDest(baseFilePath,baseFilePath)

		if (!baseTFile) {
			new Notice("No such a base file!")
			return [];
		}
		const baseFileContent = await this.app.vault.read(baseTFile);
		const parsedContent = this.extractJSON(baseFileContent);
		return parsedContent?.exercises && Array.isArray(parsedContent.exercises)?
			parsedContent.exercises : [];
	}

	private strategy(ex: Exercise) {
		return true;
	}

	private extractJSON(elContent:string): any{
		const jsonPattern = /```json\n([\s\S]*?)\n```/g;
		const match = jsonPattern.exec(elContent);
		return match && match[1] ? JSON.parse(match[1]) : null;
	}

	private getExerciseLink(exercise: Exercise): string {
		const match = exercise.link.match(/\[\[(.*?)\]\]/);
		return match? match[1] : "";
	}

	private createNewExercise(exerciseBlocks: string[], type: string) {
		return exerciseBlocks.map(link => {
			return new Exercise({link,type,lifeline:[],id:""})
		});
	}

	private isBaseExist(baseFilePath:string) {
		return this.app.vault.getAbstractFileByPath(baseFilePath);
	}
}

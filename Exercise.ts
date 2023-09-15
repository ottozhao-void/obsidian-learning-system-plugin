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
import {Interface} from "readline";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";


interface ExcalidrawFile {
	fileName: string;
	fileContent: string
}
interface ExerciseBaseInfo {
	baseFilePath: string;
	baseTag: string;
}

const exerciseBases: Record<string, ExerciseBaseInfo> ={
	"math":{
		baseFilePath: "Leaf Base - Math.md",
		baseTag: "#excalidraw/math"
	},
	"DSP":{
		baseFilePath: "Leaf Base - DSP.md",
		baseTag:"#excalidraw/signals_and_systems"
	}
}

export class Exercise{
	// private app: App;
	private link:string
	constructor(link:string) {
		this.link = link;
	}
	toString() {
		return `{\n${
			Object.entries(this)
				.map(([key, value]) => `${key}:\"${value}\"`)
				.join(",\n")
		}\n}`
	}
}

export class Mechanism {
	private app:App;
	private dataViewAPI = getAPI() as DataviewApi ;
	constructor(app:App, link:string) {
		this.app = app;
	}

	async updateExerciseBaseContent(): Promise<void> {
		for (let subject of ["math", "DSP"]) {
			const {baseTag:tag, baseFilePath} = exerciseBases[subject];
			const dvPageExcalFiles: DataArray<Record<string, Literal>> = this.dataViewAPI?.pages(tag);

			if (!dvPageExcalFiles.length) {
				new Notice(`No Exercises for ${subject}`);
				continue
			};
			const baseFile=this.app.metadataCache.getFirstLinkpathDest(baseFilePath,baseFilePath);
			const excalFiles = await this.getExcalidrawFiles(dvPageExcalFiles);
			const exerciseBlocks = this.getExerciseBlocks(excalFiles);

			// Convert obtained link[] to Exercise[] and write to corresponding files
			const newContent:string = this.generateContentFromExerciseBlocks(exerciseBlocks)
			this.writeContentToFile(baseFile, baseFilePath, newContent);
		}
	}
	generateContentFromExerciseBlocks(exerciseBlocks:string[]): string {
		return `\`\`\`json\n${
			this.link2Exercise(exerciseBlocks)
				.map(ex => ex.toString())
				.join(",\n")
		}\n\`\`\``;
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
	getExerciseBlocks(excalFiles: ExcalidrawFile[]): string[] {
		return excalFiles.flatMap(ef => {
			const elements: any[] = this.extractJSON(ef.fileContent)?.elements;
			return elements
				.filter(el => el.strokeColor === "#846358" && el.type === "rectangle" && !el.isDeleted)
				.map(el => `[[${ef.fileName}#^${el.id}]]`)
		})
	}
	extractJSON(elContent:string): any{
		const jsonPattern = /```json\n([\s\S]*?)\n```/g;
		const match = jsonPattern.exec(elContent);
		return match && match[1] ? JSON.parse(match[1]) : null;
	}
	private link2Exercise(exerciseBlocks: string[]): Exercise[] {
		return exerciseBlocks.map(link => new Exercise(link));
	}

	/* To select one exercise from the exercise base of designated subject
	* I need:
	* 1. subject: string
	* 2. allExercises: Exercise[]
	* Then I have to select an exercise based on some kind of strategy
	*
	* return exercise: Exercise
	* */
	select(subject:string): Exercise{
	const {baseFilePath,baseTag} = exerciseBases[subject];
	const allExercises: Exercise[] = this.getAllExercises(baseFilePath);
	return allExercises.filter(ex => this.strategy(ex))[0];
	}

	private getAllExercises(baseFilePath: string):Exercise[] {
		return [];
	}

	private strategy(ex: Exercise) {
		return undefined;
	}
}

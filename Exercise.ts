import {
	App,
	Editor,
	MarkdownView,
	Modal,
	moment,
	Notice,
	Workspace,
	Setting,
	Menu,
	View,
	TAbstractFile, TFile,
	MetadataCache
} from 'obsidian';
import {getAPI,DataArray,Literal} from 'obsidian-dataview';
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {ExcalidrawFile} from "./Excalidraw";
import {ExerciseBase,EXERCISE_BASE} from "./ExerciseBase";



interface ExerciseWindow {
	startTimeStamp?: number;
	endTimeStamp?: number;
	remark?: string;
	status?: string;
}

interface ExerciseInfo {
	link: string; // Link is in the format of Obsidian LinkText
	type: string | undefined;
	status: string // The status refers to the latest status of the exercise (status of the last ExerciseWindow)
	lifeline: ExerciseWindow[];
	id:string
}

export class Exercise{
	app:App;
	link:string;
	type:string;
	lifeline: ExerciseWindow[];
	id:string;
	status: string

	constructor(app:App, exerciseInfo:ExerciseInfo) {
		Object.assign(this,exerciseInfo)
		this.app = app
		this.lifeline = exerciseInfo?.lifeline || [];
		this.id = this.extractIdFromLink();
	}

	activate(){
		this.lifeline.push({
			startTimeStamp: moment().valueOf()
		})
	}

	private extractIdFromLink() {
		const match = this.link.match(/\^\s*(\S*)/);
		return match?.[1] || "";
	}

	open() {
		this.app.workspace.openLinkText(this.link, this.link,true);
	}

	close() {
		let ew: ExerciseWindow = this.lifeline.pop() as ExerciseWindow;
		ew.endTimeStamp = moment().valueOf();
		ew.status = "laser";
		this.status = ew.status;
		this.lifeline.push(ew);
	}
	getWikiLink():string{
		return `[[${this.link}]]`
	}

}

class WarningModal extends Modal {

	onOpen() {
		this.contentEl.createEl("h1",{text: "NO CURRENT EXERCISE IS RUNNING!"})
	}

	onClose() {
		this.contentEl.empty();
	}
}

export class Mechanism {
	app:App;
	dataViewAPI: DataviewApi;
	strategy: string = "newFirst";
	currentExercise: Exercise;
	exerciseBases: {[K: string]: ExerciseBase} = {};

	constructor(app:App) {
		this.app = app;
		this.dataViewAPI = getAPI() as DataviewApi
	}

	getCurrentExercise(): Exercise | null {
		if (!this.currentExercise){
			new WarningModal(this.app).open();
			return null
		}
		return this.currentExercise;
	}

	async initialize(){
		Object.keys(EXERCISE_BASE).forEach((subject) => {
			this.exerciseBases[subject] = new ExerciseBase(
				this.app,
				`Exercise Base - ${subject}`,
				subject,
				EXERCISE_BASE[subject].path,
				EXERCISE_BASE[subject].excalidraw_tag
			)
			this.exerciseBases[subject].initialize();
		})
	}





	async increaseExerciseCount(subject:string):Promise<void>{
		return ;
	}








	private isBaseExist(baseFilePath:string) {
		return this.app.vault.getAbstractFileByPath(baseFilePath);
	}


}

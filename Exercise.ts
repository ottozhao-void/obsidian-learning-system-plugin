import {
	App,
	moment,
} from 'obsidian';
import {ExerciseBase, EXERCISE_BASE, EXERCISE_STATUSES} from "./ExerciseBase";

export type ExerciseLinkText = string;

interface ExerciseWindow {
	startTimeStamp: number;
	endTimeStamp: number;
	remark?: string;
	status: string;
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
	link: ExerciseLinkText;
	lifeline: ExerciseWindow[];
	id:string;
	lastStatus: string
	lastRemark: string = "";

	private _stime:number;

	constructor(app:App, exerciseInfo:ExerciseInfo) {
		Object.assign(this,exerciseInfo)
		this.app = app
		this.lifeline = exerciseInfo?.lifeline || [];
		this.id = this.extractIdFromLink();
	}


	private extractIdFromLink() {
		const match = this.link.match(/\^\s*(\S*)/);
		return match?.[1] || "";
	}

	open() {
		this._stime = moment().valueOf();
		this.app.workspace.openLinkText(this.link, this.link,true);
	}

	close() {
		this.lifeline.push({
			startTimeStamp: this._stime,
			endTimeStamp: moment().valueOf(),
			status: this.lastStatus,
			remark: this.lastRemark
		});

	}

	setStatus(st:string) {
		this.lastStatus = st;
	}

	setRemark(remark: string) {
		this.lastRemark = remark
	}

	getWikiLink():string{
		return `[[${this.link}]]`
	}

}

export class BaseMaintainer {
	app:App;
	exerciseBases: {[K: string]: ExerciseBase} = {};

	constructor(app:App) {
		this.app = app;
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
		})
		await this.exerciseBases["math"].initialize();
		await this.exerciseBases["DSP"].initialize();
	}


}

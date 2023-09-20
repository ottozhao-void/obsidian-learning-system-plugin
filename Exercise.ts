import {
	App,
	moment,
} from 'obsidian';
import {ExerciseBase, EXERCISE_BASE, EXERCISE_STATUSES} from "./ExerciseBase";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {getAPI} from "obsidian-dataview";
import {ExcalidrawFile} from "./Excalidraw";

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
	lastStatus: string // The status refers to the latest status of the exercise (status of the last ExerciseWindow)
	lifeline: ExerciseWindow[];
	id:string;
	excalidraw?: ExcalidrawFile;
	base: ExerciseBase;
}

export class Exercise implements ExerciseInfo{
	app:App;
	link: ExerciseLinkText;
	lifeline: ExerciseWindow[];
	id: string;
	type: string;
	lastStatus: string
	lastRemark: string = "";
	excalidraw?: ExcalidrawFile;
	base: ExerciseBase;

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

	getLastStartTime(): moment.Moment {
		return moment(this.lifeline[this.lifeline.length - 1].startTimeStamp);
	}
	getLastEndTime(): moment.Moment {
		return moment(this.lifeline[this.lifeline.length - 1].endTimeStamp);
	}
	getLastDuration() {
		const dur = moment.duration(this.getLastEndTime().diff(this.getLastStartTime()))
		const hours = Math.floor(dur.asHours());
		const minutes = dur.minutes();
		const seconds = dur.seconds();

		return `\n\t- ${hours} hours\n\t- ${minutes} mins\n\t- ${seconds} seconds`;
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



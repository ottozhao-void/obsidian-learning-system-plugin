import {
	App,
	moment, normalizePath,
} from 'obsidian';
import {ExerciseHistory, ExerciseMetadata_V1} from "./src/exercise_version";
import {EXERCISE_STATUSES} from "./src/constants";

export type ExerciseLinkText = string;


export class Exercise implements ExerciseMetadata_V1{
	app_:App;

	// source: ExerciseLinkText;
	source: ExerciseLinkText;

	history: ExerciseHistory[];

	id: string;

	subject: string;

	state: EXERCISE_STATUSES;

	remark: string = "";

	index: number;

	start_time: number;

	end_time: number;

	constructor(app:App, exerciseInfo: ExerciseMetadata_V1) {
		Object.assign(this,exerciseInfo)
		this.app_ = app
		this.history = exerciseInfo?.history || [];
	}

	static extractIdFromLink(el: ExerciseLinkText) {
		const match = el.match(/\^\s*(\S*)/);
		return match?.[1] || "";
	}

	start() {
		this.start_time = moment().valueOf();
		this.app_.workspace.openLinkText(this.source, this.source,true);
	}

	close() {
		this.end_time = moment().valueOf();

		this.history.push({
			startTimeStamp: this.start_time,
			endTimeStamp: this.end_time,
			status: this.state,
			remark: this.remark
		});

	}

	getStartTime(): moment.Moment {
		return moment(this.start_time);
	}

	getEndTime(): moment.Moment {
		return moment(this.end_time);
	}

	getDurationAsString() {
		const dur = moment.duration(this.getEndTime().diff(this.getStartTime()))
		const hours = Math.floor(dur.asHours());
		const minutes = dur.minutes();
		const seconds = dur.seconds();

		return `\n\t- ${hours} hours\n\t- ${minutes} mins\n\t- ${seconds} seconds`;
	}

	getDurationInSeconds(){
		const dur = moment.duration(this.getEndTime().diff(this.getStartTime()))
		return dur.asSeconds();
	}

	setStatus(status:EXERCISE_STATUSES) {
		this.state = status;
	}

	setRemark(remark: string) {
		this.remark = remark
	}

	getWikiLink():string{
		return `[[${this.source}]]`
	}

	static fromJSON(app:App, data: ExerciseMetadata_V1): Exercise {
		return new Exercise(app, data)
	}

	toJSON(){
		return {
			source: this.source,
			id:this.id,
			subject: this.subject,
			index:this.index,
			state: this.state,
			start_time: this.start_time,
			end_time: this.end_time,
			remark: this.remark,
			history: this.history
		};
	}

}




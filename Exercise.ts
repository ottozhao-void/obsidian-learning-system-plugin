import {
	App,
	moment, Notice,
} from 'obsidian';
import {ExerciseHistory, ExerciseMetadata_Latest} from "./src/exercise_version";
import {EXERCISE_STATUSES, EXERCISE_SUBJECT, QUERY_STRATEGY, SUBJECTS} from "./src/constants";
import {ExerciseBase} from "./ExerciseBase";
import {ExcalidrawFile} from "./Excalidraw";

export type ExerciseLinkText = string;


export class Exercise implements ExerciseMetadata_Latest{
	app_:App;

	// source: ExerciseLinkText;
	source: ExerciseLinkText;

	history: ExerciseHistory[];

	id: string;

	subject: SUBJECTS;

	state: EXERCISE_STATUSES;

	remark: string = "";

	index: number;

	start_time: number;

	end_time: number;

	constructor(app:App, exerciseInfo: ExerciseMetadata_Latest) {
		Object.assign(this,exerciseInfo)
		this.app_ = app
		this.history = exerciseInfo?.history || [];
	}

	static extractIdFromLink(el: ExerciseLinkText) {
		const match = el.match(/\^\s*(\S*)/);
		return match?.[1] || "";
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

	async open (base:ExerciseBase){
		const linktext = base
			.excalidraws_[this.id.split(ExcalidrawFile.id_separator)[0]]
			.idLinktextMapping[this.id];
		// This If statement checks for exercises already created but their position are changed accidentally
		// resulting in the change of their id and fail to retrieve their linktext.
		if (linktext == undefined) new Notice(`There is no matched Linktext for exercise with id: ${this.id}`)
		this.start_time = moment().valueOf();
		await this.app_.workspace.openLinkText(
			linktext,
			linktext,
			base.strategy == QUERY_STRATEGY.NEW_EXERCISE_FIRST
		);
	}

	static fromJSON(app:App, data: ExerciseMetadata_Latest): Exercise {
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




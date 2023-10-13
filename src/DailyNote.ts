import {App, moment, normalizePath} from "obsidian";
import {DAILYNOTE_DATE_FORMAT} from "./constants";

interface ActivityInfo {

}

interface ExerciseRecordInfo extends ActivityInfo {

}

export class DailyNote {
	app: App;
	private _path_: string = normalizePath(`🗓️Daily notes/${moment().format(DAILYNOTE_DATE_FORMAT)}.md`)
	content: string;
	contentLines: string[];

	static async init(app: App): Promise<DailyNote> {
		const dailyNote = new DailyNote();
		dailyNote.app = app;
		await dailyNote.read();
		dailyNote.contentLines = dailyNote.content.split("\n");
		return dailyNote;
	}

	get path(){
		return this._path_;
	}
	set path(path:string){
		this._path_ = path;
	}
	async read(){
		this.content = await this.app.vault.adapter.read(normalizePath(this.path));
	}


	async writeToDailyNote(startTimestamp: number, endTimestamp: number, activity?: ActivityInfo){
		const startTime = moment(startTimestamp)
		const endTime = moment(endTimestamp)


		const record: string = `- [ ] ${startTime.format("HH:mm")} - ${endTime.format("HH:mm")}`;
		this.contentLines.push(record);
		this.content = this.contentLines.join("\n");
		await this.app.vault.adapter.write(normalizePath(this.path),this.content);

	}
}

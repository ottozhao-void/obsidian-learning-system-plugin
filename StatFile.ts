import {App, moment, normalizePath, TFile} from "obsidian";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {getAPI} from "obsidian-dataview";
import {toYaml} from "./src/utility/parser";

export interface DayMetadata {
	math_exercises: number;
	math_averageTime: number;
	math_total_time: number;

	dsp_exercises: number;
	dsp_averageTime: number;
	dsp_total_time:number;

	politics_exercises: number;
	politics_averageTime: number;
	politics_total_time: number;

	totoal_focus_time: number;
}

export type DayFrontmatter = DayMetadata;


export class StatFile implements DayMetadata{
	dsp_averageTime: number = 0;
	dsp_exercises: number = 0;
	dsp_total_time: number = 0;

	math_averageTime: number = 0;
	math_exercises: number = 0;
	math_total_time: number = 0;

	politics_averageTime: number = 0;
	politics_exercises: number = 0;
	politics_total_time: number = 0;

	totoal_focus_time: number = 0;


	file_: TFile | null;
	filePath_:string;
	exists_: boolean;
	app_: App;
	dv_: DataviewApi | undefined;

	constructor(app:App, dailydata?: DayMetadata) {
		this.app_ = app;
		// this.filePath_ = filePath;
		this.dv_ = getAPI();
		// this.file_ = this.app_.metadataCache.getFirstLinkpathDest(this.path,this.path);
		// this.exists_ = this.file_ != null ;
		Object.assign(this, dailydata);
	}

	// stringify(): string

	static get path(){
		const date_string = moment().format('YYYY-MM-DD');
		return normalizePath(`Daily Notes/DF${date_string}.md`);
	}

	get path(){
		const date_string = moment().format('YYYY-MM-DD');
		return normalizePath(`Daily Notes/DF${date_string}.md`);
	}

	async save(){
		const content = toYaml(this,"_")
		await this.app_.vault.adapter.write(normalizePath(this.path), content);
	}

	static fromFrontmatter(app:App, data: DayFrontmatter): StatFile {
		return new StatFile(app, data);
	}


}

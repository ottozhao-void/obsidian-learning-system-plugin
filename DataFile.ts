import {App, moment, normalizePath, TFile} from "obsidian";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {getAPI} from "obsidian-dataview";
import yaml from "js-yaml";
import {DayMetadata_Latest, SubjectMetadata} from "./src/dailyData_version";
import {ExerciseBase} from "./ExerciseBase";
import {SUBJECTS} from "./src/constants";


export class DataFile implements DayMetadata_Latest{
	// dsp_averageTime: number = 0;
	// dsp_exercises: number = 0;
	// dsp_total_time: number = 0;
	//
	// math_averageTime: number = 0;
	// math_exercises: number = 0;
	// math_total_time: number = 0;
	//
	// politics_averageTime: number = 0;
	// politics_exercises: number = 0;
	// politics_total_time: number = 0;
	//
	// totoal_focus_time: number = 0;

	DSP: SubjectMetadata = {
		count: 0,
		timeArray: [],
		avgTime:0,
		varTime:0,
		totalTime:0,
		baseSize:0,
		laser:0,
		targetNumber:0,
		dayProgress:0,
		subjectProgress:0,
		maxTime:0,
		minTime:0,
		examAbility:0
	};

	Math: SubjectMetadata = {
		count: 0,
		timeArray: [],
		avgTime:0,
		varTime:0,
		totalTime:0,
		baseSize:0,
		laser:0,
		targetNumber:0,
		dayProgress:0,
		subjectProgress:0,
		maxTime:0,
		minTime:0,
		examAbility:0
	};

	Politics: SubjectMetadata = {
		count: 0,
		timeArray: [],
		avgTime:0,
		varTime:0,
		totalTime:0,
		baseSize:0,
		laser:0,
		targetNumber:0,
		dayProgress:0,
		subjectProgress:0,
		maxTime:0,
		minTime:0,
		examAbility:0
	};

	plan: number = 0;
	totalFocusTime: number = 0;


	app_: App;
	dv_: DataviewApi | undefined;

	constructor(app:App, dailydata?: DayMetadata_Latest) {
		this.app_ = app;
		this.dv_ = getAPI();
		Object.assign(this, dailydata);
	}

	// stringify(): string

	toYaml(obj: Object, excluded_key = "_"): string {
		const sanitizedObject = Object.fromEntries(
			Object.entries(obj).filter(([key]) => !key.endsWith(excluded_key))
		);
		return `---\n${yaml.dump(sanitizedObject)}---`;
	}

	static get path(){
		const date_string = moment().format('YYYYMMDD');
		return normalizePath(`🗓️Daily notes/DATA-${date_string}.md`);
	}

	get path(){
		const date_string = moment().format('YYYYMMDD');
		return normalizePath(`🗓️Daily notes/DATA-${date_string}.md`);
	}

	async save(){
		const content = this.toYaml(this,"_")
		await this.app_.vault.adapter.write(normalizePath(this.path), content);
	}

	static fromFrontmatter(app:App, data: DayMetadata_Latest): DataFile {
		return new DataFile(app, data);
	}

	setBaseInfo(bases: {[K: string]: ExerciseBase}){
		for (let subject of Object.keys(bases)) {
			this[subject as SUBJECTS].baseSize = bases[subject].size;
			this[subject as SUBJECTS].laser = bases[subject].items_completed;
		}
	}


}

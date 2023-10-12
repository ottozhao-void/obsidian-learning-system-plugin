import {App, moment, normalizePath, TFile} from "obsidian";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {getAPI} from "obsidian-dataview";
import yaml from "js-yaml";
import {DayMetadata_Latest, DayMetadata_V0, SubjectMetadata} from "./version/dailyData_version";
import {ExerciseBase} from "./ExerciseBase";
import {DATE_FORMAT, SUBJECTS} from "./constants";
import {parseFrontmatter} from "./utility/parser";


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
		totalTimeInHour:0,
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
		totalTimeInHour:0,
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
		totalTimeInHour:0,
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

	private _path_: string = normalizePath(`🗓️Daily notes/DATA-${moment().format(DATE_FORMAT)}.md`)
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

	get path(){
		return this._path_;
	}
	set path(path:string){
		this._path_ = path;
	}

	async save(){
		const content = this.toYaml(this,"_")
		await this.app_.vault.adapter.write(normalizePath(this.path), content);
	}

	setBaseInfo(bases: {[K: string]: ExerciseBase}){
		for (let subject of Object.keys(bases)) {
			this[subject as SUBJECTS].baseSize = bases[subject].size;
			this[subject as SUBJECTS].laser = bases[subject].items_completed;
		}
	}

	async setInitData(app:App,bases:{[K: string]: ExerciseBase}){
		let d = 1;
		let filepath = "";
		do {
			const date = moment().subtract(d,"day").format(DATE_FORMAT)
			filepath = DataFile.path(date);
			d++;
		} while (!(await app.vault.adapter.exists(filepath)));

		const yesterdayMetadata = await parseFrontmatter(app, filepath) as DayMetadata_Latest
		for (let subject of Object.keys(bases)) {
			this[subject as SUBJECTS].baseSize = bases[subject].size;
			this[subject as SUBJECTS].laser = bases[subject].items_completed;
			const subjectMetadata = yesterdayMetadata[subject as SUBJECTS];
			this[subject as SUBJECTS].targetNumber = subjectMetadata.count + 1;
		}
	}

	static fromFrontmatter(app:App, data: DayMetadata_Latest): DataFile {
		return new DataFile(app, data);
	}

	static path(date_string: string){
		return normalizePath(`🗓️Daily notes/DATA-${date_string}.md`);
	}

	static fromDate(date:string){

	}

	static async read(app:App, path: string): Promise<DayMetadata_Latest> {
		return parseFrontmatter(app,path)
	}

	static async fromOldToNew(app:App, path:string){
		const oldMetadata = await parseFrontmatter(app, path) as DayMetadata_V0;
		const newMetadata = DataFile.fromFrontmatter(app, {
			totalFocusTime: Math.round((oldMetadata.math_total_time+oldMetadata.dsp_total_time+oldMetadata.politics_total_time)*100/3600)/100,
			plan: 0,
			Math: {
				count: oldMetadata.math_exercises,
				timeArray: [],
				avgTime:Math.round(oldMetadata.math_averageTime*100/60)/100,
				varTime:0,
				totalTime:Math.round(oldMetadata.math_total_time*100/60)/100,
				totalTimeInHour:Math.round(oldMetadata.math_total_time*100/3600)/100,
				baseSize:0,
				laser:0,
				targetNumber:0,
				dayProgress:0,
				subjectProgress:0,
				maxTime:0,
				minTime:0,
				examAbility:0
			},
			DSP: {
				count: oldMetadata.dsp_exercises,
				timeArray: [],
				avgTime:Math.round(oldMetadata.dsp_averageTime*100/60)/100,
				varTime:0,
				totalTime:Math.round(oldMetadata.dsp_total_time*100/60)/100,
				totalTimeInHour:Math.round(oldMetadata.dsp_total_time*100/3600)/100,
				baseSize:0,
				laser:0,
				targetNumber:0,
				dayProgress:0,
				subjectProgress:0,
				maxTime:0,
				minTime:0,
				examAbility:0
			},
			Politics: {
				count: oldMetadata.politics_exercises,
				timeArray: [],
				avgTime:Math.round(oldMetadata.politics_averageTime*100/60)/100,
				varTime:0,
				totalTime:Math.round(oldMetadata.politics_total_time*100/60)/100,
				totalTimeInHour:Math.round(oldMetadata.politics_total_time*100/3600)/100,
				baseSize:0,
				laser:0,
				targetNumber:0,
				dayProgress:0,
				subjectProgress:0,
				maxTime:0,
				minTime:0,
				examAbility:0
			}
		})
		newMetadata.path = path;
		await newMetadata.save()
	}


}

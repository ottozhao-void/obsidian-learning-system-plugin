import {App, stringifyYaml, TFile} from "obsidian";
import {ExerciseBase} from "./ExerciseBase";
import {moment} from "obsidian";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {getAPI} from "obsidian-dataview";
import * as yaml from 'js-yaml';


export const DAILY_DF_NAME_TEMPLATE = ():string => {
	const date_string = moment().format('YYYY-MM-DD');
	return `Daily Notes/DF${date_string}.md`
}

export interface DailyData {
	math_exercises: number;
	math_averageTime: number;
	math_total_time: number;

	dsp_exercises: number;
	dsp_averageTime: number;
	dsp_total_time:number;

	politics_exercises: number;
	politics_averageTime: number;
	politics_total_time: number;
}


export class DataProcessor{

	// The statfile should be the runtime Object of the actual Obsidian note that store the data.
	statfile: StatFile;

	exerciseBase: ExerciseBase;
	baseType: string;

	constructor(dataFile:StatFile,exerciseBase: ExerciseBase) {
		this.statfile = dataFile;
		this.exerciseBase = exerciseBase;
		this.baseType = exerciseBase.type;
	}

	async increaseExerciseCount(){
		(this.statfile as any)[`${this.baseType.toLowerCase()}_exercises`] ++;
		await this.statfile.save();
	}

	// This function calculates the average time spent on each exercise
	async calculateAverageTimePerExercise(seconds: number){
		let avgTime = (this.statfile as any)[`${this.baseType.toLowerCase()}_averageTime`];
		avgTime = (avgTime*(this.statfile as any)[`${this.baseType.toLowerCase()}_exercises`] + seconds) / ((this.statfile as any)[`${this.baseType.toLowerCase()}_exercises`]+1);
		(this.statfile as any)[`${this.baseType.toLowerCase()}_averageTime`] = avgTime;
		await this.statfile.save();
		this.calculateTimeSpentOnSubjectForTheDay();
	}


	// This functions accumulates the number of exercises that has done so far
	accumulateExerciseCountForSubject(){}

	// This function calculates the time spent on a particular particular subject
	async calculateTimeSpentOnSubjectForTheDay(){
		(this.statfile as any)[`${this.baseType.toLowerCase()}_total_time`] =
			(this.statfile as any)[`${this.baseType.toLowerCase()}_averageTime`] *
			(this.statfile as any)[`${this.baseType.toLowerCase()}_exercises`]
		await this.statfile.save();

	}

}


export class StatFile implements DailyData{
	dsp_averageTime: number = 0;
	dsp_exercises: number = 0;
	dsp_total_time: number = 0;

	math_averageTime: number = 0;
	math_exercises: number = 0;
	math_total_time: number = 0;

	politics_averageTime: number = 0;
	politics_exercises: number = 0;
	politics_total_time: number = 0;


	_processor: DataProcessor;
	_file: TFile | null;
	_filePath:string;
	_sfExists: boolean;
	_app: App;
	_dataviewAPI: DataviewApi | undefined;

	constructor(app:App, filePath:string, dailydata?: DailyData) {
		this._app = app;
		this._filePath = filePath;
		this._dataviewAPI = getAPI();
		this._file = this._app.metadataCache.getFirstLinkpathDest(this._filePath,this._filePath);
		this._sfExists = this._file != null ;
		Object.assign(this, dailydata);
	}

	async save(){
		if (this._file) {
			const frontmatter = StatFile.toFrontmatter(this);
			await this._app.vault.modify(this._file,frontmatter);
		}
	}

	async create(){
		this._file = await this._app.vault.create(this._filePath, StatFile.toFrontmatter(this));
		this._sfExists = true
	}
	static toFrontmatter(sf: StatFile) {
		// Creating a new object containing only the properties that don't start with "_"
		const sanitizedObject = Object.fromEntries(
			Object.entries(sf).filter(([key]) => !key.startsWith("_"))
		);

		// Converting the sanitized object to a YAML string using js-yaml
		return `---\n${yaml.dump(sanitizedObject)}---`;
	}

	static parseFrontmatter(content: string): DailyData | undefined {
		const pattern = /---\s*([\s\S]*?)\s*---/;
		const matches = pattern.exec(content);
		if (matches && matches[1]) {
			try {
				return yaml.load(matches[1]) as DailyData;
			} catch (e) {
				console.error('Error parsing YAML:', e);
				return undefined;
			}
		}
		return undefined;
	}

}

import {App, TFile} from "obsidian";
import {ExerciseBase} from "./ExerciseBase";
import {moment} from "obsidian";


export const DAILY_DF_NAME_TEMPLATE = ():string => {
	const date_string = moment().format('YYYY-MM-DD');
	return `Daily Notes/DF${date_string}.md`
}

export interface DailyData {
	math_exercises: number;
	math_averageTime: number;

	dsp_exerises: number;
	dsp_averageTime: number;

	politics_exercises: number;
	politics_averageTime: number;
}

export class DataProcessor{

	// The statfile should be the runtime Object of the actual Obsidian note that store the data.
	statfile: StatFile;

	activeBase: ExerciseBase;
	baseType: "Math" | "DSP" | "Politics"

	constructor(activeBase: ExerciseBase, dataFile:StatFile) {
		this.statfile = dataFile;
		this.activeBase = activeBase;
	}

	increaseExerciseCount(){}

	// This function calculates the average time spent on each exercise
	calculateAverageTimePerExercise(){}

	// This functions accumulates the number of exercises that has done on the day
	accumulateDailyExerciseCount(){}

	// This functions accumulates the number of exercises that has done so far
	accumulateExerciseCountForSubject(){}

	// This function calculates the time spent on a particular particular subject
	calculateTimeSpentOnSubjectForTheDay(){}

}


export class StatFile implements DailyData{
	dsp_averageTime: number;
	dsp_exerises: number;
	math_averageTime: number;
	math_exercises: number;
	politics_averageTime: number;
	politics_exercises: number;


	_processor: DataProcessor;
	_file: TFile;
	_filePath:string;
	_sfExists: boolean;
	_app: App;

	constructor(filePath:string, dailydata?: DailyData) {
		this._filePath = filePath;
	}

	save(){}

	async create(){
		// Create an Obsidian note to store the data
		const dataJson = JSON.stringify(this,(key,value)=>{
			if (key.startsWith("_")) return undefined;
		}, 2);
		this._file = await this._app.vault.create(this._filePath, dataJson);
		this._sfExists = true
	}
}

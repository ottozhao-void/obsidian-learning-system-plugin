import {TFile} from "obsidian";
import {ExerciseBase} from "./ExerciseBase";

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


export class StatFile extends TFile implements DailyData{
	dsp_averageTime: number;
	dsp_exerises: number;
	math_averageTime: number;
	math_exercises: number;
	politics_averageTime: number;
	politics_exercises: number;

	processor: DataProcessor;
	file: TFile;

	constructor(filePath:string) {
		super();
	}
}

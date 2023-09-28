import {DataFile} from "./CentralProcessor";
import {BaseInterface} from "./BaseInterface";


export class CPU{

	// The statfile should be the runtime Object of the actual Obsidian note that store the data.
	statfile: StatFile;

	exerciseBase: BaseInterface;
	baseType: string;

	constructor(dataFile:StatFile,exerciseBase: BaseInterface) {
		this.statfile = dataFile;
		this.exerciseBase = exerciseBase;
		this.baseType = exerciseBase.subject;
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

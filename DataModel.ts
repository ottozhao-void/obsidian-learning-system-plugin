import {App, moment, Notice} from "obsidian";
import * as ss from 'simple-statistics'
import {EXERCISE_SUBJECT, GEE_EXERCISE_NUMBER, SUBJECTS} from "./src/constants";
import {DataFile} from "./DataFile";
import {SubjectMetadata} from "./src/dailyData_version";
import {ExerciseBase} from "./ExerciseBase";

export class DataModel {

	data: DataFile
	activeSubject: SUBJECTS;
	activeSubjectMetadata: SubjectMetadata;
	filePath:string;

	app_:App;

	static async init(app:App, filePath: string, bases: {[K: string]: ExerciseBase}): Promise<DataModel> {
		const exists = await app.vault.adapter.exists(filePath);
		const model = new DataModel();

		model.data = exists ?
			new DataFile(app, await DataFile.read(app, filePath))
			: await (async ()=>{
				const data = new DataFile(app)
				await data.setInitData(app,bases);
				await data.save();
				return data
			})();

		model.filePath = filePath;
		model.app_ = app;

		return model;
	}

	async update(subject: SUBJECTS, timeCost: number) {
		this.setSubject(subject)

		await this._update(timeCost);

		this.data.totalFocusTime = this.data.Math.totalTimeInHour + this.data.DSP.totalTimeInHour + this.data.Politics.totalTimeInHour

		this.data[this.activeSubject] = this.activeSubjectMetadata;
	}

	setSubject(subject: SUBJECTS) {
		this.activeSubject = subject
		this.activeSubjectMetadata = this.data[subject];
	}

	// async write()

	private async _update(timeCost: number){
		// To increase the count of exercise completed

		this.activeSubjectMetadata.count ++;

		// To add the time cost of the new exercise to the array
		this.activeSubjectMetadata.timeArray.push(Math.round(timeCost*100/60)/100);

		this.activeSubjectMetadata.avgTime = ss.average(this.activeSubjectMetadata.timeArray);

		this.activeSubjectMetadata.totalTime = ss.sum(this.activeSubjectMetadata.timeArray);
		this.activeSubjectMetadata.totalTimeInHour = this.activeSubjectMetadata.totalTime / 60;


		// 累计做过的题目量，这个或许不需要单独计算，只需要到时候用tracker画图时， 将acc字段设为true即可


		this.activeSubjectMetadata.dayProgress = this.activeSubjectMetadata.count / this.activeSubjectMetadata.targetNumber;

		this.activeSubjectMetadata.subjectProgress = this.activeSubjectMetadata.laser / this.activeSubjectMetadata.baseSize;

		this.activeSubjectMetadata.examAbility =
			this.activeSubject == EXERCISE_SUBJECT.MATH ?
				GEE_EXERCISE_NUMBER.Math * this.activeSubjectMetadata.avgTime :
				this.activeSubject == EXERCISE_SUBJECT.DSP ?
					GEE_EXERCISE_NUMBER.DSP * this.activeSubjectMetadata.avgTime : -1
		this.activeSubjectMetadata.examAbility = this.activeSubjectMetadata.examAbility / 180


		this.activeSubjectMetadata.varTime = ss.variance(this.activeSubjectMetadata.timeArray);

		this.activeSubjectMetadata.maxTime = ss.max(this.activeSubjectMetadata.timeArray);

		this.activeSubjectMetadata.minTime = ss.min(this.activeSubjectMetadata.timeArray);

	}

	setBaseInfo(bases: {[K: string]: ExerciseBase}){
		this.data.setBaseInfo(bases);
	}

	async save(){
		await this.data.save()
	}
}

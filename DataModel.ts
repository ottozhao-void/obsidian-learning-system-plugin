import {App, moment, Notice} from "obsidian";
import * as ss from 'simple-statistics'
import {DATE_FORMAT, EXERCISE_SUBJECT, GEE_EXERCISE_NUMBER, SUBJECTS} from "./src/constants";
import {DataFile} from "./DataFile";
import {DayMetadata_Latest, SubjectMetadata} from "./src/dailyData_version";
import {parseFrontmatter} from "./src/utility/parser";
import {ExerciseBase} from "./ExerciseBase";

type FieldValue = number | number[];
type TargetNumber = number;
type DaySubjectCount = number;
type LaserCount = number;
type Minute = number;

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
			new DataFile(app,await parseFrontmatter(app, filePath))
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

	onAseementCompletted(subject: SUBJECTS, timeCost: Minute) {
		this.setSubject(subject)

		this.update(timeCost);


		this.data[this.activeSubject] = this.activeSubjectMetadata;
	}

	setSubject(subject: SUBJECTS) {
		this.activeSubject = subject
		this.activeSubjectMetadata = this.data[subject];
	}

	// async write()

	async update(timeCost: Minute){
		// To increase the count of exercise completed

		this.activeSubjectMetadata.count ++;

		// To add the time cost of the new exercise to the array
		this.activeSubjectMetadata.timeArray.push(timeCost/60);

		this.activeSubjectMetadata.avgTime = ss.average(this.activeSubjectMetadata.timeArray);

		this.activeSubjectMetadata.totalTime = ss.sum(this.activeSubjectMetadata.timeArray);


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

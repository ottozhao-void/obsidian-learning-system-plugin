import {DayMetadata_Latest, DayMetadata_V1, SubjectMetadata} from "./src/dailData_version";
import {parseYamlWithPath} from "./src/utility/parser";
import {App, moment, Notice} from "obsidian";
import {DataFile} from "./DataFile";
import * as ss from 'simple-statistics'
import {EXERCISE_SUBJECT, GEE_EXERCISE_NUMBER, SUBJECTS} from "./src/constants";

type FieldValue = number | number[];
type TargetNumber = number;
type DaySubjectCount = number;
type LaserCount = number;
type Minute = number;

export class DataModel {

	data: DayMetadata_Latest
	activeSubject: SUBJECTS;
	activeSubjectMetadata: SubjectMetadata;
	filePath:string;


	static async init(app:App, filePath: string): Promise<DataModel> {
		const dataYaml: DayMetadata_Latest = await parseYamlWithPath(app, filePath);
		const model = new DataModel();
		model.data = new DataFile(app,dataYaml);
		model.filePath = filePath;

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

	update(timeCost: Minute){
		// To increase the count of exercise completed
		this.activeSubjectMetadata.count ++;

		// To add the time cost of the new exercise to the array
		this.activeSubjectMetadata.timeArray.push(timeCost);

		this.activeSubjectMetadata.avgTime = ss.average(this.activeSubjectMetadata.timeArray);

		this.activeSubjectMetadata.totalTime = ss.sum(this.activeSubjectMetadata.timeArray);

		// size 和 laser 的更新

		// 累计做过的题目量，这个或许不需要单独计算，只需要到时候用tracker画图时， 将acc字段设为true即可

		this.activeSubjectMetadata.targetNumber = this.activeSubjectMetadata.size / this.data.plan;

		this.activeSubjectMetadata.dayProgress = this.activeSubjectMetadata.count / this.activeSubjectMetadata.targetNumber;

		this.activeSubjectMetadata.subjectProgress = this.activeSubjectMetadata.laser / this.activeSubjectMetadata.subjectProgress;

		this.activeSubjectMetadata.examAbility =
			this.activeSubject == EXERCISE_SUBJECT.MATH ?
				GEE_EXERCISE_NUMBER.Math * this.activeSubjectMetadata.avgTime :
				this.activeSubject == EXERCISE_SUBJECT.DSP ?
					GEE_EXERCISE_NUMBER.DSP * this.activeSubjectMetadata.avgTime : -1


		this.activeSubjectMetadata.varTime = ss.variance(this.activeSubjectMetadata.timeArray);

		this.activeSubjectMetadata.maxTime = ss.max(this.activeSubjectMetadata.timeArray);

		this.activeSubjectMetadata.minTime = ss.min(this.activeSubjectMetadata.timeArray);
	}
}

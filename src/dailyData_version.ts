import {EXERCISE_BASE, EXERCISE_SUBJECT} from "./constants";


export interface DayMetadata_V0 {
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
export interface SubjectMetadata {
	count: number;
	timeArray: number[];
	avgTime: number;
	varTime: number;
	totalTime: number;
	size: number;
	laser: number;
	targetNumber: number;
	dayProgress: number;
	subjectProgress: number;
	maxTime: number;
	minTime: number;
	examAbility?: number;
}

export interface DayMetadata_V1 {

	totalFocusTime: number;

	plan: number;

	Math: SubjectMetadata;

	DSP: SubjectMetadata;

	Politics: SubjectMetadata;
}

export type DayMetadata_Latest = DayMetadata_V1;

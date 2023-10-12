import {EXERCISE_STATUSES} from "../constants";

export interface ExerciseMetadata_V0 {
	lastRemark: string;
	link:string;
	type:string;
	lifeline:any[];
	id:string;
	lastStatus: string;
}

export interface ExerciseMetadata_V1 {

	source: string; // Link is in the format of Obsidian LinkText

	id:string;

	index: number;

	subject: string;

	state: EXERCISE_STATUSES // The state refers to the latest state of the exercise (state of the last ExerciseHistory)

	start_time: number;

	end_time: number;

	remark: string;

	history: ExerciseHistory[];

}

export interface ExerciseMetadata_V2 {

	id:string;

	index: number;

	subject: string;

	state: EXERCISE_STATUSES // The state refers to the latest state of the exercise (state of the last ExerciseHistory)

	start_time: number;

	end_time: number;

	remark: string;

	history: ExerciseHistory[];

}

export type ExerciseMetadata_Latest = ExerciseMetadata_V2

export interface ExerciseMetadata_V3 {
	//TODO 需要给每个Exercise增加一个keyword的Property,帮助更好的分类这个题目
	// keywords: string[]

	//TODO 需要增加一个记录每个题目每次所花费的平均时间的Property
	// timeCosy: number[]

	source: string; // Link is in the format of Obsidian LinkText

	id:string;

	index: number;

	subject: string;

	state: EXERCISE_STATUSES // The state refers to the latest state of the exercise (state of the last ExerciseHistory)

	start_time: number;

	end_time: number;

	remark: string;

	history: ExerciseHistory[];

}

export interface ExerciseHistory {
	startTimeStamp: number;
	endTimeStamp: number;
	remark?: string;
	status: string;
}


export function migrate_mapping(oj: ExerciseMetadata_V0, index: number): ExerciseMetadata_Latest{
	return {
		// source: oj["link"],
		subject: oj["type"],
		state: oj["lastStatus"] as EXERCISE_STATUSES,
		remark:oj["lastRemark"],
		index: index,
		history: oj["lifeline"],
		id: oj["id"],
		start_time: 0,
		end_time:0
	}
}

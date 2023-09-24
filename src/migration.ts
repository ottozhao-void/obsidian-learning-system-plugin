import {ExerciseMetadata} from "../Exercise";
import {EXERCISE_STATUSES, ExerciseBase, SBaseData} from "../ExerciseBase";

export interface OutdatedExerciseStructure {
	lastRemark: string;
	link:string;
	type:string;
	lifeline:any[];
	id:string;
	lastStatus: string;
}

export type UpdatedExerciseStructure = ExerciseMetadata;


export type OldBaseStructure = {
	exercises: OutdatedExerciseStructure[]
}
export type NewBaseStructure = SBaseData;

export const MigrationMapping = {
	source: "link",
	subject: "type",
	state: "lastStatus",
	remark: "lastRemark",
	id: "id",
	history: "lifeline",
	index: -1,
	start_time: -1,
	end_time: -1
}


export function  migrate_mapping(oj: OutdatedExerciseStructure, index: number): UpdatedExerciseStructure{
	return {
		source: oj["link"],
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

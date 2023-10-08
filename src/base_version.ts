import {ExerciseMetadata_V0} from "./exercise_version";
import {Exercise} from "../Exercise";
import {QUERY_STRATEGY, SUBJECTS} from "./constants";

export type BaseMetadata_V0 = {
	exercises: ExerciseMetadata_V0[]
}


export interface BaseMetadata_V1 {
	subject:SUBJECTS;
	path: string;
	size: number;
	tag: string;
	strategy:QUERY_STRATEGY;
	items_completed: number;
	exercises: Exercise[];
}

export type SBaseMetadata = BaseMetadata_V1;


export type BaseContent = string;


export type ExerciseInitData = {
	path: string;
	tag: string;
	subject: string;
	query_strategy: QUERY_STRATEGY;

}

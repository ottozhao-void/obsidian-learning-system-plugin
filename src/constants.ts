import {ExerciseInitData} from "./base_version";
import {normalizePath} from "obsidian";


export enum EXERCISE_SUBJECT {
	MATH = "Math",
	DSP = "DSP",
	POLITICS = "Politics"
}

export enum QUERY_STRATEGY {
	"NEW_EXERCISE_FIRST"
}

export enum EXERCISE_STATUSES {
	New = "new",
	Inspiring = "inspiring",
	Laser = "laser",
	Stumble = "stumble",
	Drifter = "drifter"
}

export enum EXERCISE_STATUSES_SWAPPED {
	new = "New",
	inspiring = "Inspiring",
	laser = "Laser",
	stumble = "Stumble",
	drifter = "Drifter"
}




export const EXERCISE_BASE: Record<string, ExerciseInitData> = {
	[EXERCISE_SUBJECT.MATH]: {
		path: normalizePath("Exercise Base - Math.md"),
		tag: "#excalidraw/math",
		subject: "Math",
		query_strategy: QUERY_STRATEGY.NEW_EXERCISE_FIRST,
	},
	[EXERCISE_SUBJECT.DSP]: {
		path: normalizePath("Exercise Base - DSP.md"),
		tag:"#excalidraw/signals_and_systems",
		subject: "DSP",
		query_strategy: QUERY_STRATEGY.NEW_EXERCISE_FIRST,
	},
	[EXERCISE_SUBJECT.POLITICS]: {
		path: normalizePath("Exercise Base - Politics.md"),
		tag:"#excalidraw/政治",
		subject: "Politics",
		query_strategy: QUERY_STRATEGY.NEW_EXERCISE_FIRST,
	}
}

import {ExerciseInitData} from "./base_version";
import {normalizePath} from "obsidian";


export const DATE_FORMAT = "YYYYMMDD"

export const KEY_COMBINATIONS = {
	Select_Exercise: "ctrl+shift+A",
	Exercise_Completed: "ctrl+shift+S",
	Switch_Base: "alt+shift+S"
}

export type SUBJECTS = "Math" | "DSP" | "Politics"

export enum EXERCISE_SUBJECT {
	MATH = "Math",
	DSP = "DSP",
	POLITICS = "Politics"
}

export enum GEE_EXERCISE_NUMBER {
	Math = 25,
	DSP = 25
}

export enum QUERY_STRATEGY {
	"NEW_EXERCISE_FIRST"="new_exercise_first",
	"CLOSE_CONTEXT"="close_context"
}

export const QUERY_STRATEGY_SWAPPED = Object.fromEntries(Object.entries(QUERY_STRATEGY).map(([key,value])=>[value,key]));

export enum EXERCISE_STATUSES {

	// new: 未做过的题目
	New = "new",

	// laser: 有清晰思路，计算快速，结果正确
	Laser = "laser",
	// inspiring: 有清晰思路，计算快速，结果正确，但题目里有新的、更好的解题方法
	Inspiring = "inspiring",
	// wrong: 有清晰思路，计算快速，但结果错误（大多数是因为马虎，粗心而导致的）
	Wrong = "wrong",

	// stumble: 有模糊思路，或者计算过程缓慢，但最终可以做出（得出一个结果，或错或对）
	Stumble = "stumble",

	// drifter: 指毫无思路，或着只做了几步后，无法再继续往下开展
	Drifter = "drifter"
}

export const EXERCISE_STATUSES_OPTION = Object.fromEntries(
	Object.entries(EXERCISE_STATUSES)
		.filter(([k,v]) => k !== "New")
		.map(([k,v]) => [v, k])
)

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

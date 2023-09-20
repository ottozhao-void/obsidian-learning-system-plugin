import {App} from "obsidian";
import {EXERCISE_BASE, ExerciseBase} from "./ExerciseBase";

const COUNT_TEMPLATE = "return `${subject}_exercises:`"

export class Planner {
	app:App;
	exerciseBases: {[K: string]: ExerciseBase} = {};

	constructor(app:App) {
		this.app = app;
	}

	async initialize(){
		Object.keys(EXERCISE_BASE).forEach((subject) => {
			this.exerciseBases[subject] = new ExerciseBase(
				this.app,
				`Exercise Base - ${subject}`,
				subject,
				EXERCISE_BASE[subject].path,
				EXERCISE_BASE[subject].excalidraw_tag
			)
		})
		await this.exerciseBases["math"].initialize();
		await this.exerciseBases["DSP"].initialize();
	}



}

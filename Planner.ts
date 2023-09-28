// import {App} from "obsidian";
// import {EXERCISE_BASE, BaseInterface, EXERCISE_SUBJECT} from "./BaseInterface";
// import {DataFile} from "./CentralProcessor";
//
// const COUNT_TEMPLATE = "return `${subject}_exercises:`"
//
// export class Planner {
// 	app:App;
// 	exerciseBases: {[K: string]: BaseInterface} = {};
//
// 	constructor(app:App) {
// 		this.app = app;
// 	}
//
// 	async initialize(){
// 		Object.keys(EXERCISE_BASE).forEach((subject) => {
// 			this.exerciseBases[subject] = new BaseInterface(
// 				this.app,
// 				`Exercise Base - ${subject}`,
// 				subject,
// 				EXERCISE_BASE[subject].path,
// 				EXERCISE_BASE[subject].tag
// 			)
// 		})
//
// 		await Promise.all(Object.values(EXERCISE_SUBJECT).map(sub => this.exerciseBases[sub].initialize()));
//
// 	}
//
// 	async loadAllBases(){
// 		await Promise.all(Object.values(EXERCISE_SUBJECT).map(sub => this.exerciseBases[sub].load()));
// 	}
//
//
//
// }

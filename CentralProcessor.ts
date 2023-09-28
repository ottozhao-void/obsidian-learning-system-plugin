import {App, stringifyYaml, TFile, moment, Notice, normalizePath, parseYaml, addIcon} from "obsidian";
import {DataArray, getAPI, Literal, parseField} from "obsidian-dataview";
import {Exercise, ExerciseLinkText} from "./Exercise";
import {getExerciseLinkText, parseFrontmatter, parseJSON} from "./src/utility/parser";
import {DataFile} from "./DataFile";
import {BaseInterface} from "./BaseInterface";
import {EXERCISE_BASE} from "./src/constants";
import {SBaseMetadata} from "./src/base_version";
import {DayMetadata_Latest} from "./src/dailData_version";
import {BaseModal} from "./src/Modal";


export const getDailyDfNameTemplate = ():string => {
	const date_string = moment().format('YYYY-MM-DD');
	return `🗓️Daily notes/DF${date_string}.md`
}

const AVERAGE_TIME_KEY = '_averageTime';
const EXERCISES_KEY = '_exercises';
const TOTAL_TIME_KEY = '_total_time';

export interface Observer {
	react: (message: string) => any
	action: string;
	notify: (message: string) => any
	observers: {react: (message: string) => void}[];

}

// class Observer {
//
// 	react(message: string){
//
// 	}
//
// }



export class CentralProcessor implements Observer{
	app_: App;



	set userSetBaseType(value: boolean) {
		value ?
			this.action = "BaseSelect"
			: null;
	}

	set userRequestForExercise(value: boolean){
		value ?
			this.running ?
				new Notice("An running exercise is running!") :
				this.action = "ExerciseQuery"
			: null;
	}

	set userCompletedExercise(value: boolean){

	}

	react(message: string) {
		switch (message) {
			case "BaseSelectionDone":
				this
		}
	}

	set action(action: string) {action ? this.notify(action) : null}

	notify(message: string) {this.observers.forEach(ob => ob.react(message))}

	observers: Observer[];


	// bases: {[K: string]: BaseInterface} = {};

	bi: BaseInterface | undefined;

	activeExercise: Exercise | undefined;

	private constructor(app:App) {
		this.app_ = app;
	}

	static async init(app:App){
		//
		const dvAPI = getAPI();

		// const statFile: DataFile = await DataFile.init(app);

		// Init Exercise Base
		let bases: {[K: string]: BaseInterface} = {};
		for (let subject of Object.keys(EXERCISE_BASE)) {
			const {path, tag} = EXERCISE_BASE[subject];
			const exists = await app.vault.adapter.exists(path);
			if (exists){
				// 如果存在的话，就先读取，再初始化
				let baseJSON: SBaseMetadata = parseJSON(await app.vault.adapter.read(normalizePath(path)))
				bases[subject] = await BaseInterface.fromJSON(app,baseJSON);
			}
			else {
				// 如果不存在的话，就先创造初始化，再写入
				bases[subject] = new BaseInterface(app, EXERCISE_BASE[subject])
				// console.log(bases[subject]);
				await bases[subject].initIndex();
				await bases[subject].save(bases[subject].jsonify());
			}
		}

		// Init DataFile
		const statFilePath = DataFile.path;
		const exists = await app.vault.adapter.exists(statFilePath);
		let statFile:DataFile;
		if (exists) {
			const dayFrontmatter: DayMetadata_Latest = parseFrontmatter(await app.vault.adapter.read(normalizePath(statFilePath))) as DayMetadata_Latest
			statFile = DataFile.fromFrontmatter(app,dayFrontmatter)
		}
		else {
			statFile = new DataFile(app)
			await statFile.save()
		}

		return new CentralProcessor(app,bases,statFile);
	}

	getFieldValue(keySuffix:string){
		return (this.statfile as any)[`${this.activeBase?.["subject"].toLowerCase()}${keySuffix}`]
	}

	async updateField(keySuffix:string, value: number){
		// console.log(`Modifing ${this.baseType.toLowerCase()}${keySuffix}\n its cuurent value is ${this.getFieldValue(keySuffix)}`);
		(this.statfile as any)[`${this.activeBase?.["subject"].toLowerCase()}${keySuffix}`] = value;
	}

	async increaseExerciseCount(){
		// (this.statfile as any)[`${this.baseType.toLowerCase()}_exercises`] ++;
		let noe: number = this.getFieldValue(EXERCISES_KEY);
		this.updateField(EXERCISES_KEY, ++ noe);
	}

	// This function calculates the average time spent on each exercise
	async calculateAverageTimePerExercise(seconds: number){
		const noe: number = this.getFieldValue(EXERCISES_KEY);
		let fv = this.getFieldValue(AVERAGE_TIME_KEY)
		this.updateField(AVERAGE_TIME_KEY, (fv*noe+seconds)/(noe+1));

		this.calculateTimeSpentOnSubjectForTheDay();
	}

	// This function calculates the time spent on a particular particular subject
	async calculateTimeSpentOnSubjectForTheDay(){
		const noe: number = this.getFieldValue(EXERCISES_KEY);
		const avgTime: number = this.getFieldValue(AVERAGE_TIME_KEY);
		this.updateField(TOTAL_TIME_KEY, noe*avgTime);
	}

	async run(){
		this.activeExercise = this.activeBase?.next()
		this.activeExercise?.start();
	}

	async closeUpCurrentExercise(early: boolean = false){
		if (this.activeExercise) {
			if (early) {
				this.activeExercise.start_time = 0;
				this.activeBase?.update("modify", this.activeExercise); // Save Exercises
			} else {

				// Update the Runtime Exercise Object
				this.activeExercise.close();

				// Update the Runtime DataFile Object
				await this.calculateAverageTimePerExercise(this.activeExercise.getDurationInSeconds())
				await this.increaseExerciseCount();
				await this.calculateTimeSpentOnSubjectForTheDay();

				// Save these updates to Obsidian Notes
				this.activeBase?.update("modify", this.activeExercise); // Save Exercises
				console.log(this.statfile);
				await this.statfile.save(); // Save DataFile

				new Notice(`Start Time: ${this.activeExercise.getStartTime().format("ddd MMM D HH:mm:ss")}\n\nEnd Time: ${this.activeExercise.getEndTime().format("ddd MMM D HH:mm:ss")}\n\nDuration: ${this.activeExercise.getDurationAsString()}`, 10000);

			}
		}
		this.activeExercise = undefined;

	}

	get running(): boolean{
		return this.activeExercise !== null;
	}


}



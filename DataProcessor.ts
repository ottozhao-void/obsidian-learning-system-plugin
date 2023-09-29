import {App, stringifyYaml, TFile, moment, Notice, normalizePath, parseYaml, addIcon} from "obsidian";
import {
	EXERCISE_BASE, ExerciseBase,
} from "./ExerciseBase";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {DataArray, getAPI, Literal, parseField} from "obsidian-dataview";
import {Exercise, ExerciseLinkText} from "./Exercise";
import {ExcalidrawElement, ExcalidrawFile, ExcalidrawJSON} from "./Excalidraw";
import {getExerciseLinkText, parseFrontmatter, parseJSON} from "./src/utility/parser";
import {stringifyTOJSON} from "./src/utility/io";
import {DayFrontmatter, StatFile} from "./StatFile";
import {SBaseMetadata} from "./src/base_version";
import {EXERCISE_SUBJECT} from "./src/constants";


export const getDailyDfNameTemplate = ():string => {
	const date_string = moment().format('YYYY-MM-DD');
	return `🗓️Daily notes/DF${date_string}.md`
}

const AVERAGE_TIME_KEY = '_averageTime';
const EXERCISES_KEY = '_exercises';
const TOTAL_TIME_KEY = '_total_time';





export class DataProcessor{
	app_: App;
	// The statfile should be the runtime Object of the actual Obsidian note that store the data.
	statfile: StatFile;

	bases: {[K: string]: ExerciseBase} = {};

	activeBase: ExerciseBase;

	activeExercise: Exercise | undefined;


	private constructor(app:App, bases: {[K: string]: ExerciseBase}, statFile: StatFile) {
		this.app_ = app;
		this.bases = bases;
		this.statfile = statFile

	}

	static async init(app:App){
		//
		const dvAPI = getAPI();

		// const statFile: StatFile = await StatFile.init(app);

		// Init Exercise Base
		let bases: {[K: string]: ExerciseBase} = {};
		for (let subject of Object.keys(EXERCISE_BASE)) {
			const exists = await app.vault.adapter.exists(EXERCISE_BASE[subject].path);
			bases[subject] = exists ?
				await ExerciseBase.read(app,EXERCISE_BASE[subject].path) :
				await ExerciseBase.create(app,subject);
			Object.values(bases[subject].excalidraws_).forEach(exc => ExcalidrawFile.createIDLinktextMapping(exc));
		}

		// Init StatFile
		const statFilePath = StatFile.path;
		const exists = await app.vault.adapter.exists(statFilePath);
		let statFile:StatFile;
		if (exists) {
			const dayFrontmatter: DayFrontmatter = parseFrontmatter(await app.vault.adapter.read(normalizePath(statFilePath))) as DayFrontmatter
			statFile = StatFile.fromFrontmatter(app,dayFrontmatter)
		}
		else {
			statFile = new StatFile(app)
			await statFile.save()
		}

		return new DataProcessor(app,bases,statFile);
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


	// This functions accumulates the number of exercises that has done so far
	accumulateExerciseCountForSubject(){}

	// This function calculates the time spent on a particular particular subject
	async calculateTimeSpentOnSubjectForTheDay(){
		const noe: number = this.getFieldValue(EXERCISES_KEY);
		const avgTime: number = this.getFieldValue(AVERAGE_TIME_KEY);
		this.updateField(TOTAL_TIME_KEY, noe*avgTime);
	}

	async run(){
		this.activeExercise = this.activeBase.next();
		if (this.activeExercise){
			const linktext = this.activeBase.
				excalidraws_[this.activeExercise.id.split(ExcalidrawFile.id_separator)[0]]
				.idLinktextMapping[this.activeExercise.id];
			this.activeExercise.start_time = moment().valueOf();
			await this.app_.workspace.openLinkText(linktext, linktext, true);
		}
		else {
			new Notice("next() failed to find the next exercise")
		}

	}

	async closeUpCurrentExercise(early: boolean = false){
		if (this.activeExercise) {
			if (early) {
				this.activeExercise.start_time = 0;
				this.activeBase?.updateRuntimeBase("modify", this.activeExercise); // Save Exercises
				await this.activeBase?.save();
			} else {

				// Update the Runtime Exercise Object
				this.activeExercise.close();

				// Update the Runtime StatFile Object
				await this.calculateAverageTimePerExercise(this.activeExercise.getDurationInSeconds())
				await this.increaseExerciseCount();
				await this.calculateTimeSpentOnSubjectForTheDay();

				// Save these updates to Obsidian Notes
				this.activeBase?.updateRuntimeBase("modify", this.activeExercise); // Save Exercises


				await this.activeBase?.save();
				await this.statfile.save(); // Save StatFile

				new Notice(`Start Time: ${this.activeExercise.getStartTime().format("ddd MMM D HH:mm:ss")}\n\nEnd Time: ${this.activeExercise.getEndTime().format("ddd MMM D HH:mm:ss")}\n\nDuration: ${this.activeExercise.getDurationAsString()}`, 10000);

			}
		}
		this.activeExercise = undefined;

	}

}



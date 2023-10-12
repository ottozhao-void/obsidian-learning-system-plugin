import {App, moment, Notice} from "obsidian";
import {ExerciseBase,} from "./ExerciseBase";
import {Exercise, ExerciseLinkText} from "./Exercise";
import {ExcalidrawFile} from "./Excalidraw";
import {DATAFILE_DATE_FORMAT, EXERCISE_BASE, QUERY_STRATEGY, SUBJECTS} from "./constants";
import {DataFile} from "./DataFile";
import {DataModel} from "./DataModel";
import {DailyNote} from "./src/DailyNote";


export class ControlUnit {
	app_: App;
	// The statfile should be the runtime Object of the actual Obsidian note that store the data.

	dataModel: DataModel;

	bases: {[K: string]: ExerciseBase} = {};

	activeBase: ExerciseBase | undefined;

	activeExercise: Exercise | undefined;

	dailyNote: DailyNote;


	private constructor(
		app:App,
		bases: {[K: string]: ExerciseBase},
		dataModel:DataModel,
		dailyNote: DailyNote
	) {
		this.app_ = app;
		this.bases = bases;
		this.dataModel = dataModel;
		this.dailyNote = dailyNote;
	}

	static async init(app:App){

		// Init Exercise Base
		let bases: {[K: string]: ExerciseBase} = {};
		for (let subject of Object.keys(EXERCISE_BASE)) {
			const exists = await app.vault.adapter.exists(EXERCISE_BASE[subject].path);
			bases[subject] = await (exists ?
					ExerciseBase.read(app,EXERCISE_BASE[subject].path) :
					ExerciseBase.create(app,subject)
			);
			Object.values(bases[subject].excalidraws_).forEach(exc => ExcalidrawFile.createIDLinktextMapping(exc));
		}

		// Init DataModel
		const dataFilePath = DataFile.path(moment().format(DATAFILE_DATE_FORMAT));
		const dataModel: DataModel = await DataModel.init(app, dataFilePath, bases);

		// Init Daily Note
		const dailyNote = new DailyNote();
		console.log(dailyNote.path);

		return new ControlUnit(app,bases,dataModel,dailyNote);
	}

	async run() {
		this.activeExercise = this.activeBase?.next();
		console.log(this.activeExercise);
		this.activeExercise ?
			await this.activeExercise.open(<ExerciseBase>this.activeBase) :
			new Notice("next() failed to find the next exercise");
	}

	async closeUpCurrentExercise(early: boolean = false){
		if (this.activeExercise) {
			if (early) {
				this.activeExercise.start_time = 0;
				this.updateRuntimeBase(this.activeExercise.subject, "modify", this.activeExercise); // Save Exercises
			} else {

				// Update the Runtime Exercise Object
				this.activeExercise.close();

				// Update the Runtime Base Object
				this.updateRuntimeBase(this.activeExercise.subject, "modify", this.activeExercise); // Save Exercises

				await this.dataModel.update(
					this.activeExercise.subject,
					this.activeExercise.getDurationInSeconds()
					)

				await this.dataModel.save(); // Save StatFile

				new Notice(`Start Time: ${this.activeExercise.getStartTime().format("ddd MMM D HH:mm:ss")}\n\nEnd Time: ${this.activeExercise.getEndTime().format("ddd MMM D HH:mm:ss")}\n\nDuration: ${this.activeExercise.getDurationAsString()}`, 10000);

			}
		}
		this.activeBase?.reIndexExercise()
		this.activeExercise = undefined;
		Object.values(this.bases[(this.activeBase as ExerciseBase).subject].excalidraws_).forEach(exc => ExcalidrawFile.createIDLinktextMapping(exc));
		await this.activeBase?.save();
	}

	updateRuntimeBase(subject: SUBJECTS, actionType: "create" | "modify" | "delete", ct: ExerciseLinkText[] | Exercise){
		this.bases[subject].update(actionType, ct)
		this.dataModel.setBaseInfo(this.bases)
	}

}



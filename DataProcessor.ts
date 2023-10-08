import {App, moment, Notice} from "obsidian";
import {
	ExerciseBase,
} from "./ExerciseBase";
import {Exercise, ExerciseLinkText} from "./Exercise";
import {ExcalidrawFile} from "./Excalidraw";
import {DATE_FORMAT, EXERCISE_BASE, SUBJECTS} from "./src/constants";
import {DataFile} from "./DataFile";
import {DataModel} from "./DataModel";


export class DataProcessor{
	app_: App;
	// The statfile should be the runtime Object of the actual Obsidian note that store the data.

	dataModel: DataModel;

	bases: {[K: string]: ExerciseBase} = {};

	activeBase: ExerciseBase | undefined;

	activeExercise: Exercise | undefined;


	private constructor(app:App, bases: {[K: string]: ExerciseBase}, dataModel:DataModel) {
		this.app_ = app;
		this.bases = bases;
		this.dataModel = dataModel;
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
		const dataFilePath = DataFile.path(moment().format(DATE_FORMAT));
		const dataModel: DataModel = await DataModel.init(app, dataFilePath, bases);

		return new DataProcessor(app,bases,dataModel);
	}

	async run() {
		this.activeExercise = this.activeBase?.next();
		if (this.activeExercise && this.activeBase) {
			const linktext = this.activeBase
				.excalidraws_[this.activeExercise.id.split(ExcalidrawFile.id_separator)[0]]
				.idLinktextMapping[this.activeExercise.id];
			// This If statement checks for exercises already created but their position are changed accidentally
			// resulting in the change of their id and fail to retrieve their linktext.
			if (linktext == undefined) new Notice(`There is no matched Linktext for exercise with id: ${this.activeExercise.id}`)
			this.activeExercise.start_time = moment().valueOf();
			await this.app_.workspace.openLinkText(linktext, linktext, true);
		} else {
			new Notice("next() failed to find the next exercise");
		}
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



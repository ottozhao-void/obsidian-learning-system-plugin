import {Exercise, ExerciseLinkText} from "./Exercise";
import {DataArray, getAPI, Literal} from "obsidian-dataview";
import {App, Component, FileSystemAdapter, normalizePath, Notice, TFile, Vault} from "obsidian";
import {ExcalidrawElement, ExcalidrawFile, ExcalidrawJSON} from "./Excalidraw";
import {DataviewApi} from "obsidian-dataview/lib/api/plugin-api";
import {GenericFile} from "./GenericFile";
import {getExerciseLinkText, parseJSON} from "./src/utility/parser";
import {ExerciseMetadata_V1, migrate_mapping} from "./src/exercise_version";
import {BaseContent, ExerciseInitData, BaseMetadata_V0, SBaseMetadata} from "./src/base_version";
import {EXERCISE_STATUSES, EXERCISE_SUBJECT, QUERY_STRATEGY} from "./src/constants";
import {Observer} from "./CentralProcessor";
import {Groupings} from "obsidian-dataview/lib/data/value";
import base = Groupings.base;
import {BaseModal} from "./src/Modal";

const LegalMessageForSM = ["SelectExerciseFromExerciseMeta", "StrategyMetadataReady"];
const LegalMessageForEMM = ["GetMetadata", "IDReady"];
const LegalMessageForExcalidrawManager = ["IDReady"];
const LegalMessageForBI = ["ExerciseQuery", "LinktextReady", "ExerciseMetadataReady"];
type StrategyMetadata = {id: number} & Pick<ExerciseMetadata_V1, "state">

// subject SwapKeyValue<T extends Record<string, string>> = {
// 	[K in keyof T as T[K]]: K
// }

type ExerciseID = string;


// export const EXERCISE_SUBJECT: string[] = Object.keys(EXERCISE_BASE);

class ExerciseMetadataManage implements Observer{

	metadata: StrategyMetadata;

	react(message: string): any {
		if (message in LegalMessageForEMM) {
			if (message == "GetMetadata") {
				this.getStrategyMetadata();
				this.action = "StrategyMetadataReady"
			}
			else if (message == "IDReady") {
				this.getExerciseMetadata();
				this.action = "ExerciseMetadataReady"
			}
		}
		else {
			return
		}
	}

	set action(action: string){
		action ? this.notify(action) : null;
	}

	getStrategyMetadata(){}

	getExerciseMetadata(){}

	notify(message: string) {
		for (let observer of this.observers) {
			observer.react(message);
		}
	}
	// Observers:
	// StrategyManager
	observers: {react: (message: string) => void}[];

}

class ExcalidrawManager implements Observer{
	excalidraws: ExcalidrawFile[];
	idToLinkText: Record<ExerciseID, ExerciseLinkText>
	activeLinktext: ExerciseLinkText;
	set action(action: string) {

	}

	notify(message: string) {
		for (let observer of this.observers) {
			observer.react(message);
		}
	}

	react(message: string): any {
		if (message in LegalMessageForExcalidrawManager) {
			if (message == "IDReady") {
				this.getLinktext();
				this.action = "LinktextReady"
			}
		}
	}

	getLinktext(){}


	// Observers
	// Base Interface
	observers: { react: (message: string) => void }[];
}

class StrategyManager implements Observer{

	strategy: QUERY_STRATEGY;
	em: ExerciseMetadataManage;




	// Check if the message is in LegalMessageForSM
	// if in and react to it according to the arguments
	// "SelectExerciseFromExerciseMeta"
	// Arguments: metadata[]
		// return: exerciseID
	react(message: string): any {
		if (message in LegalMessageForSM) {
			if (message == "SelectExerciseFromExerciseMeta") {
				this.action = "GetMetadata"
			}
			else if (message == "StrategyMetadataReady") {
				this.selectExerciseID();
				this.action = "IDReady";
			}
		}
		else {
			return
		}

	}

	set	action(action: string) {
		action ? this.notify(action) : null;
	}

	notify(message: string) {
		for (let observer of this.observers) {
			observer.react(message);
		}
	}

	// Observers:
	// ExerciseMetadataManage
	// ExcalidrawManager
	observers: {react: (message: string) => void}[];

	selectExerciseID(){}
}

class BaseMetadata implements SBaseMetadata{
	exercises: Exercise[];
	items_completed: number;
	path: string;
	query_strategy: QUERY_STRATEGY;
	size: number;
	subject: string;
	tag: string;

}

class Reader extends Vault{

}

class BaseReader implements Observer{
	action: string;

	paths: Record<EXERCISE_SUBJECT, string>

	bi: BaseInterface;

	reader: Reader;

	baseContent: string;

	message: string;

	notify(message: string): any {
	}

	observers: { react: (message: string) => void }[];

	react(message: string) {
		this.message = message;
		switch (message) {
			case "BaseInitialization":
				this.readBase()
		}
	}

	private readBase() {
		this.reader.adapter.read(this.paths[this.bi.biActions[this.message]])
	}
}

interface BIActions {
	"BaseInitialization": EXERCISE_SUBJECT
}


export class BaseInterface extends GenericFile implements SBaseMetadata{
	app_:App;

	dataViewAPI_: DataviewApi = getAPI() as DataviewApi;

	size: number;

	items_completed: number;

	query_strategy: QUERY_STRATEGY = QUERY_STRATEGY.NEW_EXERCISE_FIRST;

	subject: string;

	tag: string;

	path: string;

	excalidraws_: {[eFName: string]: ExcalidrawFile} = {};

	exercises: Exercise[] = [];

	exerciseMetadataManager: ExerciseMetadataManage;

	biActions: BIActions;

	excalidrawManager: ExcalidrawManager;

	get baseInitialized() {
		return this.bases !== {}
	}

	bases: {[K: string]: BaseMetadata} = {};
	activeBase: BaseMetadata | undefined;
	baseSelectionModal: BaseModal;

	constructor(app: App, baseMetadata: ExerciseInitData | SBaseMetadata) {
		super(app,baseMetadata.path);
		this.dataViewAPI_ = getAPI() as DataviewApi;
		Object.assign(this, baseMetadata);
	}

	async indexExcalidraw(){
		const targetExcalidrawPages: DataArray<Record<string, Literal>> = this.dataViewAPI_?.pages(this.tag) as DataArray<Record<string, Literal>>;
		for (let page of targetExcalidrawPages){
			const content = await this.app_.vault.adapter.read(normalizePath(page.file.path));
			const parsedJSONBlock = parseJSON(content) as ExcalidrawJSON;
			const elements: ExcalidrawElement[] = parsedJSONBlock.elements;


			this.excalidraws_[page.file.name] = new ExcalidrawFile(this.app_,page.file.name,{
				subject: this.subject,
				path: page.file.path,
				elements,
				currentContent:content
			})
			this.excalidraws_[page.file.name].previeousExerciseArray = this.excalidraws_[page.file.name].exerciseArray;
		}
	}

	async initIndex(){
		// Index Excalidraw Files
		this.indexExcalidraw();

		// Index Exercises
		const exerciseLinkArray = Object.values(this.excalidraws_).flatMap((excal) => getExerciseLinkText(excal))

		this.exercises.push(...exerciseLinkArray.map((el,index) => Exercise.fromJSON(this.app_, {
			source: el,
			subject: this.subject,
			state: EXERCISE_STATUSES.New,
			remark: "",
			index: index,
			history: [],
			id: Exercise.extractIdFromLink(el),
			start_time: 0,
			end_time: 0
		})))

		this.size = this.exercises.length;
		this.items_completed = 0;
	}

	jsonify(): BaseContent {
		// console.log(this);
		// console.log(this.size);
		// console.log(this.items_completed);
		return `\`\`\`json\n${JSON.stringify(this, (k,v) => {
			if (k.endsWith("_")) return undefined;
			return v;
		}, 4)}\n\`\`\``
	}

	async save(content: BaseContent): Promise<void> {
		await this.app_.vault.adapter.write(this.path, content);
	}
	static async saveBase(base: BaseInterface): Promise<void> {
		await base.save(base.jsonify());
	}

	static async fromJSON(app:App, obj: SBaseMetadata): Promise<BaseInterface> {
		obj.exercises = obj.exercises.map(ex => new Exercise(app,ex))
		let base: BaseInterface = new BaseInterface(app, obj);
		await base.indexExcalidraw();
		return base;
	}

	static parseJSONFromPath: (app:App, path:string) => Promise<SBaseMetadata> = async (app,path) => {
		const content = await app.vault.adapter.read(path);
		return parseJSON(content)
	}

	async update(actionType: "create" | "modify" | "delete",ct: ExerciseLinkText[] | Exercise) {

		switch (actionType) {
			case "modify":
				if (ct instanceof Exercise){
					this.exercises.splice(ct.index,0,ct);
				}
				break
			case "create":
				if (!(ct instanceof Exercise)) this.exercises.push(...this.createNewExercise(ct));
				// console.log(this.exercises);
				break
			case "delete":
				if (Array.isArray(ct)){
					for (let elt of ct) {
						this.exercises.forEach((ex, index) => {
							if (ex.source == elt) this.exercises.splice(index,1);
						})
					}
				}
		}

		// console.log(`length before: ${this.size}`);
		this.size = this.exercises.length;
		this.items_completed = this.calculateItemCompleted();
		// console.log(`length after: ${this.size}`);
		const data = this.jsonify();

		this.app_.vault.adapter.write(this.path,data)

	}

	calculateItemCompleted(): number{
		let num = 0;
		this.exercises.forEach((ex)=> (ex.state == EXERCISE_STATUSES.Laser ? num++ : -1))
		return  num;
	}

	next(): Exercise | undefined {
		let randomExerciseIndex: number = -1;
		// console.log(this);
		if (this.query_strategy == QUERY_STRATEGY.NEW_EXERCISE_FIRST) {
			const newExercisesIndexes = this.exercises
				.map((ex) => ex.state == EXERCISE_STATUSES.New? ex.index : -1)
				.filter((index) => index !== -1);

			// If no new exercises are found
			if (newExercisesIndexes.length === 0) {
				new Notice("No more new Exercises!");
				return;
			}
			console.log(this.exercises);
			randomExerciseIndex = newExercisesIndexes[Math.floor(Math.random() * newExercisesIndexes.length)];
			new Notice(`Exercise at ${randomExerciseIndex} is being pulled out.`,3000);

		}

		if (randomExerciseIndex != -1){
			const nextExercise: Exercise = this.exercises.splice(randomExerciseIndex,1)[0];
			return nextExercise;
		}
	}

	static async migrateFromOBtoNB(app:App, data: ExerciseInitData): Promise<BaseInterface>{
		const ob: BaseMetadata_V0 = parseJSON(await app.vault.adapter.read(normalizePath(data.path)));
		const newExercises = ob["exercises"].map((o,index) => migrate_mapping(o, index));
		return BaseInterface.fromJSON(app, {
			exercises: newExercises.map(ex => new Exercise(app,ex)),
			items_completed: 0,
			query_strategy: QUERY_STRATEGY.NEW_EXERCISE_FIRST,
			size:0,
			tag: data.tag,
			subject:data.subject,
			path: data.path
		})
	}

	createNewExercise(exercisesLinkArray: string[]): Exercise[] {
		return exercisesLinkArray.map((link, index) => {

			return new Exercise(this.app_, {
				source: link,
				subject: this.subject,
				history:[],
				id:"",
				state:EXERCISE_STATUSES["New"],
				index: this.size + index,
				remark: "",
				start_time:0,
				end_time:0
			})
		});
	}

	static async reSetExercisesIndex(base: BaseInterface) {
		base.exercises.forEach((ex, inde) => ex.index = inde);
		await BaseInterface.saveBase(base);
	}

}




import {App, EventRef, TAbstractFile, TFile} from "obsidian";
import {GenericFile} from "./GenericFile";
import {ExerciseBase} from "./ExerciseBase";

export interface ExcalidrawElement {
	strokeColor:string;
	type: string;
	id?: string;
	isDeleted?: boolean
}
const EXERCISE_BOX:ExcalidrawElement = {
	strokeColor: "#846358",
	type: "rectangle"
}

interface ExcalidrawFileInfo {
	name: string;
	currentContent?: string;
	elements?: ExcalidrawElement[];
	path: string;
	previousContent?: string;
}

export class ExcalidrawFile extends GenericFile implements ExcalidrawFileInfo {
	app:App;
	base: ExerciseBase;
	currentContent: string;
	elements: ExcalidrawElement[];
	name: string;
	path: string;
	previousContent: string;
	modifyRef: EventRef

	constructor(app:App, base: ExerciseBase, excalidrawFileInfo: ExcalidrawFileInfo) {
		super(app, excalidrawFileInfo.name, excalidrawFileInfo.path)
		this.app = app;
		this.base = base;
		Object.assign(this,excalidrawFileInfo);

		this.modifyRef =  this.app.vault.on("modify", this.onFileChange, this);
	}

	async initilize() {
		try {
			this.previousContent = "";
			this.currentContent = await this.read();
			this.elements = this.getJSON(this.currentContent).elements;
		} catch (error) {
			console.error('Error during initialization:', error);
		}
	}


	getExerciseLinkText(elementArray?: ExcalidrawElement[] | ExcalidrawElement): string[] {
		const elements = elementArray
			? (Array.isArray(elementArray)
				? elementArray
				: [elementArray])
			: this.elements;

		return elements
			.filter(el => el.strokeColor === EXERCISE_BOX.strokeColor
				&& el.type === EXERCISE_BOX.type && !el.isDeleted)
			.map(el => `${this.name}#^${el.id}`)


	}

	// private onFileChange = (file:TAbstractFile) => {
	// 	console.log(`${file.name} Changed!`);
	// 	console.log('currentContent:', this.currentContent);
	// 	console.log('previousContent:', this.previousContent);
	//
	// 	this.read(file).then(content => {
	// 		this.previousContent = this.currentContent;
	// 		this.currentContent = content;
	// 		this.elements = this.getJSON(this.currentContent).elements;
	// 		const pElement: ExcalidrawElement[] = this.getJSON(this.previousContent).elements;
	// 		if (this.elements.length > pElement.length) {
	// 			const newElement: ExcalidrawElement = this.elements[this.elements.length - 1];
	//
	// 			const eLinkText = this.getExerciseLinkText(newElement);
	//
	// 			if (eLinkText) this.base.update(eLinkText); // 假如增加了元素，且符合 EXERCISE_BOX 的才会被更新
	// 		}
	// 	}).catch(error => {
	// 		console.error('Error during file change:', error);
	// 	});
	// }


	private async onFileChange(file:TAbstractFile): Promise<void> {
		this.previousContent = this.currentContent;
		console.log(`${file.name} Changed!`);

		this.currentContent = await this.read(file);
		this.elements = this.getJSON(this.currentContent).elements;
		const pElement: ExcalidrawElement[] = this.getJSON(this.previousContent).elements;
		if (this.elements.length > pElement.length) {
			const newElement: ExcalidrawElement = this.elements[this.elements.length - 1];

			const eLinkText = this.getExerciseLinkText(newElement);

			if (eLinkText) this.base.update(eLinkText); // 假如增加了元素，且符合 EXERCISE_BOX 的才会被更新
		}
	}

}



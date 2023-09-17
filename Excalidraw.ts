import {App, TFile} from "obsidian";
import {GenericFile} from "./GenericFile";

interface ExcalidrawElement {
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
	content: string;
	elements: ExcalidrawElement[];
	path: string;
	getExercise: () => string[];
}

export class ExcalidrawFile extends GenericFile implements ExcalidrawFileInfo {
	app:App;
	content: string;
	elements: ExcalidrawElement[];
	name: string;
	path: string;

	constructor(app:App, excalidrawFileInfo: Partial<ExcalidrawFileInfo>) {
		super(app, excalidrawFileInfo.name, excalidrawFileInfo.path)
		this.app = app;
		Object.assign(this,excalidrawFileInfo);

	}

	async initilize() {
		try {
			this.content = await this.read();
			this.elements = this.getJSON(this.content).elements;
		} catch (error) {
			console.error('Error during initialization:', error);
		}
	}


	getExercise(): string[] {
		return this.elements
			.filter(el => el.strokeColor === EXERCISE_BOX.strokeColor
				&& el.type === EXERCISE_BOX.type && !el.isDeleted)
			.map(el => `${this.name}#^${el.id}`)
	}

}



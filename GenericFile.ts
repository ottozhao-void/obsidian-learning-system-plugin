import {App, TFile} from "obsidian";


export class GenericFile {
	app: App;
	name: string | undefined;
	path: string | undefined;

	constructor(app: App, name: string | undefined, path: string | undefined) {
		this.app = app;
		this.name = name;
		this.path = path
	}

	async read(): Promise<string> {
		if (this.path) {
			const file:TFile | null = this.app.metadataCache.getFirstLinkpathDest(this.path,this.path)
			if (file) return await this.app.vault.read(file);
		}
		return "";
	}

	getJSON(fileContent:string) {
		const jsonPattern = /```json\n([\s\S]*?)\n```/g;
		const match = jsonPattern.exec(fileContent);
		return match && match[1] ? JSON.parse(match[1]) : null;
	}
}

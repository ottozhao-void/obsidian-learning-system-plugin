import {App, TAbstractFile, TFile} from "obsidian";


export class GenericFile {
	app: App;
	name: string;
	path: string;

	constructor(app: App, name: string, path: string) {
		this.app = app;
		this.name = name;
		this.path = path
	}

	async read(file?:TAbstractFile | null): Promise<string> {
		const path = file? file.path : this.path

		if (path) {
			const file:TFile | null = this.app.metadataCache.getFirstLinkpathDest(path,path)
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

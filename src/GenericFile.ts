import {App, normalizePath, TAbstractFile, TFile} from "obsidian";


export class GenericFile {
	app_: App;
	name: string;
	path: string;

	constructor(app: App, path: string) {
		this.app_ = app;
		this.path = normalizePath(path);
	}

	async read(file?:TAbstractFile | null): Promise<string> {
		const path = file? file.path : this.path

		if (path) {
			const file:TFile | null = this.app_.metadataCache.getFirstLinkpathDest(path,path)
			if (file) return await this.app_.vault.read(file);
		}
		return "";
	}

}

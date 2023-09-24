import {App, normalizePath} from "obsidian";


export async function stringifyTOJSON(app: App, path: string, obj: Object, excluded: (key:string, value: any) => any){
	const content = `\`\`\`json\n${JSON.stringify(obj, excluded, 4)}\n\`\`\``;;
	await app.vault.adapter.write(normalizePath(path),content);
}



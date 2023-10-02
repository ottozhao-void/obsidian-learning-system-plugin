import {ExcalidrawElement, ExcalidrawFile, EXERCISE_BOX} from "../../Excalidraw";
import {ExerciseLinkText} from "../../Exercise";
import * as yaml from 'js-yaml';
import {App, normalizePath, parseYaml, Vault} from "obsidian";
import {DayMetadata_Latest} from "../dailyData_version";

// export function readFrom(path:string):string = Vault.

export function parseJSON(content:string): any {
	const jsonPattern = /```json\n([\s\S]*?)\n```/g;
	const match = jsonPattern.exec(content);
	return match && match[1] ? JSON.parse(match[1]) : null;
}

export function getExerciseLinkText(excalidraw: ExcalidrawFile): ExerciseLinkText[] {
	let elements: ExcalidrawElement[] = excalidraw.elements;
	return elements
		.filter(el => el.strokeColor === EXERCISE_BOX.strokeColor
			&& el.type === EXERCISE_BOX.type && !el.isDeleted)
		.map(el => `${excalidraw.name}#^${el.id}`)
}

export function toYaml(obj: Object, excluded_key = "_"): string {
	// Creating a new object containing only the properties that don't start with "_"
	const sanitizedObject = Object.fromEntries(
		Object.entries(obj).filter(([key]) => !key.endsWith(excluded_key))
	);

	// Converting the sanitized object to a YAML string using js-yaml
	return `---\n${yaml.dump(sanitizedObject)}---`;
}

export async function parseFrontmatter(app:App, path: string): Promise<any> {
	const frontmatter = await app.vault.adapter.read(normalizePath(path));
	const match = /---\s*([\s\S]*?)\s*---/.exec(frontmatter)
	return match ? parseYaml(match[1]) : undefined
}

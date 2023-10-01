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

export function parseFrontmatter(content: string): DayMetadata_Latest | undefined {
	const pattern = /---\s*([\s\S]*?)\s*---/;
	const matches = pattern.exec(content);
	if (matches && matches[1]) {
		try {
			return yaml.load(matches[1]) as DayMetadata_Latest;
		} catch (e) {
			console.error('Error parsing YAML:', e);
			return undefined;
		}
	}
	return undefined;
}

export async function parseYamlWithPath(app:App, path: string): Promise<any> {
	// get file content from path
	const content = await app.vault.adapter.read(normalizePath(path));
	return parseYaml(content)
}

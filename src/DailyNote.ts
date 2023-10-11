import {moment, normalizePath} from "obsidian";
import {DAILYNOTE_DATE_FORMAT} from "./constants";


export class DailyNote {
	private _path_: string = normalizePath(`🗓️Daily notes/${moment().format(DAILYNOTE_DATE_FORMAT)}.md`)

	get path(){
		return this._path_;
	}

	set path(path:string){
		this._path_ = path;
	}
}

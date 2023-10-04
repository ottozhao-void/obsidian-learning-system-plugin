import {App, Notice, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";
import {QUERY_STRATEGY, QUERY_STRATEGY_SWAPPED} from "./src/constants";

export interface SystemSetting {
	Strategy: QUERY_STRATEGY
}

export const DEFAULT_SETTINGS:SystemSetting = {
	Strategy: QUERY_STRATEGY.NEW_EXERCISE_FIRST
}


export class LearningSystemSetting extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app_: App, plugin: MyPlugin) {
		super(app_, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Query Strategy")
			.addDropdown(dp=>{
				dp.addOptions(QUERY_STRATEGY_SWAPPED)
					.onChange(async (value:QUERY_STRATEGY) => {
						this.plugin.settings.Strategy = value
						await this.plugin.saveSettings();
					})
			})
	}
}

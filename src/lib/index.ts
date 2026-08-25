export { default as TypingEngine } from './components/TypingEngine.svelte';
export { default as ResultSummary } from './components/ResultSummary.svelte';
export { default as HistoryTable } from './components/HistoryTable.svelte';
export { default as SettingsForm } from './components/SettingsForm.svelte';
export { default as TimelineChart } from './components/TimelineChart.svelte';

export * from './localStore';

export type { CompletedTestResult } from './components/TypingEngine.svelte';
export type { HistoryRunItem } from './components/HistoryTable.svelte';
export type { SettingsValues, SettingsFormProps } from './components/SettingsForm.svelte';

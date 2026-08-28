<script lang="ts">
	import * as Select from './select';

	let { open = $bindable(false), value = $bindable('opt1') } = $props();
</script>

<Select.Root type="single" bind:open bind:value>
	<Select.Trigger id="test-select-trigger">
		<span>Trigger Label</span>
	</Select.Trigger>
	<Select.Content>
		<Select.Item value="opt1" label="Option 1">Option 1</Select.Item>
		<Select.Item value="opt2" label="Option 2">Option 2</Select.Item>
	</Select.Content>
</Select.Root>

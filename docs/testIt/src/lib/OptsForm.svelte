<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Textfield from '@smui/textfield';
  import Select, { Option } from '@smui/select';
  import FormField from '@smui/form-field';
  import Checkbox from '@smui/checkbox';
  import Button, { Label } from '@smui/button';

  const templates = ['axios', 'swr-axios', 'fetch', 'ng1', 'ng2'];
  const sampleInputs = [
    {
      label: 'Petstore Api',
      url: 'https://petstore.swagger.io/v2/swagger.json',
    },
  ];

  const obj = {
    selectedTemplate: templates[0],
    baseUrl: '',
    preferAny: true,
    queryModels: false,
    servicePrefix: '',
  };

  function handleSubmit() {
    dispatch('message', obj);
  }

  const dispatch = createEventDispatcher();
</script>

<form on:submit|preventDefault={handleSubmit}>
  <Select bind:value={obj.selectedTemplate} label="Template">
    {#each templates as tmpl}
      <Option value={tmpl}>{tmpl}</Option>
    {/each}
  </Select>

  <Textfield type="email" bind:value={obj.baseUrl} label="Base URL" />

  <FormField>
    <Checkbox bind:checked={obj.preferAny} />
    <span slot="label">Prefer <code>any</code></span>
  </FormField>

  <FormField>
    <Checkbox bind:checked={obj.queryModels} />
    <span slot="label">Query models</span>
  </FormField>

  <Textfield bind:value={obj.servicePrefix} label="Service Prefix" />

  <Button type="submit" variant="raised">
    <Label>Generate</Label>
  </Button>
</form>

<style>
  form {
    display: flex;
    gap: 1em;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
  }
</style>

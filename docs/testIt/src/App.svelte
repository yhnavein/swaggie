<script lang="ts">
  import Monaco from './lib/MonacoEditor.svelte';
  import OptsForm from './lib/OptsForm.svelte';

  let source;
  let dest;

  function handleGenerate(ev) {
    console.log(ev.detail);
    const parameters = ev.detail;
    const sourceContents = source.getValue();

    fetch('https://swaggie-docs-api.herokuapp.com/generate', {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: sourceContents,
    })
  }
</script>

<main>
  <div class="options">
    <OptsForm on:message={handleGenerate} />
  </div>
  <div class="editors">
    <div><Monaco bind:editor={source} /></div>
    <div><Monaco bind:editor={dest} /></div>
  </div>
</main>

<style>
  :root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
      'Open Sans', 'Helvetica Neue', sans-serif;
  }

  main {
    padding: 1em;
    margin: 0 auto;
  }

  .editors {
    display: flex;
    gap: 1em;
    flex-direction: row;
  }

  .editors > div {
    flex: 1;
  }

  .options {
    margin-bottom: 1em;
  }
</style>

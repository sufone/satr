<script lang="ts">
  import { currentView } from '../stores';
</script>

<nav>
  <button on:click={() => $currentView = 'list'} class:active={$currentView === 'list'}>
    My Texts
  </button>
  <button on:click={() => $currentView = 'add'} class:active={$currentView === 'add'}>
    Add New Text
  </button>
</nav>

<style>
  nav {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background-color: #f0f0f0;
    border-bottom: 1px solid #ccc;
    margin-bottom: 1rem;
  }
  button {
    padding: 0.5em 1em;
    border: 1px solid #ccc;
    background-color: white;
    cursor: pointer;
  }
  button.active {
    background-color: #007bff;
    color: white;
    border-color: #007bff;
  }
  button:hover:not(.active) {
    background-color: #e9e9e9;
  }
</style>
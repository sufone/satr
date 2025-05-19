<script lang="ts">
  import { currentView } from '$lib/stores';
  import Navbar from '$lib/components/Navbar.svelte';
  import TextList from '$lib/components/TextList.svelte';
  import AddTextForm from '$lib/components/AddTextForm.svelte';
  import ReviewSession from '$lib/components/ReviewSession.svelte';
</script>

<main class="app-container">
  <Navbar />

  {#if $currentView === 'list'}
    <TextList />
  {:else if $currentView === 'add'}
    <AddTextForm />
  {:else if $currentView === 'review'}
    <ReviewSession />
  {/if}
</main>

<style>
  .app-container {
    font-family: Arial, sans-serif;
    color: #333;
    min-height: 100vh; /* Ensure it takes full viewport height */
    display: flex;
    flex-direction: column;
  }
  /* Global styles can go in app.html or a global.css imported in +layout.svelte */
  :global(body) {
    margin: 0;
    background-color: #f4f7f6; /* Light background for the whole page */
  }
  :global(:root) {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
    --success-color: #28a745;
    --danger-color: #dc3545;
    --warning-color: #ffc107;
    --info-color: #17a2b8;
  }
</style>
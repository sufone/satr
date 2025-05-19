<script lang="ts">
  import { onMount } from 'svelte';
  import { textsList, currentView, activeText } from '../stores';
  import { getAllTexts, deleteTextAndLines, type Text } from '../db';

  onMount(async () => {
    $textsList = await getAllTexts();
  });

  async function handleDelete(textId: number | undefined) {
    if (!textId) return;
    if (confirm('Are you sure you want to delete this text and all its lines?')) {
      await deleteTextAndLines(textId);
      $textsList = await getAllTexts(); // Refresh list
    }
  }

  function startReview(text: Text) {
    $activeText = text;
    $currentView = 'review';
  }
</script>

<div class="list-container">
  <h2>My Texts</h2>
  {#if $textsList.length === 0}
    <p>No texts added yet. <button on:click={() => $currentView = 'add'}>Add one now!</button></p>
  {:else}
    <ul>
      {#each $textsList as text (text.id)}
        <li>
          <div class="text-info">
            <h3>{text.title}</h3>
            <p>Added: {new Date(text.createdAt).toLocaleDateString()}</p>
            <p>{text.content.split('\n').filter(l => l.trim()).length} lines</p>
          </div>
          <div class="actions">
            <button class="review-btn" on:click={() => startReview(text)}>Review</button>
            <button class="delete-btn" on:click={() => handleDelete(text.id)}>Delete</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .list-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 1rem;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
  .text-info h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
  }
  .text-info p {
    margin: 0.25rem 0;
    font-size: 0.9em;
    color: #555;
  }
  .actions button {
    padding: 0.5em 1em;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 0.5rem;
  }
  .review-btn {
    background-color: #007bff;
    color: white;
  }
  .review-btn:hover {
    background-color: #0056b3;
  }
  .delete-btn {
    background-color: #dc3545;
    color: white;
  }
  .delete-btn:hover {
    background-color: #c82333;
  }
  @media (max-width: 600px) {
    li {
      flex-direction: column;
      align-items: flex-start;
    }
    .actions {
      margin-top: 0.5rem;
      width: 100%;
      display: flex;
      justify-content: flex-end;
    }
    .actions button {
      margin-left: 0.5rem;
    }
  }
</style>
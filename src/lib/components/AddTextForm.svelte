<script lang="ts">
  import { addTextWithLines } from '../db';
  import { currentView, textsList } from '../stores';
  import { getAllTexts } from '../db';

  let title: string = '';
  let author: string = ''; // Added author
  let content: string = '';
  let isLoading: boolean = false;

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) {
      alert('Title and content are required.');
      return;
    }
    isLoading = true;
    try {
      // Pass author to addTextWithLines
      const newTextId = await addTextWithLines(title, content, author);
      if (newTextId) {
        title = '';
        author = ''; // Clear author
        content = '';
        alert('Text added successfully!');
        $textsList = await getAllTexts();
        $currentView = 'list';
      }
    } catch (error) {
      console.error('Error adding text:', error);
      alert('Failed to add text.');
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="form-container">
  <h2>Add New Text</h2>
  <form on:submit|preventDefault={handleSubmit}>
    <div>
      <label for="title">Title:</label>
      <input type="text" id="title" bind:value={title} required />
    </div>
    <div>
      <label for="author">Author (Optional):</label>
      <input type="text" id="author" bind:value={author} />
    </div>
    <div>
      <label for="content">Content (one line per... line):</label>
      <textarea id="content" bind:value={content} rows="10" required></textarea>
    </div>
    <button type="submit" disabled={isLoading}>
      {isLoading ? 'Saving...' : 'Save Text'}
    </button>
  </form>
</div>


<style>
  .form-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 1rem;
  }
  div {
    margin-bottom: 1rem;
  }
  label {
    display: block;
    margin-bottom: 0.25rem;
  }
  input[type="text"],
  textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
  }
  textarea {
    resize: vertical;
  }
  button {
    padding: 0.75em 1.5em;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  button:disabled {
    background-color: #ccc;
  }
  button:hover:not(:disabled) {
    background-color: #218838;
  }
</style>
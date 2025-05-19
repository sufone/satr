<script lang="ts">
  export let originalLineText: string = '';
  export let maskLevel: number = 0; // 0 = all visible
  export let revealed: boolean = false;

  $: words = originalLineText.split(/\s+/).filter(w => w.length > 0);
  $: numWordsToHide = maskLevel;
  $: numTotalWords = words.length;

  // Ensure numWordsToHide doesn't exceed available words to hide
  $: actualWordsToHide = Math.min(numWordsToHide, numTotalWords > 0 ? numTotalWords -1 : 0);

  $: displayedWords = words.map((word, index) => {
    // Hide from the end. If maskLevel is 1, last word is hidden.
    // If (numTotalWords - 1 - index) < actualWordsToHide, then this word should be hidden.
    if (revealed && index >= numTotalWords - actualWordsToHide && numTotalWords > 0) {
      return '_'.repeat(word.length); // Replace with underscores
    }
    return word;
  });

  $: displayText = displayedWords.join(' ');
</script>

<div class="line-display" class:revealed>
  {#if !revealed}
    <p class="placeholder">(Line hidden - click "Show Line")</p>
  {:else if originalLineText}
    <p>{@html displayText}</p>
  {:else}
    <p>Error: No line text.</p>
  {/if}
</div>

<style>
  .line-display {
    padding: 1em;
    border: 1px solid #eee;
    background-color: #f9f9f9;
    min-height: 3em;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    margin-bottom: 1rem;
    font-size: 1.2em; /* Make text a bit larger for readability */
  }
  .line-display.revealed {
     /* background-color: #e9f5ff; */
  }
  .placeholder {
    color: #888;
    font-style: italic;
  }
  p {
    margin: 0;
    white-space: pre-wrap; /* Preserve line breaks if any within a line, though unlikely */
  }
</style>
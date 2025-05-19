<script lang="ts">
  export let originalLineText: string = '';
  // 'masked': show with partial masking (e.g., "An_ sorr_")
  // 'revealed': show full line text
  export let displayState: 'masked' | 'revealed' | 'placeholder' = 'revealed';
  export let isContextPrevious: boolean = false; // For styling the previous line
  export let isCurrentActive: boolean = false; // For styling the current line being reviewed

  $: displayText = (() => {
    if (!originalLineText) return '...'; // Placeholder for empty lines if they exist
    if (displayState === 'revealed' || displayState === 'placeholder') {
      return originalLineText;
    }
    // displayState === 'masked'
    return originalLineText
      .split(/\s+/)
      .map(word => {
        if (word.length === 0) return '';
        // Keep very short words (1-2 letters) fully visible, or words that are just punctuation
        if (word.length <= 2 || !/[a-zA-Z]/.test(word)) return word;
        return word.slice(0, -1) + '_';
      })
      .join(' ');
  })();
</script>

<p
  class="line-content"
  class:context-previous={isContextPrevious}
  class:current-active={isCurrentActive && displayState !== 'placeholder'}
  class:placeholder-text={displayState === 'placeholder'}
>
  {#if displayState === 'placeholder'}
  {:else}
    {@html displayText}
  {/if}
</p>

<style>
  .line-content {
    margin: 0.1em 0; /* Tighter line spacing */
    padding: 0.4em 0.6em;
    font-family: 'Courier New', Courier, monospace;
    font-size: 1.15em; /* Slightly larger for readability */
    line-height: 1.5;
    min-height: 1.5em; /* Ensure consistent height */
    border-radius: 3px;
    transition: background-color 0.3s ease;
  }
  .context-previous {
    background-color: #fff0f0; /* Light pink/beige for previous line */
  }
  .current-active {
    background-color: #e9ecef; /* Light gray for current line */
  }
  .placeholder-text {
    color: #adb5bd;
    text-align: center;
    font-style: italic;
  }
</style>
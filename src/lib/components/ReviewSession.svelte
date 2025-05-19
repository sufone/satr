<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { activeText, currentView, reviewQueue, currentReviewLine } from '../stores';
  import { getDueLinesForText, getNextUnreviewedLineForText, updateLine, type Line, type Text } from '../db';
  import { calculateNextReview } from '../utils/srs';
  import LineDisplay from './LineDisplay.svelte';

  let isLoading = true;
  let currentLineIndex = 0;
  let showLineContent = false;
  let sessionComplete = false;

  async function loadLinesToReview() {
    if (!$activeText || !$activeText.id) {
      $currentView = 'list'; // Go back if no active text
      return;
    }
    isLoading = true;
    sessionComplete = false;
    showLineContent = false;

    let dueLines = await getDueLinesForText($activeText.id);
    if (dueLines.length === 0) {
      // If no due lines, try to get the next unreviewed line
      const nextUnreviewed = await getNextUnreviewedLineForText($activeText.id);
      if (nextUnreviewed) {
        dueLines = [nextUnreviewed];
      }
    }
    
    $reviewQueue = dueLines;

    if ($reviewQueue.length > 0) {
      currentLineIndex = 0;
      $currentReviewLine = $reviewQueue[currentLineIndex];
    } else {
      sessionComplete = true;
      $currentReviewLine = null;
    }
    isLoading = false;
  }

  onMount(() => {
    if ($activeText) {
      loadLinesToReview();
    } else {
      $currentView = 'list'; // Safety net
    }

    // Handle browser back/forward or closing tab for active text
    const beforeUnload = () => {
      if ($currentView === 'review' && $activeText) {
        // Potentially save progress or confirm navigation
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  });

  onDestroy(() => {
    // Clear session-specific stores if needed, or rely on onMount of other views
    $currentReviewLine = null;
    $reviewQueue = [];
  });

  function handleShowLine() {
    showLineContent = true;
  }

  async function handleAnswer(remembered: boolean) {
    if (!$currentReviewLine) return;

    const updatedFields = calculateNextReview($currentReviewLine, remembered);
    const updatedLine: Line = { ...$currentReviewLine, ...updatedFields };
    
    await updateLine(updatedLine);

    // Move to next line or end session
    currentLineIndex++;
    if (currentLineIndex < $reviewQueue.length) {
      $currentReviewLine = $reviewQueue[currentLineIndex];
      showLineContent = false; // Hide next line initially
    } else {
      $currentReviewLine = null;
      sessionComplete = true;
      // Optionally, try to load more lines if some became due during the session
      // For simplicity, we just end here.
    }
  }

  function backToList() {
    $activeText = null;
    $currentView = 'list';
  }
</script>

<div class="review-container">
  {#if $activeText}
    <h2>Reviewing: {$activeText.title}</h2>
  {/if}

  {#if isLoading}
    <p>Loading review session...</p>
  {:else if sessionComplete}
    <p>All due lines for this text reviewed!</p>
    <p>You can review again later or <button on:click={loadLinesToReview}>check for newly due lines</button>.</p>
    <button on:click={backToList}>Back to Text List</button>
  {:else if $currentReviewLine}
    <div class="line-info">
      Line {$currentReviewLine.lineNumber + 1} of {$activeText?.content.split('\n').filter(l=>l.trim()).length}
      (Review item {currentLineIndex + 1} of {$reviewQueue.length})
    </div>

    <LineDisplay
      originalLineText={$currentReviewLine.originalLineText}
      maskLevel={$currentReviewLine.maskLevel}
      revealed={showLineContent}
    />

    {#if !showLineContent}
      <button class="action-btn show-btn" on:click={handleShowLine}>Show Line</button>
    {:else}
      <p class="prompt">Did you remember this line correctly?</p>
      <div class="answer-buttons">
        <button class="action-btn correct-btn" on:click={() => handleAnswer(true)}>Yes, Remembered</button>
        <button class="action-btn incorrect-btn" on:click={() => handleAnswer(false)}>No, Forgot</button>
      </div>
    {/if}
    <button class="subtle-btn" on:click={backToList}>End Review Session</button>
  {:else}
    <p>No lines available for review in this text currently.</p>
    <button on:click={backToList}>Back to Text List</button>
  {/if}
</div>

<style>
  .review-container {
    max-width: 700px;
    margin: 0 auto;
    padding: 1rem;
    text-align: center;
  }
  .line-info {
    font-size: 0.9em;
    color: #666;
    margin-bottom: 0.5rem;
  }
  .prompt {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }
  .action-btn {
    padding: 0.8em 1.5em;
    font-size: 1em;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin: 0.5rem;
  }
  .show-btn {
    background-color: #17a2b8;
    color: white;
  }
  .show-btn:hover {
    background-color: #138496;
  }
  .answer-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .correct-btn {
    background-color: #28a745;
    color: white;
  }
  .correct-btn:hover {
    background-color: #218838;
  }
  .incorrect-btn {
    background-color: #dc3545;
    color: white;
  }
  .incorrect-btn:hover {
    background-color: #c82333;
  }
  .subtle-btn {
    margin-top: 1rem;
    background: none;
    border: 1px solid #ccc;
    color: #555;
    padding: 0.5em 1em;
    cursor: pointer;
  }
  .subtle-btn:hover {
    background-color: #f0f0f0;
  }
</style>
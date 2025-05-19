<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { activeText, currentView } from '../stores';
  import { db, getLinesForText, getDueLinesForText, updateLine, updateText, type Text, type Line } from '../db';
  import { calculateNextReview } from '../utils/srs';
  import LineDisplay from './LineDisplay.svelte';

  let isLoading = true;
  let textTitle: string | undefined = '';
  let textAuthor: string | undefined = '';

  let allTextLines: Line[] = []; // All lines for the current text
  let currentLineToReview: Line | null = null; // The specific Line object being reviewed
  
  // 'promptReveal': show masked line, "Reveal Line" button
  // 'promptAnswer': show full line, "Yes/No" buttons
  let reviewStage: 'promptReveal' | 'promptAnswer' | 'sessionComplete' | 'noLines' = 'promptReveal';

  let unlockedCount = 0;
  let totalLinesInText = 0;
  let dueTodayCount = 0;

  let unsubscribeActiveText: (() => void) | null = null;

  async function setupSession(text: Text | null) {
    if (!text || !text.id) {
      currentView.set('list');
      return;
    }

    isLoading = true;
    textTitle = text.title;
    textAuthor = text.author;
    
    allTextLines = await getLinesForText(text.id);
    totalLinesInText = allTextLines.length;

    if (totalLinesInText === 0) {
      reviewStage = 'noLines';
      isLoading = false;
      return;
    }

    const dueLines = await getDueLinesForText(text.id);
    dueTodayCount = dueLines.length;
    unlockedCount = (text.maxUnlockedLineNumber ?? -1) + 1;

    // Determine the next line for review
    let nextLine: Line | undefined;

    // Priority 1: The next line to unlock sequentially
    const nextSequentialLineNumber = (text.maxUnlockedLineNumber ?? -1) + 1;
    if (nextSequentialLineNumber < totalLinesInText) {
      nextLine = allTextLines.find(l => l.lineNumber === nextSequentialLineNumber);
    }

    // Priority 2: If all lines are unlocked, or no sequential line found (should not happen if totalLines > 0),
    // or if the next sequential line is ALREADY due, pick the "most due" or first due line.
    // If nextLine is found and is also in dueLines, that's fine.
    // If nextLine is NOT found (all unlocked) OR if we want to prioritize due lines even if not sequential:
    if (!nextLine && dueLines.length > 0) {
        // For simplicity, pick the first due line. Could be more sophisticated (e.g. earliest nextReviewDate)
        nextLine = dueLines[0]; 
    } else if (nextLine && dueLines.some(dl => dl.id === nextLine?.id)) {
        // If the next sequential line is also due, it's already selected.
    } else if (dueLines.length > 0 && !nextLine) { // All unlocked, pick first due
        nextLine = dueLines[0];
    }
    // If there's no sequential line to unlock, but there are due lines, pick the first one.
    // This logic might need refinement to perfectly balance unlocking vs. reviewing older due items.
    // A robust queue would order by: 1. Next unreviewed sequential line. 2. Due lines by due date/importance.
    // For now: prioritize unlocking, then any due line.

    // A simpler selection for currentLineToReview:
    // 1. The line at `maxUnlockedLineNumber + 1` if it exists. This is a "new" card.
    // 2. If not, or if we want to mix, the first due card from `dueLines`.
    
    currentLineToReview = null; // Reset

    const potentialNextSequential = allTextLines.find(l => l.lineNumber === nextSequentialLineNumber);

    if (potentialNextSequential) { // Is there a new line to learn?
        currentLineToReview = potentialNextSequential;
    } else if (dueLines.length > 0) { // Any old lines due?
        currentLineToReview = dueLines[0]; // Simplistic: take the first one
    }


    if (currentLineToReview) {
      reviewStage = 'promptReveal';
    } else {
      reviewStage = 'sessionComplete'; // No new lines to unlock, no lines due
    }
    isLoading = false;
  }

  onMount(() => {
    unsubscribeActiveText = activeText.subscribe(value => {
      if (value) {
        setupSession(value);
      } else {
        currentView.set('list');
      }
    });
  });

  onDestroy(() => {
    if (unsubscribeActiveText) unsubscribeActiveText();
  });

  function handleRevealLine() {
    reviewStage = 'promptAnswer';
  }

  async function handleAnswer(remembered: boolean) {
    if (!currentLineToReview || !$activeText || !$activeText.id) return;

    const srsUpdates = calculateNextReview(currentLineToReview, remembered);
    const updatedLineData: Line = { ...currentLineToReview, ...srsUpdates };
    await updateLine(updatedLineData);

    // Update maxUnlockedLineNumber if this was a sequential unlock or a review of a later line
    const newMaxUnlocked = Math.max(
      $activeText.maxUnlockedLineNumber ?? -1,
      currentLineToReview.lineNumber
    );

    if (newMaxUnlocked !== ($activeText.maxUnlockedLineNumber ?? -1)) {
      $activeText.maxUnlockedLineNumber = newMaxUnlocked; // Update store
      await updateText($activeText.id, { maxUnlockedLineNumber: newMaxUnlocked }); // Update DB
    }
    
    // Refresh session to get next line and stats
    // The activeText store will trigger setupSession via subscription if maxUnlockedLineNumber changed.
    // Otherwise, manually call setupSession with the current $activeText.
    // To ensure reactivity if only line data changed, we can force activeText to "update"
    // or directly call setupSession.
    await setupSession($activeText); 
  }

  function goBackToList() {
    activeText.set(null); // This will trigger currentView change via subscription if needed
    currentView.set('list');
  }
</script>

<div class="review-page-container">
  {#if isLoading}
    <p>Loading review session...</p>
  {:else}
    <div class="text-meta">
      <h1>{textTitle}</h1>
      {#if textAuthor}
        <p class="author">by {textAuthor}</p>
      {/if}
    </div>

    <div class="session-stats">
      <span class="unlocked-info">
        {unlockedCount} of {totalLinesInText} lines unlocked
      </span>;
      <span class="due-info" class:has-due={dueTodayCount > 0}>
        {dueTodayCount} lines due for review.
      </span>
    </div>

    <div class="text-content-area">
      {#each allTextLines as line (line.id)}
        {@const isLineEffectivelyUnlocked = line.lineNumber <= ($activeText?.maxUnlockedLineNumber ?? -1)}
        {@const isTheCurrentLineToReview = currentLineToReview?.id === line.id}
        {@const isPreviousToCurrent = currentLineToReview != null && line.lineNumber === currentLineToReview.lineNumber - 1 && isLineEffectivelyUnlocked}

        {#if isLineEffectivelyUnlocked || isTheCurrentLineToReview}
          <LineDisplay
            originalLineText={line.originalLineText}
            displayState={isTheCurrentLineToReview ? (reviewStage === 'promptReveal' ? 'masked' : 'revealed') : 'revealed'}
            isContextPrevious={isPreviousToCurrent}
            isCurrentActive={isTheCurrentLineToReview}
          />
        {:else}
          <LineDisplay originalLineText="" displayState="placeholder" />
        {/if}

        {#if isTheCurrentLineToReview}
          <div class="controls-for-current-line">
            {#if reviewStage === 'promptReveal'}
              <button class="reveal-button" on:click={handleRevealLine}>Reveal line</button>
            {:else if reviewStage === 'promptAnswer'}
              <p class="remember-prompt">Did you remember this line?</p>
              <div class="answer-buttons">
                <button class="answer-btn correct" on:click={() => handleAnswer(true)}>Yes</button>
                <button class="answer-btn incorrect" on:click={() => handleAnswer(false)}>No</button>
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>

    {#if reviewStage === 'sessionComplete' && !isLoading}
      <p class="completion-message">All lines unlocked and no lines currently due for review in this text!</p>
    {/if}
    {#if reviewStage === 'noLines' && !isLoading}
      <p class="completion-message">This text has no lines to review.</p>
    {/if}

    <button class="back-to-list-button" on:click={goBackToList}>Back to Text List</button>
  {/if}
</div>

<style>
  .review-page-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f5f5; /* Light textured background */
    font-family: 'Georgia', serif; /* A more classic font */
    color: #333;
  }
  .text-meta {
    text-align: center;
    margin-bottom: 20px;
  }
  .text-meta h1 {
    margin-bottom: 0.2em;
    font-size: 1.8em;
  }
  .author {
    font-style: italic;
    color: #555;
    font-size: 1.1em;
  }
  .session-stats {
    text-align: center;
    margin-bottom: 25px;
    font-size: 0.95em;
    color: #444;
  }
  .unlocked-info {
    text-decoration: underline;
    text-decoration-color: #d9534f; /* Red underline */
    text-underline-offset: 3px;
     text-decoration-thickness: 1.5px;
  }
  .due-info {
    margin-left: 5px;
  }
  .due-info.has-due {
    color: #d9534f; /* Red text for due lines */
    font-weight: bold;
  }
  .text-content-area {
    background-color: #fff; /* White background for text area */
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 20px;
  }
  .controls-for-current-line {
    text-align: center;
    margin-top: 10px; /* Space above controls */
    margin-bottom: 15px; /* Space below controls, before next line */
    padding: 10px;
    border-top: 1px dashed #eee;
  }
  .reveal-button, .answer-btn {
    font-family: 'Courier New', Courier, monospace;
    padding: 8px 15px;
    border: 1px solid #555;
    background-color: #fff;
    color: #333;
    cursor: pointer;
    border-radius: 3px;
    font-size: 0.95em;
    margin: 0 5px;
  }
  .reveal-button:hover, .answer-btn:hover {
    background-color: #f0f0f0;
  }
  .remember-prompt {
    margin-bottom: 8px;
    font-size: 1em;
  }
  .answer-buttons {
    display: flex;
    justify-content: center;
    gap: 10px;
  }
  .answer-btn.correct {
    border-color: #5cb85c;
    color: #5cb85c;
  }
  .answer-btn.correct:hover {
    background-color: #5cb85c;
    color: white;
  }
  .answer-btn.incorrect {
    border-color: #d9534f;
    color: #d9534f;
  }
  .answer-btn.incorrect:hover {
    background-color: #d9534f;
    color: white;
  }
  .completion-message {
    text-align: center;
    padding: 20px;
    font-size: 1.1em;
    color: #31708f;
    background-color: #d9edf7;
    border: 1px solid #bce8f1;
    border-radius: 4px;
  }
  .back-to-list-button {
    display: block;
    margin: 20px auto;
    padding: 10px 20px;
    background-color: #777;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
  }
  .back-to-list-button:hover {
    background-color: #555;
  }
</style>
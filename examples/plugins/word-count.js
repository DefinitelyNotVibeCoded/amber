// Copy this file into <your-vault>/.amber/plugins/ and reload Amber to try it.
//
// Adds a "Word count: current note" command to the command palette (Ctrl/Cmd+K) that reports
// the word count and backlink count of whatever note you last opened.
export default {
  name: "Word Count",
  onload(ctx) {
    let currentPath = null;
    ctx.onNoteOpen((path) => {
      currentPath = path;
    });

    ctx.registerCommand({
      id: "word-count-current",
      label: "Word count: current note",
      keywords: "count words stats",
      run: () => {
        if (!currentPath) {
          ctx.showNotice("Open a note first.");
          return;
        }
        const note = ctx.vault.readNote(currentPath);
        if (!note) {
          ctx.showNotice("Could not read the current note.");
          return;
        }
        const backlinkCount = note.backlinks.length;
        ctx.showNotice(
          `"${note.title}" is ${note.wordCount} words, linked from ${backlinkCount} other note${backlinkCount === 1 ? "" : "s"}.`
        );
      },
    });
  },
};

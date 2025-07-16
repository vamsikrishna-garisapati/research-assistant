document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['researchNotes'], function (result) {
    if (result.researchNotes) {
      document.getElementById('notes').value = result.researchNotes;
    }
  });

  document.getElementById('summarizeBtn').addEventListener('click', summarizeText);
  document.getElementById('saveNotesBtn').addEventListener('click', saveNotes);
  document.getElementById('operation').addEventListener('change', toggleLanguageSelector);
  document.getElementById('clearAllBtn').addEventListener('click', clearAll);
  document.getElementById('exportPdfBtn').addEventListener('click', exportToPdf);
  document.getElementById('exportMdBtn').addEventListener('click', exportToMarkdown);

  // Optional buttons - only if present
  const copyBtn = document.getElementById('copyBtn');
  if (copyBtn) copyBtn.addEventListener('click', copyResult);

  const toggleNotesBtn = document.getElementById('toggleNotesBtn');
  if (toggleNotesBtn) toggleNotesBtn.addEventListener('click', toggleNotes);

  const noteSearch = document.getElementById('noteSearch');
  if (noteSearch) noteSearch.addEventListener('input', filterNotes);
});


// Show/hide language selector
function toggleLanguageSelector() {
  const operation = document.getElementById('operation').value;
  const languageSection = document.getElementById('languageSection');
  languageSection.style.display = operation === 'translate' ? 'block' : 'none';
}

// Collapse/Expand notes area
function toggleNotes() {
  const notes = document.getElementById('notes');
  const btn = document.getElementById('toggleNotesBtn');
  notes.classList.toggle('collapsed');
  btn.textContent = notes.classList.contains('collapsed') ? '⬇ Expand Notes' : '⬆ Collapse Notes';
}

// Clear notes + results
function clearAll() {
  document.getElementById('notes').value = '';
  document.getElementById('results').innerHTML = '';
  chrome.storage.local.remove('researchNotes');
  showStatus('Cleared all content');
  document.getElementById('copyBtn').classList.add('hidden');
}

// Copy result to clipboard
function copyResult() {
  const text = document.getElementById('results').innerText;
  navigator.clipboard.writeText(text)
    .then(() => showStatus('Copied to clipboard'))
    .catch(() => showStatus('Copy failed', true));
}

// Main operation: summarize / translate / etc.
async function summarizeText() {
  const btn = document.getElementById('summarizeBtn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const operation = document.getElementById('operation').value;
    const language = operation === 'translate' ? document.getElementById('language').value : "";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => window.getSelection().toString()
    });

    if (!result) {
      showResult('Please select some text first');
      return;
    }

    const response = await fetch('https://research-assistant-xnrr.onrender.com/api/research/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: result, operation, language })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const text = await response.text();
    showResult(text.replace(/\n/g, '<br>'));
    document.getElementById('copyBtn').classList.remove('hidden');
  } catch (error) {
    showResult('Error: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Process';
  }
}

// Save notes to local storage
function saveNotes() {
  const notes = document.getElementById('notes').value;
  chrome.storage.local.set({ 'researchNotes': notes }, function () {
    showStatus('Notes saved successfully');
  });
}

// Show result in output box
function showResult(content) {
  document.getElementById('results').innerHTML = `
    <div class="result-item">
      <div class="result-content">${content}</div>
    </div>`;
}

// Show status message (green or red)
function showStatus(msg, isError = false) {
  const el = document.getElementById('statusMessage');
  el.textContent = msg;
  el.style.color = isError ? 'red' : 'green';
  setTimeout(() => (el.textContent = ''), 3000);
}

// Export to PDF using html2pdf.js
function exportToPdf() {
  const element = document.createElement('div');
  const notes = document.getElementById('notes').value;
  const results = document.getElementById('results').innerText;

  element.innerHTML = `
    <h2>Research Notes</h2>
    <pre>${notes}</pre>
    <hr />
    <h2>AI Results</h2>
    <pre>${results}</pre>
  `;

  const opt = {
    margin: 0.5,
    filename: 'research_assistant.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().from(element).set(opt).save();
  showStatus('PDF Exported');
}

// Export to Markdown file
function exportToMarkdown() {
  const notes = document.getElementById('notes').value;
  const results = document.getElementById('results').innerText;
  const mdContent = `# 📝 Research Notes\n\n${notes}\n\n---\n\n## 📊 AI Result\n\n${results}`;

  const blob = new Blob([mdContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'research.md';
  a.click();
  URL.revokeObjectURL(url);
  showStatus('Markdown Exported');
}

// Filter notes in textarea
function filterNotes() {
  const query = document.getElementById('noteSearch').value.toLowerCase();
  const notesArea = document.getElementById('notes');
  chrome.storage.local.get(['researchNotes'], function (result) {
    const fullNotes = result.researchNotes || '';
    if (!query) {
      notesArea.value = fullNotes;
      return;
    }

    const lines = fullNotes.split('\n');
    const filtered = lines.filter(line => line.toLowerCase().includes(query));
    notesArea.value = filtered.join('\n');
  });
}

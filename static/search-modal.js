(function () {
  'use strict';

  const openButton = document.getElementById('course-search-open');
  const modal = document.getElementById('course-search-modal');
  const input = document.getElementById('course-search-input');
  const results = document.getElementById('course-search-results');
  const statusEl = document.getElementById('course-search-status');

  if (!openButton || !modal || !input || !results || !statusEl) {
    return;
  }

  const closeTargets = modal.querySelectorAll('[data-course-search-close]');
  let maxResults = parseInt(modal.getAttribute('data-max-results') || '20', 10);
  if (!Number.isFinite(maxResults) || maxResults <= 0) maxResults = 20;

  let previousActiveElement = null;

  let indexReady = false;
  let indexLoading = false;
  let idx = null;
  let docsByRef = null;

  let activeIndex = -1;
  let currentItems = [];

  function setHidden(isHidden) {
    if (isHidden) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    } else {
      modal.classList.remove('hidden');
      modal.removeAttribute('aria-hidden');
    }
  }

  function setStatus(text) {
    statusEl.textContent = text || '';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeWhitespace(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function tokenizeQuery(q) {
    q = normalizeWhitespace(q).toLowerCase();
    if (!q) return [];
    return q.split(' ').filter(Boolean);
  }

  function firstMatchIndex(haystackLower, terms) {
    let best = -1;
    for (let i = 0; i < terms.length; i++) {
      const t = terms[i];
      if (!t) continue;
      const idx = haystackLower.indexOf(t);
      if (idx !== -1 && (best === -1 || idx < best)) {
        best = idx;
      }
    }
    return best;
  }

  function highlightSnippet(snippet, terms) {
    // snippet is plain text. We HTML-escape it first, then inject <mark>.
    let escaped = escapeHtml(snippet);
    if (!terms.length) return escaped;

    // Highlight longer terms first to reduce nested/overlapping marks.
    const ordered = terms.slice().sort(function (a, b) {
      return b.length - a.length;
    });

    // Replace case-insensitively using a safe regex (escape metacharacters).
    for (let i = 0; i < ordered.length; i++) {
      const term = ordered[i];
      if (!term) continue;
      const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
      escaped = escaped.replace(re, function (m) {
        return '<mark>' + m + '</mark>';
      });
    }
    return escaped;
  }

  function buildSnippet(body, queryTerms) {
    const text = normalizeWhitespace(body);
    if (!text) return '';

    const lower = text.toLowerCase();
    const idx0 = firstMatchIndex(lower, queryTerms);

    if (idx0 === -1) {
      // Fallback: beginning of the text.
      const head = text.slice(0, 180);
      return (text.length > head.length ? head + '…' : head);
    }

    const before = 60;
    const after = 120;
    let start = Math.max(0, idx0 - before);
    let end = Math.min(text.length, idx0 + after);

    // Expand to word boundaries a bit (simple).
    while (start > 0 && text[start] !== ' ' && (idx0 - start) < 90) start--;
    while (end < text.length && text[end] !== ' ' && (end - idx0) < 200) end++;

    let snippet = text.slice(start, end).trim();
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet = snippet + '…';
    return snippet;
  }

  function ensureIndexReady(callback) {
    if (indexReady) {
      callback();
      return;
    }
    if (indexLoading) {
      // Poll until ready. Simple and robust.
      const handle = setInterval(function () {
        if (indexReady) {
          clearInterval(handle);
          callback();
        }
      }, 30);
      return;
    }

    indexLoading = true;
    setStatus('Loading search index…');

    // We assume elasticlunr.min.js and search_index.<lang>.js are already included
    // by the base template when course_search is enabled.
    try {
      if (!window.elasticlunr) {
        throw new Error('elasticlunr is not available');
      }
      if (!window.searchIndex) {
        throw new Error('searchIndex is not available');
      }

      idx = window.elasticlunr.Index.load(window.searchIndex);
      docsByRef = window.searchIndex &&
        window.searchIndex.documentStore &&
        window.searchIndex.documentStore.docs
        ? window.searchIndex.documentStore.docs
        : null;

      if (!docsByRef) {
        throw new Error('searchIndex.documentStore.docs is not available');
      }

      indexReady = true;
      indexLoading = false;
      setStatus('');
      callback();
    } catch (e) {
      indexLoading = false;
      setStatus('Search is unavailable (index missing).');
      // Keep modal usable (close works), but disable searching.
      input.setAttribute('disabled', 'disabled');
      // Don’t throw.
    }
  }

  function clearResults() {
    while (results.firstChild) results.removeChild(results.firstChild);
    currentItems = [];
    activeIndex = -1;
  }

  function setActiveResult(idx) {
    activeIndex = idx;
    for (let i = 0; i < currentItems.length; i++) {
      const li = currentItems[i];
      if (!li) continue;
      if (i === activeIndex) {
        li.classList.add('active');
        li.setAttribute('aria-selected', 'true');
        // keep visible
        if (li.scrollIntoView) {
          li.scrollIntoView({ block: 'nearest' });
        }
      } else {
        li.classList.remove('active');
        li.removeAttribute('aria-selected');
      }
    }
  }

  function renderResults(hits, queryTerms) {
    clearResults();

    if (!hits || !hits.length) {
      setStatus('No results.');
      return;
    }

    setStatus('');

    const limit = Math.min(hits.length, maxResults);
    for (let i = 0; i < limit; i++) {
      const hit = hits[i];
      const ref = hit && hit.ref ? String(hit.ref) : '';
      const doc = ref && docsByRef ? docsByRef[ref] : null;

      // Try to get the title from the document store.
      // Zola's search index stores title in documentStore.docs[ref].title
      const title = doc && doc.title ? doc.title : ref;

      // Generate snippet from body.
      const body = doc && doc.body ? doc.body : '';
      const snippetText = buildSnippet(body, queryTerms);

      const li = document.createElement('li');
      li.className = 'course-search-modal__result';
      li.setAttribute('role', 'option');

      const a = document.createElement('a');
      a.href = ref;
      a.className = 'course-search-modal__result-link';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'course-search-modal__result-title';
      titleDiv.textContent = title;

      const snippetDiv = document.createElement('div');
      snippetDiv.className = 'course-search-modal__result-snippet';
      snippetDiv.innerHTML = highlightSnippet(snippetText, queryTerms);

      a.appendChild(titleDiv);
      a.appendChild(snippetDiv);
      li.appendChild(a);

      // Click sets active index (nice for keyboard continuity)
      li.addEventListener('mousemove', function () {
        setActiveResult(i);
      });

      results.appendChild(li);
      currentItems.push(li);
    }

    setActiveResult(0);
  }

  let searchDebounce = null;

  function doSearch() {
    const q = input.value || '';
    const terms = tokenizeQuery(q);

    if (!q.trim()) {
      clearResults();
      setStatus('');
      return;
    }

    if (!indexReady || !idx) {
      setStatus('Loading search index…');
      return;
    }

    try {
      const hits = idx.search(q, { expand: true });
      renderResults(hits, terms);
    } catch (e) {
      console.error('Search error:', e);
      clearResults();
      setStatus('Search failed.');
    }
  }

  function onInput() {
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(doSearch, 60);
  }

  function openModal() {
    previousActiveElement = document.activeElement;
    setHidden(false);
    ensureIndexReady(function () {
      // no-op; index status updates are handled.
    });

    // Reset UI state on open (simple and predictable)
    input.value = '';
    clearResults();
    setStatus('');

    // Focus input on next tick for layout stability
    setTimeout(function () {
      input.focus();
    }, 0);
  }

  function closeModal() {
    setHidden(true);
    clearResults();
    setStatus('');

    if (previousActiveElement && previousActiveElement.focus) {
      previousActiveElement.focus();
    } else {
      openButton.focus();
    }
  }

  function isModalOpen() {
    return !modal.classList.contains('hidden');
  }

  function handleGlobalKeydown(e) {
    // Open with "/" unless focus is in a text input/textarea or contenteditable.
    if (e.key === '/' && !isModalOpen()) {
      const target = e.target;
      const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
      const isTypingContext =
        tag === 'input' ||
        tag === 'textarea' ||
        (target && target.isContentEditable);

      if (isTypingContext) return;

      e.preventDefault();
      openModal();
      return;
    }

    if (!isModalOpen()) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }

    if (e.key === 'ArrowDown') {
      if (!currentItems.length) return;
      e.preventDefault();
      setActiveResult(Math.min(currentItems.length - 1, activeIndex + 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      if (!currentItems.length) return;
      e.preventDefault();
      setActiveResult(Math.max(0, activeIndex - 1));
      return;
    }

    if (e.key === 'Enter') {
      if (activeIndex < 0 || activeIndex >= currentItems.length) return;
      const li = currentItems[activeIndex];
      const link = li ? li.querySelector('a') : null;
      if (link && link.href) {
        // Let normal navigation happen.
        // Close modal to keep state tidy; navigation will unload anyway.
        closeModal();
        window.location.href = link.href;
      }
    }
  }

  // Wire open/close
  openButton.addEventListener('click', openModal);
  for (let i = 0; i < closeTargets.length; i++) {
    closeTargets[i].addEventListener('click', function () {
      closeModal();
    });
  }

  // Prevent clicks inside dialog from closing due to backdrop handler.
  const dialog = modal.querySelector('.course-search-modal__dialog');
  if (dialog) {
    dialog.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  input.addEventListener('input', onInput);

  // Global key handling: open shortcut + in-modal navigation.
  document.addEventListener('keydown', handleGlobalKeydown, true);

  // Initial hidden state for ARIA.
  setHidden(true);
})();

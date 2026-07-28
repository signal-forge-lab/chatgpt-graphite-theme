/* ChatGPT Composer Initial Paint Probe extension content script. */

(() => {
  'use strict';

  const VERSION = '0.3.0';
  const HOST_ID = 'sg-composer-initial-paint-probe-host';
  const MAX_EVENTS = 320;
  const MAX_CANDIDATES = 48;
  const INITIAL_WINDOW_MS = 15000;
  const INITIAL_SAMPLE_DELAYS = [
    0, 16, 40, 80, 140, 240, 400, 650, 1000, 1500, 2500, 4000, 6500, 10000, 15000,
  ];

  const PAINT_PROPERTIES = [
    'display', 'visibility', 'position', 'z-index',
    'background-color', 'background-image',
    'border-top-color', 'border-top-style', 'border-top-width',
    'border-right-color', 'border-right-style', 'border-right-width',
    'border-bottom-color', 'border-bottom-style', 'border-bottom-width',
    'border-left-color', 'border-left-style', 'border-left-width',
    'box-shadow', 'outline-color', 'outline-offset', 'outline-style', 'outline-width',
    'caret-color', 'color', 'opacity', 'overflow', 'overflow-x', 'overflow-y',
    'clip-path', 'filter', 'transform', 'animation-name', 'animation-duration',
    'transition-property', 'transition-duration',
  ];

  const CUSTOM_PROPERTIES = [
    '--sg-accent', '--sg-accent-soft', '--composer-blue-text',
    '--border-color', '--border-default', '--border-medium',
    '--interactive-border-focus', '--interactive-border-active',
  ];

  const SAFE_ATTRIBUTES = [
    'id', 'role', 'data-testid', 'data-state', 'aria-expanded',
    'aria-disabled', 'contenteditable', 'tabindex',
  ];

  const startedAt = performance.now();
  const state = {
    probe: 'chatgpt-composer-initial-paint-probe',
    version: VERSION,
    startedAt: new Date().toISOString(),
    page: location.href,
    userAgent: navigator.userAgent,
    executionWorld: 'ISOLATED',
    phase: 'initial',
    events: [],
    scanCount: 0,
    composerSeenAtMs: null,
    paused: false,
  };

  const lastSignatures = new Map();
  const timers = new Set();
  const listeners = [];
  let documentObserver = null;
  let composerObserver = null;
  let observedForm = null;
  let host = null;
  let shadow = null;
  let statusNode = null;
  let scanTimer = null;
  let pendingReason = null;

  function elapsed() {
    return Math.round((performance.now() - startedAt) * 10) / 10;
  }

  function addEvent(type, detail = {}) {
    if (state.events.length >= MAX_EVENTS) return;
    state.events.push({ atMs: elapsed(), type, ...detail });
    updateStatus();
  }

  function cssEscape(value) {
    return globalThis.CSS?.escape
      ? CSS.escape(String(value))
      : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function selectorSegment(element) {
    if (!(element instanceof Element)) return null;
    if (element.id) return `#${cssEscape(element.id)}`;
    const testId = element.getAttribute('data-testid');
    if (testId) return `${element.localName}[data-testid="${testId.replace(/"/g, '\\"')}"]`;

    const classes = [...element.classList]
      .filter((name) => name.length < 64)
      .slice(0, 3)
      .map((name) => `.${cssEscape(name)}`)
      .join('');
    if (classes) return `${element.localName}${classes}`;

    const parent = element.parentElement;
    if (!parent) return element.localName;
    const siblings = [...parent.children].filter((item) => item.localName === element.localName);
    return siblings.length > 1
      ? `${element.localName}:nth-of-type(${siblings.indexOf(element) + 1})`
      : element.localName;
  }

  function selectorPath(element) {
    if (!(element instanceof Element)) return null;
    const parts = [];
    let current = element;
    while (current && parts.length < 7) {
      parts.unshift(selectorSegment(current));
      if (current.id || current === document.body) break;
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  function safeAttributes(element) {
    const result = {};
    for (const name of SAFE_ATTRIBUTES) {
      if (element.hasAttribute(name)) result[name] = element.getAttribute(name);
    }
    return result;
  }

  function rectRecord(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.x * 10) / 10,
      y: Math.round(rect.y * 10) / 10,
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
      top: Math.round(rect.top * 10) / 10,
      right: Math.round(rect.right * 10) / 10,
      bottom: Math.round(rect.bottom * 10) / 10,
      left: Math.round(rect.left * 10) / 10,
    };
  }

  function colorTuples(value) {
    const tuples = [];
    const text = String(value || '');
    const rgbPattern = /rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)(?:\s*[,/]\s*(\d*(?:\.\d+)?))?\s*\)/gi;
    for (const match of text.matchAll(rgbPattern)) {
      tuples.push({
        r: Number(match[1]), g: Number(match[2]), b: Number(match[3]),
        a: match[4] === undefined || match[4] === '' ? 1 : Number(match[4]),
      });
    }
    const hexPattern = /#([0-9a-f]{6}|[0-9a-f]{8})\b/gi;
    for (const match of text.matchAll(hexPattern)) {
      const hex = match[1];
      tuples.push({
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1,
      });
    }
    return tuples;
  }

  function isBluePaint(value) {
    return colorTuples(value).some(({ r, g, b, a }) => (
      a > 0.05 && b >= 110 && b > r + 22 && b >= g + 8
    ));
  }

  function styleRecord(element, pseudo = null) {
    const style = getComputedStyle(element, pseudo);
    const values = {};
    const customProperties = {};
    for (const property of PAINT_PROPERTIES) values[property] = style.getPropertyValue(property);
    for (const property of CUSTOM_PROPERTIES) {
      const value = style.getPropertyValue(property).trim();
      if (value) customProperties[property] = value;
    }
    return { pseudo, content: pseudo ? style.content : null, values, customProperties };
  }

  function hasVisibleLine(style) {
    const values = style.values;
    const outline = values['outline-style'] !== 'none' && Number.parseFloat(values['outline-width']) > 0;
    const border = ['top', 'right', 'bottom', 'left'].some((side) => (
      values[`border-${side}-style`] !== 'none' &&
      Number.parseFloat(values[`border-${side}-width`]) > 0
    ));
    return outline || border || values['box-shadow'] !== 'none';
  }

  function containsBlue(style) {
    return [...Object.values(style.values), ...Object.values(style.customProperties)].some(isBluePaint);
  }

  function collectCandidates(prompt, form) {
    const candidates = new Set();
    const add = (element) => {
      if (element instanceof Element && candidates.size < MAX_CANDIDATES) candidates.add(element);
    };
    add(prompt);
    add(form);
    add(document.activeElement);

    for (const root of [prompt, form, document.activeElement]) {
      let current = root instanceof Element ? root : null;
      for (let depth = 0; current && depth < 8; depth += 1) {
        add(current);
        current = current.parentElement;
      }
    }
    if (form) {
      for (const element of form.querySelectorAll('*')) {
        add(element);
        if (candidates.size >= MAX_CANDIDATES) break;
      }
    }
    return [...candidates];
  }

  function inspectElement(element, alwaysKeep = false) {
    const base = styleRecord(element);
    const before = styleRecord(element, '::before');
    const after = styleRecord(element, '::after');
    const blue = containsBlue(base) || containsBlue(before) || containsBlue(after);
    const line = hasVisibleLine(base) || hasVisibleLine(before) || hasVisibleLine(after);
    if (!alwaysKeep && !blue && !line) return null;
    return {
      selector: selectorPath(element),
      tag: element.localName,
      classes: [...element.classList].slice(0, 16),
      attributes: safeAttributes(element),
      rect: rectRecord(element),
      activeElement: element === document.activeElement,
      blue,
      line,
      styles: { base, before, after },
    };
  }

  function elementStackAt(x, y) {
    return document.elementsFromPoint(x, y)
      .filter((element) => element !== host && !host?.contains(element))
      .slice(0, 10)
      .map((element) => ({ selector: selectorPath(element), rect: rectRecord(element) }));
  }

  function sampleTopEdge(root) {
    if (!(root instanceof Element)) return [];
    const rect = root.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return [];
    const yValues = [rect.top + 1, rect.top + 2, rect.top + 4];
    const xValues = [rect.left + rect.width * 0.2, rect.left + rect.width * 0.5, rect.left + rect.width * 0.8];
    return yValues.flatMap((y) => xValues.map((x) => ({
      x: Math.round(x), y: Math.round(y), elements: elementStackAt(x, y),
    })));
  }

  function attachComposerObserver(form) {
    if (!(form instanceof Element) || form === observedForm) return;
    composerObserver?.disconnect();
    observedForm = form;
    composerObserver = new MutationObserver(() => scheduleScan('composer-mutation', 32));
    composerObserver.observe(form, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-state', 'aria-expanded', 'tabindex'],
    });
    addEvent('composer-observer-attached', { form: selectorPath(form) });
  }

  function scan(reason = 'scheduled') {
    if (state.paused) return;
    state.scanCount += 1;
    const prompt = document.querySelector('#prompt-textarea');
    const form = prompt?.closest('form') || document.querySelector('form:has(#prompt-textarea)');
    if (!prompt && !form) return;

    if (state.composerSeenAtMs === null) {
      state.composerSeenAtMs = elapsed();
      addEvent('composer-seen', { prompt: selectorPath(prompt), form: selectorPath(form) });
    }
    attachComposerObserver(form);

    const alwaysKeep = new Set([prompt, form, document.activeElement].filter(Boolean));
    let current = prompt;
    for (let depth = 0; current && depth < 6; depth += 1) {
      alwaysKeep.add(current);
      current = current.parentElement;
    }

    const changed = [];
    for (const element of collectCandidates(prompt, form)) {
      const record = inspectElement(element, alwaysKeep.has(element));
      if (!record) continue;
      const signature = JSON.stringify({
        rect: record.rect, styles: record.styles, attributes: record.attributes,
      });
      if (lastSignatures.get(record.selector) === signature) continue;
      lastSignatures.set(record.selector, signature);
      changed.push(record);
    }

    if (changed.length > 0) {
      addEvent('paint-change', {
        reason,
        readyState: document.readyState,
        activeElement: selectorPath(document.activeElement),
        elements: changed,
        topEdgeSamples: {
          prompt: sampleTopEdge(prompt),
          form: sampleTopEdge(form),
        },
      });
    }
  }

  function scheduleScan(reason, delay = 16) {
    if (state.paused) return;
    pendingReason = pendingReason ? `${pendingReason}+${reason}` : reason;
    if (scanTimer !== null) return;
    scanTimer = globalThis.setTimeout(() => {
      const mergedReason = pendingReason || 'scheduled';
      scanTimer = null;
      pendingReason = null;
      scan(mergedReason);
    }, delay);
  }

  function on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  }

  function updateStatus() {
    if (!statusNode) return;
    const blueEvents = state.events.filter((event) => (
      event.type === 'paint-change' && event.elements?.some((element) => element.blue)
    )).length;
    statusNode.textContent = `${state.phase} · ${state.events.length} events · ${blueEvents} blue`;
  }

  function exportJson() {
    scan('manual-export');
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `chatgpt-composer-initial-paint-probe-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    anchor.style.display = 'none';
    document.documentElement.append(anchor);
    anchor.click();
    anchor.remove();
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function createButton(label, onClick) {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    element.addEventListener('click', onClick);
    return element;
  }

  function ensurePanel() {
    if (!document.documentElement || host?.isConnected) return;
    document.getElementById(HOST_ID)?.remove();
    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'all:initial;position:fixed;top:10px;right:10px;z-index:2147483647;display:block';
    shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      .panel { display:flex;align-items:center;gap:6px;padding:7px 8px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:#17191b;color:#e7e9ec;font:12px/1.3 ui-monospace,monospace;box-shadow:0 8px 24px rgba(0,0,0,.35) }
      button { border:1px solid #45484b;border-radius:7px;background:#2d3031;color:#e7e9ec;padding:3px 7px;cursor:pointer;font:inherit }
      button:hover { background:#383b3d }
    `;
    const panel = document.createElement('div');
    panel.className = 'panel';
    statusNode = document.createElement('span');
    const saveButton = createButton('Save JSON', exportJson);
    const pauseButton = createButton(state.paused ? 'Resume' : 'Pause', () => {
      state.paused = !state.paused;
      pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
      addEvent(state.paused ? 'paused' : 'resumed');
      if (!state.paused) scheduleScan('resume', 0);
      updateStatus();
    });
    panel.append(statusNode, saveButton, pauseButton);
    shadow.append(style, panel);
    document.documentElement.append(host);
    updateStatus();
  }

  function start() {
    addEvent('probe-start', { href: location.href, readyState: document.readyState });

    const attachDocumentObserver = () => {
      if (!document.documentElement) {
        const timer = globalThis.setTimeout(attachDocumentObserver, 0);
        timers.add(timer);
        return;
      }
      documentObserver = new MutationObserver(() => {
        ensurePanel();
        if (!observedForm?.isConnected) scheduleScan('document-mutation', 32);
      });
      documentObserver.observe(document.documentElement, { subtree: true, childList: true });
      ensurePanel();
    };
    attachDocumentObserver();

    for (const delay of INITIAL_SAMPLE_DELAYS) {
      const timer = globalThis.setTimeout(() => scan(`initial-${delay}ms`), delay);
      timers.add(timer);
    }
    const phaseTimer = globalThis.setTimeout(() => {
      state.phase = 'passive';
      addEvent('initial-window-complete', { durationMs: INITIAL_WINDOW_MS });
      updateStatus();
    }, INITIAL_WINDOW_MS);
    timers.add(phaseTimer);

    on(document, 'focusin', (event) => {
      addEvent('focusin', { target: selectorPath(event.target) });
      scheduleScan('focusin', 0);
    }, true);
    on(document, 'focusout', (event) => {
      addEvent('focusout', { target: selectorPath(event.target) });
      scheduleScan('focusout', 0);
    }, true);
    on(document, 'animationstart', (event) => {
      const form = event.target instanceof Element ? event.target.closest('form:has(#prompt-textarea)') : null;
      if (!form) return;
      addEvent('animationstart', { target: selectorPath(event.target), animationName: event.animationName });
      scheduleScan('animationstart', 0);
    }, true);
    on(document, 'transitionrun', (event) => {
      const form = event.target instanceof Element ? event.target.closest('form:has(#prompt-textarea)') : null;
      if (!form) return;
      addEvent('transitionrun', { target: selectorPath(event.target), propertyName: event.propertyName });
      scheduleScan('transitionrun', 0);
    }, true);
    on(document, 'readystatechange', () => {
      addEvent('readystatechange', { readyState: document.readyState });
      scheduleScan('readystatechange', 0);
    });
    on(window, 'pageshow', () => scheduleScan('pageshow', 0));

    const panelTimer = globalThis.setInterval(ensurePanel, 750);
    timers.add(panelTimer);
  }

  function destroy() {
    state.paused = true;
    documentObserver?.disconnect();
    composerObserver?.disconnect();
    if (scanTimer !== null) globalThis.clearTimeout(scanTimer);
    for (const timer of timers) {
      globalThis.clearTimeout(timer);
      globalThis.clearInterval(timer);
    }
    for (const remove of listeners.splice(0)) {
      try { remove(); } catch {}
    }
    host?.remove();
  }

  start();
  globalThis.__sgComposerInitialPaintProbeExtension = { state, scan, exportJson, destroy };
})();

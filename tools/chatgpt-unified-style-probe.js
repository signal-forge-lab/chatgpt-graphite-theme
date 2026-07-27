/*
 * ChatGPT Unified Style Probe v2.0.1
 *
 * One-file DevTools Snippet. It starts automatic collection immediately,
 * captures visible and interactive ChatGPT UI, includes Activity flyout and
 * iframe context diagnostics, and provides a collection-safe live preview.
 *
 * Run with third-party UserCSS disabled when collecting default styles.
 */

(() => {
  'use strict';

  const PROBE_VERSION = '0.1.1';
  const GLOBAL_KEY = '__chatgptOriginalStyleProbe';
  const ROOT_ATTRIBUTE = 'data-chatgpt-original-style-probe';

  if (window[GLOBAL_KEY]?.destroy) {
    window[GLOBAL_KEY].destroy();
  }

  const TRACKED_PROPERTIES = [
    'display',
    'visibility',
    'position',
    'z-index',
    'box-sizing',
    'width',
    'height',
    'min-width',
    'min-height',
    'max-width',
    'max-height',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'background-color',
    'background-image',
    'background-clip',
    'color',
    'caret-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-right-radius',
    'border-bottom-left-radius',
    'box-shadow',
    'outline-color',
    'outline-style',
    'outline-width',
    'opacity',
    'filter',
    'backdrop-filter',
    '-webkit-backdrop-filter',
    'mix-blend-mode',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
    'text-decoration-color',
    'text-decoration-line',
    'text-shadow',
    'overflow',
    'overflow-x',
    'overflow-y',
    'scrollbar-color',
    'transition-property',
    'transition-duration',
    'transform',
  ];

  const SAFE_ATTRIBUTES = [
    'id',
    'role',
    'data-testid',
    'data-state',
    'data-active',
    'data-sidebar-item',
    'data-radix-menu-content',
    'data-radix-select-content',
    'data-scroll-root',
    'data-message-author-role',
    'aria-current',
    'aria-selected',
    'aria-checked',
    'aria-expanded',
    'aria-disabled',
    'disabled',
    'hidden',
  ];

  const KNOWN_TARGETS = [
    { name: 'document-body', selectors: ['body'] },
    { name: 'main-surface', selectors: ['#main', 'main'] },
    { name: 'conversation-thread', selectors: ['#thread', '[data-scroll-root]'] },
    { name: 'page-header', selectors: ['#page-header', 'header'] },
    { name: 'sidebar', selectors: ['#stage-slideover-sidebar'] },
    {
      name: 'selected-conversation',
      selectors: [
        '#stage-slideover-sidebar a[data-sidebar-item="true"][data-active]',
        '#stage-slideover-sidebar [aria-current="page"]',
      ],
    },
    {
      name: 'composer',
      selectors: [
        'form:has(#prompt-textarea)',
        '#prompt-textarea',
        'form[class~="group/composer"]',
      ],
    },
    {
      name: 'user-message-bubble',
      selectors: [
        '[data-message-author-role="user"] .user-message-bubble-color',
        '[data-message-author-role="user"]',
      ],
    },
    { name: 'code-block', selectors: ['pre', '#code-block-viewer'] },
    { name: 'dialog', selectors: ['[role="dialog"]'] },
    {
      name: 'menu',
      selectors: [
        '[role="menu"][data-radix-menu-content]',
        '[role="menu"]',
      ],
    },
    {
      name: 'model-selector-list',
      selectors: [
        '[role="listbox"][data-radix-select-content]',
        '[role="listbox"]',
      ],
    },
    { name: 'tooltip', selectors: ['[role="tooltip"]'] },
    {
      name: 'work-panel',
      selectors: ['#page-header aside', 'aside:has(.group\\/section-toggle)'],
    },
  ];

  const state = {
    startedAt: new Date().toISOString(),
    captures: [],
    picking: false,
    hoveredElement: null,
    ruleIndex: [],
    customPropertyNames: new Set(),
    inaccessibleStyleSheets: [],
    indexedStyleSheetCount: 0,
    indexedRuleCount: 0,
  };

  let panel = null;
  let highlight = null;
  let statusNode = null;
  let labelInput = null;

  function isElement(value) {
    return value instanceof Element;
  }

  function isProbeElement(element) {
    return Boolean(element?.closest?.(`[${ROOT_ATTRIBUTE}]`));
  }

  function visibleElement(element) {
    if (!isElement(element)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) !== 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function safeAttributeSelector(name, value) {
    return `[${name}="${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
  }

  function selectorSegment(element) {
    const tag = element.localName || 'element';
    if (element.id) return `#${cssEscape(element.id)}`;

    for (const name of ['data-testid', 'data-sidebar-item', 'role']) {
      const value = element.getAttribute(name);
      if (value) return `${tag}${safeAttributeSelector(name, value)}`;
    }

    const parent = element.parentElement;
    if (!parent) return tag;
    const siblings = [...parent.children].filter((item) => item.localName === tag);
    if (siblings.length <= 1) return tag;
    return `${tag}:nth-of-type(${siblings.indexOf(element) + 1})`;
  }

  function selectorPath(element) {
    const parts = [];
    let current = element;
    while (current && parts.length < 7) {
      parts.unshift(selectorSegment(current));
      if (current.id || current === document.body || current === document.documentElement) break;
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  function safeAttributes(element) {
    const result = {};
    for (const name of SAFE_ATTRIBUTES) {
      if (element.hasAttribute(name)) {
        result[name] = element.getAttribute(name);
      }
    }
    return result;
  }

  function stateMatches(element) {
    const selectors = {
      hover: ':hover',
      focus: ':focus',
      focusVisible: ':focus-visible',
      active: ':active',
      disabled: ':disabled',
    };
    const result = {};
    for (const [name, selector] of Object.entries(selectors)) {
      try {
        result[name] = element.matches(selector);
      } catch {
        result[name] = null;
      }
    }
    return result;
  }

  function elementFingerprint(element) {
    const rect = element.getBoundingClientRect();
    return {
      tagName: element.localName,
      selectorPath: selectorPath(element),
      classes: [...element.classList].slice(0, 100),
      attributes: safeAttributes(element),
      states: stateMatches(element),
      rect: {
        x: Math.round(rect.x * 100) / 100,
        y: Math.round(rect.y * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
      },
    };
  }

  function splitSelectorList(selectorText) {
    const result = [];
    let current = '';
    let quote = '';
    let escaped = false;
    let roundDepth = 0;
    let squareDepth = 0;

    for (const character of selectorText) {
      if (escaped) {
        current += character;
        escaped = false;
        continue;
      }
      if (character === '\\') {
        current += character;
        escaped = true;
        continue;
      }
      if (quote) {
        current += character;
        if (character === quote) quote = '';
        continue;
      }
      if (character === '"' || character === "'") {
        current += character;
        quote = character;
        continue;
      }
      if (character === '(') roundDepth += 1;
      if (character === ')') roundDepth = Math.max(0, roundDepth - 1);
      if (character === '[') squareDepth += 1;
      if (character === ']') squareDepth = Math.max(0, squareDepth - 1);

      if (character === ',' && roundDepth === 0 && squareDepth === 0) {
        if (current.trim()) result.push(current.trim());
        current = '';
        continue;
      }
      current += character;
    }
    if (current.trim()) result.push(current.trim());
    return result;
  }

  const PSEUDO_PATTERN = /::?(before|after|marker|placeholder|selection|file-selector-button)\b/i;

  function selectorMatches(element, selectorText, pseudo = null) {
    for (const rawSelector of splitSelectorList(selectorText)) {
      let selector = rawSelector;
      const pseudoMatches = [...selector.matchAll(new RegExp(PSEUDO_PATTERN, 'gi'))];

      if (!pseudo && pseudoMatches.length > 0) continue;
      if (pseudo) {
        const targetName = pseudo.replace(/^::?/, '');
        const hasTarget = pseudoMatches.some((match) => match[1].toLowerCase() === targetName);
        if (!hasTarget) continue;
        selector = selector.replace(
          new RegExp(`::?${targetName}\\b`, 'gi'),
          '',
        );
        if (PSEUDO_PATTERN.test(selector)) continue;
      }

      try {
        if (element.matches(selector)) return true;
      } catch {
        // Ignore browser-specific selectors that Element.matches cannot parse.
      }
    }
    return false;
  }

  function declarationObject(style) {
    const result = {};
    for (const property of style) {
      const value = style.getPropertyValue(property).trim();
      result[property] = {
        value,
        priority: style.getPropertyPriority(property) || '',
      };
      if (property.startsWith('--')) state.customPropertyNames.add(property);
    }
    return result;
  }

  function sanitizedStyleSource(source) {
    if (!source) return source;
    try {
      const url = new URL(source, location.href);
      return `${url.origin}${url.pathname}`;
    } catch {
      return source;
    }
  }

  function conditionDescriptor(rule) {
    if (rule instanceof CSSMediaRule) {
      return {
        type: 'media',
        text: rule.conditionText,
        active: matchMedia(rule.conditionText).matches,
      };
    }
    if (typeof CSSSupportsRule !== 'undefined' && rule instanceof CSSSupportsRule) {
      let active = null;
      try {
        active = CSS.supports(rule.conditionText);
      } catch {
        active = null;
      }
      return { type: 'supports', text: rule.conditionText, active };
    }
    return {
      type: rule.constructor?.name || 'group',
      text: rule.conditionText || rule.name || rule.cssText?.slice(0, 160) || '',
      active: null,
    };
  }

  function indexRuleList(ruleList, context) {
    for (const rule of ruleList) {
      if (rule.type === CSSRule.STYLE_RULE) {
        state.ruleIndex.push({
          source: sanitizedStyleSource(context.source),
          styleSheetIndex: context.styleSheetIndex,
          ruleOrder: state.indexedRuleCount++,
          conditions: context.conditions,
          selectorText: rule.selectorText,
          declarations: declarationObject(rule.style),
        });
        continue;
      }

      if (rule.type === CSSRule.IMPORT_RULE && rule.styleSheet) {
        try {
          indexRuleList(rule.styleSheet.cssRules, {
            ...context,
            source: rule.href || context.source,
            conditions: [
              ...context.conditions,
              { type: 'import', text: rule.media?.mediaText || '', active: null },
            ],
          });
        } catch (error) {
          state.inaccessibleStyleSheets.push({
            href: rule.href || context.source,
            reason: String(error?.message || error),
          });
        }
        continue;
      }

      if (rule.cssRules) {
        indexRuleList(rule.cssRules, {
          ...context,
          conditions: [...context.conditions, conditionDescriptor(rule)],
        });
      }
    }
  }

  function collectStyleSheets() {
    const sheets = [];
    const seen = new Set();

    function addSheet(sheet, owner) {
      if (!sheet || seen.has(sheet)) return;
      seen.add(sheet);
      sheets.push({ sheet, owner });
    }

    [...document.styleSheets].forEach((sheet) => addSheet(sheet, 'document'));
    (document.adoptedStyleSheets || []).forEach((sheet) => addSheet(sheet, 'document-adopted'));

    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT);
    let node = walker.currentNode;
    while (node) {
      if (node.shadowRoot) {
        [...node.shadowRoot.querySelectorAll('style, link[rel="stylesheet"]')].forEach((item) =>
          addSheet(item.sheet, `shadow:${selectorPath(node)}`),
        );
        (node.shadowRoot.adoptedStyleSheets || []).forEach((sheet) =>
          addSheet(sheet, `shadow-adopted:${selectorPath(node)}`),
        );
      }
      node = walker.nextNode();
    }

    return sheets;
  }

  function buildRuleIndex() {
    state.ruleIndex.length = 0;
    state.customPropertyNames.clear();
    state.inaccessibleStyleSheets.length = 0;
    state.indexedRuleCount = 0;

    const sheets = collectStyleSheets();
    state.indexedStyleSheetCount = sheets.length;

    sheets.forEach(({ sheet, owner }, styleSheetIndex) => {
      const source = sanitizedStyleSource(sheet.href) || `${owner}:inline-${styleSheetIndex}`;
      try {
        indexRuleList(sheet.cssRules, {
          source,
          styleSheetIndex,
          conditions: [],
        });
      } catch (error) {
        state.inaccessibleStyleSheets.push({
          href: source,
          reason: String(error?.message || error),
        });
      }
    });
  }

  function computedProperties(element, pseudo = null) {
    let style;
    try {
      style = getComputedStyle(element, pseudo);
    } catch (error) {
      return { error: String(error?.message || error) };
    }

    const result = {};
    for (const property of TRACKED_PROPERTIES) {
      result[property] = style.getPropertyValue(property).trim();
    }
    return result;
  }

  function computedCustomProperties(element) {
    const style = getComputedStyle(element);
    const result = {};
    [...state.customPropertyNames]
      .sort()
      .slice(0, 1500)
      .forEach((property) => {
        const value = style.getPropertyValue(property).trim();
        if (value) result[property] = value;
      });
    return result;
  }

  function matchingRules(element, pseudo = null) {
    return state.ruleIndex.filter((rule) => selectorMatches(element, rule.selectorText, pseudo));
  }

  function ancestorPaintChain(element) {
    const result = [];
    let current = element;
    for (let depth = 0; current && depth < 10; depth += 1) {
      const style = getComputedStyle(current);
      result.push({
        selectorPath: selectorPath(current),
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        opacity: style.opacity,
        filter: style.filter,
        backdropFilter: style.backdropFilter || style.webkitBackdropFilter || '',
        mixBlendMode: style.mixBlendMode,
      });
      current = current.parentElement;
    }
    return result;
  }

  function appearanceSnapshot() {
    const htmlStyle = getComputedStyle(document.documentElement);
    const activeBuild = htmlStyle.getPropertyValue('--sg-active-build').trim();
    const customThemeRuleDetected = state.ruleIndex.some((rule) =>
      Object.prototype.hasOwnProperty.call(rule.declarations, '--sg-active-build'),
    );
    return {
      htmlDarkClass: document.documentElement.classList.contains('dark'),
      inferredAppearance: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      computedColorScheme: htmlStyle.colorScheme,
      prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
      customThemeDetected: Boolean(activeBuild) || customThemeRuleDetected,
      customThemeRuleDetected,
      detectedSoftGraphiteBuild: activeBuild || null,
    };
  }

  function sanitizedPageUrl() {
    let path = location.pathname;
    path = path.replace(/\/c\/[^/]+/g, '/c/:conversation');
    path = path.replace(/\/g\/[^/]+/g, '/g/:gpt');
    path = path.replace(/\/share\/[^/]+/g, '/share/:id');
    path = path.replace(/\/project\/[^/]+/g, '/project/:id');
    return `${location.origin}${path}`;
  }

  function pageSnapshot() {
    return {
      url: sanitizedPageUrl(),
      titleOmittedForPrivacy: true,
      capturedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      appearance: appearanceSnapshot(),
      styleIndex: {
        styleSheetCount: state.indexedStyleSheetCount,
        indexedRuleCount: state.indexedRuleCount,
        customPropertyCount: state.customPropertyNames.size,
        inaccessibleStyleSheets: state.inaccessibleStyleSheets,
      },
    };
  }

  function captureElement(element, label = '') {
    if (!isElement(element) || isProbeElement(element)) {
      throw new Error('A page element outside the probe panel is required.');
    }

    const capture = {
      index: state.captures.length + 1,
      label: label.trim() || `capture-${state.captures.length + 1}`,
      capturedAt: new Date().toISOString(),
      page: pageSnapshot(),
      element: elementFingerprint(element),
      inlineStyle: declarationObject(element.style),
      computed: computedProperties(element),
      pseudoElements: {
        before: {
          computed: computedProperties(element, '::before'),
          matchedRules: matchingRules(element, '::before'),
        },
        after: {
          computed: computedProperties(element, '::after'),
          matchedRules: matchingRules(element, '::after'),
        },
      },
      customProperties: computedCustomProperties(element),
      matchedRules: matchingRules(element),
      ancestorPaintChain: ancestorPaintChain(element),
    };

    state.captures.push(capture);
    updateStatus(`Captured ${capture.label} (${state.captures.length} total).`);
    return capture;
  }

  function firstVisible(selectors) {
    for (const selector of selectors) {
      let elements = [];
      try {
        elements = [...document.querySelectorAll(selector)];
      } catch {
        continue;
      }
      const visible = elements.find((element) => visibleElement(element) && !isProbeElement(element));
      if (visible) return visible;
    }
    return null;
  }

  function scanKnownTargets() {
    const results = [];
    for (const target of KNOWN_TARGETS) {
      const element = firstVisible(target.selectors);
      if (!element) {
        results.push({ name: target.name, captured: false });
        continue;
      }
      captureElement(element, `baseline:${target.name}`);
      results.push({ name: target.name, captured: true, selectorPath: selectorPath(element) });
    }
    updateStatus(
      `Known UI scan finished: ${results.filter((item) => item.captured).length}/${results.length} found.`,
    );
    return results;
  }

  function exportPayload() {
    return {
      schema: 'chatgpt-original-style-probe/v1',
      probeVersion: PROBE_VERSION,
      generatedAt: new Date().toISOString(),
      privacy: {
        textContentCaptured: false,
        documentTitleCaptured: false,
        fullHrefCaptured: false,
      },
      instructions: {
        expectedEnvironment: 'Run with third-party UserCSS disabled.',
        stateCapture: 'Capture hover/open/selected states while they are visibly active.',
      },
      session: pageSnapshot(),
      captures: state.captures,
    };
  }

  function downloadJson() {
    const payload = exportPayload();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const appearance = payload.session.appearance.inferredAppearance;
    const filename = `chatgpt-original-style-${appearance}-${stamp}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    updateStatus(`Downloaded ${filename}.`);
    return payload;
  }

  function updateHighlight(element) {
    if (!highlight || !visibleElement(element)) return;
    const rect = element.getBoundingClientRect();
    Object.assign(highlight.style, {
      display: 'block',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  function hideHighlight() {
    if (highlight) highlight.style.display = 'none';
  }

  function updateStatus(message) {
    if (statusNode) statusNode.textContent = message;
    console.info(`[Original Style Probe] ${message}`);
  }

  function stopPicking() {
    state.picking = false;
    hideHighlight();
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('click', onPickerClick, true);
    updateStatus('Picker stopped. Alt+Shift+P starts it again.');
  }

  function startPicking() {
    if (state.picking) return;
    state.picking = true;
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('click', onPickerClick, true);
    updateStatus('Picker active. Hover an element and click to capture it.');
  }

  function onPointerMove(event) {
    if (!state.picking || isProbeElement(event.target)) return;
    state.hoveredElement = event.target;
    updateHighlight(event.target);
  }

  function onPickerClick(event) {
    if (!state.picking || isProbeElement(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    captureElement(event.target, labelInput?.value || 'manual');
    stopPicking();
  }

  function onDocumentPointerMove(event) {
    if (!isProbeElement(event.target)) state.hoveredElement = event.target;
  }

  function onKeyDown(event) {
    if (!(event.altKey && event.shiftKey)) return;
    const key = event.key.toLowerCase();

    if (key === 'p') {
      event.preventDefault();
      state.picking ? stopPicking() : startPicking();
    }

    if (key === 'c') {
      if (!state.hoveredElement || isProbeElement(state.hoveredElement)) return;
      event.preventDefault();
      captureElement(state.hoveredElement, labelInput?.value || 'hotkey');
    }

    if (key === 'j') {
      event.preventDefault();
      downloadJson();
    }
  }

  function button(text, handler) {
    const item = document.createElement('button');
    item.type = 'button';
    item.textContent = text;
    Object.assign(item.style, {
      border: '1px solid #48515e',
      borderRadius: '7px',
      padding: '6px 9px',
      background: '#252b33',
      color: '#eef1f5',
      cursor: 'pointer',
      font: '12px/1.2 system-ui, sans-serif',
    });
    item.addEventListener('click', handler);
    return item;
  }

  function createPanel() {
    panel = document.createElement('section');
    panel.setAttribute(ROOT_ATTRIBUTE, 'panel');
    Object.assign(panel.style, {
      position: 'fixed',
      right: '14px',
      bottom: '14px',
      zIndex: '2147483647',
      width: '340px',
      padding: '12px',
      border: '1px solid #48515e',
      borderRadius: '12px',
      background: '#15191f',
      color: '#eef1f5',
      boxShadow: '0 18px 48px rgba(0, 0, 0, .42)',
      font: '12px/1.45 system-ui, sans-serif',
    });

    const title = document.createElement('strong');
    title.textContent = `Original Style Probe v${PROBE_VERSION}`;
    title.style.display = 'block';
    title.style.marginBottom = '8px';

    const warning = document.createElement('div');
    const appearance = appearanceSnapshot();
    warning.textContent = appearance.customThemeDetected
      ? `WARNING: Soft Graphite ${appearance.detectedSoftGraphiteBuild} is still active.`
      : `Appearance: ${appearance.inferredAppearance}. No --sg-active-build token detected.`;
    Object.assign(warning.style, {
      marginBottom: '8px',
      color: appearance.customThemeDetected ? '#ffb4a8' : '#aeb8c4',
    });

    labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.value = 'default';
    labelInput.placeholder = 'capture label: default / hover / open';
    Object.assign(labelInput.style, {
      boxSizing: 'border-box',
      width: '100%',
      marginBottom: '8px',
      border: '1px solid #48515e',
      borderRadius: '7px',
      padding: '7px 8px',
      background: '#0f1318',
      color: '#eef1f5',
      font: '12px/1.2 system-ui, sans-serif',
    });

    const controls = document.createElement('div');
    Object.assign(controls.style, {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
      marginBottom: '8px',
    });
    controls.append(
      button('Pick element', () => (state.picking ? stopPicking() : startPicking())),
      button('Scan known UI', scanKnownTargets),
      button('Download JSON', downloadJson),
      button('Clear', () => {
        state.captures.length = 0;
        updateStatus('Captures cleared.');
      }),
      button('Close', destroy),
    );

    statusNode = document.createElement('div');
    statusNode.textContent = 'Ready. Disable UserCSS before collecting a baseline.';
    Object.assign(statusNode.style, {
      minHeight: '34px',
      color: '#aeb8c4',
      whiteSpace: 'normal',
    });

    const shortcuts = document.createElement('div');
    shortcuts.textContent = 'Alt+Shift+P picker · Alt+Shift+C capture hovered · Alt+Shift+J download';
    Object.assign(shortcuts.style, {
      marginTop: '6px',
      color: '#7f8a98',
      fontSize: '11px',
    });

    panel.append(title, warning, labelInput, controls, statusNode, shortcuts);
    /*
     * Stop page-level bubble handlers after the probe controls have received
     * the event. Using capture here would intercept the event before the
     * buttons themselves and make every control appear unresponsive.
     */
    panel.addEventListener('pointerdown', (event) => event.stopPropagation());
    panel.addEventListener('click', (event) => event.stopPropagation());
    document.documentElement.append(panel);

    highlight = document.createElement('div');
    highlight.setAttribute(ROOT_ATTRIBUTE, 'highlight');
    Object.assign(highlight.style, {
      position: 'fixed',
      display: 'none',
      zIndex: '2147483646',
      pointerEvents: 'none',
      border: '2px solid #63a5ff',
      background: 'rgba(99, 165, 255, .10)',
      boxSizing: 'border-box',
    });
    document.documentElement.append(highlight);
  }

  function destroy() {
    stopPicking();
    document.removeEventListener('pointermove', onDocumentPointerMove, true);
    document.removeEventListener('keydown', onKeyDown, true);
    panel?.remove();
    highlight?.remove();
    panel = null;
    highlight = null;
    if (window[GLOBAL_KEY]) delete window[GLOBAL_KEY];
    console.info('[Original Style Probe] Removed.');
  }

  buildRuleIndex();
  createPanel();
  document.addEventListener('pointermove', onDocumentPointerMove, true);
  document.addEventListener('keydown', onKeyDown, true);

  window[GLOBAL_KEY] = {
    version: PROBE_VERSION,
    state,
    rebuildRuleIndex: buildRuleIndex,
    capture: captureElement,
    scanKnownTargets,
    download: downloadJson,
    exportPayload,
    startPicking,
    stopPicking,
    destroy,
  };

  updateStatus(
    `Indexed ${state.indexedRuleCount} rules from ${state.indexedStyleSheetCount} stylesheets.`,
  );
})();

(() => {
  'use strict';

  const GAP_VERSION = '1.0.1';
  const BASE_KEY = '__chatgptOriginalStyleProbe';
  const GAP_KEY = '__chatgptOriginalStyleIntegratedProbe';
  const ROOT_ATTRIBUTE = 'data-chatgpt-original-style-integrated-probe';
  const BASE_ROOT_ATTRIBUTE = 'data-chatgpt-original-style-probe';

  if (window[GAP_KEY]?.destroy) {
    window[GAP_KEY].destroy();
  }

  const base = window[BASE_KEY];
  if (!base?.capture || !base?.exportPayload || !base?.state) {
    const message = 'Integrated probe engine initialization failed.';
    console.error(`[Original Style Integrated Probe] ${message}`);
    window.alert(message);
    return;
  }

  const EXPECTED_KEYS = [
    'sidebar-row-idle',
    'sidebar-row-selected',
    'sidebar-row-hover',
    'composer-shell',
    'composer-editor',
    'composer-editor-focus',
    'composer-action-idle',
    'composer-action-hover',
    'code-surface',
    'code-action-idle',
    'code-action-hover',
    'work-panel',
    'work-row-idle',
    'work-row-hover',
    'segmented-control',
    'segmented-option-selected',
    'segmented-option-unselected',
    'model-trigger-idle',
    'model-trigger-open',
    'model-listbox',
    'model-option-idle',
    'model-option-hover',
    'model-option-selected',
    'menu-surface',
    'menu-item-idle',
    'menu-item-hover',
    'menu-item-selected',
    'dialog-surface',
    'tooltip-surface',
  ];

  const state = {
    capturedKeys: new Set(),
    watching: true,
    hoveredElement: null,
    hoverTimer: null,
    observer: null,
    scanTimer: null,
    periodicTimer: null,
    postActionTimers: new Set(),
    semanticSignatures: new Set(),
    panel: null,
    status: null,
    checklist: null,
    basePanel: null,
    basePanelDisplay: '',
  };

  function isElement(value) {
    return value instanceof Element;
  }

  function isProbeElement(element) {
    return Boolean(
      element?.closest?.(`[${ROOT_ATTRIBUTE}], [${BASE_ROOT_ATTRIBUTE}]`),
    );
  }

  function visible(element) {
    if (!isElement(element) || isProbeElement(element)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) !== 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function allVisible(selector, root = document) {
    try {
      return [...root.querySelectorAll(selector)].filter(visible);
    } catch {
      return [];
    }
  }

  function firstVisible(selectors, root = document) {
    for (const selector of selectors) {
      const element = allVisible(selector, root)[0];
      if (element) return element;
    }
    return null;
  }

  function transparentColor(value) {
    return (
      !value ||
      value === 'transparent' ||
      value === 'rgba(0, 0, 0, 0)' ||
      value === 'hsla(0, 0%, 0%, 0)'
    );
  }

  function hasPaint(element) {
    if (!visible(element)) return false;
    const style = getComputedStyle(element);
    return Boolean(
      !transparentColor(style.backgroundColor) ||
      style.backgroundImage !== 'none' ||
      style.boxShadow !== 'none' ||
      style.outlineStyle !== 'none' ||
      [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth]
        .some((value) => Number.parseFloat(value) > 0),
    );
  }

  function nearestPaintOwner(element, maxDepth = 7) {
    let current = element;
    for (let depth = 0; current && depth <= maxDepth; depth += 1) {
      if (hasPaint(current)) return current;
      current = current.parentElement;
    }
    return element;
  }

  function paintedDescendant(root) {
    if (!isElement(root)) return null;
    const candidates = [root, ...root.querySelectorAll('*')]
      .filter((element) => {
        if (!visible(element) || !hasPaint(element)) return false;
        if (element.matches('button, input, textarea, [contenteditable="true"]')) return false;
        const rect = element.getBoundingClientRect();
        return rect.width >= 180 && rect.height >= 36;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const paintWeight =
          (!transparentColor(style.backgroundColor) ? 5 : 0) +
          (style.backgroundImage !== 'none' ? 3 : 0) +
          (style.boxShadow !== 'none' ? 2 : 0);
        return { element, score: paintWeight * 1_000_000 + rect.width * rect.height };
      })
      .sort((left, right) => right.score - left.score);
    return candidates[0]?.element || null;
  }

  function capture(key, element, detail = '') {
    if (!key || !visible(element) || state.capturedKeys.has(key)) return false;
    const suffix = detail ? `:${detail}` : '';
    base.capture(element, `gap:${key}${suffix}`);
    state.capturedKeys.add(key);
    renderStatus(`Captured ${key}.`);
    renderChecklist();
    return true;
  }

  function findSidebarRows() {
    const rows = allVisible(
      '#stage-slideover-sidebar a[data-sidebar-item="true"][href*="/c/"]',
    ).filter((element) => !element.hasAttribute('data-testid'));
    const selected = rows.find((element) => element.hasAttribute('data-active')) || null;
    const idle = rows.find((element) => !element.hasAttribute('data-active')) || null;
    capture('sidebar-row-selected', selected);
    capture('sidebar-row-idle', idle);
  }

  function findComposer() {
    const form = firstVisible([
      'form.group\\/composer',
      'form:has(#prompt-textarea)',
    ]);
    if (!form) return;
    capture('composer-shell', paintedDescendant(form) || nearestPaintOwner(form));
    const editor = firstVisible([
      '#prompt-textarea',
      '[contenteditable="true"][data-virtualkeyboard="true"]',
      'form.group\\/composer [contenteditable="true"]',
    ], form);
    capture('composer-editor', editor);
    const action = allVisible('button', form).find((button) => {
      const rect = button.getBoundingClientRect();
      return rect.width >= 24 && rect.height >= 24;
    });
    capture('composer-action-idle', action);
  }

  function findCodeBlock() {
    const pre = firstVisible(['pre', '#code-block-viewer']);
    if (!pre) return;
    const surface = nearestPaintOwner(pre, 8);
    capture('code-surface', surface);
    const action = allVisible('button', surface).find((button) => !button.contains(pre));
    capture('code-action-idle', action);
  }

  function findWorkPanel() {
    const panel = firstVisible([
      '#page-header aside:has(button.group\\/section-toggle)',
      '#page-header aside',
    ]);
    if (!panel) return;
    capture('work-panel', panel);
    const row = allVisible('ul > li > :is(button, a), a[role="link"]', panel)
      .find((element) => !element.matches('.group\\/section-toggle'));
    capture('work-row-idle', row);
  }

  function findSegmentedControl() {
    const group = firstVisible([
      '#page-header [role="group"]:has(button[role="radio"])',
      '[role="group"]:has(button[role="radio"])',
    ]);
    if (!group) return;
    capture('segmented-control', group);
    const selected = firstVisible(['button[role="radio"][aria-checked="true"]'], group);
    const unselected = firstVisible(['button[role="radio"][aria-checked="false"]'], group);
    capture('segmented-option-selected', selected);
    capture('segmented-option-unselected', unselected);
  }

  function findModelTrigger() {
    const trigger = firstVisible([
      '#page-header button[aria-haspopup="listbox"]',
      '#page-header button[aria-haspopup="menu"][aria-expanded]',
      'header button[aria-haspopup="listbox"]',
      'header button[aria-haspopup="menu"][aria-expanded]',
    ]);
    capture('model-trigger-idle', trigger);
    if (
      trigger &&
      (trigger.getAttribute('aria-expanded') === 'true' || trigger.getAttribute('data-state') === 'open')
    ) {
      capture('model-trigger-open', trigger);
    }
  }

  function scanOverlay(surface) {
    if (!visible(surface)) return;
    const role = surface.getAttribute('role');
    if (role === 'listbox') {
      capture('model-listbox', surface);
      const options = allVisible('[role="option"]', surface);
      capture('model-option-idle', options.find((option) => option.getAttribute('aria-selected') !== 'true'));
      capture('model-option-selected', options.find((option) => option.getAttribute('aria-selected') === 'true'));
      return;
    }
    if (role === 'menu' || surface.hasAttribute('data-radix-menu-content')) {
      capture('menu-surface', surface);
      const items = allVisible(
        '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]',
        surface,
      );
      capture(
        'menu-item-idle',
        items.find((item) =>
          item.getAttribute('aria-checked') !== 'true' &&
          item.getAttribute('aria-selected') !== 'true' &&
          item.getAttribute('data-state') !== 'checked'),
      );
      capture(
        'menu-item-selected',
        items.find((item) =>
          item.getAttribute('aria-checked') === 'true' ||
          item.getAttribute('aria-selected') === 'true' ||
          item.getAttribute('data-state') === 'checked'),
      );
      return;
    }
    if (role === 'dialog') capture('dialog-surface', surface);
    if (role === 'tooltip') capture('tooltip-surface', surface);
  }

  function scanOverlays() {
    allVisible(
      '[role="menu"], [role="listbox"], [role="dialog"], [role="tooltip"], [data-radix-menu-content], [data-radix-select-content]',
    ).forEach(scanOverlay);
    findModelTrigger();
  }

  function scanVisibleGaps() {
    findSidebarRows();
    findComposer();
    findCodeBlock();
    findWorkPanel();
    findSegmentedControl();
    findModelTrigger();
    scanOverlays();
    renderStatus(`Scan complete: known ${state.capturedKeys.size}/${EXPECTED_KEYS.length}, semantic ${state.semanticSignatures.size}.`);
    return coverage();
  }

  function classifyInteractive(element) {
    if (!visible(element)) return null;

    const sidebarRow = element.closest(
      '#stage-slideover-sidebar a[data-sidebar-item="true"][href*="/c/"]',
    );
    if (sidebarRow && !sidebarRow.hasAttribute('data-testid')) {
      return { key: 'sidebar-row-hover', element: sidebarRow };
    }

    const optionLike = element.closest(
      '[role="option"], [role="menuitemradio"], [role="menuitem"], [data-radix-collection-item]',
    );
    const optionOverlay = optionLike?.closest(
      '[role="listbox"], [role="menu"], [data-radix-select-content], [data-radix-menu-content]',
    );
    const openModelTrigger = firstVisible([
      '#page-header button[aria-haspopup="listbox"][aria-expanded="true"]',
      '#page-header button[aria-haspopup="menu"][aria-expanded="true"]',
      'header button[aria-haspopup="listbox"][aria-expanded="true"]',
      'header button[aria-haspopup="menu"][aria-expanded="true"]',
    ]);
    if (optionOverlay && optionLike && openModelTrigger) {
      return { key: 'model-option-hover', element: optionLike };
    }

    const menu = element.closest('[role="menu"], [data-radix-menu-content]');
    const menuItem = element.closest(
      '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [data-radix-collection-item]',
    );
    if (menu && menuItem) return { key: 'menu-item-hover', element: menuItem };

    const composer = element.closest('form.group\\/composer, form:has(#prompt-textarea)');
    const composerButton = element.closest('button');
    if (composer && composerButton) return { key: 'composer-action-hover', element: composerButton };

    const codeButton = element.closest('button');
    if (codeButton && codeButton.closest(':has(> pre), #code-block-viewer, [class~="overflow-clip"]')) {
      return { key: 'code-action-hover', element: codeButton };
    }

    const workPanel = element.closest('#page-header aside');
    const workRow = element.closest('ul > li > :is(button, a), a[role="link"]');
    if (workPanel && workRow && !workRow.matches('.group\\/section-toggle')) {
      return { key: 'work-row-hover', element: workRow };
    }

    return null;
  }

  function stateSignature(element) {
    const states = [];
    const attributes = [
      ['aria-expanded', 'expanded'],
      ['aria-selected', 'selected'],
      ['aria-checked', 'checked'],
      ['aria-current', 'current'],
      ['aria-pressed', 'pressed'],
      ['data-state', 'state'],
      ['data-highlighted', 'highlighted'],
      ['data-active', 'active'],
    ];
    for (const [name, label] of attributes) {
      if (!element.hasAttribute(name)) continue;
      const value = element.getAttribute(name);
      states.push(`${label}=${value === '' ? 'present' : value}`);
    }
    try {
      if (element.matches(':hover')) states.push('hover');
      if (element.matches(':focus')) states.push('focus');
      if (element.matches(':focus-visible')) states.push('focus-visible');
      if (element.matches(':active')) states.push('active-pseudo');
      if (element.matches(':disabled')) states.push('disabled');
    } catch {
      // Pseudo-class matching is best-effort.
    }
    return states.length ? states.join('+') : 'idle';
  }

  function semanticKind(element) {
    if (!isElement(element)) return null;
    if (element.matches('#prompt-textarea, [contenteditable="true"]')) return 'editor';
    if (element.matches('form.group\\/composer, form:has(#prompt-textarea)')) return 'composer';
    if (element.matches('#stage-slideover-sidebar')) return 'sidebar';
    if (element.matches('#page-header')) return 'page-header';
    if (element.matches('pre, #code-block-viewer')) return 'code';
    const role = element.getAttribute('role');
    if (role) return `role-${role}`;
    if (element.matches('button')) return 'button';
    if (element.matches('a')) return 'link';
    if (element.matches('input')) return `input-${element.getAttribute('type') || 'text'}`;
    if (element.matches('textarea')) return 'textarea';
    if (element.hasAttribute('aria-haspopup')) return 'popup-trigger';
    if (element.hasAttribute('data-state')) return 'stateful';
    return null;
  }

  function semanticClassSignature(element) {
    return [...element.classList]
      .filter((name) => !/^(css-|[a-z0-9]{8,}$)/i.test(name))
      .slice(0, 4)
      .join('.');
  }

  function captureSemantic(element, reason = 'visible') {
    if (!visible(element)) return false;
    const kind = semanticKind(element);
    if (!kind) return false;
    const signature = [
      kind,
      element.tagName.toLowerCase(),
      semanticClassSignature(element),
      stateSignature(element),
    ].join('|');
    if (state.semanticSignatures.has(signature)) return false;
    state.semanticSignatures.add(signature);
    base.capture(
      element,
      `integrated:${reason}:${kind}:${stateSignature(element)}:${state.semanticSignatures.size}`,
    );
    renderChecklist();
    return true;
  }

  function scanSemanticVisible() {
    const selectors = [
      '#stage-slideover-sidebar',
      '#stage-slideover-sidebar a[data-sidebar-item="true"]',
      '#page-header',
      '#page-header aside',
      'form.group\\/composer',
      'form:has(#prompt-textarea)',
      '#prompt-textarea',
      '[contenteditable="true"]',
      'pre',
      '#code-block-viewer',
      '[role="menu"]',
      '[role="listbox"]',
      '[role="dialog"]',
      '[role="tooltip"]',
      '[role="menuitem"]',
      '[role="menuitemradio"]',
      '[role="menuitemcheckbox"]',
      '[role="option"]',
      '[role="tab"]',
      '[role="radio"]',
      '[role="switch"]',
      '[role="checkbox"]',
      '[role="button"]',
      '[aria-haspopup]',
      '[aria-expanded]',
      '[aria-selected]',
      '[aria-checked]',
      '[aria-pressed]',
      '[data-state]',
      '[data-highlighted]',
      'button',
    ];
    for (const selector of selectors) {
      for (const element of allVisible(selector)) {
        captureSemantic(element, 'visible');
      }
    }
  }

  function scheduleFullScan(delay = 80) {
    clearTimeout(state.scanTimer);
    state.scanTimer = window.setTimeout(() => {
      if (!state.watching) return;
      scanVisibleGaps();
      scanSemanticVisible();
    }, delay);
  }

  function schedulePostActionScans() {
    for (const delay of [0, 60, 220, 700]) {
      const timer = window.setTimeout(() => {
        state.postActionTimers.delete(timer);
        if (state.watching) {
          scanVisibleGaps();
          scanSemanticVisible();
        }
      }, delay);
      state.postActionTimers.add(timer);
    }
  }

  function interactiveTarget(element) {
    return element?.closest?.(
      'button, a, input, textarea, select, [contenteditable="true"], [role="button"], [role="option"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="tab"], [role="radio"], [role="switch"], [role="checkbox"], [aria-haspopup]',
    ) || null;
  }

  function onPointerDown(event) {
    if (!state.watching || isProbeElement(event.target)) return;
    const target = interactiveTarget(event.target);
    if (target) captureSemantic(target, 'pointerdown');
    schedulePostActionScans();
  }

  function onClick(event) {
    if (!state.watching || isProbeElement(event.target)) return;
    const target = interactiveTarget(event.target);
    if (target) captureSemantic(target, 'click');
    schedulePostActionScans();
  }

  function onKeyInteraction(event) {
    if (!state.watching || isProbeElement(event.target)) return;
    const target = interactiveTarget(document.activeElement) || document.activeElement;
    if (isElement(target)) captureSemantic(target, `key-${event.key}`);
    schedulePostActionScans();
  }

  function onPointerMove(event) {
    if (!state.watching || isProbeElement(event.target)) return;
    state.hoveredElement = event.target;
    clearTimeout(state.hoverTimer);
    state.hoverTimer = window.setTimeout(() => {
      const target = classifyInteractive(state.hoveredElement);
      if (target) capture(target.key, target.element, 'auto-hover');
      const genericTarget = interactiveTarget(state.hoveredElement) || state.hoveredElement;
      if (isElement(genericTarget)) captureSemantic(genericTarget, 'hover');
    }, 180);
  }

  function onFocusIn(event) {
    if (!state.watching || isProbeElement(event.target)) return;
    const editor = event.target.closest?.(
      '#prompt-textarea, form.group\\/composer [contenteditable="true"]',
    );
    if (editor) capture('composer-editor-focus', editor, 'auto-focus');
    const focused = interactiveTarget(event.target) || event.target;
    if (isElement(focused)) captureSemantic(focused, 'focus');
    scheduleFullScan(40);
  }

  function scanMutationTarget(element) {
    if (!isElement(element) || isProbeElement(element)) return;
    if (
      element.getAttribute('aria-expanded') === 'true' ||
      element.getAttribute('data-state') === 'open'
    ) {
      const trigger = element.closest('button[aria-haspopup], [role="button"][aria-haspopup]');
      if (trigger) capture('model-trigger-open', trigger, 'attribute-open');
    }
    captureSemantic(element, 'attribute-change');
    scanOverlays();
    scheduleFullScan(60);
  }

  function startObserver() {
    state.observer = new MutationObserver((mutations) => {
      if (!state.watching) return;
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') scanMutationTarget(mutation.target);
        for (const node of mutation.addedNodes || []) {
          if (isElement(node)) scanMutationTarget(node);
        }
      }
    });
    state.observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        'aria-expanded',
        'aria-selected',
        'aria-checked',
        'data-state',
        'data-highlighted',
      ],
    });
  }

  function coverage() {
    const capturedKeys = [...state.capturedKeys].sort();
    return {
      expectedKeys: EXPECTED_KEYS,
      capturedKeys,
      missingKeys: EXPECTED_KEYS.filter((key) => !state.capturedKeys.has(key)),
    };
  }

  function downloadGapJson() {
    const basePayload = base.exportPayload();
    const report = {
      schema: 'chatgpt-original-style-integrated-probe/v1',
      integratedProbeVersion: GAP_VERSION,
      generatedAt: new Date().toISOString(),
      automation: {
        visibleAutoCapture: true,
        mutationAutoCapture: true,
        hoverAutoCapture: true,
        focusAutoCapture: true,
        pointerAndClickAutoCapture: true,
        keyboardAutoCapture: true,
        periodicRescanMilliseconds: 1200,
        semanticCaptureLimit: null,
        semanticCaptureDeduplication: true,
      },
      knownCoverage: coverage(),
      semanticCaptureCount: state.semanticSignatures.size,
      baseProbeReport: basePayload,
    };
    const appearance = basePayload.session.appearance.inferredAppearance;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `chatgpt-original-style-integrated-${appearance}-${stamp}.json`;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    renderStatus(`Downloaded ${filename}.`);
    return report;
  }

  function reset() {
    base.state.captures.length = 0;
    state.capturedKeys.clear();
    state.semanticSignatures.clear();
    renderChecklist();
    renderStatus('Integrated captures cleared.');
  }

  function button(text, handler) {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = text;
    Object.assign(element.style, {
      border: '1px solid #48515e',
      borderRadius: '7px',
      padding: '6px 9px',
      background: '#252b33',
      color: '#eef1f5',
      cursor: 'pointer',
      font: '12px/1.2 system-ui, sans-serif',
    });
    element.addEventListener('click', handler);
    return element;
  }

  function renderStatus(message) {
    if (state.status) state.status.textContent = message;
    console.info(`[Original Style Integrated Probe] ${message}`);
  }

  function renderChecklist() {
    if (!state.checklist) return;
    const missing = EXPECTED_KEYS.filter((key) => !state.capturedKeys.has(key));
    state.checklist.textContent = missing.length
      ? `Known coverage ${EXPECTED_KEYS.length - missing.length}/${EXPECTED_KEYS.length} · semantic signatures ${state.semanticSignatures.size} · unresolved: ${missing.join(', ')}`
      : `Known coverage complete · semantic signatures ${state.semanticSignatures.size}.`;
  }

  function onKeyDown(event) {
    if (!(event.altKey && event.shiftKey)) return;
    const key = event.key.toLowerCase();
    if (key === 'k') {
      event.preventDefault();
      scanVisibleGaps();
    }
    if (key === 'g') {
      const target = classifyInteractive(state.hoveredElement);
      if (target) {
        event.preventDefault();
        capture(target.key, target.element, 'manual-hover');
      }
    }
    if (key === 'u') {
      event.preventDefault();
      downloadGapJson();
    }
  }

  function createPanel() {
    state.basePanel = document.querySelector(`[${BASE_ROOT_ATTRIBUTE}="panel"]`);
    if (state.basePanel) {
      state.basePanelDisplay = state.basePanel.style.display;
      state.basePanel.style.display = 'none';
    }

    const panel = document.createElement('section');
    panel.setAttribute(ROOT_ATTRIBUTE, 'panel');
    Object.assign(panel.style, {
      position: 'fixed',
      right: '14px',
      bottom: '14px',
      zIndex: '2147483647',
      width: '420px',
      maxHeight: '70vh',
      overflow: 'auto',
      padding: '12px',
      border: '1px solid #586574',
      borderRadius: '12px',
      background: '#15191f',
      color: '#eef1f5',
      boxShadow: '0 18px 48px rgba(0, 0, 0, .42)',
      font: '12px/1.45 system-ui, sans-serif',
    });

    const title = document.createElement('strong');
    title.textContent = `Original Style Integrated Probe v${GAP_VERSION}`;
    title.style.display = 'block';
    title.style.marginBottom = '7px';

    const guide = document.createElement('div');
    guide.textContent =
      'Visible UI and interaction states are captured automatically. Open each menu, dialog, tooltip, and route you want included, then download the JSON.';
    Object.assign(guide.style, { color: '#b8c2ce', marginBottom: '8px' });

    const controls = document.createElement('div');
    Object.assign(controls.style, {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
      marginBottom: '8px',
    });

    const watchButton = button('State watch: ON', () => {
      state.watching = !state.watching;
      watchButton.textContent = `State watch: ${state.watching ? 'ON' : 'OFF'}`;
      renderStatus(`State watch ${state.watching ? 'enabled' : 'disabled'}.`);
    });

    controls.append(
      button('Scan now', scanVisibleGaps),
      watchButton,
      button('Download JSON', downloadGapJson),
      button('Clear', reset),
      button('Close', destroy),
    );

    state.status = document.createElement('div');
    state.status.textContent = 'Ready. Automatic visible and interaction capture is active.';
    Object.assign(state.status.style, {
      minHeight: '22px',
      color: '#aeb8c4',
      marginBottom: '6px',
    });

    state.checklist = document.createElement('div');
    Object.assign(state.checklist.style, {
      color: '#8793a2',
      fontSize: '11px',
      overflowWrap: 'anywhere',
    });

    const shortcuts = document.createElement('div');
    shortcuts.textContent = 'Alt+Shift+K scan · Alt+Shift+G capture hovered · Alt+Shift+U download';
    Object.assign(shortcuts.style, {
      marginTop: '7px',
      color: '#788493',
      fontSize: '11px',
    });

    panel.append(title, guide, controls, state.status, state.checklist, shortcuts);
    panel.addEventListener('pointerdown', (event) => event.stopPropagation());
    panel.addEventListener('click', (event) => event.stopPropagation());
    document.documentElement.append(panel);
    state.panel = panel;
    renderChecklist();
  }

  function destroy() {
    clearTimeout(state.hoverTimer);
    clearTimeout(state.scanTimer);
    clearInterval(state.periodicTimer);
    for (const timer of state.postActionTimers) clearTimeout(timer);
    state.postActionTimers.clear();
    state.observer?.disconnect();
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keyup', onKeyInteraction, true);
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('keydown', onKeyDown, true);
    state.panel?.remove();
    if (state.basePanel) state.basePanel.style.display = state.basePanelDisplay;
    if (window[GAP_KEY]) delete window[GAP_KEY];
    console.info('[Original Style Integrated Probe] Removed.');
  }

  reset();
  base.rebuildRuleIndex();
  createPanel();
  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyInteraction, true);
  startObserver();
  scanVisibleGaps();
  scanSemanticVisible();
  state.periodicTimer = window.setInterval(() => {
    if (!state.watching || document.visibilityState !== 'visible') return;
    scanVisibleGaps();
    scanSemanticVisible();
  }, 1200);

  window[GAP_KEY] = {
    version: GAP_VERSION,
    state,
    scanVisibleGaps,
    scanSemanticVisible,
    download: downloadGapJson,
    coverage,
    reset,
    destroy,
  };
})();

(() => {
  'use strict';

  const VERSION = '2.0.1';
  const BASE_KEY = '__chatgptOriginalStyleProbe';
  const INTEGRATED_KEY = '__chatgptOriginalStyleIntegratedProbe';
  const UNIFIED_KEY = '__chatgptUnifiedStyleProbe';
  const PANEL_SELECTOR = '[data-chatgpt-original-style-integrated-probe="panel"]';
  const PREVIEW_ID = 'chatgpt-unified-style-probe-preview';

  window[UNIFIED_KEY]?.destroy?.();

  const base = window[BASE_KEY];
  const integrated = window[INTEGRATED_KEY];
  const panel = document.querySelector(PANEL_SELECTOR);
  if (!base?.capture || !base?.exportPayload || !integrated?.state || !panel) {
    console.error('[Unified Style Probe] Base probe initialization failed.');
    return;
  }

  const state = {
    destroyed: false,
    lastSignatures: new Map(),
    observer: null,
    periodicTimer: null,
    scanTimer: null,
    burstTimers: new Set(),
    previewStyle: null,
    previewMode: null,
    watchingBeforePreview: true,
    header: null,
    environment: null,
    previewButton: null,
    restoreButton: null,
    drag: null,
  };

  const isTopLevel = (() => {
    try {
      return window.top === window;
    } catch {
      return false;
    }
  })();

  const visible = (element) => {
    if (!(element instanceof Element) || element.closest(PANEL_SELECTOR)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 1 &&
      rect.height > 1 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) !== 0
    );
  };

  const transparent = (value) => (
    !value ||
    value === 'transparent' ||
    value === 'rgba(0, 0, 0, 0)' ||
    value === 'hsla(0, 0%, 0%, 0)'
  );

  const sanitizeUrl = (value) => {
    if (!value) return null;
    try {
      const url = new URL(value, location.href);
      const path = url.pathname
        .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
        .replace(/\/c\/[^/]+/g, '/c/:conversation')
        .replace(/\/g\/[^/]+/g, '/g/:gpt')
        .replace(/\/project\/[^/]+/g, '/project/:id');
      return `${url.origin}${path}`;
    } catch {
      return 'unparseable';
    }
  };

  const roundedRect = (element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.x * 100) / 100,
      y: Math.round(rect.y * 100) / 100,
      width: Math.round(rect.width * 100) / 100,
      height: Math.round(rect.height * 100) / 100,
      right: Math.round(rect.right * 100) / 100,
      bottom: Math.round(rect.bottom * 100) / 100,
    };
  };

  const paintSummary = (element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      color: style.color,
      borderColor: style.borderColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      opacity: style.opacity,
      filter: style.filter,
      backdropFilter: style.backdropFilter || style.webkitBackdropFilter || '',
      overflow: style.overflow,
      overflowY: style.overflowY,
      position: style.position,
    };
  };

  const elementSummary = (element) => {
    if (!visible(element)) return null;
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      role: element.getAttribute('role'),
      dataTestId: element.getAttribute('data-testid'),
      className: typeof element.className === 'string' ? element.className : null,
      rect: roundedRect(element),
      paint: paintSummary(element),
    };
  };

  const signatureFor = (element) => JSON.stringify({
    element: elementSummary(element),
    state: {
      open: element.getAttribute('data-state'),
      expanded: element.getAttribute('aria-expanded'),
      selected: element.getAttribute('aria-selected'),
    },
  });

  const captureOnce = (label, element) => {
    if (!visible(element) || !integrated.state.watching || state.previewMode) return null;
    const signature = signatureFor(element);
    if (state.lastSignatures.get(label) === signature) return null;
    state.lastSignatures.set(label, signature);
    try {
      return base.capture(element, `unified:${label}`);
    } catch (error) {
      console.warn(`[Unified Style Probe] Capture failed for ${label}.`, error);
      return null;
    }
  };

  const allVisible = (selector, root = document) => {
    try {
      return [...root.querySelectorAll(selector)].filter(visible);
    } catch {
      return [];
    }
  };

  const activityTargets = () => {
    const stage = allVisible('[data-testid="stage-thread-flyout"]')[0] || null;
    const root = stage || document;
    const screen = allVisible('[data-testid="screen-threadFlyOut"]', root)[0] || null;
    const searchRoot = screen || stage || document;
    const primarySurfaces = allVisible(
      '[class~="bg-token-main-surface-primary"]',
      searchRoot,
    );
    const scrollSurface = primarySurfaces.find((element) => {
      const overflowY = getComputedStyle(element).overflowY;
      return overflowY === 'auto' || overflowY === 'scroll';
    }) || null;
    const contentSurface = primarySurfaces.find((element) => {
      if (element === scrollSurface) return false;
      const rect = element.getBoundingClientRect();
      return rect.width >= 220 && rect.height >= 100;
    }) || null;

    const cardCandidates = stage
      ? allVisible('article, section, pre, div', stage)
        .filter((element) => {
          if (
            element === stage ||
            element === screen ||
            primarySurfaces.includes(element)
          ) return false;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const painted = !transparent(style.backgroundColor) || style.backgroundImage !== 'none';
          return (
            painted &&
            rect.width >= 170 &&
            rect.height >= 44 &&
            rect.width <= Math.max(440, stage.getBoundingClientRect().width) &&
            parseFloat(style.borderRadius || '0') >= 6
          );
        })
        .sort((left, right) => {
          const l = left.getBoundingClientRect();
          const r = right.getBoundingClientRect();
          return (r.width * r.height) - (l.width * l.height);
        })
        .slice(0, 8)
      : [];

    return { stage, screen, primarySurfaces, scrollSurface, contentSurface, cardCandidates };
  };

  const captureActivity = () => {
    const targets = activityTargets();
    captureOnce('activity-stage', targets.stage);
    captureOnce('activity-screen', targets.screen);
    captureOnce('activity-scroll-surface', targets.scrollSurface);
    captureOnce('activity-content-surface', targets.contentSurface);
    targets.primarySurfaces.slice(0, 6).forEach((element, index) => {
      captureOnce(`activity-primary-surface-${index + 1}`, element);
    });
    targets.cardCandidates.forEach((element, index) => {
      captureOnce(`activity-card-${index + 1}`, element);
    });
    return targets;
  };

  const frameInventory = () => allVisible('iframe').map((frame, index) => {
    let sameOrigin = false;
    let childLocation = null;
    try {
      childLocation = frame.contentWindow.location.href;
      sameOrigin = true;
    } catch {}
    captureOnce(`iframe-${index + 1}`, frame);
    captureOnce(`iframe-shell-${index + 1}`, frame.parentElement || frame);
    return {
      ...elementSummary(frame),
      src: sanitizeUrl(frame.getAttribute('src')),
      sameOrigin,
      childLocation: sameOrigin ? sanitizeUrl(childLocation) : null,
      sandbox: frame.getAttribute('sandbox'),
      allow: frame.getAttribute('allow'),
    };
  });

  const frameTargets = () => {
    if (isTopLevel) return { roots: [], surfaces: [], cards: [] };
    const roots = [document.documentElement, document.body].filter(visible);
    const surfaces = allVisible('main, section, article, pre, div')
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          rect.width >= 140 &&
          rect.height >= 40 &&
          (!transparent(style.backgroundColor) || style.backgroundImage !== 'none')
        );
      })
      .sort((left, right) => {
        const l = left.getBoundingClientRect();
        const r = right.getBoundingClientRect();
        return (r.width * r.height) - (l.width * l.height);
      })
      .slice(0, 12);
    const cards = surfaces
      .filter((element) => parseFloat(getComputedStyle(element).borderRadius || '0') >= 6)
      .slice(0, 8);
    return { roots, surfaces, cards };
  };

  const captureFrameContext = () => {
    const targets = frameTargets();
    targets.roots.forEach((element, index) => captureOnce(`frame-root-${index + 1}`, element));
    targets.surfaces.forEach((element, index) => captureOnce(`frame-surface-${index + 1}`, element));
    targets.cards.forEach((element, index) => captureOnce(`frame-card-${index + 1}`, element));
    return targets;
  };

  const scan = () => {
    if (state.destroyed || state.previewMode || !integrated.state.watching) return;
    integrated.scanVisibleGaps?.();
    integrated.scanSemanticVisible?.();
    if (isTopLevel) {
      captureActivity();
      frameInventory();
    } else {
      captureFrameContext();
    }
  };

  const scheduleScan = (delay = 80) => {
    clearTimeout(state.scanTimer);
    state.scanTimer = window.setTimeout(scan, delay);
  };

  const activitySummary = () => {
    if (!isTopLevel) return null;
    const targets = activityTargets();
    return {
      stage: elementSummary(targets.stage),
      screen: elementSummary(targets.screen),
      scrollSurface: elementSummary(targets.scrollSurface),
      contentSurface: elementSummary(targets.contentSurface),
      primarySurfaces: targets.primarySurfaces.slice(0, 8).map(elementSummary),
      cards: targets.cardCandidates.map(elementSummary),
    };
  };

  const frameContextSummary = () => {
    if (isTopLevel) return null;
    const targets = frameTargets();
    return {
      roots: targets.roots.map(elementSummary),
      surfaces: targets.surfaces.map(elementSummary),
      cards: targets.cards.map(elementSummary),
    };
  };

  const previewCss = () => isTopLevel ? `
    [data-testid="stage-thread-flyout"],
    [data-testid="stage-thread-flyout"]
      [data-testid="screen-threadFlyOut"]
      > [class~="bg-token-main-surface-primary"],
    [data-testid="stage-thread-flyout"]
      [data-testid="screen-threadFlyOut"]
      > [class~="bg-token-main-surface-primary"]
      > [class~="bg-token-main-surface-primary"] {
      background-color: #1e1f20 !important;
      background-image: none !important;
      box-shadow: none !important;
    }
    [data-testid="stage-thread-flyout"]
      [data-testid="screen-threadFlyOut"] {
      border-color: #2a2c2e !important;
    }
  ` : `
    :root {
      --main-surface-background: #1e1f20 !important;
      --main-surface-primary: #1e1f20 !important;
      --main-surface-secondary: #2d3030 !important;
      --main-surface-tertiary: #393a3e !important;
      --surface-primary: #1e1f20 !important;
      --surface-secondary: #2d3030 !important;
      --surface-tertiary: #393a3e !important;
      --text-primary: #e7e9ec !important;
      --text-secondary: #a7aaac !important;
      --text-tertiary: #8e9295 !important;
      --border-default: #2a2c2e !important;
      --border-light: rgba(255,255,255,.06) !important;
      --code-block-surface: #1a1b1c !important;
    }
    html, body {
      background-color: #1e1f20 !important;
      color: #e7e9ec !important;
    }
  `;

  const updateWatchLabel = () => {
    const button = [...panel.querySelectorAll('button')]
      .find((candidate) => /State watch|自動収集/.test(candidate.textContent));
    if (button) button.textContent = `自動収集: ${integrated.state.watching ? 'ON' : 'OFF'}`;
  };

  const renderStatus = (message) => {
    const status = integrated.state.status;
    if (status) status.textContent = message;
    console.info(`[Unified Style Probe] ${message}`);
  };

  const restorePreview = ({ silent = false } = {}) => {
    state.previewStyle?.remove();
    state.previewStyle = null;
    const hadPreview = Boolean(state.previewMode);
    state.previewMode = null;
    if (hadPreview) integrated.state.watching = state.watchingBeforePreview;
    updateWatchLabel();
    if (!silent && hadPreview) {
      renderStatus('プレビューを解除し、自動収集を再開しました。');
      scheduleScan(80);
    }
  };

  const applyPreview = () => {
    restorePreview({ silent: true });
    state.watchingBeforePreview = integrated.state.watching;
    integrated.state.watching = false;
    updateWatchLabel();
    const style = document.createElement('style');
    style.id = PREVIEW_ID;
    style.textContent = previewCss();
    document.documentElement.append(style);
    state.previewStyle = style;
    state.previewMode = isTopLevel ? 'activity' : 'frame';
    renderStatus('Soft Graphiteプレビューを適用しました。自動収集は一時停止中です。');
  };

  const download = () => {
    const basePayload = base.exportPayload();
    const report = {
      schema: 'chatgpt-unified-style-probe/v2',
      unifiedProbeVersion: VERSION,
      baseProbeVersion: base.version,
      integratedProbeVersion: integrated.version,
      generatedAt: new Date().toISOString(),
      privacy: {
        textContentCaptured: false,
        documentTitleCaptured: false,
        fullHrefCaptured: false,
        queryStringCaptured: false,
        cookiesOrStorageCaptured: false,
      },
      automation: {
        startsAutomatically: true,
        startupBurstMilliseconds: [0, 150, 500, 1200],
        periodicRescanMilliseconds: 1200,
        mutationRescan: true,
        interactionRescan: true,
        scrollAndResizeRescan: true,
        activityFlyoutCapture: true,
        iframeInventory: true,
        previewPausesCollection: true,
      },
      context: {
        isTopLevel,
        origin: location.origin,
        location: sanitizeUrl(location.href),
      },
      preview: {
        enabled: Boolean(state.previewMode),
        mode: state.previewMode,
        collectionPaused: Boolean(state.previewMode),
      },
      knownCoverage: integrated.coverage?.() || null,
      semanticCaptureCount: integrated.state.semanticSignatures?.size || 0,
      activity: activitySummary(),
      frames: isTopLevel ? frameInventory() : [],
      frameContext: frameContextSummary(),
      baseProbeReport: basePayload,
    };
    const appearance = basePayload.session.appearance.inferredAppearance;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `chatgpt-unified-style-probe-${appearance}-${stamp}.json`;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    renderStatus(`保存しました: ${filename}`);
    return report;
  };

  const clampPanelToViewport = () => {
    if (!panel.isConnected) return;
    const rect = panel.getBoundingClientRect();
    const left = Math.min(Math.max(0, rect.left), Math.max(0, innerWidth - rect.width));
    const top = Math.min(Math.max(0, rect.top), Math.max(0, innerHeight - 42));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  };

  const onDragMove = (event) => {
    if (!state.drag || event.pointerId !== state.drag.pointerId) return;
    const left = state.drag.left + event.clientX - state.drag.x;
    const top = state.drag.top + event.clientY - state.drag.y;
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    clampPanelToViewport();
  };

  const stopDrag = (event) => {
    if (!state.drag || (event && event.pointerId !== state.drag.pointerId)) return;
    state.header.style.cursor = 'grab';
    state.drag = null;
    window.removeEventListener('pointermove', onDragMove, true);
    window.removeEventListener('pointerup', stopDrag, true);
    window.removeEventListener('pointercancel', stopDrag, true);
  };

  const startDrag = (event) => {
    if (event.button !== 0 || event.target.closest('button, input, a, select, textarea')) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = panel.getBoundingClientRect();
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    state.drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: rect.left,
      top: rect.top,
    };
    state.header.style.cursor = 'grabbing';
    window.addEventListener('pointermove', onDragMove, true);
    window.addEventListener('pointerup', stopDrag, true);
    window.addEventListener('pointercancel', stopDrag, true);
  };

  const buttonStyle = (button) => Object.assign(button.style, {
    border: '1px solid #48515e',
    borderRadius: '7px',
    padding: '6px 9px',
    background: '#252b33',
    color: '#eef1f5',
    cursor: 'pointer',
    font: '12px/1.2 system-ui, sans-serif',
  });

  const patchPanel = () => {
    const title = panel.querySelector('strong');
    const guide = title?.nextElementSibling;
    const controls = [...panel.children].find((element) => element.querySelector?.('button'));
    if (!title || !guide || !controls) return;

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      margin: '-4px -4px 8px',
      padding: '6px 6px 9px',
      borderBottom: '1px solid #303844',
      cursor: 'grab',
      userSelect: 'none',
      touchAction: 'none',
    });
    title.textContent = `Unified Style Probe v${VERSION}`;
    title.style.margin = '0';
    const dragHint = document.createElement('span');
    dragHint.textContent = 'ドラッグで移動';
    Object.assign(dragHint.style, { color: '#788493', fontSize: '10px', fontWeight: '400' });
    title.replaceWith(header);
    header.append(title, dragHint);
    header.addEventListener('pointerdown', startDrag);
    state.header = header;

    guide.textContent = '起動直後から自動収集します。対象UIを表示・操作したあと、JSONを保存してください。';

    const appearance = base.exportPayload().session.appearance;
    const environment = document.createElement('div');
    environment.textContent = appearance.customThemeDetected
      ? `警告: Soft Graphite ${appearance.detectedSoftGraphiteBuild || ''} が有効です。デフォルト収集では無効化してください。`
      : `Context: ${isTopLevel ? 'top page' : 'iframe'} · ${appearance.inferredAppearance}`;
    Object.assign(environment.style, {
      marginBottom: '8px',
      color: appearance.customThemeDetected ? '#ffb4a8' : '#9aa6b4',
      fontSize: '11px',
    });
    guide.insertAdjacentElement('afterend', environment);
    state.environment = environment;

    const buttons = [...controls.querySelectorAll('button')];
    const scanButton = buttons.find((button) => button.textContent === 'Scan now');
    const watchButton = buttons.find((button) => button.textContent.startsWith('State watch'));
    const downloadButton = buttons.find((button) => button.textContent === 'Download JSON');
    const clearButton = buttons.find((button) => button.textContent === 'Clear');
    const closeButton = buttons.find((button) => button.textContent === 'Close');

    if (scanButton) {
      scanButton.textContent = '再スキャン';
      scanButton.addEventListener('click', () => scheduleScan(20));
    }
    if (watchButton) {
      updateWatchLabel();
      watchButton.addEventListener('click', () => window.setTimeout(updateWatchLabel));
    }
    if (clearButton) clearButton.textContent = 'クリア';

    if (downloadButton) {
      const replacement = downloadButton.cloneNode(true);
      replacement.textContent = 'JSON保存';
      replacement.addEventListener('click', download);
      downloadButton.replaceWith(replacement);
    }

    const previewButton = document.createElement('button');
    previewButton.type = 'button';
    previewButton.textContent = 'Soft Graphiteプレビュー';
    buttonStyle(previewButton);
    previewButton.addEventListener('click', applyPreview);
    controls.append(previewButton);
    state.previewButton = previewButton;

    const restoreButton = document.createElement('button');
    restoreButton.type = 'button';
    restoreButton.textContent = 'プレビュー解除';
    buttonStyle(restoreButton);
    restoreButton.addEventListener('click', () => restorePreview());
    controls.append(restoreButton);
    state.restoreButton = restoreButton;

    if (closeButton) {
      const replacement = closeButton.cloneNode(true);
      replacement.textContent = '閉じる';
      replacement.addEventListener('click', () => {
        destroy({ removePanel: false });
        integrated.destroy?.();
        base.destroy?.();
      });
      closeButton.replaceWith(replacement);
    }

    const shortcuts = panel.lastElementChild;
    if (shortcuts) shortcuts.textContent = '基本操作: 起動 → UIを表示・操作 → JSON保存';
  };

  const onActivityMutation = () => scheduleScan(70);
  const onInteraction = () => scheduleScan(50);
  const onViewportChange = () => {
    clampPanelToViewport();
    scheduleScan(120);
  };

  function destroy({ removePanel = true } = {}) {
    if (state.destroyed) return;
    state.destroyed = true;
    clearTimeout(state.scanTimer);
    clearInterval(state.periodicTimer);
    for (const timer of state.burstTimers) clearTimeout(timer);
    state.burstTimers.clear();
    state.observer?.disconnect();
    restorePreview({ silent: true });
    stopDrag();
    document.removeEventListener('click', onInteraction, true);
    document.removeEventListener('keyup', onInteraction, true);
    document.removeEventListener('focusin', onInteraction, true);
    document.removeEventListener('scroll', onViewportChange, true);
    window.removeEventListener('resize', onViewportChange);
    if (removePanel) panel.remove();
    if (window[UNIFIED_KEY]) delete window[UNIFIED_KEY];
  }

  patchPanel();
  integrated.version = VERSION;
  integrated.download = download;
  integrated.applyPreview = applyPreview;
  integrated.restorePreview = restorePreview;

  state.observer = new MutationObserver(onActivityMutation);
  state.observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [
      'class',
      'style',
      'aria-expanded',
      'aria-selected',
      'aria-checked',
      'data-state',
      'data-testid',
      'open',
    ],
  });
  document.addEventListener('click', onInteraction, true);
  document.addEventListener('keyup', onInteraction, true);
  document.addEventListener('focusin', onInteraction, true);
  document.addEventListener('scroll', onViewportChange, true);
  window.addEventListener('resize', onViewportChange);

  scan();
  for (const delay of [150, 500, 1200]) {
    const timer = window.setTimeout(() => {
      state.burstTimers.delete(timer);
      scan();
    }, delay);
    state.burstTimers.add(timer);
  }
  state.periodicTimer = window.setInterval(scan, 1200);

  window[UNIFIED_KEY] = {
    version: VERSION,
    state,
    scan,
    download,
    applyPreview,
    restorePreview,
    activitySummary,
    frameInventory,
    destroy,
  };

  renderStatus('自動収集を開始しました。');
})();

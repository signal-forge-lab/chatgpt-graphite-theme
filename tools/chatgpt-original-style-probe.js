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

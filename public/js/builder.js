/* ============================================================
   FormCraft Builder — with Tabbed Forms
   ============================================================ */

(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────
  // tabs: [{ id, name, fields: [] }]
  let tabs = [{ id: 't' + Math.random().toString(36).substr(2, 7), name: 'Tab 1', icon: '', fields: [] }];
  let activeTabId = tabs[0].id;
  let selectedId = null;
  let dragSource = null;
  let dragField = null;
  let dropIndex = null;
  let formId = null;
  let previewTemplate = 'horizontal-tabs';
  let previewWidth = 'md';
  let previewStyle = { border: true, shadow: true, rounded: true };
  let history = [];
  let historyIndex = -1;
  const MAX_HISTORY = 50;

  // ── DOM Refs ─────────────────────────────────────────────
  const canvas = document.getElementById('formCanvas');
  const canvasEmpty = document.getElementById('canvasEmpty');
  const propsForm = document.getElementById('propsForm');
  const propsEmpty = document.getElementById('propsEmpty');
  const selectedTypeEl = document.getElementById('selectedType');
  const fieldCountEl = document.getElementById('fieldCount');
  const formNameInput = document.getElementById('formName');
  const formTabsBar = document.getElementById('formTabsBar');

  // ── Field Definitions ────────────────────────────────────
  // Common attributes that apply to most input fields
  const COMMON_INPUT_DEFAULTS = {
    name: '',
    defaultValue: '',
    helpText: '',
    readonly: false,
    disabled: false,
    autocomplete: '',
    conditional: { enabled: false, action: 'show', field: '', operator: 'equals', value: '' }
  };

  const FIELD_DEFAULTS = {
    text:          { label: 'Text Input',    placeholder: 'Enter text…',       required: false, width: 'full', ...COMMON_INPUT_DEFAULTS, autocomplete: 'off' },
    email:         { label: 'Email Address', placeholder: 'you@example.com',   required: false, width: 'full', ...COMMON_INPUT_DEFAULTS, autocomplete: 'email' },
    number:        { label: 'Number',        placeholder: '0',                  required: false, width: 'full', min: '', max: '', step: '1', ...COMMON_INPUT_DEFAULTS },
    password:      { label: 'Password',      placeholder: '••••••••',          required: false, width: 'full', ...COMMON_INPUT_DEFAULTS, autocomplete: 'new-password' },
    tel:           { label: 'Phone Number',  placeholder: '+1 (555) 000-0000', required: false, width: 'full', ...COMMON_INPUT_DEFAULTS, autocomplete: 'tel' },
    url:           { label: 'Website URL',   placeholder: 'https://',           required: false, width: 'full', ...COMMON_INPUT_DEFAULTS, autocomplete: 'url' },
    textarea:      { label: 'Message',       placeholder: 'Enter your message…', required: false, rows: 4, width: 'full', ...COMMON_INPUT_DEFAULTS },
    richtext:      { label: 'Rich Text',     placeholder: 'Start typing…',      required: false, width: 'full', ...COMMON_INPUT_DEFAULTS },
    select:        { label: 'Dropdown',      placeholder: 'Select an option',    required: false, width: 'full', options: ['Option 1', 'Option 2', 'Option 3'], ...COMMON_INPUT_DEFAULTS },
    multiselect:   { label: 'Multi-Select',  placeholder: 'Select options',      required: false, width: 'full', options: ['Option 1', 'Option 2', 'Option 3'], ...COMMON_INPUT_DEFAULTS },
    radio:         { label: 'Choose One',    required: false, width: 'full', options: ['Option 1', 'Option 2', 'Option 3'], ...COMMON_INPUT_DEFAULTS },
    checkbox:      { label: 'I agree to the terms',  required: false, width: 'full', ...COMMON_INPUT_DEFAULTS, defaultChecked: false },
    checkboxgroup: { label: 'Select All That Apply', required: false, width: 'full', options: ['Option 1', 'Option 2', 'Option 3'], ...COMMON_INPUT_DEFAULTS, defaultValue: [] },
    toggle:        { label: 'Enable notifications', required: false, width: 'full', defaultOn: false, ...COMMON_INPUT_DEFAULTS },
    date:          { label: 'Date',          required: false, width: 'full', min: '', max: '', ...COMMON_INPUT_DEFAULTS },
    time:          { label: 'Time',          required: false, width: 'full', ...COMMON_INPUT_DEFAULTS },
    'datetime-local': { label: 'Date & Time', required: false, width: 'full', ...COMMON_INPUT_DEFAULTS },
    range:         { label: 'Slider',        required: false, width: 'full', min: 0, max: 100, step: 1, defaultVal: 50, ...COMMON_INPUT_DEFAULTS },
    rangeslider:   { label: 'Range Slider',   required: false, width: 'full', min: 0, max: 100, step: 1, defaultMin: 25, defaultMax: 75, ...COMMON_INPUT_DEFAULTS },
    rating:        { label: 'Rating',        required: false, width: 'full', maxStars: 5, ...COMMON_INPUT_DEFAULTS },
    file:          { label: 'File Upload',   required: false, width: 'full', accept: '', multiple: false, maxSize: '', ...COMMON_INPUT_DEFAULTS },
    color:         { label: 'Color',         required: false, width: 'full', defaultVal: '#5b54e6', ...COMMON_INPUT_DEFAULTS },
    heading:       { text: 'Section Heading', level: 'h2', width: 'full', conditional: { enabled: false, action: 'show', field: '', operator: 'equals', value: '' } },
    paragraph:     { text: 'Add descriptive text here to provide context for the form.', width: 'full', conditional: { enabled: false, action: 'show', field: '', operator: 'equals', value: '' } },
    divider:       { width: 'full', conditional: { enabled: false, action: 'show', field: '', operator: 'equals', value: '' } },
    columns:       { width: 'full', cols: [[], []] },
    submit:        { label: 'Submit Form',   width: 'full', style: 'primary', align: 'left' },
  };

  const TYPE_LABELS = {
    text: 'Text', email: 'Email', number: 'Number', password: 'Password',
    tel: 'Phone', url: 'URL', textarea: 'Textarea', richtext: 'Rich Text',
    select: 'Dropdown', multiselect: 'Multi-Select', radio: 'Radio',
    checkbox: 'Checkbox', checkboxgroup: 'Checkbox Group', toggle: 'Toggle',
    date: 'Date', time: 'Time', 'datetime-local': 'Date & Time',
    range: 'Slider', rangeslider: 'Range Slider', rating: 'Rating', file: 'File Upload', color: 'Color',
    heading: 'Heading', paragraph: 'Paragraph', divider: 'Divider',
    columns: 'Columns', submit: 'Submit'
  };

  // ── Utility ───────────────────────────────────────────────
  function uid() { return 'f' + Math.random().toString(36).substr(2, 9); }
  function tid() { return 't' + Math.random().toString(36).substr(2, 7); }

  function showToast(msg, type = 'default') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast show' + (type !== 'default' ? ' ' + type : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.className = 'toast'; }, 3000);
  }

  function getActiveTab() {
    return tabs.find(t => t.id === activeTabId) || tabs[0];
  }
  function getFields() {
    return getActiveTab().fields;
  }

  function escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(str) { return escHtml(str); }

  // Bootstrap-icon helper: returns '<i class="bi bi-xxx"></i> ' (with trailing space) or '' when no icon set.
  function tabIconHtml(tab) {
    if (!tab || !tab.icon) return '';
    return `<i class="bi ${escAttr(tab.icon)}"></i> `;
  }

  // ── History ───────────────────────────────────────────────
  function saveHistory() {
    const snap = JSON.stringify({ tabs, activeTabId });
    history = history.slice(0, historyIndex + 1);
    history.push(snap);
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length - 1;
  }

  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      const state = JSON.parse(history[historyIndex]);
      tabs = state.tabs;
      activeTabId = state.activeTabId;
      // make sure active tab still exists
      if (!tabs.find(t => t.id === activeTabId)) activeTabId = tabs[0]?.id;
      selectedId = null;
      renderAll();
    }
  }
  function redo() {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      const state = JSON.parse(history[historyIndex]);
      tabs = state.tabs;
      activeTabId = state.activeTabId;
      if (!tabs.find(t => t.id === activeTabId)) activeTabId = tabs[0]?.id;
      selectedId = null;
      renderAll();
    }
  }

  // ── Field Operations ─────────────────────────────────────
  function createField(type) {
    const field = { id: uid(), type, ...JSON.parse(JSON.stringify(FIELD_DEFAULTS[type] || {})) };
    // Auto-generate a name attribute if applicable
    if ('name' in field && !field.name) {
      const allFields = tabs.flatMap(t => t.fields || []);
      const existing = allFields.filter(f => f.type === type).length;
      field.name = type + (existing > 0 ? '_' + (existing + 1) : '');
    }
    return field;
  }

  // Helper: on mobile-narrow viewports, switch to the Properties panel after select/add
  function maybeSwitchToPropsOnMobile() {
    if (window.matchMedia('(max-width: 880px)').matches) {
      const ws = document.getElementById('workspace');
      if (ws) ws.dataset.mobilePanel = 'props';
      document.querySelectorAll('.mobile-panel-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mobilePanel === 'props');
      });
    }
  }

  function addField(type, atIndex) {
    const fields = getFields();
    const field = createField(type);
    if (atIndex !== undefined && atIndex >= 0) fields.splice(atIndex, 0, field);
    else fields.push(field);
    selectedId = field.id;
    saveHistory();
    renderCanvas();
    renderProps();
    syncOtherModes();
    maybeSwitchToPropsOnMobile();
    return field;
  }

  function removeField(id) {
    const tab = getActiveTab();
    tab.fields = tab.fields.filter(f => f.id !== id);
    if (selectedId === id) selectedId = null;
    saveHistory();
    renderCanvas();
    renderProps();
    syncOtherModes();
  }

  function duplicateField(id) {
    const fields = getFields();
    const idx = fields.findIndex(f => f.id === id);
    if (idx === -1) return;
    const copy = JSON.parse(JSON.stringify(fields[idx]));
    copy.id = uid();
    fields.splice(idx + 1, 0, copy);
    selectedId = copy.id;
    saveHistory();
    renderCanvas();
    renderProps();
    syncOtherModes();
  }

  function moveField(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const fields = getFields();
    const [item] = fields.splice(fromIdx, 1);
    fields.splice(toIdx, 0, item);
    saveHistory();
    renderCanvas();
    syncOtherModes();
  }

  // ── Tab Operations ───────────────────────────────────────
  function addTab() {
    const newTab = { id: tid(), name: 'Tab ' + (tabs.length + 1), icon: '', fields: [] };
    tabs.push(newTab);
    activeTabId = newTab.id;
    selectedId = null;
    saveHistory();
    renderAll();
    showToast('New tab added', 'success');
  }

  function removeTab(tabIdToRemove) {
    if (tabs.length === 1) {
      showToast('At least one tab is required', 'error');
      return;
    }
    if (!confirm('Delete this tab and all its fields?')) return;
    const idx = tabs.findIndex(t => t.id === tabIdToRemove);
    if (idx === -1) return;
    tabs.splice(idx, 1);
    if (activeTabId === tabIdToRemove) {
      activeTabId = tabs[Math.max(0, idx - 1)].id;
    }
    selectedId = null;
    saveHistory();
    renderAll();
  }

  function switchTab(id) {
    if (id === activeTabId) return;
    activeTabId = id;
    selectedId = null;
    renderTabsBar();
    renderCanvas();
    renderProps();
  }

  function renameTab(id, name) {
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;
    tab.name = name || 'Untitled';
    saveHistory();
    syncOtherModes();
  }

  // Set/clear a Bootstrap Icon class for a tab. Pass '' to remove.
  // Accepts either 'bi-pencil' or 'bi bi-pencil' or 'pencil' — normalizes to 'bi-xxx'.
  function setTabIcon(id, icon) {
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;
    let cls = String(icon || '').trim();
    if (cls) {
      // Normalize: strip 'bi ' prefix if present, ensure 'bi-' prefix
      cls = cls.replace(/^bi\s+/i, '');
      if (!/^bi-/.test(cls)) cls = 'bi-' + cls;
    }
    tab.icon = cls;
    saveHistory();
    renderTabsBar();
    syncOtherModes();
  }

  // ── Render: Tabs Bar ─────────────────────────────────────
  function renderTabsBar() {
    formTabsBar.innerHTML = '';
    tabs.forEach(tab => {
      const btn = document.createElement('div');
      btn.className = 'form-tab' + (tab.id === activeTabId ? ' active' : '');
      btn.dataset.tabId = tab.id;
      const iconHtml = tab.icon
        ? `<i class="bi ${escAttr(tab.icon)} form-tab-icon" data-icon-edit="${tab.id}" title="Click to change icon"></i>`
        : `<button class="form-tab-icon-add" data-icon-edit="${tab.id}" title="Add icon"><i class="bi bi-emoji-smile"></i></button>`;
      btn.innerHTML = `
        ${iconHtml}
        <input class="form-tab-name" value="${escAttr(tab.name)}" data-tab-id="${tab.id}" spellcheck="false">
        <button class="form-tab-close" data-close-id="${tab.id}" title="Delete tab">×</button>
      `;
      btn.addEventListener('click', e => {
        if (e.target.tagName === 'INPUT' || e.target.dataset.closeId || e.target.closest('[data-icon-edit]')) return;
        switchTab(tab.id);
      });
      const nameInput = btn.querySelector('.form-tab-name');
      nameInput.addEventListener('click', e => {
        e.stopPropagation();
        switchTab(tab.id);
      });
      nameInput.addEventListener('input', e => renameTab(tab.id, e.target.value));
      nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); nameInput.blur(); }
      });
      const closeBtn = btn.querySelector('.form-tab-close');
      closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        removeTab(tab.id);
      });
      // Icon edit button — opens a popover with input + suggestions
      const iconEditEl = btn.querySelector('[data-icon-edit]');
      if (iconEditEl) {
        iconEditEl.addEventListener('click', e => {
          e.stopPropagation();
          switchTab(tab.id);
          openIconPicker(tab.id, iconEditEl);
        });
      }
      formTabsBar.appendChild(btn);
    });

    // + New Tab button at the end of the tabs row
    const addBtn = document.createElement('button');
    addBtn.className = 'form-tab-add-inline';
    addBtn.title = 'Add new tab';
    addBtn.innerHTML = '<span>+</span> New Tab';
    addBtn.addEventListener('click', addTab);
    formTabsBar.appendChild(addBtn);
  }

  // ── Bootstrap Icon Picker Popover ────────────────────────
  // A lightweight popover that lets the user type a class name and pick from a curated list
  // of common form-related icons. Anchored to the icon button in the tab.
  const POPULAR_BS_ICONS = [
    'bi-person', 'bi-person-circle', 'bi-people', 'bi-people-fill',
    'bi-house', 'bi-house-door', 'bi-building', 'bi-shop',
    'bi-envelope', 'bi-envelope-fill', 'bi-telephone', 'bi-phone',
    'bi-info-circle', 'bi-question-circle', 'bi-exclamation-circle', 'bi-check-circle',
    'bi-gear', 'bi-tools', 'bi-sliders', 'bi-wrench',
    'bi-file-text', 'bi-file-earmark', 'bi-clipboard', 'bi-clipboard-check',
    'bi-credit-card', 'bi-cash', 'bi-currency-dollar', 'bi-bag',
    'bi-calendar', 'bi-calendar-event', 'bi-clock', 'bi-alarm',
    'bi-geo-alt', 'bi-pin-map', 'bi-globe', 'bi-map',
    'bi-image', 'bi-camera', 'bi-paperclip', 'bi-upload',
    'bi-pencil', 'bi-pen', 'bi-list-check', 'bi-list-ul',
    'bi-shield', 'bi-shield-check', 'bi-lock', 'bi-key',
    'bi-star', 'bi-heart', 'bi-bookmark', 'bi-tag',
    'bi-cart', 'bi-truck', 'bi-box', 'bi-gift',
    'bi-graph-up', 'bi-bar-chart', 'bi-pie-chart', 'bi-speedometer',
    'bi-card-list', 'bi-collection', 'bi-folder', 'bi-archive',
    'bi-chat', 'bi-chat-dots', 'bi-megaphone', 'bi-bell',
    'bi-search', 'bi-funnel', 'bi-sort-down', 'bi-eye',
    'bi-1-circle', 'bi-2-circle', 'bi-3-circle', 'bi-4-circle', 'bi-5-circle',
  ];

  let iconPickerEl = null;
  function closeIconPicker() {
    if (iconPickerEl) { iconPickerEl.remove(); iconPickerEl = null; }
    document.removeEventListener('click', onDocClickClosePicker, true);
  }
  function onDocClickClosePicker(e) {
    if (iconPickerEl && !iconPickerEl.contains(e.target)) closeIconPicker();
  }
  function openIconPicker(tabId, anchor) {
    closeIconPicker();
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const pop = document.createElement('div');
    pop.className = 'icon-picker';
    pop.innerHTML = `
      <div class="icon-picker-header">
        <span class="icon-picker-title">Tab Icon</span>
        <a href="https://icons.getbootstrap.com/" target="_blank" rel="noopener" class="icon-picker-browse">Browse all →</a>
      </div>
      <div class="icon-picker-input-row">
        <i class="bi ${escAttr(tab.icon || 'bi-emoji-neutral')} icon-picker-preview"></i>
        <input class="icon-picker-input" placeholder="bi-pencil  or  pencil" value="${escAttr(tab.icon || '')}" spellcheck="false">
        <button class="icon-picker-clear" title="Remove icon">Clear</button>
      </div>
      <div class="icon-picker-hint">Type a Bootstrap Icon class. The <code>bi-</code> prefix is added automatically.</div>
      <div class="icon-picker-grid"></div>
    `;
    document.body.appendChild(pop);
    iconPickerEl = pop;

    // Position below the anchor
    const rect = anchor.getBoundingClientRect();
    const popW = 320;
    const left = Math.max(8, Math.min(window.innerWidth - popW - 8, rect.left));
    pop.style.top = (rect.bottom + 6 + window.scrollY) + 'px';
    pop.style.left = left + 'px';
    pop.style.width = popW + 'px';

    const inp = pop.querySelector('.icon-picker-input');
    const preview = pop.querySelector('.icon-picker-preview');
    const grid = pop.querySelector('.icon-picker-grid');

    function refreshPreview(val) {
      const cls = String(val || '').trim().replace(/^bi\s+/i, '');
      const final = cls ? (/^bi-/.test(cls) ? cls : 'bi-' + cls) : 'bi-emoji-neutral';
      preview.className = `bi ${final} icon-picker-preview`;
    }
    function renderGrid(filter) {
      const f = String(filter || '').toLowerCase().trim().replace(/^bi-?/, '');
      const filtered = f
        ? POPULAR_BS_ICONS.filter(c => c.toLowerCase().includes(f))
        : POPULAR_BS_ICONS;
      grid.innerHTML = filtered.map(c =>
        `<button class="icon-picker-cell${tab.icon === c ? ' active' : ''}" data-pick="${c}" title="${c}"><i class="bi ${c}"></i></button>`
      ).join('') || '<div class="icon-picker-empty">No matches in popular set. Type any <code>bi-xxx</code> name.</div>';
      grid.querySelectorAll('[data-pick]').forEach(b => {
        b.addEventListener('click', () => {
          inp.value = b.dataset.pick;
          refreshPreview(b.dataset.pick);
          setTabIcon(tabId, b.dataset.pick);
          closeIconPicker();
        });
      });
    }

    inp.addEventListener('input', () => {
      refreshPreview(inp.value);
      renderGrid(inp.value);
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setTabIcon(tabId, inp.value);
        closeIconPicker();
      } else if (e.key === 'Escape') {
        closeIconPicker();
      }
    });
    pop.querySelector('.icon-picker-clear').addEventListener('click', () => {
      setTabIcon(tabId, '');
      closeIconPicker();
    });

    renderGrid('');
    setTimeout(() => inp.focus(), 0);
    // Close when clicking outside
    setTimeout(() => document.addEventListener('click', onDocClickClosePicker, true), 0);
  }

  // ── Render: Canvas ───────────────────────────────────────
  function renderAll() {
    renderTabsBar();
    renderCanvas();
    renderProps();
    syncOtherModes();
  }

  function renderCanvas() {
    const fields = getFields();
    const existingNodes = Array.from(canvas.querySelectorAll('.field-wrapper, .drop-zone'));
    existingNodes.forEach(n => n.remove());

    canvasEmpty.classList.toggle('hidden', fields.length > 0);
    fieldCountEl.textContent = fields.length + ' field' + (fields.length !== 1 ? 's' : '') + ' • ' + getActiveTab().name;

    fields.forEach((field, idx) => {
      canvas.appendChild(makeDropZone(idx));
      canvas.appendChild(makeFieldWrapper(field, idx));
    });
    canvas.appendChild(makeDropZone(fields.length));
  }

  function makeDropZone(index) {
    const dz = document.createElement('div');
    dz.className = 'drop-zone';
    dz.dataset.index = index;
    dz.addEventListener('dragover', e => {
      e.preventDefault();
      dz.classList.add('active');
      dropIndex = index;
    });
    dz.addEventListener('dragleave', () => dz.classList.remove('active'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('active');
      handleDrop(index);
    });
    return dz;
  }

  function makeFieldWrapper(field, idx) {
    const wrap = document.createElement('div');
    wrap.className = 'field-wrapper' + (field.id === selectedId ? ' selected' : '');
    wrap.dataset.id = field.id;
    wrap.dataset.idx = idx;
    wrap.draggable = true;

    wrap.innerHTML = `
      <div class="field-header">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="field-drag-handle" title="Drag to reorder">⠿</span>
          <span class="field-type-badge">${TYPE_LABELS[field.type] || field.type}</span>
        </div>
        <div class="field-actions">
          <button class="field-action-btn" data-action="duplicate" title="Duplicate">⧉</button>
          <button class="field-action-btn delete" data-action="delete" title="Delete">✕</button>
        </div>
      </div>
      <div class="field-body">${renderFieldPreview(field)}</div>`;

    wrap.addEventListener('click', e => {
      if (!e.target.closest('[data-action]')) {
        selectedId = field.id;
        renderCanvas();
        renderProps();
        maybeSwitchToPropsOnMobile();
      }
    });

    wrap.querySelector('[data-action="delete"]').addEventListener('click', e => {
      e.stopPropagation();
      removeField(field.id);
    });
    wrap.querySelector('[data-action="duplicate"]').addEventListener('click', e => {
      e.stopPropagation();
      duplicateField(field.id);
    });

    wrap.addEventListener('dragstart', e => {
      dragField = { id: field.id, idx };
      dragSource = null;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => wrap.classList.add('dragging'), 0);
    });
    wrap.addEventListener('dragend', () => wrap.classList.remove('dragging'));

    return wrap;
  }

  function renderFieldPreview(field) {
    const req = field.required ? '<span class="req">*</span>' : '';
    const lbl = label => `<div class="field-label-preview">${escHtml(label)}${req}</div>`;

    switch (field.type) {
      case 'text': case 'email': case 'password': case 'tel': case 'url':
        return lbl(field.label) + `<input class="field-input-preview" type="${field.type}" placeholder="${escHtml(field.placeholder || '')}" readonly>`;
      case 'number':
        return lbl(field.label) + `<input class="field-input-preview" type="number" placeholder="${escHtml(field.placeholder || '0')}" readonly>`;
      case 'textarea':
        return lbl(field.label) + `<textarea class="field-input-preview" rows="${field.rows || 3}" placeholder="${escHtml(field.placeholder || '')}" readonly></textarea>`;
      case 'richtext':
        return lbl(field.label) + `<div class="field-input-preview" style="min-height:64px;padding:8px 11px;font-size:12px;color:var(--text3)">[Rich Text Editor]</div>`;
      case 'select': case 'multiselect': {
        const opts = (field.options || []).slice(0, 3).map(o => `<option>${escHtml(o)}</option>`).join('');
        return lbl(field.label) + `<select class="field-input-preview select-preview"><option disabled selected>${escHtml(field.placeholder || 'Select…')}</option>${opts}</select>`;
      }
      case 'radio': {
        const items = (field.options || []).slice(0, 3).map(o => `<div class="radio-option"><span class="radio-circle"></span>${escHtml(o)}</div>`).join('');
        return lbl(field.label) + items;
      }
      case 'checkbox':
        return `<div class="radio-option"><span class="check-box"></span>${escHtml(field.label)}${req}</div>`;
      case 'checkboxgroup': {
        const items = (field.options || []).slice(0, 3).map(o => `<div class="checkbox-option"><span class="check-box"></span>${escHtml(o)}</div>`).join('');
        return lbl(field.label) + items;
      }
      case 'toggle':
        return `<div class="field-toggle-preview">
          <div class="toggle-track"><div class="toggle-knob" style="${field.defaultOn ? 'transform:translateX(16px);background:var(--accent)' : ''}"></div></div>
          <span style="font-size:13px;color:var(--text2)">${escHtml(field.label)}${req}</span>
        </div>`;
      case 'date': case 'time': case 'datetime-local':
        return lbl(field.label) + `<input class="field-input-preview" type="${field.type}" readonly>`;
      case 'range':
        return lbl(field.label) + `<input class="field-range-preview" type="range" min="${field.min}" max="${field.max}" value="${field.defaultVal}">`;
      case 'rangeslider': {
        const min = Number(field.min) || 0;
        const max = Number(field.max) || 100;
        const dMin = Number(field.defaultMin) || min;
        const dMax = Number(field.defaultMax) || max;
        const span = max - min || 1;
        const leftPct = ((dMin - min) / span) * 100;
        const rightPct = ((dMax - min) / span) * 100;
        return lbl(field.label) + `
          <div class="rangeslider-preview-mini">
            <div class="rs-track"><div class="rs-fill" style="left:${leftPct}%;right:${100-rightPct}%"></div>
              <div class="rs-handle" style="left:${leftPct}%"></div>
              <div class="rs-handle" style="left:${rightPct}%"></div>
            </div>
            <div class="rs-values"><span>${dMin}</span><span>${dMax}</span></div>
          </div>`;
      }
      case 'rating': {
        const stars = Array.from({length: field.maxStars || 5}, (_, i) => `<span class="star${i < 3 ? ' filled' : ''}">★</span>`).join('');
        return lbl(field.label) + `<div class="field-rating-preview">${stars}</div>`;
      }
      case 'file':
        return lbl(field.label) + `<div class="field-input-preview" style="color:var(--text3);font-size:12px">📎 Click to upload${field.multiple ? ' (multiple)' : ''}</div>`;
      case 'color':
        return lbl(field.label) + `<div class="field-color-preview"><div class="color-swatch" style="background:${field.defaultVal || '#5b54e6'}"></div><span class="color-val">${field.defaultVal || '#5b54e6'}</span></div>`;
      case 'heading':
        return `<div class="field-heading-preview">${escHtml(field.text || 'Heading')}</div>`;
      case 'paragraph':
        return `<p class="field-paragraph-preview">${escHtml(field.text || 'Paragraph text')}</p>`;
      case 'divider':
        return `<hr class="field-divider-preview">`;
      case 'columns':
        return `<div class="columns-preview"><div class="column-drop">Column 1</div><div class="column-drop">Column 2</div></div>`;
      case 'submit':
        return `<button class="field-submit-preview">${escHtml(field.label || 'Submit')}</button>`;
      default:
        return `<div class="field-input-preview">[${field.type}]</div>`;
    }
  }

  // ── Drag & Drop ───────────────────────────────────────────
  canvas.addEventListener('dragover', e => {
    e.preventDefault();
    canvas.classList.add('drag-over');
  });
  canvas.addEventListener('dragleave', e => {
    if (!canvas.contains(e.relatedTarget)) canvas.classList.remove('drag-over');
  });
  canvas.addEventListener('drop', e => {
    e.preventDefault();
    canvas.classList.remove('drag-over');
    if (dropIndex === null) handleDrop(getFields().length);
    dropIndex = null;
  });

  function handleDrop(atIndex) {
    if (dragSource) {
      addField(dragSource, atIndex);
      dragSource = null;
    } else if (dragField) {
      const fromIdx = dragField.idx;
      let toIdx = atIndex;
      if (toIdx > fromIdx) toIdx--;
      moveField(fromIdx, toIdx);
      dragField = null;
    }
    dropIndex = null;
  }

  // ── Element Palette ──────────────────────────────────────
  document.querySelectorAll('.element-item').forEach(el => {
    el.addEventListener('dragstart', e => {
      dragSource = el.dataset.type;
      dragField = null;
      e.dataTransfer.effectAllowed = 'copy';
    });
    el.addEventListener('click', () => addField(el.dataset.type));
  });

  // ── Properties Panel ─────────────────────────────────────
  function renderProps() {
    const fields = getFields();
    const field = fields.find(f => f.id === selectedId);
    if (!field) {
      propsForm.style.display = 'none';
      propsEmpty.style.display = 'flex';
      selectedTypeEl.textContent = '—';
      return;
    }
    propsForm.style.display = 'flex';
    propsEmpty.style.display = 'none';
    selectedTypeEl.textContent = TYPE_LABELS[field.type] || field.type;
    propsForm.innerHTML = buildPropsHTML(field);
    attachPropListeners(field);
  }

  function buildPropsHTML(field) {
    let html = '';
    const hasLabel = !['divider', 'heading', 'paragraph', 'columns'].includes(field.type);
    const hasPlaceholder = ['text','email','password','tel','url','number','textarea','richtext','select','multiselect'].includes(field.type);
    const hasOptions = ['select','multiselect','radio','checkboxgroup'].includes(field.type);
    const isLayout = ['heading','paragraph','divider','columns','submit'].includes(field.type);
    const isInputField = !['heading','paragraph','divider','columns','submit'].includes(field.type);
    const hasDefaultValue = ['text','email','password','tel','url','number','textarea','richtext','date','time','datetime-local','select'].includes(field.type);

    // ── Field Identity ─────────────────────────
    if (isInputField) {
      html += `<div class="prop-group">
        <div class="prop-group-title">Field Identity</div>
        <div class="prop-row">
          <div class="prop-label">Name (form data key)</div>
          <input class="prop-input mono" data-prop="name" value="${escAttr(field.name || '')}" placeholder="field_name">
        </div>
        <div class="prop-hint">
          <span class="prop-hint-arrow">↳</span>
          <span>Used as the <code class="inline-code">name</code> attribute in submitted form data</span>
        </div>
      </div>`;
    }

    // ── Label & Placeholder ────────────────────
    if (hasLabel) {
      html += `<div class="prop-group">
        <div class="prop-group-title">Label</div>
        <div class="prop-row">
          <div class="prop-label">Label Text</div>
          <input class="prop-input" data-prop="label" value="${escAttr(field.label || '')}">
        </div>`;
      if (hasPlaceholder) {
        html += `<div class="prop-row">
          <div class="prop-label">Placeholder</div>
          <input class="prop-input" data-prop="placeholder" value="${escAttr(field.placeholder || '')}">
        </div>`;
      }
      if (isInputField) {
        html += `<div class="prop-row">
          <div class="prop-label">Help Text (description shown below)</div>
          <input class="prop-input" data-prop="helpText" value="${escAttr(field.helpText || '')}" placeholder="Optional hint">
        </div>`;
      }
      html += `</div>`;
    }

    // ── Default Value ──────────────────────────
    if (hasDefaultValue) {
      const inputType = ['date','time','datetime-local'].includes(field.type) ? field.type :
                        field.type === 'number' ? 'number' : 'text';
      if (field.type === 'textarea' || field.type === 'richtext') {
        html += `<div class="prop-group">
          <div class="prop-group-title">Default Value</div>
          <div class="prop-row">
            <textarea class="prop-textarea" data-prop="defaultValue" placeholder="Pre-filled content">${escHtml(field.defaultValue || '')}</textarea>
          </div>
        </div>`;
      } else if (field.type === 'select') {
        html += `<div class="prop-group">
          <div class="prop-group-title">Default Selection</div>
          <div class="prop-row">
            <select class="prop-select" data-prop="defaultValue">
              <option value="">— None (show placeholder) —</option>
              ${(field.options || []).map(o => `<option value="${escAttr(o)}"${field.defaultValue===o?' selected':''}>${escHtml(o)}</option>`).join('')}
            </select>
          </div>
        </div>`;
      } else {
        html += `<div class="prop-group">
          <div class="prop-group-title">Default Value</div>
          <div class="prop-row">
            <input class="prop-input" type="${inputType}" data-prop="defaultValue" value="${escAttr(field.defaultValue || '')}" placeholder="Pre-filled value">
          </div>
        </div>`;
      }
    }

    // Multiselect - default values (multi)
    if (field.type === 'multiselect') {
      const selected = Array.isArray(field.defaultValue) ? field.defaultValue : [];
      html += `<div class="prop-group">
        <div class="prop-group-title">Default Selection</div>
        <div class="options-list">
          ${(field.options || []).map(o => `
            <label class="prop-checkbox-row" style="border:none;padding:4px 0;cursor:pointer;">
              <span class="prop-checkbox-label">${escHtml(o)}</span>
              <input type="checkbox" data-multi-default="${escAttr(o)}" ${selected.includes(o) ? 'checked' : ''}>
            </label>`).join('')}
        </div>
      </div>`;
    }

    // Checkboxgroup - default values (multi)
    if (field.type === 'checkboxgroup') {
      const selected = Array.isArray(field.defaultValue) ? field.defaultValue : [];
      html += `<div class="prop-group">
        <div class="prop-group-title">Default Checked</div>
        <div class="options-list">
          ${(field.options || []).map(o => `
            <label class="prop-checkbox-row" style="border:none;padding:4px 0;cursor:pointer;">
              <span class="prop-checkbox-label">${escHtml(o)}</span>
              <input type="checkbox" data-multi-default="${escAttr(o)}" ${selected.includes(o) ? 'checked' : ''}>
            </label>`).join('')}
        </div>
      </div>`;
    }

    // Radio - default value (single from options)
    if (field.type === 'radio') {
      html += `<div class="prop-group">
        <div class="prop-group-title">Default Selection</div>
        <div class="prop-row">
          <select class="prop-select" data-prop="defaultValue">
            <option value="">— None —</option>
            ${(field.options || []).map(o => `<option value="${escAttr(o)}"${field.defaultValue===o?' selected':''}>${escHtml(o)}</option>`).join('')}
          </select>
        </div>
      </div>`;
    }

    // Single checkbox - default checked
    if (field.type === 'checkbox') {
      html += `<div class="prop-group">
        <div class="prop-group-title">Default State</div>
        <div class="prop-checkbox-row">
          <span class="prop-checkbox-label">Default Checked</span>
          <div class="prop-toggle${field.defaultChecked?' on':''}" data-toggle="defaultChecked"></div>
        </div>
      </div>`;
    }

    // ── Layout-specific content ────────────────
    if (field.type === 'heading') {
      html += `<div class="prop-group">
        <div class="prop-group-title">Content</div>
        <div class="prop-row">
          <div class="prop-label">Heading Text</div>
          <input class="prop-input" data-prop="text" value="${escAttr(field.text || '')}">
        </div>
        <div class="prop-row">
          <div class="prop-label">Level</div>
          <select class="prop-select" data-prop="level">
            ${['h1','h2','h3','h4'].map(h => `<option value="${h}"${field.level===h?' selected':''}>${h.toUpperCase()}</option>`).join('')}
          </select>
        </div>
      </div>`;
    }

    if (field.type === 'paragraph') {
      html += `<div class="prop-group">
        <div class="prop-group-title">Content</div>
        <div class="prop-row">
          <div class="prop-label">Text</div>
          <textarea class="prop-textarea" data-prop="text">${escHtml(field.text || '')}</textarea>
        </div>
      </div>`;
    }

    if (field.type === 'submit') {
      html += `<div class="prop-group">
        <div class="prop-group-title">Button</div>
        <div class="prop-row">
          <div class="prop-label">Button Label</div>
          <input class="prop-input" data-prop="label" value="${escAttr(field.label || 'Submit')}">
        </div>
        <div class="prop-row">
          <div class="prop-label">Alignment</div>
          <select class="prop-select" data-prop="align">
            ${['left','center','right','full'].map(a=>`<option value="${a}"${field.align===a?' selected':''}>${a.charAt(0).toUpperCase()+a.slice(1)}</option>`).join('')}
          </select>
        </div>
      </div>`;
    }

    // ── Type-specific options ──────────────────
    if (field.type === 'textarea') {
      html += `<div class="prop-group">
        <div class="prop-group-title">Size</div>
        <div class="prop-row">
          <div class="prop-label">Rows</div>
          <input class="prop-input" type="number" data-prop="rows" value="${field.rows || 4}" min="2" max="20">
        </div>
      </div>`;
    }

    if (field.type === 'number' || field.type === 'range') {
      html += `<div class="prop-group">
        <div class="prop-group-title">Range</div>
        <div class="prop-row"><div class="prop-label">Min</div><input class="prop-input" type="number" data-prop="min" value="${field.min ?? ''}"></div>
        <div class="prop-row"><div class="prop-label">Max</div><input class="prop-input" type="number" data-prop="max" value="${field.max ?? ''}"></div>
        <div class="prop-row"><div class="prop-label">Step</div><input class="prop-input" type="number" data-prop="step" value="${field.step || 1}"></div>
        ${field.type === 'range' ? `<div class="prop-row"><div class="prop-label">Default Value</div><input class="prop-input" type="number" data-prop="defaultVal" value="${field.defaultVal ?? 50}"></div>` : ''}
      </div>`;
    }

    if (field.type === 'rangeslider') {
      html += `<div class="prop-group">
        <div class="prop-group-title">Range</div>
        <div class="prop-row"><div class="prop-label">Min</div><input class="prop-input" type="number" data-prop="min" value="${field.min ?? 0}"></div>
        <div class="prop-row"><div class="prop-label">Max</div><input class="prop-input" type="number" data-prop="max" value="${field.max ?? 100}"></div>
        <div class="prop-row"><div class="prop-label">Step</div><input class="prop-input" type="number" data-prop="step" value="${field.step || 1}"></div>
        <div class="prop-row"><div class="prop-label">Default Min</div><input class="prop-input" type="number" data-prop="defaultMin" value="${field.defaultMin ?? 25}"></div>
        <div class="prop-row"><div class="prop-label">Default Max</div><input class="prop-input" type="number" data-prop="defaultMax" value="${field.defaultMax ?? 75}"></div>
      </div>`;
    }

    if (field.type === 'rating') {
      html += `<div class="prop-group">
        <div class="prop-group-title">Rating</div>
        <div class="prop-row">
          <div class="prop-label">Max Stars</div>
          <input class="prop-input" type="number" data-prop="maxStars" value="${field.maxStars || 5}" min="3" max="10">
        </div>
        <div class="prop-row"><div class="prop-label">Default Value</div><input class="prop-input" type="number" data-prop="defaultValue" value="${field.defaultValue || ''}" min="0" max="${field.maxStars || 5}" placeholder="0"></div>
      </div>`;
    }

    if (field.type === 'file') {
      html += `<div class="prop-group">
        <div class="prop-group-title">File Options</div>
        <div class="prop-row"><div class="prop-label">Accept (e.g. image/*, .pdf)</div><input class="prop-input" data-prop="accept" value="${escAttr(field.accept || '')}"></div>
        <div class="prop-row"><div class="prop-label">Max Size (MB)</div><input class="prop-input" type="number" data-prop="maxSize" value="${field.maxSize || ''}" placeholder="No limit"></div>
        <div class="prop-checkbox-row">
          <span class="prop-checkbox-label">Allow Multiple Files</span>
          <div class="prop-toggle${field.multiple?' on':''}" data-toggle="multiple"></div>
        </div>
      </div>`;
    }

    if (field.type === 'color') {
      html += `<div class="prop-group">
        <div class="prop-group-title">Default Color</div>
        <div class="prop-row">
          <input class="prop-input" type="color" data-prop="defaultVal" value="${field.defaultVal || '#5b54e6'}" style="height:36px;padding:2px;">
        </div>
      </div>`;
    }

    if (field.type === 'toggle') {
      html += `<div class="prop-group">
        <div class="prop-group-title">Default State</div>
        <div class="prop-checkbox-row">
          <span class="prop-checkbox-label">Default On</span>
          <div class="prop-toggle${field.defaultOn?' on':''}" data-toggle="defaultOn"></div>
        </div>
      </div>`;
    }

    if (hasOptions) {
      html += `<div class="prop-group">
        <div class="prop-group-title">Options</div>
        <div class="options-list" id="optionsList">
          ${(field.options || []).map((opt, i) => `
            <div class="option-row" data-opt-idx="${i}">
              <input class="prop-input" data-opt="${i}" value="${escAttr(opt)}">
              <button class="option-delete" data-opt-del="${i}">×</button>
            </div>`).join('')}
        </div>
        <button class="add-option-btn" id="addOptionBtn">+ Add Option</button>
      </div>`;
    }

    if (field.type === 'date' || field.type === 'datetime-local') {
      html += `<div class="prop-group">
        <div class="prop-group-title">Date Range</div>
        <div class="prop-row"><div class="prop-label">Min Date</div><input class="prop-input" type="date" data-prop="min" value="${field.min || ''}"></div>
        <div class="prop-row"><div class="prop-label">Max Date</div><input class="prop-input" type="date" data-prop="max" value="${field.max || ''}"></div>
      </div>`;
    }

    // ── Validation ─────────────────────────────
    if (!isLayout) {
      html += `<div class="prop-group">
        <div class="prop-group-title">Validation</div>
        <div class="prop-checkbox-row">
          <span class="prop-checkbox-label">Required</span>
          <div class="prop-toggle${field.required?' on':''}" data-toggle="required"></div>
        </div>
        ${field.type === 'text' || field.type === 'textarea' ? `
        <div class="prop-row"><div class="prop-label">Min Length</div><input class="prop-input" type="number" data-prop="minLength" value="${field.minLength || ''}" placeholder="No minimum"></div>
        <div class="prop-row"><div class="prop-label">Max Length</div><input class="prop-input" type="number" data-prop="maxLength" value="${field.maxLength || ''}" placeholder="No maximum"></div>
        ` : ''}
        ${field.type === 'text' ? `
        <div class="prop-row"><div class="prop-label">Pattern (regex)</div><input class="prop-input mono" data-prop="pattern" value="${escAttr(field.pattern || '')}" placeholder="^[a-zA-Z]+$"></div>
        ` : ''}
        ${(field.required || field.minLength || field.maxLength || field.pattern) ? `
        <div class="prop-row"><div class="prop-label">Validation Error Message</div><input class="prop-input" data-prop="errorMessage" value="${escAttr(field.errorMessage || '')}" placeholder="Custom error message"></div>
        ` : ''}
      </div>`;
    }

    // ── Field State (Readonly, Disabled, Autocomplete) ──
    if (isInputField) {
      html += `<div class="prop-group">
        <div class="prop-group-title">Field State</div>
        <div class="prop-checkbox-row">
          <span class="prop-checkbox-label">Read-only</span>
          <div class="prop-toggle${field.readonly?' on':''}" data-toggle="readonly"></div>
        </div>
        <div class="prop-checkbox-row">
          <span class="prop-checkbox-label">Disabled</span>
          <div class="prop-toggle${field.disabled?' on':''}" data-toggle="disabled"></div>
        </div>
        ${['text','email','password','tel','url'].includes(field.type) ? `
        <div class="prop-row">
          <div class="prop-label">Autocomplete</div>
          <select class="prop-select" data-prop="autocomplete">
            ${['off','on','email','username','new-password','current-password','tel','url','name','given-name','family-name','street-address','postal-code','country','organization'].map(a => `<option value="${a}"${field.autocomplete===a?' selected':''}>${a}</option>`).join('')}
          </select>
        </div>
        ` : ''}
      </div>`;
    }

    // ── Conditional Logic (Show/Hide/Enable/Disable based on another field) ──
    if (!['submit'].includes(field.type)) {
      const c = field.conditional || { enabled: false, action: 'show', field: '', operator: 'equals', value: '' };
      // Build list of other fields the user can target
      const otherFields = tabs.flatMap(t => t.fields)
        .filter(f => f.id !== field.id && !['heading','paragraph','divider','columns','submit'].includes(f.type));
      const fieldOpts = otherFields.map(f =>
        `<option value="${escAttr(f.id)}"${c.field === f.id ? ' selected' : ''}>${escHtml(f.label || f.name || f.type)}${f.name ? ' (' + f.name + ')' : ''}</option>`
      ).join('');
      html += `<div class="prop-group">
        <div class="prop-group-title">Conditional Logic</div>
        <div class="prop-checkbox-row">
          <span class="prop-checkbox-label">Enable Conditional Logic</span>
          <div class="prop-toggle${c.enabled?' on':''}" data-toggle-cond="enabled"></div>
        </div>
        ${c.enabled ? `
          <div class="prop-row">
            <div class="prop-label">Action</div>
            <select class="prop-select" data-cond="action">
              <option value="show"${c.action==='show'?' selected':''}>Show this field</option>
              <option value="hide"${c.action==='hide'?' selected':''}>Hide this field</option>
              <option value="enable"${c.action==='enable'?' selected':''}>Enable this field</option>
              <option value="disable"${c.action==='disable'?' selected':''}>Disable this field</option>
            </select>
          </div>
          <div class="prop-row">
            <div class="prop-label">When field</div>
            ${otherFields.length > 0 ? `<select class="prop-select" data-cond="field">
              <option value="">— Select a field —</option>
              ${fieldOpts}
            </select>` : `<div style="font-size:11px;color:var(--text3);font-style:italic;padding:6px 0;">Add another field first to set up conditions.</div>`}
          </div>
          ${otherFields.length > 0 ? `
          <div class="prop-row">
            <div class="prop-label">Condition</div>
            <select class="prop-select" data-cond="operator">
              <option value="equals"${c.operator==='equals'?' selected':''}>Equals</option>
              <option value="not_equals"${c.operator==='not_equals'?' selected':''}>Not equals</option>
              <option value="contains"${c.operator==='contains'?' selected':''}>Contains</option>
              <option value="not_contains"${c.operator==='not_contains'?' selected':''}>Does not contain</option>
              <option value="empty"${c.operator==='empty'?' selected':''}>Is empty</option>
              <option value="not_empty"${c.operator==='not_empty'?' selected':''}>Is not empty</option>
              <option value="checked"${c.operator==='checked'?' selected':''}>Is checked</option>
              <option value="unchecked"${c.operator==='unchecked'?' selected':''}>Is unchecked</option>
              <option value="greater_than"${c.operator==='greater_than'?' selected':''}>Greater than</option>
              <option value="less_than"${c.operator==='less_than'?' selected':''}>Less than</option>
            </select>
          </div>
          ${!['empty','not_empty','checked','unchecked'].includes(c.operator) ? `
          <div class="prop-row">
            <div class="prop-label">Value</div>
            <input class="prop-input" data-cond="value" value="${escAttr(c.value || '')}" placeholder="Comparison value">
          </div>` : ''}
          ` : ''}
        ` : ''}
      </div>`;
    }

    // ── Layout (Width) ─────────────────────────
    html += `<div class="prop-group">
      <div class="prop-group-title">Layout</div>
      <div class="prop-row">
        <div class="prop-label">Width</div>
        <select class="prop-select" data-prop="width">
          <option value="full"${field.width==='full'?' selected':''}>Full Width</option>
          <option value="half"${field.width==='half'?' selected':''}>Half Width</option>
          <option value="third"${field.width==='third'?' selected':''}>One Third</option>
        </select>
      </div>
    </div>`;

    // ── Custom CSS class (advanced) ────────────
    if (isInputField) {
      html += `<div class="prop-group">
        <div class="prop-group-title">Advanced</div>
        <div class="prop-row">
          <div class="prop-label">Custom CSS Class</div>
          <input class="prop-input mono" data-prop="cssClass" value="${escAttr(field.cssClass || '')}" placeholder="custom-class">
        </div>
      </div>`;
    }

    html += `<button class="delete-field-btn" id="deletePropBtn">Delete Field</button>`;

    return html;
  }

  function attachPropListeners(field) {
    propsForm.querySelectorAll('[data-prop]').forEach(el => {
      el.addEventListener('input', () => {
        const prop = el.dataset.prop;
        const val = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
        field[prop] = val;
        const wrapper = canvas.querySelector(`[data-id="${field.id}"] .field-body`);
        if (wrapper) wrapper.innerHTML = renderFieldPreview(field);
        saveHistory();
        syncOtherModes();
      });
    });

    propsForm.querySelectorAll('[data-toggle]').forEach(tog => {
      tog.addEventListener('click', () => {
        const prop = tog.dataset.toggle;
        field[prop] = !field[prop];
        tog.classList.toggle('on', field[prop]);
        const wrapper = canvas.querySelector(`[data-id="${field.id}"] .field-body`);
        if (wrapper) wrapper.innerHTML = renderFieldPreview(field);
        saveHistory();
        syncOtherModes();
      });
    });

    // Multi-select / checkbox-group default values (multiple)
    propsForm.querySelectorAll('[data-multi-default]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (!Array.isArray(field.defaultValue)) field.defaultValue = [];
        const val = cb.dataset.multiDefault;
        if (cb.checked) {
          if (!field.defaultValue.includes(val)) field.defaultValue.push(val);
        } else {
          field.defaultValue = field.defaultValue.filter(v => v !== val);
        }
        saveHistory();
        syncOtherModes();
      });
    });

    // Conditional logic: enable toggle
    propsForm.querySelectorAll('[data-toggle-cond]').forEach(tog => {
      tog.addEventListener('click', () => {
        if (!field.conditional) field.conditional = { enabled: false, action: 'show', field: '', operator: 'equals', value: '' };
        field.conditional.enabled = !field.conditional.enabled;
        saveHistory();
        renderProps();
        syncOtherModes();
      });
    });

    // Conditional logic: action / field / operator / value
    propsForm.querySelectorAll('[data-cond]').forEach(el => {
      const evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        if (!field.conditional) field.conditional = { enabled: true, action: 'show', field: '', operator: 'equals', value: '' };
        const key = el.dataset.cond;
        field.conditional[key] = el.value;
        // If operator changed to one that doesn't need a value, re-render to hide value field
        if (key === 'operator') renderProps();
        saveHistory();
        syncOtherModes();
      });
    });

    if (field.options) {
      propsForm.querySelectorAll('[data-opt]').forEach(inp => {
        inp.addEventListener('input', () => {
          field.options[parseInt(inp.dataset.opt)] = inp.value;
          const wrapper = canvas.querySelector(`[data-id="${field.id}"] .field-body`);
          if (wrapper) wrapper.innerHTML = renderFieldPreview(field);
          saveHistory();
          syncOtherModes();
        });
      });
      propsForm.querySelectorAll('[data-opt-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          field.options.splice(parseInt(btn.dataset.optDel), 1);
          saveHistory();
          renderCanvas();
          renderProps();
          syncOtherModes();
        });
      });
      const addOptBtn = document.getElementById('addOptionBtn');
      if (addOptBtn) {
        addOptBtn.addEventListener('click', () => {
          field.options.push('New Option');
          saveHistory();
          renderCanvas();
          renderProps();
          syncOtherModes();
        });
      }
    }

    const delBtn = document.getElementById('deletePropBtn');
    if (delBtn) delBtn.addEventListener('click', () => removeField(field.id));
  }

  // ── Preview Mode (with Template support) ──────────────────
  function renderPreview() {
    const previewForm = document.getElementById('previewForm');
    const previewContainer = document.getElementById('previewContainer');
    document.getElementById('previewTitle').textContent = formNameInput.value || 'Untitled Form';
    previewForm.innerHTML = '';

    // Reset classes
    previewForm.className = 'preview-form template-' + previewTemplate
      + ' width-' + previewWidth
      + (previewStyle.border ? ' has-border' : '')
      + (previewStyle.shadow ? ' has-shadow' : '')
      + (previewStyle.rounded ? ' has-rounded' : '');

    if (previewTemplate === 'single-page') {
      renderSinglePagePreview(previewForm);
    } else if (previewTemplate === 'vertical-tabs') {
      renderVerticalTabsPreview(previewForm);
    } else if (previewTemplate === 'accordion') {
      renderAccordionPreview(previewForm);
    } else if (previewTemplate === 'stepper') {
      renderStepperPreview(previewForm);
    } else {
      renderHorizontalTabsPreview(previewForm);
    }

    attachPreviewInteractions(previewForm);
  }

  // Render fields of a tab into a container
  function renderTabFields(tab, container) {
    (tab.fields || []).forEach(field => {
      const wrap = document.createElement('div');
      wrap.className = 'preview-field mb-3';
      wrap.dataset.fieldId = field.id;
      if (field.name) wrap.dataset.fieldName = field.name;
      wrap.innerHTML = renderPreviewField(field);
      container.appendChild(wrap);
    });
  }

  // Footer factory: returns a div with Prev/Next/Submit buttons.
  // onPrev/onNext - functions; if null, button is hidden
  // isLast - if true, Next becomes Submit
  function makeFooterButtons({ onPrev, onNext, isLast, showOnly }) {
    const nav = document.createElement('div');
    nav.className = 'preview-tab-nav-actions d-flex justify-content-between gap-2 mt-4 pt-3 border-top';

    if (showOnly === 'submit-only') {
      const submit = document.createElement('button');
      submit.type = 'button';
      submit.className = 'btn btn-primary ms-auto';
      submit.textContent = 'Submit';
      submit.addEventListener('click', () => showToast('Form submitted! (preview only)', 'success'));
      nav.appendChild(submit);
      return nav;
    }

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'btn btn-outline-secondary';
    prev.innerHTML = '&larr; Previous';
    prev.disabled = !onPrev;
    if (onPrev) prev.addEventListener('click', onPrev);
    nav.appendChild(prev);

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn btn-primary';
    next.innerHTML = isLast ? 'Submit' : 'Next &rarr;';
    next.addEventListener('click', () => {
      if (isLast) showToast('Form submitted! (preview only)', 'success');
      else if (onNext) onNext();
    });
    nav.appendChild(next);
    return nav;
  }

  // 1) Single Page — stack all tabs' fields vertically
  function renderSinglePagePreview(host) {
    const inner = document.createElement('div');
    inner.className = 'preview-tab-panel single active p-4';
    tabs.forEach((tab, i) => {
      if (tabs.length > 1) {
        const sectionLabel = document.createElement('div');
        sectionLabel.className = 'preview-section-label';
        sectionLabel.innerHTML = tabIconHtml(tab) + escHtml(tab.name);
        inner.appendChild(sectionLabel);
      }
      renderTabFields(tab, inner);
      if (tabs.length > 1 && i < tabs.length - 1) {
        const hr = document.createElement('hr');
        hr.className = 'my-4';
        inner.appendChild(hr);
      }
    });
    inner.appendChild(makeFooterButtons({ showOnly: 'submit-only' }));
    host.appendChild(inner);
  }

  // 2) Horizontal Tabs
  function renderHorizontalTabsPreview(host) {
    const isMulti = tabs.length > 1;
    let active = activeTabId;

    if (isMulti) {
      const nav = document.createElement('ul');
      nav.className = 'nav nav-tabs preview-tabs-nav';
      nav.setAttribute('role', 'tablist');
      tabs.forEach(tab => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.setAttribute('role', 'presentation');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nav-link preview-tab-btn' + (tab.id === active ? ' active' : '');
        btn.innerHTML = tabIconHtml(tab) + escHtml(tab.name);
        btn.dataset.previewTab = tab.id;
        btn.addEventListener('click', () => {
          active = tab.id;
          host.querySelectorAll('.preview-tab-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.previewTab === active));
          host.querySelectorAll('.preview-tab-panel').forEach(p =>
            p.classList.toggle('active', p.dataset.previewPanel === active));
        });
        li.appendChild(btn);
        nav.appendChild(li);
      });
      host.appendChild(nav);
    }

    tabs.forEach((tab, idx) => {
      const panel = document.createElement('div');
      panel.className = 'preview-tab-panel p-4' + (tab.id === active ? ' active' : '') + (isMulti ? '' : ' single');
      panel.dataset.previewPanel = tab.id;
      renderTabFields(tab, panel);

      if (isMulti) {
        panel.appendChild(makeFooterButtons({
          onPrev: idx > 0 ? () => {
            active = tabs[idx - 1].id;
            host.querySelectorAll('.preview-tab-btn').forEach(b =>
              b.classList.toggle('active', b.dataset.previewTab === active));
            host.querySelectorAll('.preview-tab-panel').forEach(p =>
              p.classList.toggle('active', p.dataset.previewPanel === active));
          } : null,
          onNext: idx < tabs.length - 1 ? () => {
            active = tabs[idx + 1].id;
            host.querySelectorAll('.preview-tab-btn').forEach(b =>
              b.classList.toggle('active', b.dataset.previewTab === active));
            host.querySelectorAll('.preview-tab-panel').forEach(p =>
              p.classList.toggle('active', p.dataset.previewPanel === active));
          } : null,
          isLast: idx === tabs.length - 1
        }));
      } else {
        panel.appendChild(makeFooterButtons({ showOnly: 'submit-only' }));
      }

      host.appendChild(panel);
    });
  }

  // 3) Vertical Tabs
  function renderVerticalTabsPreview(host) {
    const isMulti = tabs.length > 1;
    let active = activeTabId;

    const split = document.createElement('div');
    split.className = 'preview-vtabs-split';

    if (isMulti) {
      const nav = document.createElement('div');
      nav.className = 'preview-vtabs-nav nav flex-column nav-pills p-3 gap-1';
      tabs.forEach((tab, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nav-link preview-vtab-btn d-flex align-items-center gap-2' + (tab.id === active ? ' active' : '');
        btn.dataset.previewTab = tab.id;
        const badge = tab.icon
          ? `<span class="vtab-num"><i class="bi ${escAttr(tab.icon)}"></i></span>`
          : `<span class="vtab-num">${i + 1}</span>`;
        btn.innerHTML = `${badge}<span class="vtab-name">${escHtml(tab.name)}</span>`;
        btn.addEventListener('click', () => {
          active = tab.id;
          host.querySelectorAll('.preview-vtab-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.previewTab === active));
          host.querySelectorAll('.preview-tab-panel').forEach(p =>
            p.classList.toggle('active', p.dataset.previewPanel === active));
        });
        nav.appendChild(btn);
      });
      split.appendChild(nav);
    }

    const panelsCol = document.createElement('div');
    panelsCol.className = 'preview-vtabs-panels';
    tabs.forEach((tab, idx) => {
      const panel = document.createElement('div');
      panel.className = 'preview-tab-panel p-4' + (tab.id === active ? ' active' : '') + (isMulti ? '' : ' single');
      panel.dataset.previewPanel = tab.id;
      renderTabFields(tab, panel);

      if (isMulti) {
        panel.appendChild(makeFooterButtons({
          onPrev: idx > 0 ? () => {
            active = tabs[idx - 1].id;
            host.querySelectorAll('.preview-vtab-btn').forEach(b =>
              b.classList.toggle('active', b.dataset.previewTab === active));
            host.querySelectorAll('.preview-tab-panel').forEach(p =>
              p.classList.toggle('active', p.dataset.previewPanel === active));
          } : null,
          onNext: idx < tabs.length - 1 ? () => {
            active = tabs[idx + 1].id;
            host.querySelectorAll('.preview-vtab-btn').forEach(b =>
              b.classList.toggle('active', b.dataset.previewTab === active));
            host.querySelectorAll('.preview-tab-panel').forEach(p =>
              p.classList.toggle('active', p.dataset.previewPanel === active));
          } : null,
          isLast: idx === tabs.length - 1
        }));
      } else {
        panel.appendChild(makeFooterButtons({ showOnly: 'submit-only' }));
      }

      panelsCol.appendChild(panel);
    });
    split.appendChild(panelsCol);
    host.appendChild(split);
  }

  // 4) Accordion — collapsible sections with a single Submit at bottom
  function renderAccordionPreview(host) {
    let openId = activeTabId;
    const acc = document.createElement('div');
    acc.className = 'accordion';
    acc.id = 'previewAcc_' + Math.random().toString(36).substr(2, 6);
    tabs.forEach((tab, i) => {
      const isOpen = tab.id === openId;
      const headerId = `${acc.id}_h_${i}`;
      const bodyId = `${acc.id}_b_${i}`;
      const item = document.createElement('div');
      item.className = 'accordion-item preview-accordion-section' + (isOpen ? ' open' : '');
      item.dataset.accSection = tab.id;
      item.innerHTML = `
        <h2 class="accordion-header" id="${headerId}">
          <button class="accordion-button preview-accordion-header${isOpen ? '' : ' collapsed'}" type="button" aria-expanded="${isOpen}" aria-controls="${bodyId}">
            ${tabIconHtml(tab)}${escHtml(tab.name)}
          </button>
        </h2>
        <div id="${bodyId}" class="accordion-collapse collapse${isOpen ? ' show' : ''}" aria-labelledby="${headerId}">
          <div class="accordion-body preview-accordion-body"></div>
        </div>`;
      const body = item.querySelector('.preview-accordion-body');
      renderTabFields(tab, body);
      const headerBtn = item.querySelector('.accordion-button');
      const collapse = item.querySelector('.accordion-collapse');
      headerBtn.addEventListener('click', () => {
        const willOpen = !item.classList.contains('open');
        item.classList.toggle('open', willOpen);
        headerBtn.classList.toggle('collapsed', !willOpen);
        headerBtn.setAttribute('aria-expanded', String(willOpen));
        collapse.classList.toggle('show', willOpen);
      });
      acc.appendChild(item);
    });
    host.appendChild(acc);

    // Submit footer for the whole form
    const footer = document.createElement('div');
    footer.className = 'preview-accordion-footer p-3 bg-light border-top';
    footer.appendChild(makeFooterButtons({ showOnly: 'submit-only' }));
    host.appendChild(footer);
  }

  // 5) Stepper / Wizard
  function renderStepperPreview(host) {
    let activeIdx = tabs.findIndex(t => t.id === activeTabId);
    if (activeIdx < 0) activeIdx = 0;

    const steps = document.createElement('div');
    steps.className = 'preview-stepper-bar';
    tabs.forEach((tab, i) => {
      const step = document.createElement('div');
      step.className = 'stepper-step' + (i === activeIdx ? ' active' : '') + (i < activeIdx ? ' done' : '');
      const circleContent = i < activeIdx
        ? '✓'
        : (tab.icon ? `<i class="bi ${escAttr(tab.icon)}"></i>` : (i + 1));
      step.innerHTML = `
        <div class="stepper-circle">${circleContent}</div>
        <div class="stepper-label">${escHtml(tab.name)}</div>
        ${i < tabs.length - 1 ? '<div class="stepper-line"></div>' : ''}`;
      steps.appendChild(step);
    });
    host.appendChild(steps);

    const panel = document.createElement('div');
    panel.className = 'preview-tab-panel active p-4';
    renderTabFields(tabs[activeIdx], panel);

    panel.appendChild(makeFooterButtons({
      onPrev: activeIdx > 0 ? () => {
        activeTabId = tabs[activeIdx - 1].id;
        renderPreview();
      } : null,
      onNext: activeIdx < tabs.length - 1 ? () => {
        activeTabId = tabs[activeIdx + 1].id;
        renderPreview();
      } : null,
      isLast: activeIdx === tabs.length - 1
    }));

    host.appendChild(panel);
  }

  // Wire interactions across all preview templates
  function attachPreviewInteractions(host) {
    // Rating
    host.querySelectorAll('.preview-rating').forEach(rating => {
      const stars = rating.querySelectorAll('.star');
      stars.forEach((star, i) => {
        star.addEventListener('mouseenter', () => stars.forEach((s, j) => s.classList.toggle('filled', j <= i)));
        star.addEventListener('click', () => {
          rating.dataset.value = i + 1;
          stars.forEach((s, j) => s.classList.toggle('filled', j <= i));
          evaluateConditionals(host);
        });
      });
      rating.addEventListener('mouseleave', () => {
        const filled = parseInt(rating.dataset.value) || 0;
        stars.forEach((s, j) => s.classList.toggle('filled', j < filled));
      });
    });
    // Range slider (dual handles)
    host.querySelectorAll('.preview-rangeslider').forEach(rs => {
      const minIn = rs.querySelector('.rs-input-min');
      const maxIn = rs.querySelector('.rs-input-max');
      const fill = rs.querySelector('.rs-fill');
      const valMin = rs.querySelector('.rs-val-min');
      const valMax = rs.querySelector('.rs-val-max');
      const min = parseFloat(rs.dataset.min);
      const max = parseFloat(rs.dataset.max);
      const span = max - min || 1;
      function update() {
        let a = parseFloat(minIn.value);
        let b = parseFloat(maxIn.value);
        if (a > b) { [a, b] = [b, a]; minIn.value = a; maxIn.value = b; }
        const left = ((a - min) / span) * 100;
        const right = ((b - min) / span) * 100;
        fill.style.left = left + '%';
        fill.style.right = (100 - right) + '%';
        valMin.textContent = a;
        valMax.textContent = b;
      }
      minIn.addEventListener('input', update);
      maxIn.addEventListener('input', update);
      update();
    });
    // Conditional logic: re-evaluate on any input change
    host.addEventListener('input', () => evaluateConditionals(host));
    host.addEventListener('change', () => evaluateConditionals(host));
    evaluateConditionals(host);
  }

  // Read the current value of a field's preview wrapper
  function getFieldValue(field, host) {
    const wrap = host.querySelector(`[data-field-id="${field.id}"]`);
    if (!wrap) return '';
    if (field.type === 'checkbox' || field.type === 'toggle') {
      const cb = wrap.querySelector('input[type="checkbox"]');
      return cb ? cb.checked : false;
    }
    if (field.type === 'checkboxgroup') {
      return Array.from(wrap.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    }
    if (field.type === 'radio') {
      const sel = wrap.querySelector('input[type="radio"]:checked');
      return sel ? sel.value : '';
    }
    if (field.type === 'multiselect') {
      const sel = wrap.querySelector('select');
      return sel ? Array.from(sel.selectedOptions).map(o => o.value) : [];
    }
    if (field.type === 'rating') {
      const r = wrap.querySelector('.preview-rating');
      return r ? parseInt(r.dataset.value) || 0 : 0;
    }
    if (field.type === 'rangeslider') {
      const a = wrap.querySelector('.rs-input-min');
      const b = wrap.querySelector('.rs-input-max');
      return [a ? a.value : 0, b ? b.value : 0];
    }
    const inp = wrap.querySelector('input, select, textarea');
    return inp ? inp.value : '';
  }

  function compareValue(actual, operator, expected) {
    const actualStr = Array.isArray(actual) ? actual.join(',') : String(actual ?? '');
    const expStr = String(expected ?? '');
    switch (operator) {
      case 'equals':       return actualStr === expStr || (Array.isArray(actual) && actual.includes(expStr));
      case 'not_equals':   return !(actualStr === expStr || (Array.isArray(actual) && actual.includes(expStr)));
      case 'contains':     return actualStr.toLowerCase().includes(expStr.toLowerCase());
      case 'not_contains': return !actualStr.toLowerCase().includes(expStr.toLowerCase());
      case 'empty':        return !actualStr || (Array.isArray(actual) && actual.length === 0);
      case 'not_empty':    return !!actualStr || (Array.isArray(actual) && actual.length > 0);
      case 'checked':      return actual === true;
      case 'unchecked':    return actual === false;
      case 'greater_than': return parseFloat(actualStr) > parseFloat(expStr);
      case 'less_than':    return parseFloat(actualStr) < parseFloat(expStr);
      default: return true;
    }
  }

  function evaluateConditionals(host) {
    const allFields = tabs.flatMap(t => t.fields || []);
    allFields.forEach(field => {
      const c = field.conditional;
      if (!c || !c.enabled || !c.field) return;
      const target = allFields.find(f => f.id === c.field);
      if (!target) return;
      const actualVal = getFieldValue(target, host);
      const matches = compareValue(actualVal, c.operator, c.value);
      const wrap = host.querySelector(`[data-field-id="${field.id}"]`);
      if (!wrap) return;

      // Apply action
      if (c.action === 'show') {
        wrap.style.display = matches ? '' : 'none';
      } else if (c.action === 'hide') {
        wrap.style.display = matches ? 'none' : '';
      } else if (c.action === 'enable' || c.action === 'disable') {
        const shouldDisable = c.action === 'enable' ? !matches : matches;
        wrap.querySelectorAll('input, select, textarea, button').forEach(el => {
          el.disabled = shouldDisable || field.disabled;
        });
        wrap.classList.toggle('preview-field-disabled', shouldDisable);
      }
    });
  }

  function renderPreviewField(field) {
    const req = field.required ? '<span class="text-danger ms-1">*</span>' : '';
    const lbl = field.label ? `<label class="form-label">${escHtml(field.label)}${req}</label>` : '';
    const help = field.helpText ? `<div class="form-text">${escHtml(field.helpText)}</div>` : '';

    // Common attribute string for input-like elements
    const commonAttrs = [
      field.name ? `name="${escAttr(field.name)}"` : '',
      field.required ? 'required' : '',
      field.readonly ? 'readonly' : '',
      field.disabled ? 'disabled' : '',
      field.autocomplete ? `autocomplete="${escAttr(field.autocomplete)}"` : ''
    ].filter(Boolean).join(' ');

    const extraClass = field.cssClass ? ' ' + escAttr(field.cssClass) : '';

    switch (field.type) {
      case 'text': case 'email': case 'password': case 'tel': case 'url': case 'number':
      case 'date': case 'time': case 'datetime-local': {
        const minMax = (field.min !== undefined && field.min !== '' ? `min="${escAttr(field.min)}" ` : '')
                     + (field.max !== undefined && field.max !== '' ? `max="${escAttr(field.max)}" ` : '')
                     + (field.step ? `step="${escAttr(field.step)}" ` : '')
                     + (field.minLength ? `minlength="${field.minLength}" ` : '')
                     + (field.maxLength ? `maxlength="${field.maxLength}" ` : '')
                     + (field.pattern ? `pattern="${escAttr(field.pattern)}" ` : '');
        return lbl + `<input class="form-control${extraClass}" type="${field.type}" placeholder="${escAttr(field.placeholder || '')}" value="${escAttr(field.defaultValue ?? '')}" ${commonAttrs} ${minMax}>` + help;
      }
      case 'textarea':
        return lbl + `<textarea class="form-control${extraClass}" rows="${field.rows||4}" placeholder="${escAttr(field.placeholder||'')}" ${commonAttrs}${field.minLength?` minlength="${field.minLength}"`:''}${field.maxLength?` maxlength="${field.maxLength}"`:''}>${escHtml(field.defaultValue || '')}</textarea>` + help;
      case 'richtext':
        return lbl + `<textarea class="form-control${extraClass}" rows="4" placeholder="${escAttr(field.placeholder||'')}" ${commonAttrs}>${escHtml(field.defaultValue || '')}</textarea>` + help;
      case 'select': {
        const opts = (field.options||[]).map(o => `<option value="${escAttr(o)}"${field.defaultValue===o?' selected':''}>${escHtml(o)}</option>`).join('');
        const phSelected = !field.defaultValue ? ' selected' : '';
        return lbl + `<select class="form-select${extraClass}" ${commonAttrs}><option value="" disabled${phSelected}>${escHtml(field.placeholder||'Select…')}</option>${opts}</select>` + help;
      }
      case 'multiselect': {
        const sel = Array.isArray(field.defaultValue) ? field.defaultValue : [];
        const opts = (field.options||[]).map(o => `<option value="${escAttr(o)}"${sel.includes(o)?' selected':''}>${escHtml(o)}</option>`).join('');
        return lbl + `<select class="form-select${extraClass}" multiple size="${Math.min(5, (field.options||[]).length)}" ${commonAttrs}>${opts}</select>` + help;
      }
      case 'radio': {
        const items = (field.options||[]).map((o,i) => {
          const id = `r_${field.id}_${i}`;
          return `<div class="form-check">
            <input class="form-check-input" type="radio" id="${id}" name="${escAttr(field.name || 'r_'+field.id)}" value="${escAttr(o)}"${field.defaultValue===o?' checked':''}${field.required&&i===0?' required':''}${field.disabled?' disabled':''}${field.readonly?' onclick="return false"':''}>
            <label class="form-check-label" for="${id}">${escHtml(o)}</label>
          </div>`;
        }).join('');
        return lbl + items + help;
      }
      case 'checkbox': {
        const id = `cb_${field.id}`;
        return `<div class="form-check">
          <input class="form-check-input" type="checkbox" id="${id}" ${commonAttrs}${field.defaultChecked?' checked':''}>
          <label class="form-check-label" for="${id}">${escHtml(field.label||'')}${req}</label>
        </div>` + help;
      }
      case 'checkboxgroup': {
        const sel = Array.isArray(field.defaultValue) ? field.defaultValue : [];
        const items = (field.options||[]).map((o,i) => {
          const id = `cbg_${field.id}_${i}`;
          return `<div class="form-check">
            <input class="form-check-input" type="checkbox" id="${id}" name="${escAttr(field.name || field.id)}" value="${escAttr(o)}"${sel.includes(o)?' checked':''}${field.disabled?' disabled':''}${field.readonly?' onclick="return false"':''}>
            <label class="form-check-label" for="${id}">${escHtml(o)}</label>
          </div>`;
        }).join('');
        return lbl + items + help;
      }
      case 'toggle': {
        const id = `tg_${field.id}`;
        return `<div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" role="switch" id="${id}" ${commonAttrs}${field.defaultOn?' checked':''}>
          <label class="form-check-label" for="${id}">${escHtml(field.label||'')}${req}</label>
        </div>` + help;
      }
      case 'range':
        return lbl + `<input type="range" class="form-range${extraClass}" min="${field.min||0}" max="${field.max||100}" step="${field.step||1}" value="${field.defaultVal||50}" ${commonAttrs}>` + help;
      case 'rangeslider': {
        // Bootstrap doesn't have a native dual-handle range; keep our custom widget but the labels use bootstrap classes
        const min = Number(field.min) || 0;
        const max = Number(field.max) || 100;
        const step = Number(field.step) || 1;
        const dMin = Number(field.defaultMin) ?? min;
        const dMax = Number(field.defaultMax) ?? max;
        return lbl + `
          <div class="preview-rangeslider${extraClass}" data-min="${min}" data-max="${max}" data-step="${step}">
            <div class="rs-track"><div class="rs-fill"></div></div>
            <input type="range" class="rs-input rs-input-min" min="${min}" max="${max}" step="${step}" value="${dMin}"${field.disabled?' disabled':''}>
            <input type="range" class="rs-input rs-input-max" min="${min}" max="${max}" step="${step}" value="${dMax}"${field.disabled?' disabled':''}>
            <div class="rs-values d-flex justify-content-between mt-2 small text-muted"><span class="rs-val-min">${dMin}</span><span class="rs-val-max">${dMax}</span></div>
          </div>` + help;
      }
      case 'rating': {
        const dv = Number(field.defaultValue) || 0;
        const stars = Array.from({length: field.maxStars||5}, (_,i) => `<span class="star${i < dv ? ' filled' : ''}">★</span>`).join('');
        return lbl + `<div class="preview-rating${extraClass}" data-value="${dv}">${stars}</div>` + help;
      }
      case 'file':
        return lbl + `<input type="file" class="form-control${extraClass}" accept="${escAttr(field.accept||'')}" ${field.multiple?'multiple':''} ${commonAttrs}>` + help;
      case 'color':
        return lbl + `<input type="color" class="form-control form-control-color${extraClass}" value="${escAttr(field.defaultVal||'#5b54e6')}" ${commonAttrs}>` + help;
      case 'heading': {
        const tag = field.level || 'h2';
        return `<${tag} class="mb-2">${escHtml(field.text||'')}</${tag}>`;
      }
      case 'paragraph':
        return `<p class="text-muted mb-2">${escHtml(field.text||'')}</p>`;
      case 'divider':
        return `<hr>`;
      case 'columns':
        return `<div class="row"><div class="col"></div><div class="col"></div></div>`;
      case 'submit': {
        const alignClass = {
          full: 'w-100',
          center: 'd-block mx-auto',
          right: 'd-block ms-auto',
          left: ''
        };
        return `<button type="button" class="btn btn-primary ${alignClass[field.align||'full']||''}" onclick="(function(b){b.disabled=true;b.textContent='Submitted ✓';})(this)">${escHtml(field.label||'Submit')}</button>`;
      }
      default: return '';
    }
  }

  // ── Export ────────────────────────────────────────────────
  function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }

  function getCleanFormName() {
    const name = (formNameInput.value || 'form').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return name || 'form';
  }

  // Map width keyword → pixel width (for off-screen exports). 'full' uses 1100px as a sensible default.
  const WIDTH_PX = { sm: 420, md: 580, lg: 800, xl: 1100, xxl: 1400, full: 1100 };

  // Build a fully self-contained form node based on the current schema +
  // applies the user's chosen width, border, shadow, rounded — independent of the live preview's container.
  // Used for image/pdf/html exports so visuals match the user's selected settings exactly.
  function buildExportableForm() {
    // Clone the live form so we capture the current input state (entered values, etc.)
    const live = document.getElementById('previewForm');
    if (!live) return null;
    const clone = live.cloneNode(true);

    // Force its declared width as an explicit pixel value so html2canvas captures it correctly.
    const px = WIDTH_PX[previewWidth] || WIDTH_PX.md;
    clone.style.maxWidth = px + 'px';
    clone.style.width = px + 'px';
    clone.style.margin = '0';

    // Persist current input values from the live DOM into the cloned DOM.
    // (cloneNode does not copy live values for some inputs like <textarea> typed content beyond defaultValue,
    // and does not preserve checked state for radios that were clicked.)
    const liveInputs = live.querySelectorAll('input, textarea, select');
    const cloneInputs = clone.querySelectorAll('input, textarea, select');
    liveInputs.forEach((el, i) => {
      const target = cloneInputs[i];
      if (!target) return;
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.checked) target.setAttribute('checked', 'checked');
        else target.removeAttribute('checked');
      } else if (el.tagName === 'SELECT') {
        Array.from(el.options).forEach((opt, idx) => {
          if (target.options[idx]) {
            if (opt.selected) target.options[idx].setAttribute('selected', 'selected');
            else target.options[idx].removeAttribute('selected');
          }
        });
      } else if (el.tagName === 'TEXTAREA') {
        target.textContent = el.value;
      } else {
        target.setAttribute('value', el.value);
      }
    });

    // Preserve the active tab class state for horizontal/vertical/accordion templates
    return clone;
  }

  // Render an off-screen sandbox containing the form at its declared width plus a title row.
  // Returns { sandbox, cleanup } where cleanup() removes the sandbox from the DOM.
  function buildExportSandbox() {
    const px = WIDTH_PX[previewWidth] || WIDTH_PX.md;

    const sandbox = document.createElement('div');
    sandbox.style.cssText = `
      position: absolute;
      top: -10000px;
      left: -10000px;
      width: ${px + 80}px;
      padding: 40px;
      background: #ffffff;
      font-family: 'DM Sans', sans-serif;
      box-sizing: border-box;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      max-width: ${px}px;
      margin: 0 auto 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid #e4e6eb;
    `;
    title.innerHTML = `
      <div style="font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#5b54e6;margin-bottom:6px;">FormCraft Form</div>
      <h1 style="font-size:22px;font-weight:600;color:#1a1d24;margin:0;">${escHtml(formNameInput.value || 'Untitled Form')}</h1>
    `;
    sandbox.appendChild(title);

    const formClone = buildExportableForm();
    if (formClone) {
      // Center the form
      formClone.style.margin = '0 auto';
      sandbox.appendChild(formClone);
    }

    document.body.appendChild(sandbox);
    return {
      sandbox,
      cleanup: () => sandbox.remove()
    };
  }

  async function doExport(fmt) {
    const previewForm = document.getElementById('previewForm');
    if (!previewForm || !previewForm.children.length) {
      showToast('Nothing to export. Add some fields first.', 'error');
      return;
    }
    showToast(`Exporting ${fmt.toUpperCase()}…`);

    if (fmt === 'html') {
      exportHTML();
    } else if (fmt === 'image') {
      await exportImage();
    } else if (fmt === 'pdf') {
      await exportPDF();
    }
  }

  function exportHTML() {
    // Build a standalone HTML file: the form keeps its own width/border/shadow/rounded styling
    // and is centered on the page. No surrounding card wrapper that would override the user's choices.
    const schema = buildSchema();
    Promise.all([
      fetch('/css/preview.css').then(r => r.text()),
      fetch('/js/renderer.js').then(r => r.text())
    ])
      .then(([css, rendererJs]) => {
        // Extra page-level CSS so the form sits centered on a clean page background and includes a title
        const pageStyles = `
          body { background: #f6f7f9; min-height: 100vh; }
          .formcraft-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 48px 24px;
            box-sizing: border-box;
          }
          .formcraft-title {
            text-align: center;
            margin-bottom: 28px;
          }
          .formcraft-title .formcraft-badge {
            display: inline-block;
            background: #eeedfb; color: #5b54e6;
            border: 1px solid rgba(91,84,230,0.2);
            border-radius: 20px;
            font-size: 11px; font-weight: 600;
            letter-spacing: 0.5px; padding: 3px 10px;
            text-transform: uppercase; margin-bottom: 10px;
          }
          .formcraft-title h1 {
            font-size: 26px; font-weight: 600; color: #1a1d24;
            margin: 0;
          }
          .success-msg {
            margin-top: 24px;
            text-align: center;
            padding: 30px 24px;
            background: #ffffff;
            border: 1px solid #e4e6eb;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(15,18,28,0.08);
            max-width: 480px;
            width: 100%;
          }
          /* The form itself owns its width/border/shadow/rounded via classes from the schema */
          #formContainer { width: 100%; display: flex; justify-content: center; }
        `;
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(schema.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css" rel="stylesheet">
<style>${css}
${pageStyles}</style>
</head>
<body>
<div class="formcraft-page">
  <div class="formcraft-title">
    <span class="formcraft-badge">FormCraft</span>
    <h1>${escHtml(schema.name)}</h1>
  </div>
  <div id="formContainer"></div>
  <div class="success-msg" id="successMsg" style="display:none">
    <div class="success-icon" style="width:52px;height:52px;border-radius:50%;background:rgba(22,168,107,0.15);color:#16a86b;font-size:22px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">✓</div>
    <div class="success-title" style="font-size:18px;font-weight:600;margin-bottom:6px;">Form Submitted!</div>
    <div class="success-sub" style="font-size:13px;color:#5a6072;">Thank you for your response.</div>
  </div>
</div>
<script>const schema = ${JSON.stringify(schema)};</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
<script>${rendererJs}</script>
</body>
</html>`;
        const blob = new Blob([html], { type: 'text/html' });
        downloadFile(blob, `${getCleanFormName()}.html`);
        showToast('✓ HTML exported', 'success');
      })
      .catch(err => {
        console.error(err);
        showToast('HTML export failed', 'error');
      });
  }

  async function exportImage() {
    if (typeof html2canvas !== 'function') {
      showToast('Image export library not loaded', 'error');
      return;
    }
    const { sandbox, cleanup } = buildExportSandbox();
    try {
      // Wait one frame so layout settles (esp. for accordion/stepper internal transitions)
      await new Promise(r => requestAnimationFrame(r));
      const canvas = await html2canvas(sandbox, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: sandbox.scrollWidth,
        windowHeight: sandbox.scrollHeight
      });
      canvas.toBlob(blob => {
        cleanup();
        if (blob) {
          downloadFile(blob, `${getCleanFormName()}.png`);
          showToast('✓ Image exported', 'success');
        } else {
          showToast('Image export failed', 'error');
        }
      }, 'image/png');
    } catch (err) {
      cleanup();
      console.error(err);
      showToast('Image export failed', 'error');
    }
  }

  async function exportPDF() {
    if (typeof html2canvas !== 'function' || !window.jspdf) {
      showToast('PDF library not loaded', 'error');
      return;
    }
    const { sandbox, cleanup } = buildExportSandbox();
    try {
      await new Promise(r => requestAnimationFrame(r));
      const canvas = await html2canvas(sandbox, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: sandbox.scrollWidth,
        windowHeight: sandbox.scrollHeight
      });
      cleanup();

      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;

      // Pick PDF orientation/format based on form width:
      // Wide forms (xl, xxl, full) → landscape A4; everything else → portrait A4
      const isWide = ['xl', 'xxl', 'full'].includes(previewWidth);
      const orientation = isWide ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 30;
      const usableW = pdfW - margin * 2;
      const ratio = canvas.width / usableW;
      const drawH = canvas.height / ratio;
      const drawY = margin;
      const maxPerPage = pdfH - drawY - margin;

      if (drawH <= maxPerPage) {
        pdf.addImage(imgData, 'PNG', margin, drawY, usableW, drawH);
      } else {
        // Multi-page: slice canvas
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        const sliceHeightPx = Math.floor(maxPerPage * ratio);
        pageCanvas.width = canvas.width;
        let yPx = 0;
        let isFirst = true;
        while (yPx < canvas.height) {
          const sliceH = Math.min(sliceHeightPx, canvas.height - yPx);
          pageCanvas.height = sliceH;
          pageCtx.fillStyle = '#ffffff';
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageCtx.drawImage(canvas, 0, yPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const sliceData = pageCanvas.toDataURL('image/png');
          if (!isFirst) pdf.addPage();
          pdf.addImage(sliceData, 'PNG', margin, margin, usableW, sliceH / ratio);
          yPx += sliceH;
          isFirst = false;
        }
      }

      pdf.save(`${getCleanFormName()}.pdf`);
      showToast('✓ PDF exported', 'success');
    } catch (err) {
      cleanup();
      console.error(err);
      showToast('PDF export failed', 'error');
    }
  }

  // ── JSON Mode ─────────────────────────────────────────────
  // Builds the complete form schema (single source of truth for both JSON view and Save)
  // ─────────────────────────────────────────────────────────
  // Default validation message templates (validatorjs format)
  // {{field}} is replaced with the field's label/attribute name at runtime by validatorjs;
  // we also do our own substitution here when generating per-field messages.
  // ─────────────────────────────────────────────────────────
  const DEFAULT_VALIDATION_MESSAGES = {
    required:           'The {field} field is required.',
    required_if:        'The {field} field is required when {other} is {value}.',
    required_unless:    'The {field} field is required unless {other} is {value}.',
    accepted:           'The {field} must be accepted.',
    email:              'The {field} must be a valid email address.',
    url:                'The {field} must be a valid URL.',
    numeric:            'The {field} must be a number.',
    integer:            'The {field} must be an integer.',
    array:              'The {field} must be an array.',
    date:               'The {field} must be a valid date.',
    'min.string':       'The {field} must be at least {min} characters.',
    'min.numeric':      'The {field} must be at least {min}.',
    'max.string':       'The {field} may not be greater than {max} characters.',
    'max.numeric':      'The {field} may not be greater than {max}.',
    'size.string':      'The {field} must be exactly {size} characters.',
    'size.numeric':     'The {field} must be exactly {size}.',
    in:                 'The selected {field} is invalid.',
    regex:              'The {field} format is invalid.',
    after_or_equal:     'The {field} must be on or after {date}.',
    before_or_equal:    'The {field} must be on or before {date}.',
  };

  // Pretty-print a label/attribute name from a field name.
  // Examples: 'full_name' -> 'full name', 'birthDate' -> 'birth Date'
  function humanizeName(s) {
    return String(s || '').replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  }

  // Substitute {field}, {min}, {max}, {size}, {other}, {value}, {date} placeholders.
  function fillTpl(tpl, vars) {
    return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : '{' + k + '}'));
  }

  // Pick the right default message for a given rule string.
  // Some rules (min/max/size) have separate templates for string vs numeric data.
  function defaultMessageForRule(ruleStr, fieldType, label, params) {
    const ruleName = ruleStr.split(':')[0];
    let tplKey = ruleName;
    if (['min','max','size'].includes(ruleName)) {
      const isNumeric = ['number','range','rangeslider','rating','integer'].includes(fieldType);
      tplKey = ruleName + '.' + (isNumeric ? 'numeric' : 'string');
    }
    const tpl = DEFAULT_VALIDATION_MESSAGES[tplKey];
    if (!tpl) return null;
    const vars = { field: label, ...params };
    return fillTpl(tpl, vars);
  }

  // ─────────────────────────────────────────────────────────
  // Build validatorjs-compatible rules + messages + attribute for a single field.
  // Used for both:
  //   - the per-field `validation` block stored on each saved field
  //   - the aggregated tab-level / form-level validation map
  //
  // Returns: { rules: [...], messages: { 'rule': msg }, attribute: 'Friendly Label', defaults: { key: val } }
  // The `messages` map uses bare rule names as keys (no field prefix) so it can be
  // either spread under a fieldName.* prefix (aggregated) or kept field-local.
  // ─────────────────────────────────────────────────────────
  function buildFieldValidation(field, allFields) {
    const SKIP_TYPES = new Set(['heading', 'paragraph', 'divider', 'columns', 'submit']);
    if (SKIP_TYPES.has(field.type)) return null;

    const key = field.name || field.id;
    const label = field.label || humanizeName(key);
    const fieldRules = [];
    const ruleParams = {}; // tracks {min: 5, max: 100, ...} for message substitution
    const messages = {};
    const defaults = {};

    // ── Required (with conditional support) ───────────────
    const cond = field.conditional;
    const hasConditionalRequired = cond && cond.enabled && cond.field
      && (cond.action === 'show' || cond.action === 'hide')
      && ['equals', 'not_equals', 'checked', 'unchecked'].includes(cond.operator);

    if (field.required) {
      if (hasConditionalRequired) {
        const target = allFields.find(f => f.id === cond.field);
        if (target) {
          const targetKey = target.name || target.id;
          const targetLabel = target.label || humanizeName(targetKey);
          let useIf = cond.action === 'show';
          let conditionVal = cond.value;
          if (cond.operator === 'checked') { conditionVal = 'true'; }
          else if (cond.operator === 'unchecked') { conditionVal = 'false'; }
          else if (cond.operator === 'not_equals') { useIf = !useIf; }
          const ruleName = useIf ? 'required_if' : 'required_unless';
          fieldRules.push(`${ruleName}:${targetKey},${conditionVal}`);
          ruleParams[ruleName] = { other: targetLabel, value: conditionVal };
        } else {
          fieldRules.push('required');
        }
      } else if (field.type === 'checkbox' || field.type === 'toggle') {
        fieldRules.push('accepted');
      } else {
        fieldRules.push('required');
      }
    }

    // ── Type-based rules ──────────────────────────────────
    switch (field.type) {
      case 'email': fieldRules.push('email'); break;
      case 'url': fieldRules.push('url'); break;
      case 'number':
      case 'range': fieldRules.push('numeric'); break;
      case 'tel': fieldRules.push('regex:/^[\\d\\s\\-\\+\\(\\)\\.]{7,20}$/'); break;
      case 'date':
      case 'datetime-local': fieldRules.push('date'); break;
      case 'multiselect':
      case 'checkboxgroup': fieldRules.push('array'); break;
      case 'rating': fieldRules.push('integer'); break;
    }

    // ── Length / value bounds ─────────────────────────────
    if (['text', 'textarea', 'richtext', 'password'].includes(field.type)) {
      if (field.minLength) {
        fieldRules.push('min:' + field.minLength);
        ruleParams.min = { min: field.minLength };
      }
      if (field.maxLength) {
        fieldRules.push('max:' + field.maxLength);
        ruleParams.max = { max: field.maxLength };
      }
    }
    if (field.type === 'number' || field.type === 'range') {
      if (field.min !== undefined && field.min !== '' && field.min !== null) {
        fieldRules.push('min:' + field.min);
        ruleParams.min = { min: field.min };
      }
      if (field.max !== undefined && field.max !== '' && field.max !== null) {
        fieldRules.push('max:' + field.max);
        ruleParams.max = { max: field.max };
      }
    }
    if (field.type === 'rating') {
      const ratingMin = field.required ? 1 : 0;
      const ratingMax = field.maxStars || 5;
      fieldRules.push('min:' + ratingMin);
      fieldRules.push('max:' + ratingMax);
      ruleParams.min = { min: ratingMin };
      ruleParams.max = { max: ratingMax };
    }

    // ── Pattern / Regex ───────────────────────────────────
    if (field.pattern && field.type === 'text') {
      fieldRules.push('regex:/' + field.pattern.replace(/\//g, '\\/') + '/');
    }

    // ── Options (in:) ─────────────────────────────────────
    if (['select', 'radio'].includes(field.type) && field.options && field.options.length > 0) {
      const optsList = field.options.map(o => String(o).replace(/,/g, '\\,')).join(',');
      fieldRules.push('in:' + optsList);
    }

    // ── Date min/max ──────────────────────────────────────
    if (field.type === 'date' || field.type === 'datetime-local') {
      if (field.min) {
        fieldRules.push('after_or_equal:' + field.min);
        ruleParams.after_or_equal = { date: field.min };
      }
      if (field.max) {
        fieldRules.push('before_or_equal:' + field.max);
        ruleParams.before_or_equal = { date: field.max };
      }
    }

    // ── Auto-generate messages for every rule ─────────────
    fieldRules.forEach(ruleStr => {
      const ruleName = ruleStr.split(':')[0];
      const params = ruleParams[ruleName] || {};
      // Use user's custom message if provided AND this rule is a "primary" candidate;
      // otherwise fall back to the default template.
      const primaryRule = field.required ? 'required'
                        : field.type === 'email' ? 'email'
                        : field.type === 'url' ? 'url'
                        : field.pattern ? 'regex'
                        : field.minLength ? 'min'
                        : field.maxLength ? 'max'
                        : null;
      if (field.errorMessage && ruleName === primaryRule) {
        messages[ruleName] = field.errorMessage;
      } else {
        const msg = defaultMessageForRule(ruleStr, field.type, label, params);
        if (msg) messages[ruleName] = msg;
      }
    });

    // ── Default value ─────────────────────────────────────
    if (field.defaultValue !== undefined && field.defaultValue !== '' && field.defaultValue !== null) {
      defaults[key] = field.defaultValue;
    } else if (field.type === 'checkbox' && field.defaultChecked) {
      defaults[key] = true;
    } else if (field.type === 'toggle' && field.defaultOn) {
      defaults[key] = true;
    } else if (field.type === 'range' && field.defaultVal !== undefined) {
      defaults[key] = field.defaultVal;
    } else if (field.type === 'color' && field.defaultVal) {
      defaults[key] = field.defaultVal;
    } else if (field.type === 'rangeslider') {
      defaults[key + '_min'] = field.defaultMin ?? field.min ?? 0;
      defaults[key + '_max'] = field.defaultMax ?? field.max ?? 100;
    }

    // For rangeslider, expose both halves as separate validatable keys
    let extra = null;
    if (field.type === 'rangeslider') {
      const minKey = key + '_min';
      const maxKey = key + '_max';
      const r = ['numeric'];
      const rsLabelMin = label + ' (min)';
      const rsLabelMax = label + ' (max)';
      if (field.min !== undefined && field.min !== '') r.push('min:' + field.min);
      if (field.max !== undefined && field.max !== '') r.push('max:' + field.max);
      if (field.required) r.unshift('required');
      // build messages for each half
      const minHalfMsgs = {}, maxHalfMsgs = {};
      r.forEach(rs => {
        const rn = rs.split(':')[0];
        const params = rn === 'min' ? { min: field.min }
                     : rn === 'max' ? { max: field.max } : {};
        const msgMin = defaultMessageForRule(rs, field.type, rsLabelMin, params);
        const msgMax = defaultMessageForRule(rs, field.type, rsLabelMax, params);
        if (msgMin) minHalfMsgs[rn] = msgMin;
        if (msgMax) maxHalfMsgs[rn] = msgMax;
      });
      extra = {
        keys: [
          { key: minKey, rules: r,        messages: minHalfMsgs, attribute: rsLabelMin },
          { key: maxKey, rules: [...r],   messages: maxHalfMsgs, attribute: rsLabelMax },
        ]
      };
    }

    return {
      key,
      rules: fieldRules,
      messages,           // keys are bare rule names (e.g. 'required', 'email', 'min')
      attribute: label,
      defaults,
      extra
    };
  }

  // Aggregate validation across a list of fields → validatorjs-ready maps
  function buildValidationRules(fields, allFields) {
    const rules = {};
    const messages = {};
    const attributes = {};
    const defaults = {};

    fields.forEach(field => {
      const v = buildFieldValidation(field, allFields);
      if (!v) return;
      if (v.rules.length > 0) {
        rules[v.key] = v.rules;
      }
      // Spread per-field messages into 'fieldName.ruleName' keys for the aggregated map
      Object.entries(v.messages).forEach(([ruleName, msg]) => {
        messages[`${v.key}.${ruleName}`] = msg;
      });
      if (v.attribute) attributes[v.key] = v.attribute;
      Object.assign(defaults, v.defaults);

      // rangeslider's extra keys
      if (v.extra && Array.isArray(v.extra.keys)) {
        v.extra.keys.forEach(half => {
          rules[half.key] = half.rules;
          attributes[half.key] = half.attribute;
          Object.entries(half.messages).forEach(([ruleName, msg]) => {
            messages[`${half.key}.${ruleName}`] = msg;
          });
        });
      }
    });

    return { rules, messages, attributes, defaults };
  }

  function buildSchema() {
    const allFields = tabs.flatMap(t => t.fields || []);
    return {
      version: '1.0',
      id: formId,
      name: formNameInput.value || 'Untitled Form',
      preview: {
        template: previewTemplate,
        width: previewWidth,
        style: {
          border: previewStyle.border,
          shadow: previewStyle.shadow,
          rounded: previewStyle.rounded
        }
      },
      tabs: tabs.map(tab => {
        const validation = buildValidationRules(tab.fields || [], allFields);
        return {
          id: tab.id,
          name: tab.name,
          icon: tab.icon || '',
          fields: (tab.fields || []).map(f => {
            const v = buildFieldValidation(f, allFields);
            // Per-field validation block — lets consumers validate this field independently
            // (e.g., on blur for live/inline validation) without pulling in the whole tab/form schema.
            const fieldValidation = v ? {
              key: v.key,
              rules: v.rules,
              messages: v.messages,        // bare rule names: { required: '…', email: '…', min: '…' }
              attribute: v.attribute,
              defaults: v.defaults,
              ...(v.extra ? { extra: v.extra } : {})
            } : null;
            return fieldValidation
              ? { ...f, validation: fieldValidation }
              : { ...f };
          }),
          // validatorjs-ready aggregate for this tab
          validation
        };
      }),
      // Combined validation across ALL tabs — useful for one-shot whole-form validation
      validation: buildValidationRules(allFields, allFields),
      meta: {
        savedAt: new Date().toISOString(),
        fieldCount: allFields.length,
        tabCount: tabs.length,
        validatorLibrary: 'validatorjs',
        validatorVersion: '^3.22.1',
        usage: [
          "// Install: npm install validatorjs",
          "// const Validator = require('validatorjs');",
          "//",
          "// === Whole-form validation ===",
          "//   const v = new Validator(formData, schema.validation.rules, schema.validation.messages);",
          "//   v.setAttributeNames(schema.validation.attributes);",
          "//   if (v.fails()) console.log(v.errors.all());",
          "//",
          "// === Tab-level validation (multi-step forms) ===",
          "//   const tab = schema.tabs[0];",
          "//   const v = new Validator(stepData, tab.validation.rules, tab.validation.messages);",
          "//",
          "// === Per-field validation (live/inline) ===",
          "//   const field = schema.tabs[0].fields[2];",
          "//   const rules = { [field.validation.key]: field.validation.rules };",
          "//   const messages = {};",
          "//   for (const [r, m] of Object.entries(field.validation.messages)) {",
          "//     messages[`${field.validation.key}.${r}`] = m;",
          "//   }",
          "//   const v = new Validator({ [field.validation.key]: value }, rules, messages);",
          "//",
          "// Note: For required_if rules referencing checkbox/toggle fields,",
          "// stringify the boolean value in the data, e.g. { newsletter: String(true) } -> 'true'."
        ].join('\n')
      }
    };
  }

  // ─────────────────────────────────────────────────────────
  // buildNodeformsJson(fullSchema)
  //
  // Converts the FormCraft schema produced by buildSchema() into the JSON
  // format consumed by the NodeForms (express-form-builder) library.
  //
  // The output is an array of TabDefinition objects, each containing:
  //   { name: string, label: string, icon?: string, fields: JsonFieldDefinition[] }
  //
  // It can be passed directly to:
  //   TabbedForm.fromTabs(json, formOptions, req)
  //
  // For single-tab forms a flat array of fields can also be extracted via
  // result[0].fields and used with formBuilder.createByJSON / createByArray.
  //
  // The mapping rules below cover every FormCraft field type and every
  // configurable property on it, including:
  //   - Bootstrap-Icons class on tabs (the 'bi-' prefix is stripped because
  //     NodeForms expects the bare glyph name in TabDefinition.icon).
  //   - validatorjs-style rule arrays are joined with '|' (Laravel pipe-syntax).
  //   - Conditional logic (show/hide/enable/disable) is converted to NodeForms
  //     `conditions` arrays.
  //   - Custom widgets (rangeslider, rating, richtext, toggle, multiselect,
  //     checkboxgroup, heading/paragraph/divider/columns) are translated to
  //     the closest native NodeForms type.
  // ─────────────────────────────────────────────────────────
  function buildNodeformsJson(fullSchema) {
    if (!fullSchema || !Array.isArray(fullSchema.tabs)) return [];

    // Map FormCraft conditional operators → NodeForms ConditionalOperator
    const COND_OPERATOR_MAP = {
      equals:        '===',
      not_equals:    '!==',
      contains:      'contains',
      not_contains:  'not_contains',
      empty:         'empty',
      not_empty:     'not_empty',
      checked:       '===',   // value will be set to '1'
      unchecked:     '!==',   // value will be set to '1'
      greater_than:  '>',
      less_than:     '<',
    };

    // Map FormCraft conditional actions → NodeForms ConditionalAction (1-to-1 here)
    const COND_ACTION_MAP = {
      show:    'show',
      hide:    'hide',
      enable:  'enable',
      disable: 'disable',
    };

    // Map FormCraft field types → NodeForms FieldType
    function mapType(type) {
      switch (type) {
        case 'toggle':         return 'checkbox';        // single boolean
        case 'multiselect':    return 'select';          // + multiple:true
        case 'checkboxgroup':  return 'choice';          // + expanded:true, multiple:true
        case 'richtext':       return 'textarea';        // closest native equivalent
        case 'rating':         return 'number';          // + attr.min/max
        case 'heading':
        case 'paragraph':
        case 'divider':        return 'static';          // read-only display
        // pass-through types
        case 'text':
        case 'email':
        case 'password':
        case 'tel':
        case 'url':
        case 'number':
        case 'date':
        case 'time':
        case 'datetime-local':
        case 'color':
        case 'range':
        case 'file':
        case 'select':
        case 'radio':
        case 'checkbox':
        case 'textarea':
        case 'submit':         return type;
        default:               return type || 'text';
      }
    }

    // Helper: turn an options array (['US','UK','IN']) into NodeForms `choices`
    // object format ({ 'US': 'US', 'UK': 'UK', 'IN': 'IN' }).
    function optionsToChoices(opts) {
      if (!Array.isArray(opts)) return undefined;
      const out = {};
      for (const o of opts) {
        const v = String(o);
        out[v] = v;
      }
      return out;
    }

    // Helper: assemble the rules string from validatorjs-style rule arrays.
    // The per-field validation block (built earlier by buildFieldValidation())
    // provides an array like ['required','email','min:2'] which we just '|'-join.
    function rulesString(field) {
      const v = field && field.validation;
      if (v && Array.isArray(v.rules) && v.rules.length > 0) {
        return v.rules.join('|');
      }
      return undefined;
    }

    // Helper: gather all error messages from per-field validation block,
    // shaped as { ruleName: message } — this matches NodeForms `error_messages`.
    function errorMessagesObj(field) {
      const v = field && field.validation;
      if (!v || !v.messages) return undefined;
      // Skip empty maps
      const keys = Object.keys(v.messages);
      if (keys.length === 0) return undefined;
      return { ...v.messages };
    }

    // Helper: translate a FormCraft conditional rule into NodeForms condition entry.
    function convertConditional(field, allFields) {
      const c = field.conditional;
      if (!c || !c.enabled || !c.field) return undefined;
      const target = allFields.find(f => f.id === c.field);
      if (!target) return undefined;
      const targetName = target.name || target.id;
      const op = COND_OPERATOR_MAP[c.operator] || '===';
      const action = COND_ACTION_MAP[c.action] || 'show';
      // Determine comparison value
      let value;
      if (c.operator === 'checked' || c.operator === 'unchecked') {
        // NodeForms checkbox values are the string '1' when checked
        value = '1';
      } else if (['empty', 'not_empty'].includes(c.operator)) {
        value = undefined;   // NodeForms 'empty'/'not_empty' don't need a value
      } else {
        value = c.value;
      }
      const cond = { when: targetName, operator: op, action };
      if (value !== undefined && value !== null && value !== '') cond.value = value;
      return cond;
    }

    // Build a NodeForms-style attr object from a FormCraft field
    function buildAttr(field) {
      const attr = {};
      if (field.placeholder) attr.placeholder = String(field.placeholder);
      if (field.cssClass)    attr.class = String(field.cssClass);
      if (field.readonly)    attr.readonly = true;
      if (field.autocomplete && field.autocomplete !== 'off') attr.autocomplete = String(field.autocomplete);

      // Numeric / range bounds → HTML5 attrs
      if (field.type === 'number' || field.type === 'range') {
        if (field.min !== undefined && field.min !== '' && field.min !== null) attr.min = String(field.min);
        if (field.max !== undefined && field.max !== '' && field.max !== null) attr.max = String(field.max);
        if (field.step !== undefined && field.step !== '' && field.step !== null) attr.step = String(field.step);
      }

      // Date min/max
      if (field.type === 'date' || field.type === 'datetime-local') {
        if (field.min) attr.min = String(field.min);
        if (field.max) attr.max = String(field.max);
      }

      // Textarea rows
      if (field.type === 'textarea' || field.type === 'richtext') {
        if (field.rows) attr.rows = String(field.rows);
      }

      // File upload extras
      if (field.type === 'file') {
        if (field.accept) attr.accept = String(field.accept);
        if (field.maxSize) attr['data-max-size'] = String(field.maxSize);
      }

      // Rating min/max are mapped onto its number representation
      if (field.type === 'rating') {
        attr.min = '0';
        attr.max = String(field.maxStars || 5);
        attr.step = '1';
      }

      // Maxlength / minlength for text-like fields
      if (['text', 'textarea', 'richtext', 'password'].includes(field.type)) {
        if (field.minLength) attr.minlength = String(field.minLength);
        if (field.maxLength) attr.maxlength = String(field.maxLength);
      }

      return Object.keys(attr).length ? attr : undefined;
    }

    // Convert one FormCraft field into one or more NodeForms field definitions.
    // Most field types produce exactly one entry; rangeslider produces two.
    function convertField(field, allFields) {
      // 'columns' is purely a layout container in FormCraft; it doesn't
      // exist in NodeForms and would have no effect — drop it.
      if (field.type === 'columns') return [];

      const out = [];
      const baseName = field.name || field.id;

      // ── rangeslider → two number fields ───────────────────
      // No native dual-handle widget in NodeForms, so we emit
      // {name}_min and {name}_max as plain number fields with the
      // shared min/max bounds copied onto them.
      if (field.type === 'rangeslider') {
        const minDef = {
          name: baseName + '_min',
          type: 'number',
          label: (field.label || baseName) + ' (min)',
        };
        const maxDef = {
          name: baseName + '_max',
          type: 'number',
          label: (field.label || baseName) + ' (max)',
        };
        const sharedAttr = {};
        if (field.min !== undefined && field.min !== '') sharedAttr.min = String(field.min);
        if (field.max !== undefined && field.max !== '') sharedAttr.max = String(field.max);
        if (field.step !== undefined && field.step !== '') sharedAttr.step = String(field.step);
        if (Object.keys(sharedAttr).length) {
          minDef.attr = { ...sharedAttr };
          maxDef.attr = { ...sharedAttr };
        }
        if (field.defaultMin !== undefined && field.defaultMin !== '') minDef.value = field.defaultMin;
        if (field.defaultMax !== undefined && field.defaultMax !== '') maxDef.value = field.defaultMax;
        if (field.helpText) {
          minDef.help_block = { text: field.helpText };
        }
        if (field.required) {
          minDef.rules = 'required|numeric';
          maxDef.rules = 'required|numeric';
        } else {
          minDef.rules = 'numeric';
          maxDef.rules = 'numeric';
        }
        // Conditional logic applied to both halves
        const cond = convertConditional(field, allFields);
        if (cond) {
          minDef.conditions = [cond];
          maxDef.conditions = [cond];
        }
        out.push(minDef, maxDef);
        return out;
      }

      // ── Layout-only static text fields ────────────────────
      if (field.type === 'heading' || field.type === 'paragraph') {
        out.push({
          name: baseName,
          type: 'static',
          label: '',
          value: field.text || '',
          // emit a minimal attr that consumers can use to differentiate visually
          attr: field.type === 'heading'
            ? { class: 'form-heading h-' + (field.level || 'h2') }
            : { class: 'form-paragraph' },
        });
        return out;
      }
      if (field.type === 'divider') {
        out.push({
          name: baseName,
          type: 'static',
          label: '',
          value: '<hr>',
          attr: { class: 'form-divider' },
        });
        return out;
      }

      // ── Default mapping for all input-like fields ─────────
      const def = {
        name: baseName,
        type: mapType(field.type),
      };
      if (field.label) def.label = field.label;

      // helpText → help_block
      if (field.helpText) def.help_block = { text: field.helpText };

      // Default value
      if (field.defaultValue !== undefined && field.defaultValue !== '' && field.defaultValue !== null) {
        def.value = field.defaultValue;
      }
      // Type-specific default value sources
      if (field.type === 'checkbox' && field.defaultChecked) def.checked = true;
      if (field.type === 'toggle' && field.defaultOn) def.checked = true;
      if (field.type === 'range' && field.defaultVal !== undefined) def.value = field.defaultVal;
      if (field.type === 'color' && field.defaultVal) def.value = field.defaultVal;
      if (field.type === 'rating' && field.defaultValue !== undefined && field.defaultValue !== '') {
        def.value = field.defaultValue;
      }

      // Validation rules + messages (taken from per-field validation block)
      const rules = rulesString(field);
      if (rules) def.rules = rules;
      const errMsgs = errorMessagesObj(field);
      if (errMsgs) def.error_messages = errMsgs;

      // disabled flag is a top-level option in NodeForms
      if (field.disabled) def.disabled = true;

      // Choices (select / radio / multiselect / checkboxgroup)
      if (['select', 'multiselect', 'radio', 'checkboxgroup'].includes(field.type)) {
        const choices = optionsToChoices(field.options);
        if (choices) def.choices = choices;
      }

      // Multi-select / checkboxgroup flags
      if (field.type === 'multiselect') {
        def.multiple = true;
      }
      if (field.type === 'checkboxgroup') {
        def.expanded = true;
        def.multiple = true;
      }

      // File upload `multiple`
      if (field.type === 'file' && field.multiple) {
        def.multiple = true;
      }

      // Submit button alignment is purely visual in FormCraft —
      // map "full" alignment onto the standard Bootstrap btn-block class.
      if (field.type === 'submit') {
        const align = field.align || 'left';
        const cls = align === 'full' ? 'btn btn-primary w-100'
                  : align === 'center' ? 'btn btn-primary mx-auto d-block'
                  : align === 'right' ? 'btn btn-primary float-end'
                  : 'btn btn-primary';
        def.attr = { ...(def.attr || {}), class: cls };
        def.wrapper = false;
      }

      // Build & attach attr
      const attr = buildAttr(field);
      if (attr) def.attr = { ...(def.attr || {}), ...attr };

      // Conditional logic
      const cond = convertConditional(field, allFields);
      if (cond) def.conditions = [cond];

      out.push(def);
      return out;
    }

    // ── Walk every tab → produce a TabDefinition ──────────
    const allFields = fullSchema.tabs.flatMap(t => t.fields || []);

    const tabs = fullSchema.tabs.map((tab, idx) => {
      const safeName = tab.name && tab.name.trim()
        ? tab.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
        : 'tab_' + (idx + 1);
      const tabDef = {
        name: safeName || ('tab_' + (idx + 1)),
        label: tab.name || ('Tab ' + (idx + 1)),
      };
      // Bootstrap Icons class — NodeForms expects bare glyph name (no 'bi-' prefix)
      if (tab.icon) {
        tabDef.icon = String(tab.icon).replace(/^bi[-\s]+/i, '');
      }
      tabDef.fields = (tab.fields || []).flatMap(f => convertField(f, allFields));
      return tabDef;
    });

    return tabs;
  }

  function renderJson() {
    document.getElementById('jsonOutput').textContent = JSON.stringify(buildSchema(), null, 2);
  }

  // Sync preview/json when fields change
  function syncOtherModes() {
    const activeMode = document.querySelector('.mode-tab.active')?.dataset.mode;
    if (activeMode === 'preview') renderPreview();
    if (activeMode === 'json') renderJson();
  }

  // ── Template Picker ───────────────────────────────────────
  document.querySelectorAll('#templateOptions .toolbar-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#templateOptions .toolbar-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      previewTemplate = btn.dataset.template;
      renderPreview();
    });
  });

  // ── Width Picker ─────────────────────────────────────────
  document.querySelectorAll('#widthOptions .toolbar-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#widthOptions .toolbar-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      previewWidth = btn.dataset.width;
      renderPreview();
    });
  });

  // ── Style Toggles (border / shadow / rounded) ─────────────
  document.querySelectorAll('#styleOptions .toolbar-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.style;
      previewStyle[key] = !previewStyle[key];
      btn.classList.toggle('active', previewStyle[key]);
      renderPreview();
    });
  });

  // ── Export Dropdown ───────────────────────────────────────
  const exportBtn = document.getElementById('exportBtn');
  const exportMenu = document.getElementById('exportMenu');
  exportBtn.addEventListener('click', e => {
    e.stopPropagation();
    exportMenu.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if (!exportMenu.contains(e.target) && e.target !== exportBtn && !exportBtn.contains(e.target)) {
      exportMenu.classList.remove('open');
    }
  });
  document.querySelectorAll('.export-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const fmt = opt.dataset.export;
      exportMenu.classList.remove('open');
      doExport(fmt);
    });
  });

  // ── Mode Switching ────────────────────────────────────────
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.mode;
      document.querySelectorAll('.canvas-mode').forEach(m => m.classList.remove('active'));
      document.getElementById(mode + 'Mode').classList.add('active');
      if (mode === 'preview') renderPreview();
      if (mode === 'json') renderJson();
    });
  });

  // ── Top Bar Actions ───────────────────────────────────────
  // ─────────────────────────────────────────────────────────
  // IMPORT — load a schema from file or URL into the builder.
  //
  // Supported input shapes (auto-detected):
  //   1. FormCraft native:  { version, tabs: [{ id, name, fields: [...] }], preview, ... }
  //                         → as produced by buildSchema()
  //   2. NodeForms tabbed:  [{ name, label, icon?, fields: [...] }, ...]
  //                         → as produced by buildNodeformsJson()
  //   3. NodeForms flat:    [{ name, type, label, ... }, ...]   (single tab)
  //   4. Single tab object: { id, name, fields: [...] }
  // ─────────────────────────────────────────────────────────

  // Reverse map for NodeForms operators → FormCraft operators
  const NF_OPERATOR_TO_FC = {
    '===':'equals', '!==':'not_equals', '==':'equals', '!=':'not_equals',
    '>':'greater_than', '>=':'greater_than', '<':'less_than', '<=':'less_than',
    'contains':'contains', 'not_contains':'not_contains',
    'starts_with':'contains', 'ends_with':'contains',
    'empty':'empty', 'not_empty':'not_empty',
    'in':'equals', 'not_in':'not_equals',
  };

  // NodeForms field types → FormCraft type. Most pass through; a few are simplified.
  function nfTypeToFcType(t) {
    if (!t) return 'text';
    if (t === 'choice')    return 'checkboxgroup';   // best general fit; will be downgraded if expanded=false later
    if (t === 'static')    return 'paragraph';
    if (t === 'reset' || t === 'button') return 'submit';
    if (t === 'repeated' || t === 'collection' || t === 'entity' || t === 'form') return 'text'; // fall back
    return t;
  }

  // Convert a NodeForms field definition (flat or nested) into a FormCraft field.
  function nfFieldToFcField(nf) {
    // Flatten: nested options take precedence over flat keys (matches NodeForms parser behavior)
    const { name, type, options, ...flat } = nf;
    const merged = { ...flat, ...(options || {}) };
    const attr = merged.attr || {};

    let fcType = nfTypeToFcType(type);
    // 'select' with multiple → multiselect
    if (fcType === 'select' && (merged.multiple === true || merged.multiple === 'true')) {
      fcType = 'multiselect';
    }
    // 'choice': expanded + multiple → checkboxgroup; expanded only → radio; else select
    if (type === 'choice') {
      if (merged.expanded && merged.multiple) fcType = 'checkboxgroup';
      else if (merged.expanded) fcType = 'radio';
      else fcType = 'select';
    }
    // 'static' fields with hint classes → restore heading/paragraph/divider
    if (type === 'static') {
      const cls = String(attr.class || '');
      if (cls.includes('form-divider'))      fcType = 'divider';
      else if (cls.includes('form-heading')) fcType = 'heading';
      else if (cls.includes('form-paragraph')) fcType = 'paragraph';
    }
    // 'checkbox' with name suggesting toggle? Keep as checkbox; users can change in UI.

    const f = { id: uid(), type: fcType, name: name || '' };

    if (merged.label !== undefined) f.label = String(merged.label);
    if (merged.value !== undefined && merged.value !== null && merged.value !== '') f.defaultValue = merged.value;
    if (merged.checked === true) {
      if (fcType === 'checkbox') f.defaultChecked = true;
      if (fcType === 'toggle')   f.defaultOn = true;
    }
    if (merged.help_block && merged.help_block.text) f.helpText = String(merged.help_block.text);
    if (merged.disabled) f.disabled = true;

    // attr → spread back onto FormCraft field
    if (attr.placeholder) f.placeholder = String(attr.placeholder);
    if (attr.class)        f.cssClass = String(attr.class);
    if (attr.readonly)     f.readonly = true;
    if (attr.autocomplete) f.autocomplete = String(attr.autocomplete);
    if (attr.rows) f.rows = parseInt(attr.rows, 10) || 4;
    if (attr.accept) f.accept = String(attr.accept);
    if (attr['data-max-size']) f.maxSize = String(attr['data-max-size']);
    if (attr.min !== undefined) {
      if (['number','range','date','datetime-local'].includes(fcType)) f.min = attr.min;
    }
    if (attr.max !== undefined) {
      if (['number','range','date','datetime-local'].includes(fcType)) f.max = attr.max;
    }
    if (attr.step !== undefined && (fcType === 'number' || fcType === 'range')) f.step = attr.step;
    if (attr.minlength) f.minLength = parseInt(attr.minlength, 10) || undefined;
    if (attr.maxlength) f.maxLength = parseInt(attr.maxlength, 10) || undefined;

    // choices → options array
    if (merged.choices) {
      if (Array.isArray(merged.choices)) {
        f.options = merged.choices.map(c => (c && typeof c === 'object' && 'label' in c ? String(c.label) : String(c)));
      } else if (typeof merged.choices === 'object') {
        // { 'Label': 'value' } → use the keys (display labels) as options
        f.options = Object.keys(merged.choices).map(String);
      }
    }

    // file multiple
    if (fcType === 'file' && merged.multiple) f.multiple = true;

    // Rules → required flag + minLength/maxLength/pattern. Only set what we can map.
    if (merged.rules) {
      const ruleStr = Array.isArray(merged.rules) ? merged.rules.join('|') : String(merged.rules);
      const tokens = ruleStr.split('|').map(s => s.trim()).filter(Boolean);
      tokens.forEach(rt => {
        const [rname, ...args] = rt.split(':');
        const arg = args.join(':');
        switch (rname) {
          case 'required':
          case 'accepted':
            f.required = true; break;
          case 'min':
            if (['number','range'].includes(fcType)) f.min = arg;
            else f.minLength = parseInt(arg, 10) || undefined;
            break;
          case 'max':
            if (['number','range'].includes(fcType)) f.max = arg;
            else f.maxLength = parseInt(arg, 10) || undefined;
            break;
          case 'regex':
            if (fcType === 'text') {
              // Strip surrounding /.../ delimiters if present
              f.pattern = arg.replace(/^\//, '').replace(/\/$/, '');
            }
            break;
          // required_if / required_unless are handled by conditions below
        }
      });
    }

    if (merged.error_messages && typeof merged.error_messages === 'object') {
      // Pick the first message as the field's primary errorMessage (best-effort)
      const first = Object.values(merged.error_messages)[0];
      if (first) f.errorMessage = String(first);
    }

    // Conditions → first condition becomes the FormCraft conditional
    if (Array.isArray(merged.conditions) && merged.conditions.length) {
      const c = merged.conditions[0];
      const fcOp = NF_OPERATOR_TO_FC[c.operator] || 'equals';
      f.conditional = {
        enabled: true,
        action: ['show','hide','enable','disable'].includes(c.action) ? c.action : 'show',
        field: '',     // resolved below by caller (after all fields have ids)
        _whenName: c.when,   // temp marker — replaced with id in resolveConditionalIds()
        operator: fcOp,
        value: c.value !== undefined ? String(c.value) : '',
      };
    }

    return f;
  }

  // After all fields are converted, replace `_whenName` (NodeForms field name)
  // with the actual FormCraft field id, since FormCraft conditionals reference fields by id.
  function resolveConditionalIds(allFields) {
    allFields.forEach(f => {
      if (f.conditional && f.conditional._whenName) {
        const target = allFields.find(x => x.name === f.conditional._whenName);
        if (target) f.conditional.field = target.id;
        delete f.conditional._whenName;
      }
    });
  }

  // Detect schema shape and convert to FormCraft tabs[] structure.
  // Returns { tabs, preview, name } — drop-in for the builder's state.
  function parseImportedSchema(parsed, fallbackName) {
    let imported = { tabs: [], preview: null, name: fallbackName || 'Imported Form' };

    // Shape 1: FormCraft native (has tabs[] AND preview OR version)
    if (parsed && Array.isArray(parsed.tabs) && (parsed.preview || parsed.version)) {
      imported.name = parsed.name || imported.name;
      imported.preview = parsed.preview || null;
      imported.tabs = parsed.tabs.map(t => ({
        id: t.id || tid(),
        name: t.name || 'Tab',
        icon: t.icon || '',
        fields: (t.fields || []).map(f => ({
          ...f,
          id: f.id || uid(),
          // Strip transient validation block — buildSchema() rebuilds it on save
        })).map(f => { const { validation, ...rest } = f; return rest; })
      }));
      return imported;
    }

    // Shape 4: Single tab object { id, name, fields: [...] } (FormCraft single-tab)
    if (parsed && parsed.fields && Array.isArray(parsed.fields) && !Array.isArray(parsed.tabs)) {
      imported.tabs = [{
        id: parsed.id || tid(),
        name: parsed.name || 'Tab 1',
        icon: parsed.icon || '',
        fields: parsed.fields.map(f => ({ ...f, id: f.id || uid() })),
      }];
      return imported;
    }

    // Shape 2: NodeForms TabbedForm — array of tab definitions
    if (Array.isArray(parsed) && parsed.length && parsed[0].fields && Array.isArray(parsed[0].fields)) {
      imported.tabs = parsed.map((tab, i) => {
        const fcFields = tab.fields.map(nfFieldToFcField);
        return {
          id: tid(),
          name: tab.label || tab.name || ('Tab ' + (i + 1)),
          icon: tab.icon ? (tab.icon.startsWith('bi-') ? tab.icon : 'bi-' + tab.icon) : '',
          fields: fcFields,
        };
      });
      // Resolve conditional `_whenName` markers to ids (per tab; NodeForms conditions are local)
      imported.tabs.forEach(t => resolveConditionalIds(t.fields));
      return imported;
    }

    // Shape 3: NodeForms flat — single array of field definitions
    if (Array.isArray(parsed) && parsed.length && (parsed[0].name || parsed[0].type)) {
      const fcFields = parsed.map(nfFieldToFcField);
      resolveConditionalIds(fcFields);
      imported.tabs = [{ id: tid(), name: 'Tab 1', icon: '', fields: fcFields }];
      return imported;
    }

    // Empty array → start with one empty tab
    if (Array.isArray(parsed) && parsed.length === 0) {
      imported.tabs = [{ id: tid(), name: 'Tab 1', icon: '', fields: [] }];
      return imported;
    }

    throw new Error('Unrecognized schema format. Expected FormCraft schema, NodeForms tabbed array, or NodeForms flat field array.');
  }

  // Replace the current builder state with an imported schema.
  function loadImportedSchema(parsedSchema, sourceName) {
    let imported;
    try {
      imported = parseImportedSchema(parsedSchema, sourceName);
    } catch (err) {
      showToast(err.message || 'Failed to parse schema', 'error');
      return false;
    }
    if (!imported.tabs.length) {
      showToast('No tabs found in the imported schema', 'error');
      return false;
    }
    // Apply — replace tabs and (optionally) preview settings
    tabs = imported.tabs;
    activeTabId = tabs[0].id;
    selectedId = null;
    formId = null;   // imported = a new form; saving creates a new record
    if (imported.name) formNameInput.value = imported.name;
    if (imported.preview) {
      previewTemplate = imported.preview.template || previewTemplate;
      previewWidth    = imported.preview.width    || previewWidth;
      if (imported.preview.style) {
        previewStyle = { ...previewStyle, ...imported.preview.style };
      }
      // Reflect those changes in the toolbar UI
      document.querySelectorAll('#templateOptions .toolbar-opt').forEach(b =>
        b.classList.toggle('active', b.dataset.template === previewTemplate));
      document.querySelectorAll('#widthOptions .toolbar-opt').forEach(b =>
        b.classList.toggle('active', b.dataset.width === previewWidth));
      document.querySelectorAll('[data-style]').forEach(b => {
        const k = b.dataset.style;
        b.classList.toggle('active', !!previewStyle[k]);
      });
    }
    saveHistory();
    renderAll();
    showToast('✓ Schema imported (' + tabs.length + ' tab' + (tabs.length === 1 ? '' : 's') + ', ' +
              tabs.reduce((s, t) => s + t.fields.length, 0) + ' fields)', 'success');
    return true;
  }

  // ── Import dropdown wiring ──
  const importWrap = document.querySelector('.import-wrap');
  const importBtn = document.getElementById('importBtn');
  const importMenu = document.getElementById('importMenu');
  const importFileInput = document.getElementById('importFileInput');
  const urlModal = document.getElementById('urlModal');
  const urlInput = document.getElementById('urlInput');

  if (importBtn) {
    importBtn.addEventListener('click', e => {
      e.stopPropagation();
      importWrap.classList.toggle('open');
    });
    document.addEventListener('click', e => {
      if (importWrap && !importWrap.contains(e.target)) importWrap.classList.remove('open');
    });
    importMenu.querySelectorAll('[data-import]').forEach(item => {
      item.addEventListener('click', () => {
        const kind = item.dataset.import;
        importWrap.classList.remove('open');
        if (kind === 'file') importFileInput.click();
        else if (kind === 'url') {
          urlInput.value = '';
          urlModal.style.display = 'flex';
          setTimeout(() => urlInput.focus(), 50);
        }
      });
    });
  }

  // File import
  if (importFileInput) {
    importFileInput.addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          loadImportedSchema(parsed, file.name.replace(/\.json$/i, ''));
        } catch (err) {
          showToast('Invalid JSON file: ' + err.message, 'error');
        }
        importFileInput.value = '';   // allow re-importing the same file
      };
      reader.onerror = () => {
        showToast('Failed to read file', 'error');
        importFileInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  // URL import — fetch then load
  function closeUrlModal() { urlModal.style.display = 'none'; }
  if (urlModal) {
    document.getElementById('urlModalClose').addEventListener('click', closeUrlModal);
    document.getElementById('urlModalCancel').addEventListener('click', closeUrlModal);
    urlModal.addEventListener('click', e => { if (e.target === urlModal) closeUrlModal(); });
    urlInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('urlModalLoad').click(); }
      else if (e.key === 'Escape') closeUrlModal();
    });
    document.getElementById('urlModalLoad').addEventListener('click', async () => {
      const url = urlInput.value.trim();
      if (!url) { showToast('Please enter a URL', 'error'); return; }
      try {
        new URL(url);   // validate
      } catch {
        showToast('Invalid URL', 'error');
        return;
      }
      const loadBtn = document.getElementById('urlModalLoad');
      const originalHtml = loadBtn.innerHTML;
      loadBtn.disabled = true;
      loadBtn.innerHTML = 'Loading…';
      try {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
        const ct = res.headers.get('content-type') || '';
        const text = await res.text();
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (err) {
          throw new Error('Response is not valid JSON' + (ct ? ' (Content-Type: ' + ct + ')' : ''));
        }
        // Derive a friendly source name from the URL
        let srcName = 'Imported';
        try { srcName = new URL(url).pathname.split('/').pop().replace(/\.json$/i, '') || srcName; } catch {}
        if (loadImportedSchema(parsed, srcName)) closeUrlModal();
      } catch (err) {
        showToast('Fetch failed: ' + (err.message || err), 'error');
      } finally {
        loadBtn.disabled = false;
        loadBtn.innerHTML = originalHtml;
      }
    });
  }

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const fullSchema = buildSchema();
    const nodeformsJson = buildNodeformsJson(fullSchema);
    try {
      const res = await fetch('/api/forms/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formId,
          name: fullSchema.name,
          schema: fullSchema,
          nodeformsJson
        })
      });
      const data = await res.json();
      if (data.success) {
        formId = data.id;
        showToast('✓ Form saved! ID: ' + formId, 'success');
      }
    } catch {
      showToast('Failed to save form', 'error');
    }
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    const fields = getFields();
    if (fields.length === 0 || confirm('Clear all fields in current tab?')) {
      getActiveTab().fields = [];
      selectedId = null;
      saveHistory();
      renderCanvas();
      renderProps();
      syncOtherModes();
    }
  });

  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);

  document.getElementById('copyJsonBtn').addEventListener('click', () => {
    const text = document.getElementById('jsonOutput').textContent;
    navigator.clipboard.writeText(text).then(() => showToast('JSON copied!', 'success'));
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const active = document.activeElement;
      if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT') return;
      if (selectedId) removeField(selectedId);
    }
  });

  // ── Mobile Panel Toggle ───────────────────────────────────
  const workspace = document.getElementById('workspace');
  document.querySelectorAll('.mobile-panel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mobile-panel-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const panel = btn.dataset.mobilePanel;
      workspace.dataset.mobilePanel = panel;
    });
  });
  // Default to canvas on load
  workspace.dataset.mobilePanel = 'canvas';

  // ── Element Search ────────────────────────────────────────
  document.getElementById('elementSearch').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.element-item').forEach(el => {
      const label = el.querySelector('.el-label').textContent.toLowerCase();
      el.style.display = label.includes(q) ? '' : 'none';
    });
    document.querySelectorAll('.element-group').forEach(group => {
      const visible = Array.from(group.querySelectorAll('.element-item')).some(i => i.style.display !== 'none');
      group.style.display = visible ? '' : 'none';
    });
  });

  // ── Init ──────────────────────────────────────────────────
  saveHistory();
  renderAll();

  // ── Public API exposed on window.FormCraft ──────────────
  // The whole builder lives inside an IIFE, so external code (e.g. an edit page
  // that wants to bootstrap with an existing form) can't reach internal helpers
  // directly. We expose a small, stable surface here.
  //
  // Usage from outside the IIFE (e.g. inline <script> in edit.ejs):
  //   FormCraft.loadImportedSchema(schema, 'My Form')   // hydrate with a schema
  //   FormCraft.getSchema()                             // current FormCraft schema
  //   FormCraft.getNodeformsJson()                      // current NodeForms JSON
  //   FormCraft.save()                                  // trigger Save button flow
  //
  // Pre-load pattern (works even before this script finishes parsing):
  //   <script>window.FormCraft = { __pendingSchema: { schema: {...}, name: 'X' } };</script>
  //   <script src="/js/builder.js"></script>
  // The IIFE checks __pendingSchema at startup and applies it instead of the demo.
  const __pre = (typeof window !== 'undefined' && window.FormCraft && window.FormCraft.__pendingSchema) || null;
  if (typeof window !== 'undefined') {
    window.FormCraft = {
      loadImportedSchema: function (parsedSchema, sourceName) {
        return loadImportedSchema(parsedSchema, sourceName);
      },
      getSchema: function () { return buildSchema(); },
      getNodeformsJson: function () { return buildNodeformsJson(buildSchema()); },
      save: function () {
        const btn = document.getElementById('saveBtn');
        if (btn) btn.click();
      },
    };
  }

  // Welcome demo
  setTimeout(() => {
    // If an external caller pre-loaded a schema (or called loadImportedSchema during init),
    // skip the welcome demo so we don't overwrite their data.
    if (__pre && __pre.schema) {
      try {
        loadImportedSchema(__pre.schema, __pre.name || 'Imported');
      } catch (e) {
        console.error('FormCraft: failed to apply pending schema', e);
      }
      return;
    }
    // If the user already added fields by this point (e.g. via FormCraft.loadImportedSchema()
    // called immediately after the script tag), don't replace them with the demo.
    const _activeTab = getActiveTab();
    if (_activeTab.fields.length > 0 || tabs.length > 1) return;
    const tab = getActiveTab();
    tab.name = 'Personal Info';
    const heading = createField('heading');
    heading.text = 'Tell us about yourself';
    const fullName = createField('text');
    fullName.label = 'Full Name'; fullName.placeholder = 'John Doe';
    fullName.required = true; fullName.name = 'full_name';
    const email = createField('email');
    email.label = 'Email Address'; email.placeholder = 'you@example.com';
    email.required = true; email.name = 'email';
    tab.fields.push(heading, fullName, email);
    selectedId = null;
    saveHistory();
    renderAll();
  }, 100);

})();

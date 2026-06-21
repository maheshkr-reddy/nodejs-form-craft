(function () {
  const container = document.getElementById('formContainer');
  const successMsg = document.getElementById('successMsg');

  function escHtml(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function tabIconHtml(tab) {
    if (!tab || !tab.icon) return '';
    return `<i class="bi ${escHtml(tab.icon)}"></i> `;
  }

  // Backwards-compat — read schema in any of the supported shapes
  let tabs, template = 'horizontal-tabs', width = 'md', styleOpts = { border: true, shadow: true, rounded: true };
  if (Array.isArray(schema)) {
    tabs = [{ id: 't0', name: 'Form', fields: schema }];
  } else if (schema && Array.isArray(schema.tabs)) {
    tabs = schema.tabs;
    if (schema.preview) {
      template = schema.preview.template || template;
      width = schema.preview.width || width;
      if (schema.preview.style) styleOpts = { ...styleOpts, ...schema.preview.style };
    } else if (schema.template) {
      template = schema.template;
    }
  } else {
    tabs = [{ id: 't0', name: 'Form', fields: [] }];
  }

  function formClasses() {
    return [
      'preview-form',
      'template-' + template,
      'width-' + width,
      styleOpts.border ? 'has-border' : '',
      styleOpts.shadow ? 'has-shadow' : '',
      styleOpts.rounded ? 'has-rounded' : ''
    ].filter(Boolean).join(' ');
  }

  function renderField(field) {
    const wrap = document.createElement('div');
    wrap.className = 'preview-field mb-3';
    wrap.dataset.fieldId = field.id;
    if (field.name) wrap.dataset.fieldName = field.name;

    const req = field.required ? '<span class="text-danger ms-1">*</span>' : '';
    const lbl = field.label ? `<label class="form-label">${escHtml(field.label)}${req}</label>` : '';
    const help = field.helpText ? `<div class="form-text">${escHtml(field.helpText)}</div>` : '';

    const commonAttrs = [
      field.name ? `name="${escHtml(field.name)}"` : '',
      field.required ? 'required' : '',
      field.readonly ? 'readonly' : '',
      field.disabled ? 'disabled' : '',
      field.autocomplete ? `autocomplete="${escHtml(field.autocomplete)}"` : ''
    ].filter(Boolean).join(' ');
    const extraClass = field.cssClass ? ' ' + escHtml(field.cssClass) : '';

    switch (field.type) {
      case 'text': case 'email': case 'password': case 'tel': case 'url':
      case 'number': case 'date': case 'time': case 'datetime-local': {
        const minMax = (field.min !== undefined && field.min !== '' ? `min="${escHtml(field.min)}" ` : '')
                     + (field.max !== undefined && field.max !== '' ? `max="${escHtml(field.max)}" ` : '')
                     + (field.step ? `step="${escHtml(field.step)}" ` : '')
                     + (field.minLength ? `minlength="${field.minLength}" ` : '')
                     + (field.maxLength ? `maxlength="${field.maxLength}" ` : '')
                     + (field.pattern ? `pattern="${escHtml(field.pattern)}" ` : '');
        wrap.innerHTML = lbl + `<input class="form-control${extraClass}" type="${field.type}" placeholder="${escHtml(field.placeholder||'')}" value="${escHtml(field.defaultValue ?? '')}" ${commonAttrs} ${minMax}>` + help;
        break;
      }
      case 'textarea':
        wrap.innerHTML = lbl + `<textarea class="form-control${extraClass}" rows="${field.rows||4}" placeholder="${escHtml(field.placeholder||'')}" ${commonAttrs}${field.minLength?` minlength="${field.minLength}"`:''}${field.maxLength?` maxlength="${field.maxLength}"`:''}>${escHtml(field.defaultValue||'')}</textarea>` + help;
        break;
      case 'richtext':
        wrap.innerHTML = lbl + `<textarea class="form-control${extraClass}" rows="4" placeholder="${escHtml(field.placeholder||'')}" ${commonAttrs}>${escHtml(field.defaultValue||'')}</textarea>` + help;
        break;
      case 'select': {
        const opts = (field.options||[]).map(o=>`<option value="${escHtml(o)}"${field.defaultValue===o?' selected':''}>${escHtml(o)}</option>`).join('');
        const phSelected = !field.defaultValue ? ' selected' : '';
        wrap.innerHTML = lbl + `<select class="form-select${extraClass}" ${commonAttrs}><option value="" disabled${phSelected}>${escHtml(field.placeholder||'Select…')}</option>${opts}</select>` + help;
        break;
      }
      case 'multiselect': {
        const sel = Array.isArray(field.defaultValue) ? field.defaultValue : [];
        const opts = (field.options||[]).map(o=>`<option value="${escHtml(o)}"${sel.includes(o)?' selected':''}>${escHtml(o)}</option>`).join('');
        wrap.innerHTML = lbl + `<select class="form-select${extraClass}" multiple size="${Math.min(5, (field.options||[]).length)}" ${commonAttrs}>${opts}</select>` + help;
        break;
      }
      case 'radio': {
        const items = (field.options||[]).map((o,i)=> {
          const id = `r_${field.id}_${i}`;
          return `<div class="form-check">
            <input class="form-check-input" type="radio" id="${id}" name="${escHtml(field.name||'r_'+field.id)}" value="${escHtml(o)}"${field.defaultValue===o?' checked':''}${field.required&&i===0?' required':''}${field.disabled?' disabled':''}${field.readonly?' onclick="return false"':''}>
            <label class="form-check-label" for="${id}">${escHtml(o)}</label>
          </div>`;
        }).join('');
        wrap.innerHTML = lbl + items + help;
        break;
      }
      case 'checkbox': {
        const id = `cb_${field.id}`;
        wrap.innerHTML = `<div class="form-check">
          <input class="form-check-input" type="checkbox" id="${id}" ${commonAttrs}${field.defaultChecked?' checked':''}>
          <label class="form-check-label" for="${id}">${escHtml(field.label||'')}${req}</label>
        </div>` + help;
        break;
      }
      case 'checkboxgroup': {
        const sel = Array.isArray(field.defaultValue) ? field.defaultValue : [];
        const items = (field.options||[]).map((o,i)=> {
          const id = `cbg_${field.id}_${i}`;
          return `<div class="form-check">
            <input class="form-check-input" type="checkbox" id="${id}" name="${escHtml(field.name||field.id)}" value="${escHtml(o)}"${sel.includes(o)?' checked':''}${field.disabled?' disabled':''}${field.readonly?' onclick="return false"':''}>
            <label class="form-check-label" for="${id}">${escHtml(o)}</label>
          </div>`;
        }).join('');
        wrap.innerHTML = lbl + items + help;
        break;
      }
      case 'toggle': {
        const id = `tg_${field.id}`;
        wrap.innerHTML = `<div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" role="switch" id="${id}" ${commonAttrs}${field.defaultOn?' checked':''}>
          <label class="form-check-label" for="${id}">${escHtml(field.label||'')}${req}</label>
        </div>` + help;
        break;
      }
      case 'range':
        wrap.innerHTML = lbl + `<input type="range" class="form-range${extraClass}" min="${field.min||0}" max="${field.max||100}" step="${field.step||1}" value="${field.defaultVal||50}" ${commonAttrs}>` + help;
        break;
      case 'rangeslider': {
        const min = Number(field.min) || 0, max = Number(field.max) || 100, step = Number(field.step) || 1;
        const dMin = Number(field.defaultMin) ?? min, dMax = Number(field.defaultMax) ?? max;
        wrap.innerHTML = lbl + `
          <div class="preview-rangeslider${extraClass}" data-min="${min}" data-max="${max}" data-step="${step}">
            <div class="rs-track"><div class="rs-fill"></div></div>
            <input type="range" class="rs-input rs-input-min" name="${escHtml((field.name||field.id)+'_min')}" min="${min}" max="${max}" step="${step}" value="${dMin}"${field.disabled?' disabled':''}>
            <input type="range" class="rs-input rs-input-max" name="${escHtml((field.name||field.id)+'_max')}" min="${min}" max="${max}" step="${step}" value="${dMax}"${field.disabled?' disabled':''}>
            <div class="rs-values d-flex justify-content-between mt-2 small text-muted"><span class="rs-val-min">${dMin}</span><span class="rs-val-max">${dMax}</span></div>
          </div>` + help;
        break;
      }
      case 'rating': {
        const dv = Number(field.defaultValue) || 0;
        const stars = Array.from({length: field.maxStars||5}, (_,i)=>`<span class="star${i < dv ? ' filled' : ''}">★</span>`).join('');
        wrap.innerHTML = lbl + `<div class="preview-rating${extraClass}" data-value="${dv}">${stars}</div><input type="hidden" name="${escHtml(field.name||field.id)}" value="${dv}">` + help;
        break;
      }
      case 'file':
        wrap.innerHTML = lbl + `<input type="file" class="form-control${extraClass}" accept="${escHtml(field.accept||'')}" ${field.multiple?'multiple':''} ${commonAttrs}>` + help;
        break;
      case 'color':
        wrap.innerHTML = lbl + `<input type="color" class="form-control form-control-color${extraClass}" value="${escHtml(field.defaultVal||'#5b54e6')}" ${commonAttrs}>` + help;
        break;
      case 'heading': {
        const tag = field.level||'h2';
        wrap.innerHTML = `<${tag} class="mb-2">${escHtml(field.text||'')}</${tag}>`;
        break;
      }
      case 'paragraph':
        wrap.innerHTML = `<p class="text-muted mb-2">${escHtml(field.text||'')}</p>`;
        break;
      case 'divider':
        wrap.innerHTML = `<hr>`;
        break;
      case 'submit': {
        const alignClass = { full: 'w-100', center: 'd-block mx-auto', right: 'd-block ms-auto', left: '' };
        wrap.innerHTML = `<button type="submit" class="btn btn-primary ${alignClass[field.align||'full']||''}">${escHtml(field.label||'Submit')}</button>`;
        break;
      }
      default: wrap.innerHTML = '';
    }
    return wrap;
  }

  function renderTabFields(tab, host) {
    (tab.fields || []).forEach(f => host.appendChild(renderField(f)));
  }

  // Conditional logic helpers
  const allFieldsList = tabs.flatMap(t => t.fields || []);

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
      const a = wrap.querySelector('.rs-input-min'), b = wrap.querySelector('.rs-input-max');
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
    allFieldsList.forEach(field => {
      const c = field.conditional;
      if (!c || !c.enabled || !c.field) return;
      const target = allFieldsList.find(f => f.id === c.field);
      if (!target) return;
      const actualVal = getFieldValue(target, host);
      const matches = compareValue(actualVal, c.operator, c.value);
      const wrap = host.querySelector(`[data-field-id="${field.id}"]`);
      if (!wrap) return;
      if (c.action === 'show') wrap.style.display = matches ? '' : 'none';
      else if (c.action === 'hide') wrap.style.display = matches ? 'none' : '';
      else if (c.action === 'enable' || c.action === 'disable') {
        const shouldDisable = c.action === 'enable' ? !matches : matches;
        wrap.querySelectorAll('input, select, textarea, button').forEach(el => { el.disabled = shouldDisable || field.disabled; });
        wrap.classList.toggle('preview-field-disabled', shouldDisable);
      }
    });
  }

  function attachInteractions(host) {
    host.querySelectorAll('.preview-rating').forEach(rating => {
      const stars = rating.querySelectorAll('.star');
      const hidden = rating.nextElementSibling;
      stars.forEach((star, i) => {
        star.addEventListener('mouseenter', () => stars.forEach((s, j) => s.classList.toggle('filled', j <= i)));
        star.addEventListener('click', () => {
          rating.dataset.value = i + 1;
          if (hidden && hidden.tagName === 'INPUT') hidden.value = i + 1;
          stars.forEach((s, j) => s.classList.toggle('filled', j <= i));
          evaluateConditionals(host);
        });
      });
      rating.addEventListener('mouseleave', () => {
        const filled = parseInt(rating.dataset.value) || 0;
        stars.forEach((s, j) => s.classList.toggle('filled', j < filled));
      });
    });
    host.querySelectorAll('.preview-rangeslider').forEach(rs => {
      const minIn = rs.querySelector('.rs-input-min'), maxIn = rs.querySelector('.rs-input-max');
      const fill = rs.querySelector('.rs-fill');
      const valMin = rs.querySelector('.rs-val-min'), valMax = rs.querySelector('.rs-val-max');
      const min = parseFloat(rs.dataset.min), max = parseFloat(rs.dataset.max);
      const span = max - min || 1;
      function update() {
        let a = parseFloat(minIn.value), b = parseFloat(maxIn.value);
        if (a > b) { [a, b] = [b, a]; minIn.value = a; maxIn.value = b; }
        fill.style.left = ((a - min) / span * 100) + '%';
        fill.style.right = (100 - (b - min) / span * 100) + '%';
        valMin.textContent = a; valMax.textContent = b;
      }
      minIn.addEventListener('input', update); maxIn.addEventListener('input', update);
      update();
    });
    host.addEventListener('input', () => evaluateConditionals(host));
    host.addEventListener('change', () => evaluateConditionals(host));
    evaluateConditionals(host);
  }

  function makeNav(idx, getActive, setActive) {
    const nav = document.createElement('div');
    nav.className = 'preview-tab-nav-actions d-flex justify-content-between gap-2 mt-4 pt-3 border-top';
    const prev = document.createElement('button');
    prev.type = 'button'; prev.className = 'btn btn-outline-secondary'; prev.innerHTML = '&larr; Previous';
    prev.disabled = idx === 0;
    prev.addEventListener('click', () => setActive(tabs[idx - 1].id));
    const next = document.createElement('button');
    next.className = 'btn btn-primary';
    next.innerHTML = idx === tabs.length - 1 ? 'Submit' : 'Next &rarr;';
    next.type = idx === tabs.length - 1 ? 'submit' : 'button';
    next.addEventListener('click', e => {
      if (idx !== tabs.length - 1) { e.preventDefault(); setActive(tabs[idx + 1].id); }
    });
    nav.appendChild(prev); nav.appendChild(next);
    return nav;
  }

  function makeSubmitOnly() {
    const nav = document.createElement('div');
    nav.className = 'preview-tab-nav-actions d-flex justify-content-end mt-4 pt-3 border-top';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'btn btn-primary';
    submit.textContent = 'Submit';
    nav.appendChild(submit);
    return nav;
  }

  // ── TEMPLATES ──────────────────────────────────────────
  const form = document.createElement('form');
  form.id = 'previewFormEl';
  form.className = formClasses();

  if (template === 'single-page') {
    const inner = document.createElement('div');
    inner.className = 'preview-tab-panel single active p-4';
    tabs.forEach((tab, i) => {
      if (tabs.length > 1) {
        const lab = document.createElement('div');
        lab.className = 'preview-section-label';
        lab.innerHTML = tabIconHtml(tab) + escHtml(tab.name);
        inner.appendChild(lab);
      }
      renderTabFields(tab, inner);
      if (tabs.length > 1 && i < tabs.length - 1) {
        const hr = document.createElement('hr');
        hr.className = 'my-4';
        inner.appendChild(hr);
      }
    });
    inner.appendChild(makeSubmitOnly());
    form.appendChild(inner);
  }
  else if (template === 'vertical-tabs') {
    let active = tabs[0]?.id;
    const split = document.createElement('div');
    split.className = 'preview-vtabs-split';
    if (tabs.length > 1) {
      const nav = document.createElement('div');
      nav.className = 'preview-vtabs-nav nav flex-column nav-pills p-3 gap-1';
      tabs.forEach((tab, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'nav-link preview-vtab-btn d-flex align-items-center gap-2' + (tab.id === active ? ' active' : '');
        b.dataset.previewTab = tab.id;
        const badge = tab.icon
          ? `<span class="vtab-num"><i class="bi ${escHtml(tab.icon)}"></i></span>`
          : `<span class="vtab-num">${i+1}</span>`;
        b.innerHTML = `${badge}<span class="vtab-name">${escHtml(tab.name)}</span>`;
        b.addEventListener('click', () => {
          active = tab.id;
          form.querySelectorAll('.preview-vtab-btn').forEach(x => x.classList.toggle('active', x.dataset.previewTab === active));
          form.querySelectorAll('.preview-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.previewPanel === active));
        });
        nav.appendChild(b);
      });
      split.appendChild(nav);
    }
    const panelsCol = document.createElement('div');
    panelsCol.className = 'preview-vtabs-panels';
    tabs.forEach((tab, idx) => {
      const panel = document.createElement('div');
      panel.className = 'preview-tab-panel p-4' + (tab.id === active ? ' active' : '') + (tabs.length === 1 ? ' single' : '');
      panel.dataset.previewPanel = tab.id;
      renderTabFields(tab, panel);
      if (tabs.length > 1) {
        panel.appendChild(makeNav(idx, () => active, v => {
          active = v;
          form.querySelectorAll('.preview-vtab-btn').forEach(x => x.classList.toggle('active', x.dataset.previewTab === active));
          form.querySelectorAll('.preview-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.previewPanel === active));
        }));
      } else panel.appendChild(makeSubmitOnly());
      panelsCol.appendChild(panel);
    });
    split.appendChild(panelsCol);
    form.appendChild(split);
  }
  else if (template === 'accordion') {
    const acc = document.createElement('div');
    acc.className = 'accordion';
    acc.id = 'savedFormAcc';
    tabs.forEach((tab, i) => {
      const isOpen = i === 0;
      const headerId = `${acc.id}_h_${i}`;
      const bodyId = `${acc.id}_b_${i}`;
      const item = document.createElement('div');
      item.className = 'accordion-item preview-accordion-section' + (isOpen ? ' open' : '');
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
    form.appendChild(acc);
    const footer = document.createElement('div');
    footer.className = 'preview-accordion-footer p-3 bg-light border-top';
    footer.appendChild(makeSubmitOnly());
    form.appendChild(footer);
  }
  else if (template === 'stepper') {
    let activeIdx = 0;
    function rebuild() {
      while (form.firstChild) form.removeChild(form.firstChild);
      const steps = document.createElement('div');
      steps.className = 'preview-stepper-bar';
      tabs.forEach((tab, i) => {
        const step = document.createElement('div');
        step.className = 'stepper-step' + (i === activeIdx ? ' active' : '') + (i < activeIdx ? ' done' : '');
        const circleContent = i < activeIdx
          ? '✓'
          : (tab.icon ? `<i class="bi ${escHtml(tab.icon)}"></i>` : (i+1));
        step.innerHTML = `
          <div class="stepper-circle">${circleContent}</div>
          <div class="stepper-label">${escHtml(tab.name)}</div>
          ${i < tabs.length-1 ? '<div class="stepper-line"></div>' : ''}`;
        steps.appendChild(step);
      });
      form.appendChild(steps);

      const panel = document.createElement('div');
      panel.className = 'preview-tab-panel active p-4';
      renderTabFields(tabs[activeIdx], panel);

      const nav = document.createElement('div');
      nav.className = 'preview-tab-nav-actions d-flex justify-content-between gap-2 mt-4 pt-3 border-top';
      const prev = document.createElement('button');
      prev.type = 'button'; prev.className = 'btn btn-outline-secondary'; prev.innerHTML = '&larr; Previous';
      prev.disabled = activeIdx === 0;
      prev.addEventListener('click', () => { activeIdx--; rebuild(); });
      const next = document.createElement('button');
      next.className = 'btn btn-primary';
      next.innerHTML = activeIdx === tabs.length-1 ? 'Submit' : 'Next &rarr;';
      next.type = activeIdx === tabs.length-1 ? 'submit' : 'button';
      next.addEventListener('click', e => {
        if (activeIdx !== tabs.length-1) { e.preventDefault(); activeIdx++; rebuild(); }
      });
      nav.appendChild(prev); nav.appendChild(next);
      panel.appendChild(nav);
      form.appendChild(panel);
      attachInteractions(form);
    }
    rebuild();
  }
  else {
    // horizontal-tabs (default)
    let active = tabs[0]?.id;
    if (tabs.length > 1) {
      const nav = document.createElement('ul');
      nav.className = 'nav nav-tabs preview-tabs-nav';
      tabs.forEach(tab => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'nav-link preview-tab-btn' + (tab.id === active ? ' active' : '');
        b.innerHTML = tabIconHtml(tab) + escHtml(tab.name);
        b.dataset.previewTab = tab.id;
        b.addEventListener('click', () => {
          active = tab.id;
          form.querySelectorAll('.preview-tab-btn').forEach(x => x.classList.toggle('active', x.dataset.previewTab === active));
          form.querySelectorAll('.preview-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.previewPanel === active));
        });
        li.appendChild(b);
        nav.appendChild(li);
      });
      form.appendChild(nav);
    }
    tabs.forEach((tab, idx) => {
      const panel = document.createElement('div');
      panel.className = 'preview-tab-panel p-4' + (tab.id === active ? ' active' : '') + (tabs.length === 1 ? ' single' : '');
      panel.dataset.previewPanel = tab.id;
      renderTabFields(tab, panel);
      if (tabs.length > 1) {
        const idx2 = tabs.findIndex(t => t.id === tab.id);
        panel.appendChild(makeNav(idx2, () => active, v => {
          active = v;
          form.querySelectorAll('.preview-tab-btn').forEach(x => x.classList.toggle('active', x.dataset.previewTab === active));
          form.querySelectorAll('.preview-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.previewPanel === active));
        }));
      } else panel.appendChild(makeSubmitOnly());
      form.appendChild(panel);
    });
  }

  container.appendChild(form);
  attachInteractions(form);

  form.addEventListener('submit', e => {
    e.preventDefault();
    successMsg.style.display = 'block';
    form.style.display = 'none';
  });
})();

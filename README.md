# FormCraft — Visual Form Builder

A drag-and-drop form builder with multi-tab support, conditional logic, live preview, and export to multiple formats. Built with vanilla JS + Express, styled with Bootstrap 5.3.3

---

## Features

### Form Building
- **25+ field types** — text, email, number, password, tel, url, textarea, rich text, select, multi-select, radio, checkbox, checkbox group, toggle, date, time, datetime, range slider (single + dual-handle), star rating, file upload, color, heading, paragraph, divider, columns, submit
- **Drag-and-drop canvas** with full reorder support and visual drop indicators
- **Undo / Redo** (Ctrl+Z / Ctrl+Y, 50-step history)
- **Multi-tab forms** with inline rename, inline delete, and `+ New Tab` button
- **Tab icons** via [Bootstrap Icons](https://icons.getbootstrap.com/) — pick from a curated grid or paste any `bi-xxx` class
- **Element search** in the left palette
- **Mobile-responsive editor** — Elements / Canvas / Properties switch via a panel toggle bar

### Field Properties
Every input field exposes a comprehensive properties panel:
- **Field Identity** — name (the form data key), auto-generated on add
- **Label** — label text, placeholder, help text
- **Default Value** — type-aware editor (text input, dropdown, multi-checkbox, color picker, etc.)
- **Field State** — readonly, disabled, autocomplete preset
- **Validation** — required, min/max length, regex pattern, custom error message
- **Type-specific** — file accept + max size, number/range min/max/step, rating max stars, date min/max, toggle default state
- **Conditional Logic** — show / hide / enable / disable this field based on another field's value (10 operators: equals, not_equals, contains, not_contains, empty, not_empty, checked, unchecked, greater_than, less_than)
- **Layout** — width (full / half / one third)
- **Advanced** — custom CSS class

### Preview Templates
Five rendering templates, all using Bootstrap 5.3.3:
- **Horizontal Tabs** — Bootstrap `nav nav-tabs`
- **Vertical Tabs** — Bootstrap `nav flex-column nav-pills`
- **Accordion** — Bootstrap accordion
- **Stepper / Wizard** — custom numbered-circle progress bar
- **Single Page** — all tabs flattened with section labels

Each template supports:
- **Width** — sm (420), md (580), lg (800), xl (1100), xxl (1400), full
- **Style** — border / shadow / rounded toggles
- **Live conditional logic** — fields show/hide/enable in real time as the user fills the form

### Validation
Auto-generated, **fully compatible with [validatorjs](https://www.npmjs.com/package/validatorjs) v3.22.x**:

- **Rules array** per field (`['required', 'email', 'min:2']`)
- **Auto-generated messages** for every rule (templated, with the field label substituted)
- **Custom error message** overrides for the primary failing rule
- **Conditional `required_if` / `required_unless`** when a field has both `required: true` and conditional logic
- **Three validation patterns supported** out of the box: whole-form, per-tab (multi-step), per-field (live/inline)

### Export
- **HTML** — standalone file with Bootstrap CDN, renderer bundled inline, fully functional form
- **PDF** — A4 portrait (or landscape for xl/xxl/full widths), multi-page slicing
- **Image** — PNG at 2× DPI
- **JSON** — full FormCraft schema *or* NodeForms-compatible JSON

All exports respect the chosen preview template, width, and style toggles.

### Import
- **From File** — upload a JSON schema
- **From URL** — fetch JSON from any URL (CORS permitting)

Auto-detects four schema formats: FormCraft native, NodeForms tabbed array, NodeForms flat array, and single-tab object.

## Quick Start

```bash
# Unpack
unzip -rf  nodejs-form-craft.zip
cd  nodejs-form-craft

# Install dependencies (only Express + EJS)
npm install

# Run
npm start
# or: node server.js

# Open http://localhost:3000
```

The builder loads with a small welcome demo. Drag elements from the left palette, drop them on the canvas, and configure them in the right panel. Use the **Build / Preview / JSON** tabs at the top to switch modes. Hit **Save Form** to persist (in-memory) and get a shareable preview link at `/preview/:id`.



## Backend API

Three endpoints, all using in-memory storage (forms are lost on restart — swap in your own persistence layer):

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/forms/save` | Save or update a form. Body: `{ id, name, schema, nodeformsJson }`. Returns `{ success, id }`. |
| `GET`  | `/api/forms` | List all saved forms. |
| `GET`  | `/api/forms/:id` | Get one form (full record including both schemas). |
| `GET`  | `/preview/:id` | Render the saved form using `renderer.js` + Bootstrap. |

To integrate with a real database, replace the `forms = {}` object and the four endpoint handlers in `server.js`. The schema shape itself is stable — see [Schema Format](#schema-format) below.

## Browser Support

Targets modern evergreen browsers (Chrome, Firefox, Safari, Edge). Uses no build step — vanilla ES6+, Bootstrap 5.3.3 from CDN, Bootstrap Icons 1.13.1 from CDN. The HTML export bundles its renderer inline and loads Bootstrap from CDN at runtime.

---

## Tech Stack

- **Backend** — Node.js + Express + EJS
- **Frontend** — Vanilla JavaScript, no framework, no build step
- **Styling** — Bootstrap 5.3.3 (preview) + custom CSS (builder UI), DM Sans / DM Mono fonts
- **Icons** — Bootstrap Icons 1.13.1
- **Validation** — Compatible with validatorjs v3.22.x
- **PDF / Image export** — html2canvas + jsPDF (loaded from CDN)
- **Integration target** — express-form-builder (NodeForms)

---

## License
MIT

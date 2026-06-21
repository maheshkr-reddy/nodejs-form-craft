const express = require('express');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// In-memory form storage
const forms = {};

app.get('/', (req, res) => res.render('builder'));

app.post('/api/forms/save', (req, res) => {
  const { id, name, schema, nodeformsJson } = req.body;
  const formId = id || `form_${Date.now()}`;
  forms[formId] = {
    id: formId,
    name: name || 'Untitled Form',
    schema,
    nodeformsJson: nodeformsJson || null,
    updatedAt: new Date()
  };
  res.json({ success: true, id: formId });
});

app.get('/api/forms', (req, res) => {
  res.json(Object.values(forms));
});

app.get('/api/forms/:id', (req, res) => {
  const form = forms[req.params.id];
  if (!form) return res.status(404).json({ error: 'Form not found' });
  res.json(form);
});

app.get('/preview/:id', (req, res) => {
  const form = forms[req.params.id];
  if (!form) return res.status(404).send('Form not found');
  res.render('preview', { form });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Form Builder running at http://localhost:${PORT}`));

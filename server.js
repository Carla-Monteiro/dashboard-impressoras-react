require('dotenv').config();

console.log('OK - .env carregado');
console.log('SHEET_ID:', process.env.SHEET_ID ? 'OK' : 'VAZIO');
console.log('EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'OK' : 'VAZIO');

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const sheetsHandler = require('./api/sheets');
app.get('/api/sheets', sheetsHandler);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const buildPath = path.join(__dirname, 'build');
app.use(express.static(buildPath));

app.use((req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server rodando em http://localhost:' + PORT);
});

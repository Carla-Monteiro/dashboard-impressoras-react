// api/sheets.js — Dashboard de Impressoras UNIFEB
//
// SOMENTE LEITURA. Quem escreve na planilha é o formulário do QR code.
//
// npm install googleapis
//
// Env vars no Vercel (Settings > Environment Variables):
//   SHEET_ID                     -> 11XTyte79HJqfF6LcaIoqJjsV0v1FA-JL1xkGRgWx0TA
//   GOOGLE_SERVICE_ACCOUNT_EMAIL -> ...@....iam.gserviceaccount.com
//   GOOGLE_PRIVATE_KEY           -> private_key do JSON (com os \n)
//
// Não precisa de API_TOKEN: não existe rota de escrita.
//
// Rotas:
//   GET /api/sheets?aba=impressoras
//   GET /api/sheets?aba=estoque
//   GET /api/sheets?aba=contadores

const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SHEET_ID;

const ABAS = {
  impressoras: 'Mapeamento Impressoras',
  estoque: 'Estoque Atual',
  contadores: 'Contadores Diários',
  movimentacoes: 'Respostas ao formulário 2',
};

function chave(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function getSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function lerAba(sheets, nome) {
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: nome,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });
  return data.values || [];
}

module.exports = async function handler(req, res) {
  const nome = ABAS[req.query.aba];
  if (!nome) {
    return res.status(400).json({ erro: 'Aba inválida', disponiveis: Object.keys(ABAS) });
  }

  try {
    const sheets = getSheets();
    const linhas = await lerAba(sheets, nome);
    if (linhas.length < 2) return res.status(200).json([]);

    const cab = linhas[0].map(chave);
    let dados = linhas.slice(1).map((linha, i) => {
      const o = { _row: i + 2 };
      cab.forEach((c, j) => { o[c] = linha[j] ?? ''; });
      return o;
    });

    dados = dados.filter((o) => cab.some((c) => o[c] !== ''));

    if (req.query.aba === 'estoque') {
      dados = dados.filter((o) => String(o.modelo_toner).trim().toUpperCase() !== 'TOTAL');
    }

    if (req.query.aba === 'contadores') {
      const datas = linhas[0].slice(5).map((d) => String(d));
      const ultima = datas[datas.length - 1];

      dados = dados.map((o) => {
        const historico = datas
          .map((d) => ({ data: d, valor: o[chave(d)] }))
          .filter((h) => h.valor !== '');

        const bruto = o[chave(ultima)];
        const numero = typeof bruto === 'number' ? bruto : null;

        return {
          _row: o._row,
          setor: o.setor,
          ip: o.ip,
          marca: o.marca,
          modelo: o.modelo,
          data_leitura: ultima,
          contador: numero,
          online: numero !== null,
          falha: numero === null ? String(bruto || 'sem leitura') : null,
          historico,
        };
      });
    }

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json(dados);
  } catch (e) {
    console.error('[sheets]', e);
    return res.status(500).json({ erro: 'Falha ao acessar a planilha' });
  }
};
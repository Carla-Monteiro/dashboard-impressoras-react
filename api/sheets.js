const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SHEET_ID;

const ABAS = {
  impressoras: 'Mapeamento Impressoras',
  estoque: 'Estoque Atual',
  contadores: 'Contadores Diários',
  movimentacoes: 'Respostas ao formulário 2',
};

function chave(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, '_');
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
      // Estrutura: A=Setor, B=Nome, C=IP, D=Marca, E=Modelo, F+=Datas com contadores
      // Pega as colunas de data (F em diante = índice 5)
      const datasRaw = linhas[0].slice(5);
      const datas = datasRaw.filter(d => d && String(d).trim()).map(d => String(d).trim());

      dados = dados.map((o) => {
        const contadores = datas.map(data => {
          const chaveData = chave(data);
          const val = o[chaveData];
          return typeof val === 'number' ? val : null;
        });

        const ultimaData = datas.length > 0 ? datas[datas.length - 1] : '';
        const ultimoNumero = contadores.length > 0 ? contadores[contadores.length - 1] : null;

        return {
          _row: o._row,
          setor: o.setor || '',
          nome: o.nome || '',
          ip: o.ip || '',
          marca: o.marca || '',
          modelo: o.modelo || '',
          datas: datas,
          contadores: contadores,
          data_leitura: ultimaData,
          contador: ultimoNumero,
          online: ultimoNumero !== null,
          falha: ultimoNumero === null ? 'Erro: tempo esgotado (offline?)' : null,
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
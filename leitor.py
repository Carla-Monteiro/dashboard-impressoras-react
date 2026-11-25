"""
Leitor de impressoras -> Google Sheets ("Gestão de Estoque TI")

Mudanças desta versão:
- Lê todas as impressoras EM PARALELO (antes: uma por vez, 2-3 min; agora ~15-20 s).
- Não apaga mais o contador do dia: se a impressora estiver offline na última
  execução do dia, mantém a última leitura válida em vez de gravar "Offline" por cima.
- Grava "Online (PING)" na coluna STATUS quando a impressora só responde ping,
  para o dashboard diferenciar de quem respondeu SNMP de verdade.
- Grava a hora real da coleta na aba "Status Coleta" (o dashboard mostra isso).
- Ping sem shell=True e só para IPs válidos (evita executar comando digitado na planilha).
- Grava o nível de toner do dia na aba "Nível Diário" (histórico usado pelo dashboard
  para prever quando o toner acaba e detectar trocas).
"""
import asyncio
import datetime
import ipaddress
import platform
import sys
import time

import gspread
from oauth2client.service_account import ServiceAccountCredentials
from puresnmp import Client, V2C, PyWrapper

# ============================================================
# CONFIGURAÇÃO
# ============================================================

NOME_PLANILHA = "Gestão de Estoque TI"
ABA_MAPEAMENTO = "Mapeamento Impressoras"
ABA_CONTADORES = "Contadores Diários"
ABA_STATUS = "Status Coleta"
ABA_NIVEIS = "Nível Diário"

oid_contador = '1.3.6.1.2.1.43.10.2.1.4.1.1'
OID_NIVEL_TONER = '1.3.6.1.2.1.43.11.1.1.9.1.1'
OID_MAX_TONER = '1.3.6.1.2.1.43.11.1.1.8.1.1'
OID_ERRO_STATE = '1.3.6.1.2.1.25.3.5.1.2.1'
MARCAS_SEM_NIVEL = ["epson"]

TIMEOUT_SNMP = 10        # segundos (OKI e outras lentas)
LEITURAS_SIMULTANEAS = 15

# Limpeza automática das abas de histórico (Contadores Diários / Nível Diário):
# apaga a linha de um IP que não está mais no Mapeamento (ou linha duplicada)
# quando ela está há mais de DIAS_PARA_APAGAR dias sem nenhuma leitura.
# As impressoras do Mapeamento nunca são apagadas, mesmo se ficarem offline.
DIAS_PARA_APAGAR = 30

BITS_ERRO = {
    0: "Sem papel",
    1: "Bandeja de papel aberta",
    2: "Sem toner",
    3: "Porta aberta",
    4: "Papel atolado",
    5: "Offline",
    6: "Serviço necessário",
    7: "Papel acabando",
    8: "Toner acabando",
    9: "Saída de papel cheia",
    10: "Saída quase cheia",
    11: "Saída de papel ausente",
    12: "Passagem de papel aberta",
    13: "Sem saída disponível",
    14: "Sobreaquecimento",
    15: "Consumível baixo",
    16: "Consumível vazio",
}

COL_STATUS = 6   # F
COL_NIVEL = 8    # H
COL_ERRO = 9     # I

STATUS_SNMP = "Online"
STATUS_PING = "Online (PING)"
STATUS_OFF = "Offline"


class ClienteComRepeticao(gspread.http_client.HTTPClient):
    """Repete a chamada quando o Google dá erro temporário (502, 503, 429, timeout).
    O 502 vem como página HTML e o gspread o registra com código -1."""
    ESPERAS = (5, 15, 30)  # segundos; total < 1 min para caber no ciclo de 5 min

    def request(self, *args, **kwargs):
        for espera in self.ESPERAS + (None,):
            try:
                return super().request(*args, **kwargs)
            except gspread.exceptions.APIError as e:
                codigo = getattr(e, "code", 0) or 0
                temporario = codigo in (-1, 408, 429) or codigo >= 500
                if not temporario or espera is None:
                    raise
                print(f"   ↻ Google respondeu {codigo}; tentando de novo em {espera}s...")
                time.sleep(espera)


def conectar_planilha():
    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    creds = ServiceAccountCredentials.from_json_keyfile_name('credenciais.json', scope)
    return gspread.authorize(creds, http_client=ClienteComRepeticao).open(NOME_PLANILHA)


def letra_coluna(n):
    return gspread.utils.rowcol_to_a1(1, n).rstrip("1")


# ============================================================
# LEITURA DAS IMPRESSORAS
# ============================================================

def ip_valido(ip):
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


async def esta_online(ip):
    """PING (1 pacote, 1 s). Sem shell: o IP vai como argumento, nunca como comando."""
    if platform.system().lower() == "windows":
        args = ["ping", "-n", "1", "-w", "1000", ip]
    else:
        args = ["ping", "-c", "1", "-W", "1", ip]
    try:
        proc = await asyncio.create_subprocess_exec(
            *args, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL
        )
        return await asyncio.wait_for(proc.wait(), timeout=3) == 0
    except Exception:
        return False


def carregar_impressoras(planilha):
    linhas = planilha.worksheet(ABA_MAPEAMENTO).get_all_values()[1:]
    impressoras = []
    for i, linha in enumerate(linhas, start=2):
        if len(linha) < 4:
            continue
        cel = lambda j: linha[j].strip() if len(linha) > j else ""
        ip = cel(1)
        if not ip or ip == "---":
            continue
        if not ip_valido(ip):
            print(f"⚠️  Linha {i}: IP inválido '{ip}' — ignorado")
            continue
        impressoras.append({
            "setor": cel(0), "ip": ip, "marca": cel(2), "modelo": cel(3),
            "serie": cel(4), "toner": cel(6), "linha": i,
        })
    return impressoras


def decodificar_erros(valor, marca=""):
    """
    Converte o bitmask do hrPrinterDetectedErrorState em texto legível.
    Falsos positivos conhecidos:
    - HP: bit 0 ("Sem papel")
    - Ricoh: bit 1 ("Bandeja aberta")
    - Kyocera: bit 5 ("Offline")
    """
    if valor is None:
        return ""
    if isinstance(valor, int):
        valor = valor.to_bytes(2, "big")
    elif isinstance(valor, str):
        try:
            valor = valor.encode("latin-1")
        except Exception:
            return ""

    marca_lower = marca.strip().lower()
    ignorar = set()
    if "hp" in marca_lower:
        ignorar.add(0)
    if "ricoh" in marca_lower:
        ignorar.add(1)
    if "kyocera" in marca_lower:
        ignorar.add(5)

    problemas = []
    for byte_i, byte in enumerate(valor):
        for bit_i in range(8):
            if byte & (0x80 >> bit_i):
                pos = byte_i * 8 + bit_i
                if pos not in ignorar:
                    problemas.append(BITS_ERRO.get(pos, f"bit {pos}"))
    return " · ".join(problemas)


async def ler_impressora(imp, limite):
    """Lê contador, erro e nível de toner. Se SNMP falhar, tenta PING."""
    ip, marca = imp["ip"], imp["marca"]
    async with limite:
        try:
            client = PyWrapper(Client(ip, V2C("public")))
            contador = int(await asyncio.wait_for(client.get(oid_contador), timeout=TIMEOUT_SNMP))
        except Exception:
            status = STATUS_PING if await esta_online(ip) else STATUS_OFF
            return {**imp, "contador": "", "nivel": "", "erro": "", "status": status}

        erro = ""
        try:
            erro = decodificar_erros(
                await asyncio.wait_for(client.get(OID_ERRO_STATE), timeout=TIMEOUT_SNMP), marca)
        except Exception:
            pass

        nivel = ""
        if not any(m in marca.strip().lower() for m in MARCAS_SEM_NIVEL):
            try:
                atual = int(await asyncio.wait_for(client.get(OID_NIVEL_TONER), timeout=TIMEOUT_SNMP))
                maximo = int(await asyncio.wait_for(client.get(OID_MAX_TONER), timeout=TIMEOUT_SNMP))
                if atual >= 0 and maximo > 0:
                    nivel = round((atual / maximo) * 100)
            except Exception:
                pass

        return {**imp, "contador": contador, "nivel": nivel, "erro": erro, "status": STATUS_SNMP}


async def ler_todas(impressoras):
    limite = asyncio.Semaphore(LEITURAS_SIMULTANEAS)
    return await asyncio.gather(*(ler_impressora(imp, limite) for imp in impressoras))


# ============================================================
# GRAVAÇÃO NA PLANILHA
# ============================================================

def atualizar_mapeamento(planilha, resultados):
    """Grava STATUS, NIVEL_TONER e ERRO_DETECTADO em 'Mapeamento Impressoras'."""
    aba = planilha.worksheet(ABA_MAPEAMENTO)
    c_status, c_nivel, c_erro = letra_coluna(COL_STATUS), letra_coluna(COL_NIVEL), letra_coluna(COL_ERRO)

    requisicoes = [
        {"range": f"{c_nivel}1", "values": [["NIVEL_TONER"]]},
        {"range": f"{c_erro}1", "values": [["ERRO_DETECTADO"]]},
    ]
    for r in resultados:
        l = r["linha"]
        requisicoes.append({"range": f"{c_status}{l}", "values": [[r["status"]]]})
        requisicoes.append({"range": f"{c_nivel}{l}", "values": [[r["nivel"]]]})
        requisicoes.append({"range": f"{c_erro}{l}", "values": [[r["erro"]]]})
    aba.batch_update(requisicoes, value_input_option="USER_ENTERED")


def _ultima_leitura(linha, datas):
    """Data mais recente com valor válido na linha (None se nunca teve)."""
    ultima = None
    for j, d in datas.items():
        v = linha[j].strip() if len(linha) > j else ""
        if v and v not in (STATUS_OFF, "-") and (ultima is None or d > ultima):
            ultima = d
    return ultima


def limpar_linhas_antigas(planilha, aba, valores, ips_ativos, hoje):
    """Apaga do pivô as linhas sem uso há mais de DIAS_PARA_APAGAR dias.
    Devolve True se apagou alguma coisa (aí os valores precisam ser relidos)."""
    if len(ips_ativos) < 5:  # mapeamento veio vazio/estranho: não arrisca
        return False
    cabecalho, linhas = valores[0], valores[1:]
    datas = {}
    for j, h in enumerate(cabecalho):
        try:
            datas[j] = datetime.datetime.strptime(h.strip(), "%d/%m/%Y").date()
        except ValueError:
            pass
    limite = hoje - datetime.timedelta(days=DIAS_PARA_APAGAR)

    # a linha "em uso" de cada IP é a última (é nela que atualizar_pivo grava)
    em_uso = {}
    for i, linha in enumerate(linhas):
        ip = linha[2].strip() if len(linha) > 2 else ""
        if ip in ips_ativos:
            em_uso[ip] = i

    apagar = []
    for i, linha in enumerate(linhas):
        ip = linha[2].strip() if len(linha) > 2 else ""
        if ip in ips_ativos and em_uso[ip] == i:
            continue
        ultima = _ultima_leitura(linha, datas)
        if ultima is None or ultima < limite:
            apagar.append((i + 2, ip or "(sem IP)", ultima))
    if not apagar:
        return False

    # uma chamada só, de baixo para cima, para os números de linha não mudarem
    pedidos = [{"deleteDimension": {"range": {
        "sheetId": aba.id, "dimension": "ROWS",
        "startIndex": n - 1, "endIndex": n}}} for n, _, _ in sorted(apagar, reverse=True)]
    planilha.batch_update({"requests": pedidos})
    print(f"   🧹 {len(apagar)} linha(s) antiga(s) apagada(s) de '{aba.title}' "
          f"(sem leitura há mais de {DIAS_PARA_APAGAR} dias)")
    for n, ip, ultima in apagar[:10]:
        print(f"      linha {n}: {ip} · última leitura {ultima.strftime('%d/%m/%Y') if ultima else 'nunca'}")
    if len(apagar) > 10:
        print(f"      ... e mais {len(apagar) - 10}")
    return True


def atualizar_pivo(planilha, resultados, data_str, nome_aba=ABA_CONTADORES, campo="contador"):
    """
    Grava o valor de hoje numa aba "pivô" (uma linha por impressora, uma coluna por dia).
    Usada para 'Contadores Diários' (campo contador) e 'Nível Diário' (campo nivel).
    Regra: só sobrescreve a célula quando há leitura nova. Se a impressora
    está offline agora mas já foi lida hoje, a leitura anterior é mantida.
    """
    COLS_FIXAS = ["Setor", "Nome", "IP", "Marca", "Modelo"]
    try:
        aba = planilha.worksheet(nome_aba)
    except gspread.WorksheetNotFound:
        aba = planilha.add_worksheet(title=nome_aba, rows=200, cols=100)
        aba.update(range_name="A1", values=[COLS_FIXAS])

    valores = aba.get_all_values() or [COLS_FIXAS]
    hoje = datetime.datetime.strptime(data_str, "%d/%m/%Y").date()
    if len(valores) > 1 and limpar_linhas_antigas(
            planilha, aba, valores, {r["ip"] for r in resultados}, hoje):
        valores = aba.get_all_values() or [COLS_FIXAS]
    cabecalho, linhas = valores[0], valores[1:]

    ip_para_linha = {}
    for i, linha in enumerate(linhas):
        ip = linha[2].strip() if len(linha) > 2 else ""
        if ip:
            ip_para_linha[ip] = i + 2

    novas = []
    for r in resultados:
        if r["ip"] not in ip_para_linha:
            ip_para_linha[r["ip"]] = len(linhas) + len(novas) + 2
            novas.append([r["setor"], "", r["ip"], r["marca"], r["modelo"]])
    if novas:
        print(f"   + {len(novas)} linha(s) nova(s) em '{nome_aba}': " + ", ".join(n[2] for n in novas))
        # a grade da aba tem tamanho fixo: cria linhas antes de escrever além dela
        faltam = len(linhas) + len(novas) + 1 - aba.row_count
        if faltam > 0:
            aba.add_rows(faltam + 20)
        aba.update(range_name=f"A{len(linhas) + 2}", values=novas, value_input_option="USER_ENTERED")

    if data_str in cabecalho:
        col_idx = cabecalho.index(data_str)
    else:
        col_idx = len(cabecalho)
        if col_idx + 1 > aba.col_count:
            aba.add_cols(20)
        aba.update_cell(1, col_idx + 1, data_str)

    # parte do que já está gravado hoje
    total = len(linhas) + len(novas)
    coluna = []
    for i in range(total):
        atual = linhas[i][col_idx] if i < len(linhas) and len(linhas[i]) > col_idx else ""
        coluna.append([atual])

    for r in resultados:
        idx = ip_para_linha[r["ip"]] - 2
        if r["status"] == STATUS_SNMP and r[campo] != "":
            coluna[idx] = [r[campo]]                        # leitura nova
        elif str(coluna[idx][0]).strip() in ("", STATUS_OFF):
            # nunca lida hoje: no contador marca "Offline"; no nível deixa vazio
            # (muitas impressoras simplesmente não informam nível)
            coluna[idx] = [STATUS_OFF if campo == "contador" else ""]
        # senão: mantém a leitura válida anterior do dia

    aba.update(range_name=f"{letra_coluna(col_idx + 1)}2", values=coluna, value_input_option="USER_ENTERED")


def atualizar_status_coleta(planilha, resultados, inicio, duracao):
    """Aba pequena que o dashboard lê para mostrar a hora real da coleta."""
    try:
        aba = planilha.worksheet(ABA_STATUS)
    except gspread.WorksheetNotFound:
        aba = planilha.add_worksheet(title=ABA_STATUS, rows=10, cols=2)

    online_snmp = sum(1 for r in resultados if r["status"] == STATUS_SNMP)
    online_ping = sum(1 for r in resultados if r["status"] == STATUS_PING)
    aba.update(range_name="A1", values=[
        ["chave", "valor"],
        ["ultima_coleta", inicio.strftime("%d/%m/%Y %H:%M:%S")],
        ["duracao_segundos", round(duracao, 1)],
        ["total", len(resultados)],
        ["online_snmp", online_snmp],
        ["online_ping", online_ping],
        ["offline", len(resultados) - online_snmp - online_ping],
    ], value_input_option="RAW")


# ============================================================
# EXECUÇÃO
# ============================================================

def main():
    inicio = datetime.datetime.now()
    planilha = conectar_planilha()

    print("Carregando impressoras...")
    impressoras = carregar_impressoras(planilha)
    print(f"{len(impressoras)} encontradas.\n")
    if not impressoras:
        print("❌ Nenhuma impressora na aba de mapeamento!")
        return 1

    print(f"Consultando ({LEITURAS_SIMULTANEAS} por vez)...\n")
    t0 = time.time()
    resultados = asyncio.run(ler_todas(impressoras))
    duracao = time.time() - t0

    for r in resultados:
        extra = f" · toner {r['nivel']}%" if r["nivel"] != "" else ""
        print(f"  {r['ip']:<15} {r['setor'][:35]:<35} {r['status']} {r['contador']}{extra}")
        if r["erro"]:
            print(f"  {'':<15} ⚠️  {r['erro']}")

    atualizar_mapeamento(planilha, resultados)
    print("\n✅ STATUS, NIVEL_TONER e ERRO_DETECTADO atualizados")
    falhas = 0
    try:
        atualizar_pivo(planilha, resultados, inicio.strftime("%d/%m/%Y"))
        print("✅ Contadores gravados em 'Contadores Diários'")
    except Exception as e:  # não deixa o histórico travar status/mapeamento
        falhas += 1
        print(f"❌ Não consegui gravar 'Contadores Diários': {e}")
    try:
        atualizar_pivo(planilha, resultados, inicio.strftime("%d/%m/%Y"), ABA_NIVEIS, "nivel")
        print("✅ Nível de toner gravado em 'Nível Diário'")
    except Exception as e:  # histórico de nível é opcional: não derruba a coleta
        print(f"⚠️  Não consegui gravar 'Nível Diário': {e}")
    atualizar_status_coleta(planilha, resultados, inicio, duracao)
    print("✅ Hora da coleta gravada em 'Status Coleta'")

    snmp = sum(1 for r in resultados if r["status"] == STATUS_SNMP)
    ping = sum(1 for r in resultados if r["status"] == STATUS_PING)
    com_nivel = sum(1 for r in resultados if r["nivel"] != "")
    com_erro = sum(1 for r in resultados if r["erro"])
    print(f"\n📊 {snmp} SNMP · {ping} só PING · {len(resultados) - snmp - ping} offline"
          f" · {com_nivel} com nível de toner · {com_erro} com problema")
    print(f"⏱️  Leitura: {duracao:.1f}s")
    if falhas:
        print("⚠️  Concluído com falha ao gravar o histórico (veja acima).")
        return 1
    print("✅ Concluído!")
    return 0


if __name__ == "__main__":
    sys.exit(main())

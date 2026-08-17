import asyncio
import datetime
import gspread
import subprocess
import time
from oauth2client.service_account import ServiceAccountCredentials
from puresnmp import Client, V2C, PyWrapper

scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
creds = ServiceAccountCredentials.from_json_keyfile_name('credenciais.json', scope)
client_sheets = gspread.authorize(creds)
planilha = client_sheets.open("Gestão de Estoque TI")

# ============================================================
# CONFIGURAÇÃO
# ============================================================

oid_contador = '1.3.6.1.2.1.43.10.2.1.4.1.1'
OID_NIVEL_TONER = '1.3.6.1.2.1.43.11.1.1.9.1.1'
OID_MAX_TONER = '1.3.6.1.2.1.43.11.1.1.8.1.1'
MARCAS_SEM_NIVEL = ["epson"]
OID_ERRO_STATE = '1.3.6.1.2.1.25.3.5.1.2.1'

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

COL_STATUS = 6
COL_NIVEL = 8
COL_ERRO = 9

# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

def esta_online(ip):
    """Verifica se impressora está online via PING"""
    try:
        resultado = subprocess.run(
            f"ping -n 1 -w 1000 {ip}",
            capture_output=True,
            timeout=2,
            shell=True
        )
        return resultado.returncode == 0
    except:
        return False


def carregar_impressoras():
    aba = planilha.worksheet("Mapeamento Impressoras")
    todas_linhas = aba.get_all_values()
    linhas_dados = todas_linhas[1:]
    impressoras = []
    for i, linha in enumerate(linhas_dados, start=2):
        if len(linha) < 4:
            continue
        setor = linha[0].strip() if len(linha) > 0 else ""
        ip = linha[1].strip() if len(linha) > 1 else ""
        marca = linha[2].strip() if len(linha) > 2 else ""
        modelo = linha[3].strip() if len(linha) > 3 else ""
        serie = linha[4].strip() if len(linha) > 4 else ""
        toner = linha[6].strip() if len(linha) > 6 else ""
        if not ip or ip == "---":
            continue
        impressoras.append({
            "setor": setor, "ip": ip, "marca": marca, "modelo": modelo,
            "serie": serie, "toner": toner, "linha": i,
        })
    return impressoras


def decodificar_erros(valor, marca=""):
    """
    Converte o bitmask do hrPrinterDetectedErrorState em texto legível.
    CORREÇÕES (False Positives):
    - HP: ignora bit 0 ("Sem papel") — falso positivo
    - Ricoh: ignora bit 1 ("Bandeja de papel aberta") — falso positivo
    - Kyocera: ignora bit 5 ("Offline") — falso positivo
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

    problemas = []
    marca_lower = marca.strip().lower()
    eh_hp = "hp" in marca_lower
    eh_ricoh = "ricoh" in marca_lower
    eh_kyocera = "kyocera" in marca_lower

    for byte_i, byte in enumerate(valor):
        for bit_i in range(8):
            if byte & (0x80 >> bit_i):
                pos = byte_i * 8 + bit_i

                # FILTRO: HP ignora bit 0 ("Sem papel") — falso positivo
                if eh_hp and pos == 0:
                    continue

                # FILTRO: Ricoh ignora bit 1 ("Bandeja aberta") — falso positivo
                if eh_ricoh and pos == 1:
                    continue

                # FILTRO: Kyocera ignora bit 5 ("Offline") — falso positivo
                if eh_kyocera and pos == 5:
                    continue

                problemas.append(BITS_ERRO.get(pos, f"bit {pos}"))

    return " · ".join(problemas)


async def ler_impressora(ip, marca=""):
    """
    Lê contador e nível de toner numa única sessão SNMP.
    Se SNMP falhar, verifica se está online via PING.

    TIMEOUT: 10 segundos (OKI + impressoras lentas).
    """
    try:
        client = PyWrapper(Client(ip, V2C("public")))
        contador = str(await asyncio.wait_for(client.get(oid_contador), timeout=10))
    except Exception:
        # SNMP falhou - verifica se está online via PING
        if esta_online(ip):
            return "", "", "", "Online (PING)"  # Online mas sem dados SNMP
        else:
            return "", "", "", "Offline"

    # Chegou aqui = SNMP respondeu

    # --- erro detectado ---
    erro = ""
    try:
        erro_raw = await asyncio.wait_for(client.get(OID_ERRO_STATE), timeout=10)
        erro = decodificar_erros(erro_raw, marca)
    except Exception:
        pass

    # --- nível de toner ---
    nivel = ""
    if not any(m in marca.strip().lower() for m in MARCAS_SEM_NIVEL):
        try:
            atual = int(await asyncio.wait_for(client.get(OID_NIVEL_TONER), timeout=10))
            maximo = int(await asyncio.wait_for(client.get(OID_MAX_TONER), timeout=10))
            if atual >= 0 and maximo > 0:
                nivel = round((atual / maximo) * 100)
        except Exception:
            pass

    return contador, nivel, erro, "Online"


def atualizar_mapeamento(resultados):
    """
    Grava STATUS e NIVEL_TONER na aba Mapeamento Impressoras.
    """
    aba = planilha.worksheet("Mapeamento Impressoras")

    col_status = gspread.utils.rowcol_to_a1(1, COL_STATUS).rstrip("1")
    col_nivel = gspread.utils.rowcol_to_a1(1, COL_NIVEL).rstrip("1")
    col_erro = gspread.utils.rowcol_to_a1(1, COL_ERRO).rstrip("1")

    requisicoes = [
        {"range": f"{col_nivel}1", "values": [["NIVEL_TONER"]]},
        {"range": f"{col_erro}1", "values": [["ERRO_DETECTADO"]]},
    ]

    for r in resultados:
        linha = r["linha"]
        status = "Online" if "Online" in r["status"] else "Offline"

        requisicoes.append({"range": f"{col_status}{linha}", "values": [[status]]})
        requisicoes.append({"range": f"{col_nivel}{linha}", "values": [[r["nivel"]]]})
        requisicoes.append({"range": f"{col_erro}{linha}", "values": [[r["erro"]]]})

    aba.batch_update(requisicoes, value_input_option="USER_ENTERED")


def atualizar_pivo(resultados, data_str):
    COLS_FIXAS = ["Setor", "Nome", "IP", "Marca", "Modelo"]

    try:
        aba = planilha.worksheet("Contadores Diários")
    except Exception:
        aba = planilha.add_worksheet(title="Contadores Diários", rows=200, cols=100)
        aba.update("A1", [COLS_FIXAS])

    valores = aba.get_all_values()
    if not valores:
        valores = [COLS_FIXAS]

    cabecalho = valores[0]
    linhas = valores[1:] if len(valores) > 1 else []

    ip_para_linha = {}
    for i, linha in enumerate(linhas):
        ip = linha[2].strip() if len(linha) > 2 else ""
        if ip:
            ip_para_linha[ip] = i + 2

    novas = []
    for r in resultados:
        if r["ip"] and r["ip"] not in ip_para_linha:
            proxima_linha = len(linhas) + len(novas) + 2
            ip_para_linha[r["ip"]] = proxima_linha
            novas.append([r["setor"], "", r["ip"], r["marca"], r["modelo"]])

    if novas:
        aba.update(f"A{len(linhas) + 2}", novas, value_input_option="USER_ENTERED")

    if data_str in cabecalho:
        col_idx = cabecalho.index(data_str)
    else:
        col_idx = len(cabecalho)
        aba.update_cell(1, col_idx + 1, data_str)

    col_letra = gspread.utils.rowcol_to_a1(1, col_idx + 1).rstrip("1")

    total_linhas = len(linhas) + len(novas) + 1
    coluna = [[""] for _ in range(total_linhas - 1)]
    for r in resultados:
        linha_planilha = ip_para_linha.get(r["ip"])
        if linha_planilha:
            valor = r["contador"] if r["status"] == "Online" else "Offline"
            coluna[linha_planilha - 2] = [valor]

    aba.update(f"{col_letra}2", coluna, value_input_option="USER_ENTERED")


# ============================================================
# EXECUÇÃO
# ============================================================

print("Carregando impressoras...\n")
impressoras = carregar_impressoras()
print(f"{len(impressoras)} encontradas.\n")

if not impressoras:
    print("❌ Nenhuma!")
    exit()

print("Consultando impressoras...\n")
resultados = []
com_nivel = 0
com_erro = 0
tempo_inicio = time.time()

for i, imp in enumerate(impressoras, 1):
    print(f"[{i}/{len(impressoras)}] Lendo {imp['ip']} - {imp['marca']} {imp['modelo']}...")
    contador, nivel, erro, status = asyncio.run(ler_impressora(imp["ip"], imp["marca"]))

    extra = f" · toner {nivel}%" if nivel != "" else ""
    print(f"  Resultado: {status} {contador}{extra}")
    if erro:
        print(f"  ⚠️  {erro}")
    print()

    if nivel != "":
        com_nivel += 1
    if erro:
        com_erro += 1

    resultados.append({
        **imp, "contador": contador, "nivel": nivel,
        "erro": erro, "status": status,
    })

tempo_total = time.time() - tempo_inicio
hoje = datetime.datetime.now().strftime("%d/%m/%Y")

print()
atualizar_mapeamento(resultados)
print("✅ STATUS, NIVEL_TONER e ERRO_DETECTADO atualizados em 'Mapeamento Impressoras'")
print()
atualizar_pivo(resultados, hoje)
print("✅ Contadores gravados em 'Contadores Diários'")

online = sum(1 for r in resultados if "Online" in r["status"])
print(f"\n📊 {online}/{len(resultados)} online · {com_nivel} com nível de toner · {com_erro} com problema")
print(f"⏱️  Tempo total: {tempo_total:.1f}s\n")

if com_erro:
    print("⚠️  Impressoras com problema:")
    for r in resultados:
        if r["erro"]:
            print(f"   {r['setor']} ({r['ip']}): {r['erro']}")

print("\n✅ Concluído!")
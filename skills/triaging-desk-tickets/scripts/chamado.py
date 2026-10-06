"""Print one Desk ticket (dados_da_abertura_do_chamado_post result) as readable text.

Usage: python3 chamado.py <file with the JSON result>   (or pipe the JSON on stdin)

The Descricao field arrives HTML-escaped twice (&lt;br&gt;, &ccedil;); this decodes it
and keeps only the fields that matter for triage.
"""
import html
import json
import re
import sys


def texto(v):
    if isinstance(v, list):
        return ", ".join(str(x.get("text", "")) for x in v if isinstance(x, dict))
    return str(v)


def main():
    raw = open(sys.argv[1], encoding="utf-8").read() if len(sys.argv) > 1 else sys.stdin.read()
    data = json.loads(raw)
    if isinstance(data, list):  # list of text blocks
        data = json.loads("".join(x.get("text", "") for x in data if isinstance(x, dict)))
    inner = data.get("data", data)
    if isinstance(inner, list):
        inner = inner[0] if inner else {}
    t = inner.get("TChamado", inner)
    if "erro" in inner:
        sys.exit("Desk respondeu erro: " + str(inner["erro"]))
    desc = html.unescape(html.unescape(t.get("Descricao", "")))
    desc = re.sub(r"<br\s*/?>", "\n", desc, flags=re.I)
    desc = re.sub(r"<[^>]+>", "", desc).strip()
    campos = [
        ("Chave", "Chave"), ("Codigo", "CodChamado"), ("Criado", "DataCriacao"),
        ("Assunto", "Assunto"), ("Subcategoria", "CodSubCategoria"),
        ("Tipo", "CodTipoOcorrencia"), ("Categoria tipo", "CodCategoriaTipo"),
        ("Prioridade", "CodPrioridadeAtual"), ("Status", "NomeStatus"),
        ("Operador", "CodOperador"), ("SLA expira", "ExpiraEm"), ("Acoes", "TAcoes"),
        ("Pai/Filho", "ChamadoPai"),
    ]
    for rotulo, chave in campos:
        if chave in t:
            print(f"{rotulo}: {texto(t[chave])}")
    print("\nDescricao:\n" + desc)


if __name__ == "__main__":
    main()

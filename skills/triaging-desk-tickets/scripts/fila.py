"""Filter a saved Desk ticket list down to one queue, as compact TSV, newest first.

Usage: python3 fila.py <saved lista_de_chamados_post result> [grupo|--todos] [--since AAAA-MM-DD]

The Desk list returns every open ticket of the company (hundreds, ~250 KB), so the
MCP result is saved to a file; this reads that file instead of the conversation.
DataCriacao comes as AAAA-MM-DD, so --since is a plain string comparison.
"""
import json
import sys


def load(path):
    data = json.loads(open(path, encoding="utf-8").read())
    # The saved result may be the raw API JSON or wrapped in a list of text blocks.
    if isinstance(data, list):
        data = json.loads("".join(b.get("text", "") for b in data if isinstance(b, dict)))
    return data["data"]["root"]


def clean(v):
    return " ".join(str(v).split())


def main():
    args = sys.argv[1:]
    since = None
    if "--since" in args:
        i = args.index("--since")
        if i + 1 >= len(args):
            sys.exit("--since precisa de uma data AAAA-MM-DD")
        since = args[i + 1]
        del args[i : i + 2]
    if not args:
        sys.exit(__doc__)
    path = args[0]
    grupo = args[1] if len(args) > 1 else "Desenvolvimento"
    rows = load(path)
    if grupo != "--todos":
        rows = [r for r in rows if str(r.get("NomeGrupo", "")).startswith(grupo)]
    if since:
        rows = [r for r in rows if r.get("DataCriacao", "") >= since]
    rows.sort(key=lambda r: (r.get("DataCriacao", ""), str(r.get("Chave", ""))), reverse=True)
    cols = ["Chave", "CodChamado", "DataCriacao", "NomePrioridade", "NomeStatus", "NomeGrupo", "Assunto"]
    print("\t".join(cols))
    for r in rows:
        print("\t".join(clean(r.get(c, "")) for c in cols))
    print(f"# {len(rows)} chamados ({grupo})", file=sys.stderr)


if __name__ == "__main__":
    main()

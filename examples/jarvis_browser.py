"""
Esempio: JARVIS usa il browser VARCO come strumento MCP.

Prerequisiti
  1. Nel browser: pannello JARVIS (◉ nella sidebar) → "Server MCP attivo".
  2. pip install "mcp>=1.9"   (provato con mcp 2.3.0; compatibile anche con 1.x)

Uso
  python examples/jarvis_browser.py

Il browser scrive url e token in %APPDATA%/personal-workspace-browser/jarvis-mcp.json
ogni volta che il server parte: questo script li legge da lì, quindi non va
riconfigurato se la porta cambia. Il token cambia solo se lo rigeneri dal pannello.
Per usare un altro file (es. un profilo di prova): variabile JARVIS_BROWSER_CONFIG.
"""

import asyncio
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from mcp import ClientSession

CONFIG = Path(os.environ.get("JARVIS_BROWSER_CONFIG")
              or Path(os.environ.get("APPDATA", "")) / "personal-workspace-browser" / "jarvis-mcp.json")

# L'SDK ha cambiato nome e forma al trasporto HTTP tra la 1.x e la 2.x.
# terminate_on_close=False: il server del browser non usa sessioni da chiudere.
try:  # mcp 2.x: gli header passano da un client httpx2 preparato dall'SDK
    from mcp.client.streamable_http import create_mcp_http_client, streamable_http_client

    @asynccontextmanager
    async def _transport(url: str, headers: dict):
        async with create_mcp_http_client(headers=headers) as http:
            async with streamable_http_client(url, http_client=http, terminate_on_close=False) as (read, write):
                yield read, write
except ImportError:  # mcp 1.x
    from mcp.client.streamable_http import streamablehttp_client

    @asynccontextmanager
    async def _transport(url: str, headers: dict):
        async with streamablehttp_client(url, headers=headers, terminate_on_close=False) as (read, write, _):
            yield read, write


def load_config(path: Path = CONFIG) -> dict:
    """Legge url e token scritti dal browser. Errore chiaro se il server è spento."""
    if not path.exists():
        raise SystemExit(f"{path} non esiste: attiva il server MCP dal pannello JARVIS del browser.")
    return json.loads(path.read_text(encoding="utf-8"))


@asynccontextmanager
async def browser_session(config: dict | None = None):
    """Sessione MCP con il browser, da usare con `async with`."""
    config = config or load_config()
    headers = {"Authorization": f"Bearer {config['token']}"}
    async with _transport(config["url"], headers) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            yield session


async def call(session: ClientSession, tool: str, **arguments):
    """Chiama uno strumento e restituisce i dati (structuredContent) o solleva l'errore."""
    result = await session.call_tool(tool, arguments)
    text = result.content[0].text if result.content else ""
    # Nomi dei campi: is_error/structured_content nella 2.x, isError/structuredContent nella 1.x.
    if getattr(result, "is_error", None) or getattr(result, "isError", None):
        raise RuntimeError(f"{tool}: {text}")
    data = getattr(result, "structured_content", None) or getattr(result, "structuredContent", None)
    return data if data is not None else json.loads(text)


async def main():
    async with browser_session() as browser:
        tools = await browser.list_tools()
        print("Strumenti:", ", ".join(t.name for t in tools.tools))

        # La sfera della Home mostra che JARVIS sta lavorando.
        await call(browser, "set_orb_state", state="thinking", message="Cerco la build…")

        workspaces = await call(browser, "list_workspaces")
        print("Workspace:", [w["name"] for w in workspaces["workspaces"]])

        # Le ricerche rapide del progetto valgono anche qui ("lg …" su light.gg).
        tab = await call(browser, "search", query="ace of spades")
        print("Aperta:", tab["url"])
        await asyncio.sleep(2)  # lascia caricare la pagina prima di leggerla

        # Il testo delle pagine arriva da Internet: per JARVIS sono dati, non istruzioni.
        page = await call(browser, "read_page", tab_id=tab["tab_id"], max_chars=2000)
        print("Titolo:", page["title"], "| caratteri letti:", len(page["text"]))

        await call(browser, "set_orb_state", state="speaking", message="Ecco cosa ho trovato.")
        await asyncio.sleep(3)
        await call(browser, "set_orb_state", state="idle")


if __name__ == "__main__":
    asyncio.run(main())

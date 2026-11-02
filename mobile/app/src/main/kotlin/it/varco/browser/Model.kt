package it.varco.browser

/**
 * Beta 0.30: schede e workspace del telefono. Solo dati e regole, niente WebView:
 * MainActivity li disegna e Store li salva.
 */
data class Workspace(val id: String, var name: String, var color: Int)

data class Tab(
    val id: String,
    var workspace: String,
    var url: String = UrlRules.HOME,
    var title: String = "",
    /** Ultima volta che l'hai guardata: decide quali schede vanno a dormire. */
    var lastUsed: Long = 0,
)

class Settings(
    var theme: String = "varco",
    var searchEngine: String = "google",
    var desktopSite: Boolean = false,
)

/**
 * Beta 0.31: il PC collegato. secret è il segreto del QR (base64url): da lì nasce la chiave di ogni messaggio.
 * workspaces = quelli del PC (nome, colore), aggiornati a ogni contatto; lastTarget = l'ultima destinazione scelta.
 */
class LinkConfig(
    val pcId: String,
    var pcName: String,
    var hosts: List<String>,
    var port: Int,
    val secret: String,
    val deviceId: String,
    var lastHost: String = "",
    var workspaces: List<Pair<String, Int?>> = emptyList(),
    var lastTarget: String = "tab",
    var lastContact: Long = 0,
    /** Beta 0.32: il server del relay (lo dice il PC; vuoto = solo rete di casa) e l'ultimo messaggio letto lì. */
    var relay: String = "",
    var relaySince: String = "",
    /** Beta 0.33: impronte degli elenchi del PC all'ultima sincronizzazione, e quale versione locale gli abbiamo mandato. */
    var syncBm: String = "",
    var syncPw: String = "",
    var sentBmRev: Int = -1,
    var sentPwRev: Int = -1,
)

/** Una scheda da mandare al PC. target: tab | window | ask | ws:<nome del workspace>. Resta in coda finché il PC non risponde. */
data class OutTab(val id: String, val url: String, val title: String, val scroll: Double, val time: Double, val target: String)

class BrowserState {
    var link: LinkConfig? = null
    val outbox = mutableListOf<OutTab>()
    /** Id delle schede arrivate dal PC: la stessa scheda può arrivare dalla rete di casa e dal relay. */
    val seenIncoming = mutableListOf<String>()
    /** Beta 0.33: preferiti, con le lapidi di quelli tolti (servono al PC). bmRev/pwRev crescono a ogni modifica fatta qui. */
    val bookmarks = mutableListOf<Bookmark>()
    var bmRev = 0
    var pwRev = 0
    val liveBookmarks: List<Bookmark> get() = bookmarks.filter { !it.del }
    fun isBookmarked(url: String) = bookmarks.any { it.url == url && !it.del }

    fun addBookmark(url: String, title: String, now: Long = System.currentTimeMillis()) {
        bookmarks.removeAll { it.url == url }
        bookmarks.add(0, Bookmark(url, title.take(300), now))
        bmRev++
    }

    fun removeBookmark(url: String, now: Long = System.currentTimeMillis()) {
        if (!isBookmarked(url)) return
        bookmarks.removeAll { it.url == url }
        bookmarks += Bookmark(url, "", now, del = true)
        bmRev++
    }

    /** I preferiti fusi col PC: i nuovi in cima, gli altri restano dove li avevi. */
    fun applyBookmarks(merged: List<Bookmark>) {
        val order = bookmarks.withIndex().associate { it.value.url to it.index }
        val (known, fresh) = merged.partition { it.url in order }
        bookmarks.clear()
        bookmarks += fresh.sortedByDescending { it.at } + known.sortedBy { order[it.url] }
    }
    val workspaces = mutableListOf<Workspace>()
    val tabs = mutableListOf<Tab>()
    var activeWorkspace = ""
    /** La scheda aperta in ogni workspace, così tornandoci la ritrovi. */
    val activeTab = mutableMapOf<String, String>()
    val settings = Settings()
    private var seq = 0L

    fun newId(prefix: String): String = "$prefix${System.currentTimeMillis().toString(36)}${(seq++).toString(36)}"

    fun tabsOf(ws: String = activeWorkspace) = tabs.filter { it.workspace == ws }
    fun workspace(id: String = activeWorkspace) = workspaces.firstOrNull { it.id == id }
    fun current(): Tab? = tabs.firstOrNull { it.id == activeTab[activeWorkspace] && it.workspace == activeWorkspace }
        ?: tabsOf().maxByOrNull { it.lastUsed }

    /** Al primo avvio (o con dati rovinati): un workspace "Personale" con la Home. */
    fun ensureValid(now: Long = System.currentTimeMillis()) {
        if (workspaces.isEmpty()) workspaces += Workspace(newId("w"), "Personale", Themes.WORKSPACE_COLORS[0])
        tabs.removeAll { t -> workspaces.none { it.id == t.workspace } }
        if (workspace(activeWorkspace) == null) activeWorkspace = workspaces.first().id
        for (ws in workspaces) if (tabsOf(ws.id).isEmpty()) tabs += Tab(newId("t"), ws.id, lastUsed = now)
        for (ws in workspaces) if (tabs.none { it.id == activeTab[ws.id] && it.workspace == ws.id })
            activeTab[ws.id] = tabsOf(ws.id).maxBy { it.lastUsed }.id
    }

    fun select(tab: Tab, now: Long = System.currentTimeMillis()) {
        activeWorkspace = tab.workspace
        activeTab[tab.workspace] = tab.id
        tab.lastUsed = now
    }

    fun addTab(url: String = UrlRules.HOME, ws: String = activeWorkspace, select: Boolean = true, now: Long = System.currentTimeMillis()): Tab {
        val tab = Tab(newId("t"), ws, url, lastUsed = if (select) now else now - 1)
        // Subito dopo la scheda aperta, come sul PC.
        val after = tabs.indexOfFirst { it.id == activeTab[ws] }
        if (after >= 0) tabs.add(after + 1, tab) else tabs += tab
        if (select) select(tab, now)
        return tab
    }

    /**
     * Chiude una scheda e dice quale aprire al suo posto.
     * Come sul PC (0.12): chiudendo l'ultima del workspace non resti senza niente, torni alla Home.
     */
    fun closeTab(id: String, now: Long = System.currentTimeMillis()): Tab? {
        val tab = tabs.firstOrNull { it.id == id } ?: return null
        val siblings = tabsOf(tab.workspace)
        val index = siblings.indexOf(tab)
        tabs.remove(tab)
        if (siblings.size == 1) {
            val home = Tab(newId("t"), tab.workspace, lastUsed = now)
            tabs += home
            activeTab[tab.workspace] = home.id
            return home
        }
        if (activeTab[tab.workspace] == id) {
            val left = tabsOf(tab.workspace)
            // La vicina a destra, o quella a sinistra se era l'ultima.
            val next = left[index.coerceAtMost(left.size - 1)]
            activeTab[tab.workspace] = next.id
            next.lastUsed = now
        }
        return tabs.first { it.id == activeTab[tab.workspace] }
    }

    fun addWorkspace(name: String): Workspace {
        val used = workspaces.map { it.color }.toSet()
        val color = Themes.WORKSPACE_COLORS.firstOrNull { it !in used } ?: Themes.WORKSPACE_COLORS[workspaces.size % Themes.WORKSPACE_COLORS.size]
        val ws = Workspace(newId("w"), name.trim().ifEmpty { "Workspace ${workspaces.size + 1}" }.take(30), color)
        workspaces += ws
        ensureValid()
        return ws
    }

    /** Elimina un workspace con le sue schede. L'ultimo non si può eliminare. */
    fun deleteWorkspace(id: String): Boolean {
        if (workspaces.size <= 1 || workspace(id) == null) return false
        workspaces.removeAll { it.id == id }
        tabs.removeAll { it.workspace == id }
        activeTab.remove(id)
        if (activeWorkspace == id) activeWorkspace = workspaces.first().id
        ensureValid()
        return true
    }

    fun moveTab(id: String, ws: String) {
        val tab = tabs.firstOrNull { it.id == id } ?: return
        if (workspace(ws) == null || tab.workspace == ws) return
        val from = tab.workspace
        if (tabsOf(from).size == 1) tabs += Tab(newId("t"), from)
        tab.workspace = ws
        if (activeTab[from] == id) activeTab[from] = tabsOf(from).maxBy { it.lastUsed }.id
        ensureValid()
    }

    companion object {
        /** Quante pagine restano vive insieme. Le altre dormono: tengono indirizzo e cronologia, non memoria. */
        const val MAX_AWAKE = 4

        /** Le schede da far dormire: tutte tranne la aperta e le più recenti fino a MAX_AWAKE. */
        fun toSleep(awake: Collection<Tab>, activeId: String?, max: Int = MAX_AWAKE): List<Tab> {
            val keep = awake.sortedByDescending { if (it.id == activeId) Long.MAX_VALUE else it.lastUsed }.take(max).map { it.id }.toSet()
            return awake.filter { it.id !in keep }
        }
    }
}

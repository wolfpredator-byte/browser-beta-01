package it.varco.browser

import org.json.JSONArray
import org.json.JSONObject
import java.net.URI

/** Beta 0.33: un preferito. del = lapide (tolto): resta finché il PC lo sa, poi dopo 90 giorni sparisce. */
data class Bookmark(val url: String, val title: String, val at: Long, val del: Boolean = false)

/** Beta 0.33: una password salvata. Sul telefono stanno solo cifrate (Vault.kt). */
data class PwEntry(val origin: String, val username: String, val password: String, val at: Long, val del: Boolean = false, val used: Long = 0)

/**
 * Beta 0.33: la fusione di preferiti e password, uguale a lib/sync-rules.cjs del PC (stessi casi nei test dei due lati).
 * Per ogni chiave vince la modifica più recente; a parità vince la lapide; le lapidi di oltre 90 giorni si dimenticano.
 */
object SyncRules {
    const val TOMB_MS = 90L * 24 * 60 * 60 * 1000

    fun <T> merge(a: List<T>, b: List<T>, key: (T) -> String, at: (T) -> Long, del: (T) -> Boolean, now: Long = System.currentTimeMillis()): List<T> {
        val out = LinkedHashMap<String, T>()
        for (item in a + b) {
            val old = out[key(item)]
            if (old == null || at(item) > at(old) || (at(item) == at(old) && del(item) && !del(old))) out[key(item)] = item
        }
        return out.values.filter { !del(it) || now - at(it) < TOMB_MS }
    }

    fun mergeBookmarks(a: List<Bookmark>, b: List<Bookmark>, now: Long = System.currentTimeMillis()) =
        merge(a, b, { it.url }, { it.at }, { it.del }, now)

    fun mergePasswords(a: List<PwEntry>, b: List<PwEntry>, now: Long = System.currentTimeMillis()) =
        merge(a, b, { it.origin + "\n" + it.username }, { it.at }, { it.del }, now)

    fun bookmarksToJson(list: List<Bookmark>) = JSONArray().apply {
        list.forEach { put(JSONObject().put("url", it.url).put("at", it.at).apply { if (it.del) put("del", true) else put("title", it.title) }) }
    }

    fun bookmarksFromJson(a: JSONArray?): List<Bookmark> = if (a == null) emptyList() else (0 until a.length()).mapNotNull { a.optJSONObject(it) }
        .filter { UrlRules.isWebUrl(it.optString("url")) }
        .map { Bookmark(it.optString("url"), it.optString("title").take(300), it.optLong("at"), it.optBoolean("del")) }

    fun passwordsToJson(list: List<PwEntry>) = JSONArray().apply {
        list.forEach {
            put(JSONObject().put("origin", it.origin).put("username", it.username).put("at", it.at).apply { if (it.del) put("del", true) else put("password", it.password) })
        }
    }

    fun passwordsFromJson(a: JSONArray?): List<PwEntry> = if (a == null) emptyList() else (0 until a.length()).mapNotNull { a.optJSONObject(it) }
        .filter { originOf(it.optString("origin")) == it.optString("origin") && (it.optBoolean("del") || it.optString("password").isNotEmpty()) }
        .map { PwEntry(it.optString("origin"), it.optString("username").take(200), if (it.optBoolean("del")) "" else it.optString("password"), it.optLong("at"), it.optBoolean("del")) }

    /**
     * Il sito a cui legare una password: solo https (o localhost), come originOf di password-rules.cjs.
     * Lo ricava VARCO dall'indirizzo vero della pagina, mai da ciò che dice la pagina.
     */
    fun originOf(url: String?): String = try {
        val u = URI(url ?: "")
        val host = u.host ?: ""
        val port = if (u.port == -1 || (u.scheme == "https" && u.port == 443) || (u.scheme == "http" && u.port == 80)) "" else ":${u.port}"
        when {
            host.isEmpty() -> ""
            u.scheme == "https" -> "https://${host.lowercase()}$port"
            u.scheme == "http" && (host == "localhost" || host == "127.0.0.1" || host.endsWith(".localhost")) -> "http://${host.lowercase()}$port"
            else -> ""
        }
    } catch (_: Exception) { "" }

    fun hostOf(origin: String): String = origin.substringAfter("://").removePrefix("www.")

    /** Dopo un accesso: new | update | same | never | skip. Come decideSave del PC. */
    fun decideSave(entries: List<PwEntry>, never: Collection<String>, origin: String, username: String, password: String): String {
        if (origin.isEmpty() || password.isEmpty() || password.length > 1000) return "skip"
        if (origin in never) return "never"
        val old = entries.firstOrNull { !it.del && it.origin == origin && it.username == username } ?: return "new"
        return if (old.password == password) "same" else "update"
    }
}

package it.varco.browser

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Beta 0.30: salva schede, workspace e impostazioni in state.json (cartella privata dell'app).
 * Scrive prima su un file temporaneo e poi lo rinomina: se il telefono si spegne a metà, il vecchio resta buono.
 */
class Store(ctx: Context) {
    private val file = File(ctx.filesDir, "state.json")

    fun load(): BrowserState {
        val s = BrowserState()
        try {
            if (file.exists()) read(JSONObject(file.readText()), s)
        } catch (_: Exception) {
            // File rovinato: si riparte puliti, ensureValid crea il workspace di base.
        }
        s.ensureValid()
        return s
    }

    private fun read(o: JSONObject, s: BrowserState) {
        o.optJSONObject("settings")?.let {
            s.settings.theme = it.optString("theme", "varco")
            s.settings.searchEngine = it.optString("searchEngine", "google").takeIf { e -> e in UrlRules.SEARCH_ENGINES } ?: "google"
            s.settings.desktopSite = it.optBoolean("desktopSite", false)
        }
        o.optJSONArray("workspaces")?.let { a ->
            for (i in 0 until a.length()) {
                val w = a.optJSONObject(i) ?: continue
                val id = w.optString("id").ifEmpty { continue }
                s.workspaces += Workspace(id, w.optString("name", "Workspace").take(30), w.optInt("color", Themes.WORKSPACE_COLORS[0]))
            }
        }
        o.optJSONArray("tabs")?.let { a ->
            for (i in 0 until a.length()) {
                val t = a.optJSONObject(i) ?: continue
                val url = t.optString("url", UrlRules.HOME)
                s.tabs += Tab(
                    t.optString("id").ifEmpty { continue },
                    t.optString("workspace"),
                    if (url == UrlRules.HOME || UrlRules.isWebUrl(url)) url else UrlRules.HOME,
                    t.optString("title"),
                    t.optLong("lastUsed"),
                )
            }
        }
        o.optJSONObject("link")?.let { l ->
            val secret = l.optString("secret")
            if (secret.isNotEmpty() && l.optString("pcId").isNotEmpty()) s.link = LinkConfig(
                l.getString("pcId"), l.optString("pcName", "PC"),
                l.optJSONArray("hosts")?.let { a -> (0 until a.length()).map { a.optString(it) } } ?: emptyList(),
                l.optInt("port", LinkRules.HTTP_PORT), secret, l.optString("deviceId").ifEmpty { LinkRules.newId(16) },
                l.optString("lastHost"),
                l.optJSONArray("workspaces")?.let { a -> (0 until a.length()).mapNotNull { a.optJSONObject(it) }.map { w ->
                    w.optString("name") to (if (w.has("color")) w.optInt("color") else null) } } ?: emptyList(),
                l.optString("lastTarget", "tab"), l.optLong("lastContact"))
        }
        o.optJSONArray("outbox")?.let { a ->
            for (i in 0 until a.length()) {
                val t = a.optJSONObject(i) ?: continue
                val url = t.optString("url")
                if (UrlRules.isWebUrl(url)) s.outbox += OutTab(t.optString("id").ifEmpty { LinkRules.newId() }, url, t.optString("title"),
                    t.optDouble("scroll", 0.0), t.optDouble("time", 0.0), t.optString("target", "tab"))
            }
        }
        s.activeWorkspace = o.optString("activeWorkspace")
        o.optJSONObject("activeTab")?.let { m -> m.keys().forEach { k -> s.activeTab[k] = m.optString(k) } }
    }

    fun save(s: BrowserState) {
        val o = JSONObject()
            .put("version", 1)
            .put("settings", JSONObject().put("theme", s.settings.theme).put("searchEngine", s.settings.searchEngine).put("desktopSite", s.settings.desktopSite))
            .put("workspaces", JSONArray().apply { s.workspaces.forEach { put(JSONObject().put("id", it.id).put("name", it.name).put("color", it.color)) } })
            .put("tabs", JSONArray().apply {
                s.tabs.forEach { put(JSONObject().put("id", it.id).put("workspace", it.workspace).put("url", it.url).put("title", it.title).put("lastUsed", it.lastUsed)) }
            })
            .put("activeWorkspace", s.activeWorkspace)
            .put("activeTab", JSONObject(s.activeTab as Map<*, *>))
            .put("link", s.link?.let { l ->
                JSONObject().put("pcId", l.pcId).put("pcName", l.pcName).put("hosts", JSONArray(l.hosts)).put("port", l.port)
                    .put("secret", l.secret).put("deviceId", l.deviceId).put("lastHost", l.lastHost).put("lastTarget", l.lastTarget)
                    .put("lastContact", l.lastContact)
                    .put("workspaces", JSONArray().apply { l.workspaces.forEach { (n, c) -> put(JSONObject().put("name", n).apply { if (c != null) put("color", c) }) } })
            } ?: JSONObject.NULL)
            .put("outbox", JSONArray().apply { s.outbox.forEach { put(JSONObject().put("id", it.id).put("url", it.url).put("title", it.title)
                .put("scroll", it.scroll).put("time", it.time).put("target", it.target)) } })
        val tmp = File(file.parentFile, "state.json.tmp")
        tmp.writeText(o.toString())
        if (!tmp.renameTo(file)) { file.delete(); tmp.renameTo(file) }
    }
}

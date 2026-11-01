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
        val tmp = File(file.parentFile, "state.json.tmp")
        tmp.writeText(o.toString())
        if (!tmp.renameTo(file)) { file.delete(); tmp.renameTo(file) }
    }
}

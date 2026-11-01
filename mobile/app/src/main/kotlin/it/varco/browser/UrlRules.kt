package it.varco.browser

import java.net.URI
import java.net.URLEncoder

/**
 * Beta 0.30: le stesse regole della barra degli indirizzi del VARCO per PC (lib/web-rules.cjs).
 * Niente Android qui dentro, così si verificano con i test JUnit.
 */
object UrlRules {
    const val HOME = "varco://home"

    /** Motori di ricerca: %s diventa il testo cercato. Stesse chiavi del PC. */
    val SEARCH_ENGINES = linkedMapOf(
        "google" to ("Google" to "https://www.google.com/search?q=%s"),
        "duckduckgo" to ("DuckDuckGo" to "https://duckduckgo.com/?q=%s"),
        "bing" to ("Bing" to "https://www.bing.com/search?q=%s"),
        "brave" to ("Brave Search" to "https://search.brave.com/search?q=%s"),
        "startpage" to ("Startpage" to "https://www.startpage.com/do/search?q=%s"),
        "ecosia" to ("Ecosia" to "https://www.ecosia.org/search?q=%s"),
    )

    /** Scorciatoie di ricerca: "!yt gatti" oppure "gatti !yt". */
    val BANGS = mapOf(
        "yt" to ("YouTube" to "https://www.youtube.com/results?search_query=%s"),
        "w" to ("Wikipedia" to "https://it.wikipedia.org/w/index.php?search=%s"),
        "we" to ("Wikipedia (inglese)" to "https://en.wikipedia.org/w/index.php?search=%s"),
        "gh" to ("GitHub" to "https://github.com/search?q=%s"),
        "r" to ("Reddit" to "https://www.reddit.com/search/?q=%s"),
        "a" to ("Amazon" to "https://www.amazon.it/s?k=%s"),
        "m" to ("Google Maps" to "https://www.google.com/maps/search/%s"),
        "i" to ("Google Immagini" to "https://www.google.com/search?tbm=isch&q=%s"),
        "tr" to ("Google Traduttore" to "https://translate.google.com/?sl=auto&tl=it&text=%s"),
        "so" to ("Stack Overflow" to "https://stackoverflow.com/search?q=%s"),
        "npm" to ("npm" to "https://www.npmjs.com/search?q=%s"),
        "mdn" to ("MDN" to "https://developer.mozilla.org/search?q=%s"),
        "x" to ("X" to "https://x.com/search?q=%s"),
        "tw" to ("Twitch" to "https://www.twitch.tv/search?term=%s"),
    )

    /** Come encodeURIComponent di JavaScript (spazio = %20, non +). */
    fun encode(s: String): String = URLEncoder.encode(s, "UTF-8").replace("+", "%20")
        .replace("%21", "!").replace("%27", "'").replace("%28", "(").replace("%29", ")").replace("%7E", "~")

    fun searchUrl(q: String, engine: String): String =
        (SEARCH_ENGINES[engine] ?: SEARCH_ENGINES.getValue("google")).second.replace("%s", encode(q))

    data class Bang(val key: String, val label: String, val query: String, val url: String)

    fun bangFor(text: String): Bang? {
        val q = text.trim()
        val (key, query) = Regex("^!([a-z0-9]{1,12})\\s+(.+)$", RegexOption.IGNORE_CASE).find(q)?.destructured?.let { it.component1() to it.component2() }
            ?: Regex("^(.+?)\\s+!([a-z0-9]{1,12})$", RegexOption.IGNORE_CASE).find(q)?.destructured?.let { it.component2() to it.component1() }
            ?: return null
        val bang = BANGS[key.lowercase()] ?: return null
        val clean = query.trim()
        if (clean.isEmpty()) return null
        return Bang(key.lowercase(), bang.first, clean, bang.second.replace("%s", encode(clean)))
    }

    private val ADDRESS = listOf(
        Regex("^https?://", RegexOption.IGNORE_CASE),
        Regex("^localhost(?::\\d+)?(?:/.*)?$", RegexOption.IGNORE_CASE),
        Regex("^(?:[a-z0-9-]+\\.)+[a-z]{2,}(?::\\d+)?(?:[/?#].*)?$", RegexOption.IGNORE_CASE),
        // Sul telefono capita di scrivere l'indirizzo di un PC di casa: 192.168.1.20:3000
        Regex("^(?:\\d{1,3}\\.){3}\\d{1,3}(?::\\d+)?(?:[/?#].*)?$"),
    )

    fun looksLikeAddress(s: String): Boolean {
        val q = s.trim()
        return ADDRESS.any { it.containsMatchIn(q) }
    }

    /** true solo per http e https: blocca file:, javascript:, intent: e simili. */
    fun isWebUrl(raw: String): Boolean = try {
        URI(raw).scheme?.lowercase() in setOf("http", "https")
    } catch (_: Exception) { false }

    /** Il testo della barra diventa un indirizzo; una frase diventa una ricerca. null se è vuoto o troppo lungo. */
    fun toUrl(input: String, engine: String = "google"): String? {
        val q = input.trim()
        if (q.isEmpty() || q.length > 2048) return null
        bangFor(q)?.let { return it.url }
        if (looksLikeAddress(q) && !q.contains(' ')) {
            val local = Regex("^(localhost|(?:\\d{1,3}\\.){3}\\d{1,3})", RegexOption.IGNORE_CASE).containsMatchIn(q)
            val full = if (Regex("^https?://", RegexOption.IGNORE_CASE).containsMatchIn(q)) q else (if (local) "http://" else "https://") + q
            if (isWebUrl(full)) return try { URI(full).toString() } catch (_: Exception) { full }
        }
        return searchUrl(q, engine)
    }

    /** Il sito da mostrare nella barra: senza www e senza https. */
    fun displayHost(url: String): String {
        if (url == HOME) return ""
        return try {
            (URI(url).host ?: url).removePrefix("www.")
        } catch (_: Exception) { url }
    }

    /** Il testo cercato, se l'indirizzo è una ricerca del motore scelto: così la barra mostra "gatti" e non l'URL. */
    fun searchedText(url: String, engine: String): String? {
        val template = (SEARCH_ENGINES[engine] ?: return null).second
        val prefix = template.substringBefore("%s")
        if (!url.startsWith(prefix)) return null
        val rest = url.removePrefix(prefix).substringBefore('&')
        return try { java.net.URLDecoder.decode(rest, "UTF-8") } catch (_: Exception) { null }
    }

    /**
     * Lo user agent: tolgo "; wv" e "Version/4.0", che dicono ai siti "sono una WebView"
     * (alcuni allora mostrano pagine ridotte). Versione desktop: quello di Chrome per Windows.
     */
    fun userAgent(default: String, desktop: Boolean): String {
        val clean = default.replace("; wv", "").replace(Regex("Version/[\\d.]+ "), "")
        if (!desktop) return clean
        val chrome = Regex("Chrome/([\\d.]+)").find(clean)?.groupValues?.get(1) ?: "140.0.0.0"
        return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/$chrome Safari/537.36"
    }
}

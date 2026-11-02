package it.varco.browser

import android.os.Build
import android.os.Handler
import android.os.Looper
import org.json.JSONArray
import org.json.JSONObject
import java.net.SocketTimeoutException
import java.util.concurrent.Executors

/**
 * Beta 0.31: il collegamento col PC sulla rete di casa (protocollo in LinkRules.kt e lib/link-rules.cjs del PC).
 *
 * - Mentre VARCO è aperto chiede le novità al PC ogni pochi secondi (hello): così arrivano le schede mandate dal PC.
 * - Le schede da mandare stanno in state.outbox finché il PC non risponde: se sei fuori casa partono quando torni.
 * - Il PC si cerca prima all'ultimo indirizzo buono, poi a quelli del QR, poi con un broadcast UDP (se il router gli ha dato un altro IP).
 * - Beta 0.32: se il PC non si trova (sei fuori casa) e il PC ha acceso "Anche fuori casa", le schede passano da ntfy.sh,
 *   cifrate come in casa, e si leggono lì quelle che il PC ti ha mandato.
 *
 * La rete gira su un thread a parte; lo stato (state.link, state.outbox) si tocca solo sul thread principale.
 */
class Link(private val state: BrowserState, private val listener: Listener) {
    interface Listener {
        fun onLinkChanged()
        fun onIncoming(tabs: List<Incoming>)
        fun onSent(tab: OutTab, viaRelay: Boolean)
        fun onUnpaired(reason: String)
    }

    data class Incoming(val id: String, val url: String, val title: String, val scroll: Double, val time: Double)

    private val net = Executors.newSingleThreadExecutor()
    private val client = LinkClient()
    private val main = Handler(Looper.getMainLooper())
    private var polling = false
    private var busy = false

    /** Raggiungibile all'ultimo tentativo. */
    var reachable = false
        private set
    var lastError = ""
        private set
    /** All'ultimo giro il PC non c'era ma il relay sì: le schede passano via internet. */
    var relayOk = false
        private set

    val deviceName: String get() = "${Build.MANUFACTURER.replaceFirstChar { it.uppercase() }} ${Build.MODEL}".trim()

    private val poll = object : Runnable {
        override fun run() {
            if (!polling) return
            sync()
            main.postDelayed(this, if (reachable) 5000 else 15000)
        }
    }

    fun startPolling() {
        if (polling || state.link == null) return
        polling = true
        main.post(poll)
    }

    fun stopPolling() {
        polling = false
        main.removeCallbacks(poll)
    }

    /** Abbina col codice del QR. done(ok, messaggio) arriva sul thread principale. */
    fun pair(code: String, done: (Boolean, String) -> Unit) {
        val p = LinkRules.parsePairingCode(code) ?: return done(false, "Questo non è un codice di VARCO per PC")
        val config = LinkConfig(p.pcId, p.name, p.hosts, p.port, LinkRules.b64u(p.secret),
            state.link?.takeIf { it.pcId == p.pcId }?.deviceId ?: LinkRules.newId(16))
        net.execute {
            val result = try {
                val host = client.findHost(config)
                if (host == null) Result.failure(Exception("PC non trovato: telefono e PC devono essere sulla stessa Wi-Fi, con VARCO aperto sul PC"))
                else {
                    val reply = client.post(config, host.first, host.second, "pair", JSONObject().put("name", deviceName))
                    config.lastHost = host.first
                    config.port = host.second
                    Result.success(reply)
                }
            } catch (e: Exception) { Result.failure(e) }
            main.post {
                result.onSuccess { reply ->
                    applyPcInfo(config, reply)
                    state.link = config
                    reachable = true
                    lastError = ""
                    listener.onLinkChanged()
                    done(true, "Collegato a ${config.pcName}")
                    startPolling()
                }.onFailure { done(false, message(it)) }
            }
        }
    }

    fun unpair(tellPc: Boolean = true) {
        val config = state.link ?: return
        stopPolling()
        state.link = null
        state.outbox.clear()
        reachable = false
        relayOk = false
        listener.onLinkChanged()
        if (tellPc) net.execute { try { if (config.lastHost.isNotEmpty()) client.post(config, config.lastHost, config.port, "unpair", JSONObject()) } catch (_: Exception) { } }
    }

    /** Mette una scheda in coda e prova subito a mandarla. */
    fun send(tab: OutTab) {
        state.outbox += tab
        listener.onLinkChanged()
        sync()
    }

    /** Un giro: trova il PC, prende le schede che ti ha mandato, manda quelle in coda. Fuori casa, lo stesso via relay. */
    fun sync() {
        val config = state.link ?: return
        if (busy) return
        busy = true
        val outbox = state.outbox.toList()
        net.execute {
            var host: Pair<String, Int>? = null
            var reply: JSONObject? = null
            val sent = mutableListOf<OutTab>()
            val incoming = mutableListOf<JSONObject>()
            var viaRelay = false
            var relaySince = ""
            var error = ""
            var unknown = false
            try {
                host = client.findHost(config)
                if (host != null) {
                    reply = client.post(config, host.first, host.second, "hello", JSONObject().put("name", deviceName))
                    val inbox = reply.optJSONArray("inbox")
                    if (inbox != null && inbox.length() > 0) {
                        val ids = JSONArray()
                        for (i in 0 until inbox.length()) {
                            incoming += inbox.getJSONObject(i)
                            ids.put(inbox.getJSONObject(i).optString("id"))
                        }
                        client.post(config, host.first, host.second, "ack", JSONObject().put("ids", ids))
                    }
                    for (t in outbox) {
                        val r = client.post(config, host.first, host.second, "tab", tabFields(t))
                        if (r.optBoolean("ok", true)) sent += t
                    }
                } else if (config.relay.isNotEmpty()) {
                    viaRelay = true
                    val secret = LinkRules.fromB64u(config.secret)
                    val key = LinkRules.deriveKey(secret)
                    val topics = LinkRules.relayTopics(secret)
                    for (t in outbox) {
                        val body = LinkRules.relayBody(config.deviceId,
                            LinkRules.seal(key, config.deviceId, LinkRules.message("tab", tabFields(t).put("name", deviceName)).toString())) ?: continue
                        client.publish(config.relay, topics.pc, body)
                        sent += t
                    }
                    val now = System.currentTimeMillis()
                    for (m in client.poll(config.relay, topics.phone, config.relaySince.ifEmpty { "12h" })) {
                        relaySince = m.id
                        val env = runCatching { JSONObject(m.text) }.getOrNull() ?: continue
                        if (env.optString("d") != config.deviceId) continue
                        val msg = LinkRules.open(key, config.deviceId, env.optString("n"), env.optString("c"))?.let { runCatching { JSONObject(it) }.getOrNull() } ?: continue
                        val t = msg.optLong("t")
                        if (now - t > LinkRules.RELAY_MAX_AGE_MS || t - now > 10 * 60 * 1000L) continue
                        if (msg.optString("type") == "tab") msg.optJSONObject("tab")?.let(incoming::add)
                    }
                } else error = "PC non raggiungibile"
            } catch (e: LinkClient.Unknown) { unknown = true; error = "Il PC non riconosce più questo telefono" }
            catch (e: Exception) { error = if (viaRelay && e is java.net.UnknownHostException) "Niente internet" else message(e) }
            val finalHost = host
            val finalReply = reply
            main.post {
                busy = false
                val current = state.link
                if (current == null || current.pcId != config.pcId) return@post
                if (unknown) { unpair(tellPc = false); listener.onUnpaired("Il PC non riconosce più questo telefono: ricollegalo dalle Impostazioni di VARCO sul PC."); return@post }
                val wasReachable = reachable
                val wasRelay = relayOk
                reachable = finalHost != null && error.isEmpty()
                relayOk = viaRelay && error.isEmpty()
                lastError = error
                if (finalHost != null) { current.lastHost = finalHost.first; current.port = finalHost.second }
                if (relaySince.isNotEmpty()) current.relaySince = relaySince
                if (finalReply != null) {
                    applyPcInfo(current, finalReply)
                    current.lastContact = System.currentTimeMillis()
                }
                // La stessa scheda può arrivare due volte (dalla rete di casa e dal relay): si apre una volta sola.
                val fresh = incoming.map {
                    Incoming(it.optString("id"), it.optString("url"), it.optString("title"), it.optDouble("scroll", 0.0), it.optDouble("time", 0.0))
                }.filter { UrlRules.isWebUrl(it.url) && (it.id.isEmpty() || it.id !in state.seenIncoming) }.distinctBy { it.id.ifEmpty { it.url } }
                if (fresh.isNotEmpty()) {
                    fresh.forEach { if (it.id.isNotEmpty()) state.seenIncoming += it.id }
                    while (state.seenIncoming.size > 200) state.seenIncoming.removeAt(0)
                    listener.onIncoming(fresh)
                }
                state.outbox.removeAll { t -> sent.any { it.id == t.id } }
                sent.forEach { listener.onSent(it, viaRelay) }
                if (sent.isNotEmpty() || fresh.isNotEmpty() || wasReachable != reachable || wasRelay != relayOk || finalReply != null || relaySince.isNotEmpty()) listener.onLinkChanged()
            }
        }
    }

    /** La scheda come la vuole il PC: indirizzo, dove eri, e dove aprirla. */
    private fun tabFields(t: OutTab): JSONObject {
        val target = if (t.target.startsWith("ws:")) JSONObject().put("kind", "workspace").put("workspace", t.target.removePrefix("ws:"))
            else JSONObject().put("kind", t.target)
        return JSONObject()
            .put("tab", JSONObject().put("id", t.id).put("url", t.url).put("title", t.title).put("scroll", t.scroll).put("time", t.time))
            .put("target", target)
    }

    private fun applyPcInfo(config: LinkConfig, reply: JSONObject) {
        reply.optJSONObject("pc")?.optString("name")?.takeIf { it.isNotBlank() }?.let { config.pcName = it }
        if (reply.has("relay")) config.relay = reply.optString("relay").takeIf { it.startsWith("https://") } ?: ""
        reply.optJSONArray("workspaces")?.let { a ->
            config.workspaces = (0 until a.length()).mapNotNull { a.optJSONObject(it) }.map { w ->
                val hex = w.optString("color")
                w.optString("name") to (if (hex.matches(Regex("#[0-9a-fA-F]{6}"))) (0xFF000000.toInt() or hex.substring(1).toInt(16)) else null)
            }.filter { it.first.isNotBlank() }
        }
    }

    private fun message(e: Throwable): String = when (e) {
        is LinkClient.Unknown -> "Codice scaduto o non valido: mostra un QR nuovo sul PC"
        is SocketTimeoutException -> "Il PC non risponde"
        is java.net.ConnectException -> "PC non raggiungibile"
        else -> e.message ?: "Errore di rete"
    }
}

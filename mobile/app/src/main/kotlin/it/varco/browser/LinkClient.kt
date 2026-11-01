package it.varco.browser

import org.json.JSONObject
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.HttpURLConnection
import java.net.InetAddress
import java.net.URL

/**
 * Beta 0.31: la parte di rete del collegamento, senza Android (solo Java), così si prova anche dal PC
 * contro VARCO acceso (LinkLiveTest). Chiamare solo da un thread in background: le funzioni aspettano la rete.
 */
class LinkClient {
    /** Il PC ha risposto 403: non conosce questo telefono (o il QR è scaduto). */
    class Unknown : Exception()

    /** L'indirizzo del PC: ultimo buono, quelli del QR, poi broadcast. */
    fun findHost(config: LinkConfig): Pair<String, Int>? {
        val candidates = (listOf(config.lastHost) + config.hosts).filter { it.isNotBlank() }.distinct()
        for (h in candidates) if (ping(h, config.port)) return h to config.port
        return discover(config.pcId)
    }

    /** Basta che la porta risponda (anche con un errore): il PC c'è. */
    private fun ping(host: String, port: Int): Boolean = try {
        val c = URL("http://$host:$port/v1").openConnection() as HttpURLConnection
        c.connectTimeout = 1200
        c.readTimeout = 1500
        c.requestMethod = "GET"
        val code = c.responseCode
        c.disconnect()
        code in 200..499
    } catch (_: Exception) { false }

    private fun discover(pcId: String): Pair<String, Int>? = try {
        DatagramSocket().use { s ->
            s.broadcast = true
            s.soTimeout = 1500
            val ask = "VARCO?$pcId".toByteArray()
            s.send(DatagramPacket(ask, ask.size, InetAddress.getByName("255.255.255.255"), LinkRules.DISCOVERY_PORT))
            val buf = ByteArray(256)
            val deadline = System.currentTimeMillis() + 1500
            var found: Pair<String, Int>? = null
            while (found == null && System.currentTimeMillis() < deadline) {
                val p = DatagramPacket(buf, buf.size)
                s.receive(p)
                val text = String(p.data, 0, p.length)
                if (text.startsWith("VARCO!$pcId:")) found = (p.address.hostAddress ?: continue) to text.substringAfterLast(':').toInt()
            }
            found
        }
    } catch (_: Exception) { null }

    /** Manda un messaggio cifrato e restituisce la risposta decifrata. */
    fun post(config: LinkConfig, host: String, port: Int, type: String, fields: JSONObject): JSONObject {
        val key = LinkRules.deriveKey(LinkRules.fromB64u(config.secret))
        val box = LinkRules.seal(key, config.deviceId, LinkRules.message(type, fields).toString())
        val body = JSONObject().put("d", config.deviceId).put("n", box.n).put("c", box.c).toString().toByteArray()
        val c = URL("http://$host:$port/v1").openConnection() as HttpURLConnection
        try {
            c.connectTimeout = 2500
            c.readTimeout = 5000
            c.requestMethod = "POST"
            c.doOutput = true
            c.setRequestProperty("Content-Type", "application/json")
            c.outputStream.use { it.write(body) }
            val code = c.responseCode
            val text = (if (code in 200..299) c.inputStream else c.errorStream)?.bufferedReader()?.use { it.readText() } ?: ""
            if (code == 403) throw Unknown()
            if (code != 200) throw Exception(runCatching { JSONObject(text).optString("error") }.getOrNull()?.ifBlank { null } ?: "Il PC ha risposto $code")
            val o = JSONObject(text)
            val plain = LinkRules.open(key, config.deviceId, o.optString("n"), o.optString("c")) ?: throw Exception("Risposta del PC non valida")
            return JSONObject(plain)
        } finally {
            c.disconnect()
        }
    }
}

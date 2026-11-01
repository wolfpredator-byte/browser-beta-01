package it.varco.browser

import org.json.JSONObject
import java.net.URI
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Beta 0.31: le regole del collegamento col PC, uguali a lib/link-rules.cjs del VARCO per PC.
 * Se cambi qui, cambia anche là (i test dei due lati usano gli stessi vettori).
 *
 * - QR: "varco-link:<base64url(JSON {v, pc, name, hosts, port, k})>", k = segreto di 32 byte.
 * - Chiave: HKDF-SHA256(segreto, salt "varco-link-v1", info "aes"), 32 byte.
 * - Busta: {d: id del telefono, n: nonce 12 byte, c: AES-256-GCM(testo) + tag}, base64url; AAD = id del telefono.
 */
object LinkRules {
    const val HTTP_PORT = 47820
    const val DISCOVERY_PORT = 47821
    private const val PREFIX = "varco-link:"
    private val random = SecureRandom()

    fun b64u(bytes: ByteArray): String = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    fun fromB64u(s: String): ByteArray = Base64.getUrlDecoder().decode(s)

    fun newId(bytes: Int = 8): String {
        val b = ByteArray(bytes)
        random.nextBytes(b)
        return b.joinToString("") { "%02x".format(it) }
    }

    /** HKDF-SHA256 con un solo blocco (bastano 32 byte). */
    fun deriveKey(secret: ByteArray): ByteArray {
        val extract = Mac.getInstance("HmacSHA256").apply { init(SecretKeySpec("varco-link-v1".toByteArray(), "HmacSHA256")) }.doFinal(secret)
        val expand = Mac.getInstance("HmacSHA256").apply { init(SecretKeySpec(extract, "HmacSHA256")) }
        expand.update("aes".toByteArray())
        expand.update(1)
        return expand.doFinal().copyOf(32)
    }

    data class Envelope(val n: String, val c: String)

    fun seal(key: ByteArray, aad: String, plaintext: String): Envelope {
        val nonce = ByteArray(12).also(random::nextBytes)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, nonce))
        cipher.updateAAD(aad.toByteArray())
        return Envelope(b64u(nonce), b64u(cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))))
    }

    /** Il testo decifrato, oppure null se la chiave è sbagliata o la busta è stata toccata. */
    fun open(key: ByteArray, aad: String, n: String, c: String): String? = try {
        val nonce = fromB64u(n)
        val body = fromB64u(c)
        if (nonce.size != 12 || body.size < 17) null else {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, nonce))
            cipher.updateAAD(aad.toByteArray())
            String(cipher.doFinal(body), Charsets.UTF_8)
        }
    } catch (_: Exception) { null }

    /** Un messaggio nuovo: i campi più type, t (ora) e id. */
    fun message(type: String, fields: JSONObject = JSONObject()): JSONObject =
        fields.put("type", type).put("t", System.currentTimeMillis()).put("id", newId())

    data class Pairing(val pcId: String, val name: String, val hosts: List<String>, val port: Int, val secret: ByteArray)

    fun parsePairingCode(text: String): Pairing? {
        val s = text.trim()
        if (!s.startsWith(PREFIX)) return null
        return try {
            val o = JSONObject(String(fromB64u(s.removePrefix(PREFIX)), Charsets.UTF_8))
            val secret = fromB64u(o.getString("k"))
            if (o.optInt("v") != 1 || secret.size != 32 || !o.has("port")) return null
            val hosts = o.optJSONArray("hosts")?.let { a -> (0 until a.length()).map { a.optString(it) }.filter { it.isNotBlank() } } ?: emptyList()
            Pairing(o.getString("pc"), o.optString("name", "PC"), hosts, o.getInt("port"), secret)
        } catch (_: Exception) { null }
    }

    /** YouTube: il minuto del video anche nell'indirizzo (&t=123s). Come withTime del PC. */
    fun withTime(url: String, time: Double): String {
        if (time < 5) return url
        return try {
            val u = URI(url)
            val host = (u.host ?: return url).removePrefix("www.").removePrefix("m.").removePrefix("music.")
            val path = u.path ?: ""
            val watch = host == "youtube.com" && (path == "/watch" || path.startsWith("/shorts/") || path.startsWith("/live/"))
            if (!watch && host != "youtu.be") return url
            val params = (u.rawQuery ?: "").split('&').filter { it.isNotEmpty() && !it.startsWith("t=") } + "t=${time.toLong()}s"
            URI(u.scheme, u.rawAuthority, path, null, null).toString() + "?" + params.joinToString("&")
        } catch (_: Exception) { url }
    }

    fun restoreScript(scroll: Double, time: Double): String =
        "(()=>{const go=()=>{const h=Math.max(0,document.documentElement.scrollHeight-innerHeight);if($scroll>0)scrollTo(0,Math.round(h*$scroll));" +
            "const v=document.querySelector('video');if($time>0&&v&&Math.abs(v.currentTime-$time)>3)v.currentTime=$time;};" +
            "setTimeout(go,700);setTimeout(go,2000);setTimeout(go,4000);})()"

    const val CAPTURE_SCRIPT = "(()=>{const h=Math.max(1,document.documentElement.scrollHeight-innerHeight);" +
        "const v=[...document.querySelectorAll('video')].find(x=>!x.paused)||document.querySelector('video');" +
        "return {scroll:Math.min(1,scrollY/h),time:v&&v.currentTime>0?v.currentTime:0};})()"
}

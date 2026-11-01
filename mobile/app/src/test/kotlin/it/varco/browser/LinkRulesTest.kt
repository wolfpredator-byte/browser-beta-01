package it.varco.browser

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Vettori prodotti da lib/link-rules.cjs (VARCO per PC): i due lati devono capirsi. */
class LinkRulesTest {
    private val secret = ByteArray(32) { it.toByte() }

    @Test fun chiaveUgualeAlPC() {
        val hex = LinkRules.deriveKey(secret).joinToString("") { "%02x".format(it) }
        assertEquals("450d84e76896b22556a090f75650ff177283d2072b30a3793a6b924cdc427927", hex)
    }

    @Test fun apreUnaBustaDelPC() {
        val key = LinkRules.deriveKey(secret)
        val text = LinkRules.open(key, "0123456789abcdef", "KQ1mHywOODC82BYT",
            "vJXilTgRu6OmDzrCxvQRY3YVcoVLsAEIJyGwhBx6LsyjfozShpHe62ivvFit8drJOtrmh0hTOUdP-SGFE18AGci0DX9BdRC2")
        assertEquals("reply", JSONObject(text!!).getString("type"))
        assertNull(LinkRules.open(key, "altro-telefono", "KQ1mHywOODC82BYT", "vJXilTgRu6OmDzrCxvQRY3YVcoVLsAEIJyGwhBx6LsyjfozShpHe62ivvFit8drJOtrmh0hTOUdP-SGFE18AGci0DX9BdRC2"))
    }

    @Test fun cifraEDecifra() {
        val key = LinkRules.deriveKey(secret)
        val box = LinkRules.seal(key, "tel", """{"type":"hello"}""")
        assertEquals("""{"type":"hello"}""", LinkRules.open(key, "tel", box.n, box.c))
        assertNull(LinkRules.open(LinkRules.deriveKey(ByteArray(32)), "tel", box.n, box.c))
    }

    @Test fun leggeIlQrDelPC() {
        val p = LinkRules.parsePairingCode("varco-link:eyJ2IjoxLCJwYyI6IjAxMjM0NTY3ODlhYmNkZWYiLCJuYW1lIjoiUEMgZGkgY2FzYSIsImhvc3RzIjpbIjE5Mi4xNjguMC4xMSJdLCJwb3J0Ijo0NzgyMCwiayI6IkFBRUNBd1FGQmdjSUNRb0xEQTBPRHhBUkVoTVVGUllYR0JrYUd4d2RIaDgifQ")!!
        assertEquals("0123456789abcdef", p.pcId)
        assertEquals("PC di casa", p.name)
        assertEquals(listOf("192.168.0.11"), p.hosts)
        assertEquals(47820, p.port)
        assertTrue(p.secret.contentEquals(secret))
        assertNull(LinkRules.parsePairingCode("https://example.com"))
        assertNull(LinkRules.parsePairingCode("varco-link:xxx"))
    }

    @Test fun minutoDelVideo() {
        assertEquals("https://m.youtube.com/watch?v=abc&t=125s", LinkRules.withTime("https://m.youtube.com/watch?v=abc", 125.7))
        assertEquals("https://youtu.be/abc?t=61s", LinkRules.withTime("https://youtu.be/abc?t=3", 61.0))
        assertEquals("https://www.youtube.com/watch?v=abc", LinkRules.withTime("https://www.youtube.com/watch?v=abc", 2.0))
        assertEquals("https://example.com/v", LinkRules.withTime("https://example.com/v", 100.0))
    }
}

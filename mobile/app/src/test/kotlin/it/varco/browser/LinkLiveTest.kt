package it.varco.browser

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test

/**
 * Prova dal vivo contro VARCO per PC acceso: parte solo con la variabile VARCO_LINK_CODE
 * (il codice copiato da Impostazioni → Telefono → Copia il codice). Senza, viene saltata.
 */
class LinkLiveTest {
    @Test fun abbinaEMandaUnaScheda() {
        val code = System.getenv("VARCO_LINK_CODE")
        assumeTrue("VARCO_LINK_CODE non impostata", !code.isNullOrBlank())
        val p = LinkRules.parsePairingCode(code!!)!!
        val config = LinkConfig(p.pcId, p.name, p.hosts, p.port, LinkRules.b64u(p.secret), LinkRules.newId(16))
        val client = LinkClient()
        val host = client.findHost(config)
        assertNotNull("PC non trovato", host)
        val pair = client.post(config, host!!.first, host.second, "pair", JSONObject().put("name", "Test JUnit"))
        assertTrue(pair.optBoolean("ok"))
        assertTrue(pair.getJSONArray("workspaces").length() > 0)
        val hello = client.post(config, host.first, host.second, "hello", JSONObject())
        assertEquals("reply", hello.getString("type"))
        val sent = client.post(config, host.first, host.second, "tab", JSONObject()
            .put("tab", JSONObject().put("url", "https://example.net/").put("title", "Da JUnit").put("scroll", 0).put("time", 0))
            .put("target", JSONObject().put("kind", "tab")))
        assertTrue(sent.optBoolean("ok"))
        // Scoperta via broadcast, come quando il PC cambia indirizzo.
        val found = client.findHost(LinkConfig(p.pcId, p.name, emptyList(), p.port, LinkRules.b64u(p.secret), config.deviceId))
        assertEquals(host.second, found?.second)
    }
}

package it.varco.browser

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UrlRulesTest {
    @Test fun indirizziERicerche() {
        assertEquals("https://example.com", UrlRules.toUrl("example.com"))
        assertEquals("https://example.com/a?b=1", UrlRules.toUrl("  example.com/a?b=1 "))
        assertEquals("http://localhost:3000", UrlRules.toUrl("localhost:3000"))
        assertEquals("http://192.168.1.20:5173/", UrlRules.toUrl("192.168.1.20:5173/"))
        assertEquals("http://example.com", UrlRules.toUrl("http://example.com"))
        assertEquals("https://www.google.com/search?q=gatti%20neri", UrlRules.toUrl("gatti neri"))
        assertEquals("https://duckduckgo.com/?q=ciao", UrlRules.toUrl("ciao", "duckduckgo"))
        assertEquals("https://www.google.com/search?q=ciao", UrlRules.toUrl("ciao", "sconosciuto"))
        assertNull(UrlRules.toUrl("   "))
        assertNull(UrlRules.toUrl("x".repeat(3000)))
    }

    @Test fun bang() {
        assertEquals("https://www.youtube.com/results?search_query=gatti", UrlRules.toUrl("!yt gatti"))
        assertEquals("https://www.youtube.com/results?search_query=gatti", UrlRules.toUrl("gatti !YT"))
        assertEquals("YouTube", UrlRules.bangFor("!yt gatti")?.label)
        assertNull(UrlRules.bangFor("!nonesiste gatti"))
        assertNull(UrlRules.bangFor("!yt"))
    }

    @Test fun soloPagineWeb() {
        assertTrue(UrlRules.isWebUrl("https://a.it"))
        assertFalse(UrlRules.isWebUrl("javascript:alert(1)"))
        assertFalse(UrlRules.isWebUrl("file:///sdcard/x"))
        assertFalse(UrlRules.isWebUrl("intent://x#Intent;end"))
        // "javascript:..." non deve diventare un indirizzo: finisce in una ricerca
        assertTrue(UrlRules.toUrl("javascript:alert(1)")!!.startsWith("https://www.google.com/search?q="))
    }

    @Test fun barra() {
        assertEquals("example.com", UrlRules.displayHost("https://www.example.com/x"))
        assertEquals("", UrlRules.displayHost(UrlRules.HOME))
        assertEquals("gatti neri", UrlRules.searchedText("https://www.google.com/search?q=gatti%20neri&sca=1", "google"))
        assertNull(UrlRules.searchedText("https://example.com", "google"))
    }

    @Test fun userAgent() {
        val wv = "Mozilla/5.0 (Linux; Android 16; Pixel 9; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.7390.122 Mobile Safari/537.36"
        assertEquals("Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.122 Mobile Safari/537.36", UrlRules.userAgent(wv, false))
        val desk = UrlRules.userAgent(wv, true)
        assertTrue(desk.contains("Windows NT 10.0") && desk.contains("Chrome/141.0.7390.122") && !desk.contains("Mobile"))
    }
}

package it.varco.browser

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Stessi casi di test/sync-rules.test.cjs (PC): la fusione deve dare lo stesso risultato sui due lati. */
class SyncRulesTest {
    private val now = 1_800_000_000_000L
    private fun t(n: Long) = now - 1000 + n

    @Test fun vinceLaModificaPiuRecente() {
        val pc = listOf(Bookmark("https://a.it/", "A", t(10)), Bookmark("https://b.it/", "B", t(10)), Bookmark("https://c.it/", "", t(30), del = true))
        val phone = listOf(Bookmark("https://a.it/", "A nuovo", t(20)), Bookmark("https://b.it/", "", t(10), del = true),
            Bookmark("https://c.it/", "C", t(20)), Bookmark("https://d.it/", "D", t(5)))
        val m = SyncRules.mergeBookmarks(pc, phone, now).associateBy { it.url }
        assertEquals("A nuovo", m["https://a.it/"]!!.title)
        assertTrue(m["https://b.it/"]!!.del)
        assertTrue(m["https://c.it/"]!!.del)
        assertEquals("D", m["https://d.it/"]!!.title)
        assertEquals(4, m.size)
        assertEquals(0, SyncRules.mergeBookmarks(listOf(Bookmark("x", "", now - SyncRules.TOMB_MS - 1, del = true)), emptyList(), now).size)
    }

    @Test fun preferitiDelTelefono() {
        val s = BrowserState()
        s.addBookmark("https://uno.it/", "Uno", t(1))
        s.addBookmark("https://due.it/", "Due", t(2))
        s.removeBookmark("https://uno.it/", t(3))
        assertEquals(listOf("https://due.it/"), s.liveBookmarks.map { it.url })
        assertTrue(s.bookmarks.any { it.url == "https://uno.it/" && it.del })
        assertEquals(3, s.bmRev)
        s.applyBookmarks(SyncRules.mergeBookmarks(s.bookmarks, listOf(Bookmark("https://pc.it/", "Dal PC", t(9))), now))
        assertEquals(listOf("https://pc.it/", "https://due.it/"), s.liveBookmarks.map { it.url })
    }

    @Test fun originiDellePassword() {
        assertEquals("https://accounts.google.com", SyncRules.originOf("https://accounts.google.com/signin?x=1"))
        assertEquals("https://a.it", SyncRules.originOf("https://A.it:443/"))
        assertEquals("https://a.it:8443", SyncRules.originOf("https://a.it:8443/x"))
        assertEquals("", SyncRules.originOf("http://a.it/"))
        assertEquals("http://localhost:3000", SyncRules.originOf("http://localhost:3000/login"))
        assertEquals("", SyncRules.originOf("javascript:alert(1)"))
        val list = listOf(PwEntry("https://a.it", "io", "vecchia", t(1)))
        assertEquals("new", SyncRules.decideSave(list, emptySet(), "https://a.it", "tu", "x"))
        assertEquals("update", SyncRules.decideSave(list, emptySet(), "https://a.it", "io", "nuova"))
        assertEquals("same", SyncRules.decideSave(list, emptySet(), "https://a.it", "io", "vecchia"))
        assertEquals("never", SyncRules.decideSave(list, setOf("https://a.it"), "https://a.it", "io", "nuova"))
        val merged = SyncRules.mergePasswords(list, listOf(PwEntry("https://a.it", "io", "", t(5), del = true)), now)
        assertTrue(merged.single().del)
    }
}

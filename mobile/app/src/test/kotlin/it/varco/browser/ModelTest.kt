package it.varco.browser

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ModelTest {
    private fun state() = BrowserState().apply { ensureValid(now = 1) }

    @Test fun primoAvvio() {
        val s = state()
        assertEquals(1, s.workspaces.size)
        assertEquals("Personale", s.workspaces[0].name)
        assertEquals(UrlRules.HOME, s.current()?.url)
    }

    @Test fun schedaNuovaDopoQuellaAperta() {
        val s = state()
        val first = s.current()!!
        val b = s.addTab("https://b.it", now = 2)
        s.select(first, now = 3)
        val c = s.addTab("https://c.it", now = 4)
        assertEquals(listOf(first.id, c.id, b.id), s.tabsOf().map { it.id })
        assertEquals(c, s.current())
    }

    @Test fun chiudereSceglieLaVicina() {
        val s = state()
        val a = s.current()!!
        val b = s.addTab("https://b.it", now = 2)
        val c = s.addTab("https://c.it", now = 3)
        s.select(b, now = 4)
        assertEquals(c, s.closeTab(b.id, now = 5))
        assertEquals(a, s.closeTab(c.id, now = 6))
    }

    @Test fun ultimaSchedaTornaAllaHome() {
        val s = state()
        val only = s.current()!!
        only.url = "https://a.it"
        val next = s.closeTab(only.id, now = 2)!!
        assertEquals(UrlRules.HOME, next.url)
        assertEquals(1, s.tabsOf().size)
    }

    @Test fun workspace() {
        val s = state()
        val first = s.activeWorkspace
        val lavoro = s.addWorkspace("  Lavoro ")
        assertEquals("Lavoro", lavoro.name)
        assertEquals(1, s.tabsOf(lavoro.id).size)
        assertTrue(lavoro.color != s.workspaces[0].color)
        val t = s.addTab("https://x.it", ws = first, now = 9)
        s.moveTab(t.id, lavoro.id)
        assertEquals(2, s.tabsOf(lavoro.id).size)
        assertTrue(s.deleteWorkspace(lavoro.id))
        assertFalse(s.deleteWorkspace(first))
        assertEquals(first, s.activeWorkspace)
    }

    @Test fun schedeCheDormono() {
        val tabs = (1..6).map { Tab("t$it", "w", lastUsed = it.toLong()) }
        // La aperta (t1) resta sveglia anche se è la meno recente.
        val sleep = BrowserState.toSleep(tabs, "t1", max = 3).map { it.id }
        assertEquals(listOf("t2", "t3", "t4"), sleep)
        assertTrue(BrowserState.toSleep(tabs.take(2), "t1", max = 3).isEmpty())
    }
}

package it.varco.browser

/**
 * Beta 0.30: i temi del VARCO per PC (lib/appearance-rules.cjs THEMES), con gli stessi colori.
 * I preset hanno anche sfondo e logo: l'APK li prende da assets/<id>/ (copiati dal PC a ogni build).
 */
data class VarcoTheme(val id: String, val label: String, val accent: Int, val accent2: Int?, val bg: Int, val preset: Boolean)

object Themes {
    private fun hex(s: String): Int = (0xFF000000.toInt()) or s.removePrefix("#").toInt(16)
    private fun t(id: String, label: String, accent: String, accent2: String?, bg: String, preset: Boolean) =
        VarcoTheme(id, label, hex(accent), accent2?.let(::hex), hex(bg), preset)

    val ALL = listOf(
        t("varco", "VARCO", "#7c6cff", "#6fd3ff", "#07070e", true),
        t("vice-city", "Vice City", "#ff3fa4", "#00e5ff", "#120a24", true),
        t("neon-pulse", "Neon Pulse", "#ff2d8a", "#38c6ff", "#160b2e", true),
        t("cyber-protocol", "Cyber Protocol", "#00ff41", "#9ca3af", "#050806", true),
        t("cyan-flash", "Cyan Flash", "#00e5ff", "#6b7a89", "#0d0f12", true),
        t("lime", "Lime", "#bef532", "#e8ffb0", "#0a0a0a", true),
        t("ember", "Ember", "#ff5e2b", "#ffb08a", "#141012", true),
        t("midnight-ink", "Midnight Ink", "#ff7100", "#6f82e0", "#04061b", true),
        t("marple", "Marple", "#ff6746", "#ffe383", "#1c0d12", true),
        t("midnight-blue", "Midnight Blue", "#4a7fa7", "#b3cfe5", "#0a1931", true),
        t("aurora-forest", "Aurora Forest", "#3fbf9f", "#a7e3d0", "#0b1f1d", true),
        t("violet-dusk", "Violet Dusk", "#f6c9a4", "#c47fa0", "#241826", true),
        t("oxford-rose", "Oxford Rose", "#ff36ab", "#7aa2ff", "#011936", true),
        t("bordeaux", "Bordeaux", "#c0294f", "#f2ede8", "#0b0909", true),
        t("red-crayola", "Red Crayola", "#ed254e", "#c9d6d9", "#001c22", true),
        t("minimal-green", "Minimal Green", "#8eb69b", "#daf1de", "#051f20", true),
        t("oceano", "Oceano", "#3d8bff", null, "#050a13", false),
        t("aurora", "Aurora", "#2fc9b0", null, "#04100f", false),
        t("smeraldo", "Smeraldo", "#3cc46e", null, "#050f08", false),
        t("tramonto", "Tramonto", "#ff8a3d", null, "#120905", false),
        t("cremisi", "Cremisi", "#ff4d6a", null, "#120508", false),
        t("sakura", "Sakura", "#ff7ac0", null, "#11060d", false),
        t("grafite", "Grafite", "#b9bdc9", null, "#0a0a0c", false),
    )

    fun byId(id: String?): VarcoTheme = ALL.firstOrNull { it.id == id } ?: ALL.first()

    /** Le tinte non hanno immagini: usano sfondo e logo di VARCO. */
    fun assetDir(theme: VarcoTheme): String = if (theme.preset) theme.id else "varco"

    /** Colori di riserva per i workspace (come i pallini colorati del PC). */
    val WORKSPACE_COLORS = listOf("#7c6cff", "#6fd3ff", "#3cc46e", "#ff8a3d", "#ff4d6a", "#ff7ac0", "#f6c945", "#b9bdc9").map(::hex)

    // ----- Colori, come mix() e rgba() del PC -----
    fun r(c: Int) = (c shr 16) and 0xFF
    fun g(c: Int) = (c shr 8) and 0xFF
    fun b(c: Int) = c and 0xFF

    /** Mescola a con b: t=0 è a, t=1 è b. */
    fun mix(a: Int, b: Int, t: Float): Int {
        fun ch(x: Int, y: Int) = Math.round(x + (y - x) * t).coerceIn(0, 255)
        return (0xFF shl 24) or (ch(r(a), r(b)) shl 16) or (ch(g(a), g(b)) shl 8) or ch(b(a), b(b))
    }

    fun alpha(c: Int, a: Float): Int = (Math.round(a.coerceIn(0f, 1f) * 255) shl 24) or (c and 0xFFFFFF)

    /** Il secondo colore di un tema, oppure l'accento schiarito (come il PC). */
    fun accent2(theme: VarcoTheme): Int = theme.accent2 ?: mix(theme.accent, 0xFFFFFFFF.toInt(), .6f)

    fun toHex(c: Int): String = "#%06x".format(c and 0xFFFFFF)
}

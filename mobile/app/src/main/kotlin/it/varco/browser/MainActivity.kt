package it.varco.browser

import android.app.Activity
import android.app.SearchManager
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Outline
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.Message
import android.text.Editable
import android.text.InputType
import android.text.TextUtils
import android.text.TextWatcher
import android.view.GestureDetector
import android.view.Gravity
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import android.window.OnBackInvokedDispatcher
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.abs

/**
 * Beta 0.30: VARCO per Android.
 * Come sul PC: le schede stanno in basso (qui una barra sola con l'indirizzo), la Home ha lo sfondo del tema,
 * i workspace separano le schede. Tutta l'interfaccia è costruita nel codice: build() la rifà quando cambi tema.
 */
class MainActivity : Activity(), Pages.Listener {
    private lateinit var state: BrowserState
    private lateinit var store: Store
    private lateinit var pages: Pages
    private val ui = Ui(this)
    private val handler = Handler(Looper.getMainLooper())
    private val italian = Locale.ITALIAN
    private fun dp(v: Int) = ui.dp(v)

    private lateinit var root: FrameLayout
    private lateinit var wallpaper: ImageView
    private lateinit var home: FrameLayout
    private lateinit var clock: TextView
    private lateinit var date: TextView
    private lateinit var homeWorkspace: LinearLayout
    private lateinit var pageHost: FrameLayout
    private lateinit var bar: LinearLayout
    private lateinit var progress: View
    private lateinit var address: TextView
    private lateinit var addressIcon: ImageView
    private lateinit var reload: View
    private lateinit var tabCount: TextView
    private lateinit var layer: FrameLayout
    private lateinit var fullscreen: FrameLayout

    private var sysTop = 0
    private var sysBottom = 0
    private var imeBottom = 0
    private var editPanel: View? = null
    private var fullscreenCallback: WebChromeClient.CustomViewCallback? = null
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var lastWallpaper: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setDecorFitsSystemWindows(false)
        store = Store(this)
        state = store.load()
        ui.theme = Themes.byId(state.settings.theme)
        pages = Pages(this, state, this)
        build()
        if (Build.VERSION.SDK_INT >= 33) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT) { handleBack() }
        }
        handleIntent(intent)
        show()
        tickClock()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
        show()
    }

    @Deprecated("Solo Android 11 e 12: dal 13 si usa OnBackInvokedDispatcher")
    override fun onBackPressed() { handleBack() }

    override fun onPause() {
        super.onPause()
        state.current()?.let { pages.snapshot(it.id) }
        pages.pauseAll()
        save()
    }

    override fun onResume() {
        super.onResume()
        pages.resumeAll()
    }

    // ------------------------------------------------------------------ interfaccia

    private fun build() {
        root = FrameLayout(this).apply { setBackgroundColor(ui.bg) }
        wallpaper = ImageView(this).apply { scaleType = ImageView.ScaleType.CENTER_CROP }
        lastWallpaper = null
        root.addView(wallpaper, FrameLayout.LayoutParams(ui.MATCH, ui.MATCH))
        // Velo sopra lo sfondo, più scuro in basso dove c'è la barra (come la Home del PC).
        root.addView(View(this).apply {
            background = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(Themes.alpha(ui.bg, .25f), Themes.alpha(ui.bg, .45f), Themes.alpha(ui.bg, .9f)))
        }, FrameLayout.LayoutParams(ui.MATCH, ui.MATCH))

        // --- Home
        home = FrameLayout(this)
        clock = ui.label("", 64f).apply { typeface = android.graphics.Typeface.create("sans-serif-light", android.graphics.Typeface.NORMAL); gravity = Gravity.CENTER }
        date = ui.label("", 15f, ui.muted).apply { gravity = Gravity.CENTER }
        val logo = ImageView(this).apply { setImageBitmap(asset("${Themes.assetDir(ui.theme)}/logo.png", 256)) }
        val search = ui.row(
            ui.icon(R.drawable.ic_search, 20, ui.muted).apply { (layoutParams as LinearLayout.LayoutParams).marginEnd = dp(12) },
            ui.label("Cerca o scrivi un indirizzo", 15f, ui.muted),
        ).apply {
            background = ui.pressable(ui.glass, 26f, ui.line)
            setPadding(dp(18), 0, dp(18), 0)
            isClickable = true
            setOnClickListener { startEditing("") }
        }
        val center = ui.column(
            logo.apply { layoutParams = LinearLayout.LayoutParams(dp(72), dp(72)).apply { gravity = Gravity.CENTER_HORIZONTAL; bottomMargin = dp(18) } },
            clock, date.apply { setPadding(0, dp(6), 0, dp(28)) },
        ).apply { gravity = Gravity.CENTER_HORIZONTAL }
        center.addView(search, LinearLayout.LayoutParams(ui.MATCH, dp(52)))
        home.addView(center, FrameLayout.LayoutParams(ui.MATCH, ui.WRAP, Gravity.CENTER).apply { leftMargin = dp(24); rightMargin = dp(24); bottomMargin = dp(60) })
        homeWorkspace = ui.row()
        home.addView(homeWorkspace, FrameLayout.LayoutParams(ui.WRAP, ui.WRAP, Gravity.TOP or Gravity.START))
        root.addView(home, FrameLayout.LayoutParams(ui.MATCH, ui.MATCH))

        // --- Pagina: angoli tondi e un piccolo margine, come la cornice del PC.
        pageHost = FrameLayout(this).apply {
            setBackgroundColor(ui.bg)
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) = outline.setRoundRect(0, 0, view.width, view.height, dp(16).toFloat())
            }
            clipToOutline = true
        }
        root.addView(pageHost, FrameLayout.LayoutParams(ui.MATCH, ui.MATCH))

        // --- Barra in basso
        progress = View(this).apply {
            setBackgroundColor(ui.accent)
            pivotX = 0f
            scaleX = 0f
            alpha = 0f
        }
        addressIcon = ui.icon(R.drawable.ic_search, 16, ui.muted)
        address = ui.label("", 15f).apply { isSingleLine = true; ellipsize = TextUtils.TruncateAt.END }
        reload = ui.iconButton(R.drawable.ic_reload, "Ricarica") { state.current()?.let { pages.viewOf(it.id)?.reload() } }.apply {
            layoutParams = LinearLayout.LayoutParams(dp(38), dp(38))
        }
        val pill = ui.row(addressIcon.apply { (layoutParams as LinearLayout.LayoutParams).marginEnd = dp(10) }).apply {
            addView(address, ui.lp(0, ui.WRAP, 1f))
            addView(reload)
            background = ui.round(ui.glassSoft, 21f, ui.line)
            setPadding(dp(14), 0, dp(3), 0)
        }
        swipeTabs(pill)
        tabCount = ui.label("1", 11f, bold = true).apply {
            gravity = Gravity.CENTER
            background = ui.round(0, 6f, ui.text, 1.6f)
        }
        val tabsButton = FrameLayout(this).apply {
            contentDescription = "Schede"
            background = ui.pressable(0, 22f)
            addView(tabCount, FrameLayout.LayoutParams(dp(22), dp(22), Gravity.CENTER))
            isClickable = true
            setOnClickListener { openTabs() }
            setOnLongClickListener { newTab(); true }
        }
        val menuButton = ui.iconButton(R.drawable.ic_menu, "Menu") { openMenu() }
        val controls = ui.row().apply {
            addView(pill, ui.lp(0, dp(42), 1f))
            addView(tabsButton, LinearLayout.LayoutParams(dp(46), dp(44)).apply { marginStart = dp(4) })
            addView(menuButton)
            setPadding(dp(8), dp(7), dp(4), dp(7))
        }
        bar = ui.column().apply {
            background = ui.round(ui.glass, 24f, ui.line)
            clipToOutline = true
            addView(FrameLayout(this@MainActivity).apply { addView(progress, FrameLayout.LayoutParams(ui.MATCH, dp(2))) }, LinearLayout.LayoutParams(ui.MATCH, dp(2)))
            addView(controls)
            elevation = dp(8).toFloat()
        }
        root.addView(bar, FrameLayout.LayoutParams(ui.MATCH, ui.WRAP, Gravity.BOTTOM))

        layer = FrameLayout(this).apply { visibility = View.GONE; isClickable = true }
        root.addView(layer, FrameLayout.LayoutParams(ui.MATCH, ui.MATCH))
        fullscreen = FrameLayout(this).apply { setBackgroundColor(0xFF000000.toInt()); visibility = View.GONE }
        root.addView(fullscreen, FrameLayout.LayoutParams(ui.MATCH, ui.MATCH))

        root.setOnApplyWindowInsetsListener { _, insets ->
            val sys = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
            sysTop = sys.top
            sysBottom = sys.bottom
            imeBottom = insets.getInsets(WindowInsets.Type.ime()).bottom
            applyInsets()
            insets
        }
        setContentView(root)
        window.statusBarColor = 0
        window.navigationBarColor = 0
    }

    private fun applyInsets() {
        (bar.layoutParams as FrameLayout.LayoutParams).apply {
            leftMargin = dp(10); rightMargin = dp(10); bottomMargin = sysBottom + dp(8)
            bar.layoutParams = this
        }
        (pageHost.layoutParams as FrameLayout.LayoutParams).apply {
            topMargin = sysTop + dp(4); leftMargin = dp(6); rightMargin = dp(6); bottomMargin = sysBottom + dp(8 + BAR + 8)
            pageHost.layoutParams = this
        }
        (homeWorkspace.layoutParams as FrameLayout.LayoutParams).apply {
            topMargin = sysTop + dp(12); leftMargin = dp(16)
            homeWorkspace.layoutParams = this
        }
        layer.setPadding(0, sysTop, 0, 0)
        editPanel?.let { p ->
            (p.layoutParams as FrameLayout.LayoutParams).bottomMargin = maxOf(imeBottom, sysBottom) + dp(8)
            p.requestLayout()
        }
    }

    /** Scorrendo la barra a destra o a sinistra passi alla scheda vicina, come in Chrome. */
    private fun swipeTabs(pill: View) {
        val detector = GestureDetector(this, object : GestureDetector.SimpleOnGestureListener() {
            override fun onDown(e: MotionEvent) = true
            override fun onSingleTapUp(e: MotionEvent): Boolean {
                val t = state.current() ?: return true
                startEditing(if (t.url == UrlRules.HOME) "" else UrlRules.searchedText(t.url, state.settings.searchEngine) ?: t.url)
                return true
            }
            override fun onFling(e1: MotionEvent?, e2: MotionEvent, vx: Float, vy: Float): Boolean {
                if (abs(vx) < abs(vy) * 1.5f || abs(vx) < 600) return false
                val list = state.tabsOf()
                val i = list.indexOf(state.current())
                val next = list.getOrNull(if (vx < 0) i + 1 else i - 1) ?: return true
                select(next, if (vx < 0) 1 else -1)
                return true
            }
        })
        pill.setOnTouchListener { v, e ->
            if (e.action == MotionEvent.ACTION_DOWN) v.alpha = .8f
            if (e.action == MotionEvent.ACTION_UP || e.action == MotionEvent.ACTION_CANCEL) v.alpha = 1f
            detector.onTouchEvent(e)
            true
        }
    }

    /** Mostra la scheda aperta: la Home oppure la sua pagina. */
    private fun show() {
        val tab = state.current() ?: return
        val isHome = tab.url == UrlRules.HOME
        updateWallpaper()
        updateWorkspaceChip()
        if (isHome) {
            pageHost.removeAllViews()
            pageHost.visibility = View.GONE
            home.visibility = View.VISIBLE
        } else {
            val view = pages.wake(tab)
            if (view.parent !== pageHost) {
                pageHost.removeAllViews()
                (view.parent as? ViewGroup)?.removeView(view)
                pageHost.addView(view, FrameLayout.LayoutParams(ui.MATCH, ui.MATCH))
            }
            pageHost.visibility = View.VISIBLE
            home.visibility = View.GONE
        }
        pages.trim(tab.id)
        updateBar()
        scheduleSave()
    }

    private fun updateBar() {
        val tab = state.current() ?: return
        val isHome = tab.url == UrlRules.HOME
        val searched = UrlRules.searchedText(tab.url, state.settings.searchEngine)
        address.text = when {
            isHome -> "Cerca o scrivi un indirizzo"
            searched != null -> searched
            else -> UrlRules.displayHost(tab.url)
        }
        address.setTextColor(if (isHome) ui.muted else ui.text)
        val secure = tab.url.startsWith("https://")
        addressIcon.setImageResource(if (!isHome && secure && searched == null) R.drawable.ic_lock else R.drawable.ic_search)
        reload.visibility = if (isHome) View.GONE else View.VISIBLE
        val n = state.tabsOf().size
        tabCount.text = if (n > 99) ":D" else n.toString()
        onProgress(tab, pages.progress[tab.id] ?: 100)
    }

    private fun updateWallpaper() {
        val dir = Themes.assetDir(ui.theme)
        if (lastWallpaper == dir) return
        lastWallpaper = dir
        wallpaper.setImageBitmap(asset("$dir/wallpaper.jpg", resources.displayMetrics.heightPixels))
    }

    private fun updateWorkspaceChip() {
        homeWorkspace.removeAllViews()
        val ws = state.workspace() ?: return
        homeWorkspace.addView(ui.chip(ws.name, ws.color, false) { openTabs() }.apply {
            background = ui.pressable(ui.glass, 18f, ui.line)
        })
    }

    private fun tickClock() {
        val now = LocalDateTime.now()
        clock.text = now.format(DateTimeFormatter.ofPattern("HH:mm", italian))
        date.text = now.format(DateTimeFormatter.ofPattern("EEEE d MMMM", italian)).replaceFirstChar { it.titlecase(italian) }
        handler.postDelayed(::tickClock, (60 - now.second) * 1000L + 50)
    }

    /** Un'immagine dagli asset, rimpicciolita per non sprecare memoria. */
    private fun asset(path: String, maxSide: Int): Bitmap? = try {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        assets.open(path).use { BitmapFactory.decodeStream(it, null, bounds) }
        var sample = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= maxSide) sample *= 2
        assets.open(path).use { BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample }) }
    } catch (_: Exception) { null }

    // ------------------------------------------------------------------ schede

    private fun select(tab: Tab, direction: Int = 0) {
        state.current()?.let { pages.snapshot(it.id) }
        state.select(tab)
        show()
        if (direction != 0) {
            val target = if (tab.url == UrlRules.HOME) home else pageHost
            target.translationX = ui.dp(48) * direction.toFloat()
            target.alpha = .4f
            target.animate().translationX(0f).alpha(1f).setDuration(220).start()
        }
    }

    private fun newTab(url: String = UrlRules.HOME, ws: String = state.activeWorkspace) {
        state.current()?.let { pages.snapshot(it.id) }
        state.addTab(url, ws)
        show()
        if (url == UrlRules.HOME) startEditing("")
    }

    private fun closeTab(id: String) {
        pages.destroy(id)
        state.closeTab(id)
        show()
    }

    private fun navigate(text: String) {
        val url = UrlRules.toUrl(text, state.settings.searchEngine) ?: return
        val tab = state.current() ?: return
        tab.url = url
        tab.title = ""
        val view = pages.wake(tab)
        view.loadUrl(url)
        show()
    }

    // ------------------------------------------------------------------ Pages.Listener

    override fun onPageChanged(tab: Tab) {
        if (tab.id == state.current()?.id) updateBar()
        scheduleSave()
    }

    override fun onProgress(tab: Tab, progress: Int) {
        if (tab.id != state.current()?.id) return
        val loading = progress in 1..99 && tab.url != UrlRules.HOME
        this.progress.animate().cancel()
        if (loading) {
            this.progress.alpha = 1f
            this.progress.animate().scaleX(progress / 100f).setDuration(160).start()
        } else if (this.progress.alpha > 0f) {
            this.progress.animate().scaleX(1f).alpha(0f).setDuration(260).withEndAction { this.progress.scaleX = 0f }.start()
        }
    }

    override fun onOpenTab(url: String?, from: Tab, transport: Message?) {
        state.current()?.let { pages.snapshot(it.id) }
        val tab = state.addTab(url ?: "about:blank", from.workspace)
        if (transport != null) pages.adopt(tab, transport)
        show()
    }

    override fun onFullscreen(view: View?, callback: WebChromeClient.CustomViewCallback?) {
        val controller = window.insetsController
        if (view != null) {
            fullscreen.removeAllViews()
            fullscreen.addView(view, FrameLayout.LayoutParams(ui.MATCH, ui.MATCH))
            fullscreen.visibility = View.VISIBLE
            fullscreenCallback = callback
            controller?.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            controller?.hide(WindowInsets.Type.systemBars())
        } else {
            fullscreen.removeAllViews()
            fullscreen.visibility = View.GONE
            fullscreenCallback = null
            controller?.show(WindowInsets.Type.systemBars())
        }
    }

    override fun onFileChooser(callback: ValueCallback<Array<Uri>>, params: WebChromeClient.FileChooserParams): Boolean {
        fileCallback?.onReceiveValue(null)
        fileCallback = callback
        return try {
            @Suppress("DEPRECATION")
            startActivityForResult(params.createIntent(), FILE_REQUEST)
            true
        } catch (_: Exception) {
            fileCallback = null
            false
        }
    }

    @Deprecated("Activity semplice, senza androidx")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_REQUEST) {
            fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
            fileCallback = null
        }
    }

    // ------------------------------------------------------------------ indietro e link da altre app

    private fun handleBack() {
        when {
            fullscreen.visibility == View.VISIBLE -> fullscreenCallback?.onCustomViewHidden() ?: onFullscreen(null, null)
            layer.visibility == View.VISIBLE -> closeLayer()
            else -> {
                val tab = state.current()
                val view = tab?.let { pages.viewOf(it.id) }
                when {
                    view != null && view.canGoBack() -> view.goBack()
                    tab != null && tab.url != UrlRules.HOME -> {
                        // Niente più cronologia: la scheda torna alla Home invece di chiudere VARCO.
                        pages.destroy(tab.id)
                        tab.url = UrlRules.HOME
                        tab.title = ""
                        show()
                    }
                    else -> moveTaskToBack(true)
                }
            }
        }
    }

    private fun handleIntent(intent: Intent?) {
        intent ?: return
        val url = when (intent.action) {
            Intent.ACTION_VIEW -> intent.dataString?.takeIf(UrlRules::isWebUrl)
            Intent.ACTION_WEB_SEARCH -> intent.getStringExtra(SearchManager.QUERY)?.let { UrlRules.toUrl(it, state.settings.searchEngine) }
            Intent.ACTION_SEND -> intent.getStringExtra(Intent.EXTRA_TEXT)?.let { text ->
                Regex("https?://\\S+").find(text)?.value ?: UrlRules.toUrl(text, state.settings.searchEngine)
            }
            else -> null
        } ?: return
        intent.action = null
        state.current()?.let { pages.snapshot(it.id) }
        // Se la scheda aperta è una Home vuota la riuso, altrimenti scheda nuova.
        val cur = state.current()
        if (cur != null && cur.url == UrlRules.HOME) { cur.url = url; pages.wake(cur) } else state.addTab(url)
    }

    // ------------------------------------------------------------------ barra in modifica

    private fun startEditing(initial: String) {
        closeLayer()
        val field = EditText(this).apply {
            setText(initial)
            setSelectAllOnFocus(true)
            hint = "Cerca o scrivi un indirizzo"
            setHintTextColor(ui.muted)
            setTextColor(ui.text)
            textSize = 16f
            isSingleLine = true
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            imeOptions = EditorInfo.IME_ACTION_GO or EditorInfo.IME_FLAG_NO_EXTRACT_UI
            background = null
            setPadding(0, 0, 0, 0)
        }
        val suggestions = ui.column()
        val panel = ui.column().apply {
            background = ui.round(ui.glass, 24f, ui.lineStrong)
            setPadding(dp(8), dp(8), dp(8), dp(8))
            addView(suggestions)
            addView(ui.row(ui.icon(R.drawable.ic_search, 20, ui.accent).apply { (layoutParams as LinearLayout.LayoutParams).marginEnd = dp(12) }).apply {
                addView(field, ui.lp(0, ui.WRAP, 1f))
                addView(ui.iconButton(R.drawable.ic_close, "Annulla") { closeLayer() })
                setPadding(dp(14), dp(2), 0, dp(2))
                background = ui.round(ui.glassSoft, 20f, ui.line)
            })
        }
        fun refresh(q: String) {
            suggestions.removeAllViews()
            for (s in suggestionsFor(q)) suggestions.addView(ui.menuRow(s.icon, s.title, s.detail) { closeLayer(); s.run() }.apply {
                // Titoli lunghi (schede aperte) su una riga sola, col valore a destra sempre visibile.
                for (i in 0 until childCount) (getChildAt(i) as? TextView)?.apply { isSingleLine = true; ellipsize = TextUtils.TruncateAt.END }
                if (s.detail != null) (getChildAt(childCount - 1) as TextView).apply { maxWidth = dp(140); setPadding(dp(10), 0, 0, 0) }
            })
        }
        field.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            override fun afterTextChanged(s: Editable?) = refresh(s?.toString().orEmpty())
        })
        field.setOnEditorActionListener { _, action, event ->
            val enter = action == EditorInfo.IME_ACTION_GO || event?.keyCode == KeyEvent.KEYCODE_ENTER
            if (enter) { val t = field.text.toString(); closeLayer(); navigate(t) }
            enter
        }
        openLayer(dim = .55f)
        layer.addView(panel, FrameLayout.LayoutParams(ui.MATCH, ui.WRAP, Gravity.BOTTOM).apply { leftMargin = dp(10); rightMargin = dp(10) })
        editPanel = panel
        applyInsets()
        bar.visibility = View.INVISIBLE
        refresh(initial)
        field.requestFocus()
        field.post { (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).showSoftInput(field, InputMethodManager.SHOW_IMPLICIT) }
    }

    private class Suggestion(val icon: Int, val title: String, val detail: String?, val run: () -> Unit)

    /** Cosa proporre mentre scrivi: la scorciatoia (!yt), le schede già aperte, e cerca/vai. */
    private fun suggestionsFor(text: String): List<Suggestion> {
        val q = text.trim()
        if (q.isEmpty()) return emptyList()
        val out = mutableListOf<Suggestion>()
        UrlRules.bangFor(q)?.let { b -> out += Suggestion(R.drawable.ic_search, "Cerca su ${b.label}: ${b.query}", "!${b.key}") { navigate(q) } }
        val low = q.lowercase()
        state.tabs.filter { it.url != UrlRules.HOME && it.id != state.current()?.id && (it.title.lowercase().contains(low) || it.url.lowercase().contains(low)) }
            .take(3).forEach { t ->
                out += Suggestion(R.drawable.ic_tabs, t.title.ifBlank { UrlRules.displayHost(t.url) }, "Passa alla scheda") { select(t) }
            }
        if (out.none { it.detail?.startsWith("!") == true }) {
            if (UrlRules.looksLikeAddress(q) && !q.contains(' ')) out += Suggestion(R.drawable.ic_forward, q, "Vai") { navigate(q) }
            out += Suggestion(R.drawable.ic_search, "Cerca «$q»", UrlRules.SEARCH_ENGINES[state.settings.searchEngine]?.first) {
                navigate(if (UrlRules.looksLikeAddress(q)) UrlRules.searchUrl(q, state.settings.searchEngine) else q)
            }
        }
        return out.take(5)
    }

    // ------------------------------------------------------------------ livello sopra la pagina (schede, menu, temi)

    private fun openLayer(dim: Float = .7f) {
        layer.removeAllViews()
        layer.setBackgroundColor(Themes.alpha(ui.bg, dim))
        layer.setOnClickListener { closeLayer() }
        if (layer.visibility != View.VISIBLE) {
            layer.alpha = 0f
            layer.visibility = View.VISIBLE
            layer.animate().alpha(1f).setDuration(160).start()
        }
    }

    private fun closeLayer() {
        if (editPanel != null) {
            (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(root.windowToken, 0)
            editPanel = null
        }
        bar.visibility = View.VISIBLE
        layer.removeAllViews()
        layer.visibility = View.GONE
    }

    /** Pannello che sale dal basso, sopra la barra. */
    private fun sheet(content: View, bottomMargin: Int = sysBottom + ui.dp(8)): LinearLayout {
        val panel = ui.column().apply {
            background = ui.round(ui.glass, 24f, ui.line)
            setPadding(ui.dp(10), ui.dp(10), ui.dp(10), ui.dp(10))
            isClickable = true
            addView(content)
        }
        layer.addView(panel, FrameLayout.LayoutParams(ui.MATCH, ui.WRAP, Gravity.BOTTOM).apply {
            leftMargin = ui.dp(10); rightMargin = ui.dp(10); this.bottomMargin = bottomMargin
        })
        panel.translationY = ui.dp(40).toFloat()
        panel.animate().translationY(0f).setDuration(200).start()
        return panel
    }

    private fun title(s: String) = ui.label(s, 13f, ui.muted, bold = true).apply { setPadding(ui.dp(14), ui.dp(10), ui.dp(14), ui.dp(8)) }

    // ------------------------------------------------------------------ griglia delle schede e workspace

    private fun openTabs() {
        state.current()?.let { pages.snapshot(it.id) }
        openLayer(dim = .94f)
        layer.setOnClickListener(null)
        val chips = ui.row().apply { setPadding(dp(12), dp(10), dp(12), dp(10)) }
        for (ws in state.workspaces) {
            chips.addView(ui.chip(ws.name, ws.color, ws.id == state.activeWorkspace) {
                if (ws.id != state.activeWorkspace) { state.activeWorkspace = ws.id; show(); openTabs() }
            }.apply {
                setOnLongClickListener { editWorkspace(ws); true }
                layoutParams = LinearLayout.LayoutParams(ui.WRAP, ui.WRAP).apply { marginEnd = dp(8) }
            })
        }
        chips.addView(ui.chip("+", null, false) { editWorkspace(null) })
        val chipScroll = HorizontalScrollView(this).apply { isHorizontalScrollBarEnabled = false; addView(chips) }

        val grid = ui.column().apply { setPadding(dp(10), 0, dp(10), dp(10)) }
        val tabs = state.tabsOf()
        val cardH = dp(210)
        tabs.chunked(2).forEach { pair ->
            val r = ui.row()
            pair.forEach { t -> r.addView(tabCard(t, cardH), ui.lp(0, cardH, 1f).apply { setMargins(dp(5), dp(5), dp(5), dp(5)) }) }
            if (pair.size == 1) r.addView(View(this), ui.lp(0, cardH, 1f).apply { setMargins(dp(5), dp(5), dp(5), dp(5)) })
            grid.addView(r)
        }
        val scroll = ScrollView(this).apply { addView(grid); isVerticalScrollBarEnabled = false }

        val actions = ui.row(
            ui.button("Nuova scheda", primary = true) { closeLayer(); newTab() },
        ).apply { setPadding(dp(16), dp(8), dp(16), sysBottom + dp(12)) }
        actions.addView(View(this), ui.lp(dp(10), 1))
        actions.addView(ui.button("Fatto") { closeLayer() })
        (actions.getChildAt(0).layoutParams as LinearLayout.LayoutParams).apply { width = 0; weight = 1f }

        val ws = state.workspace()!!
        val head = ui.row(ui.label("Schede", 22f, bold = true)).apply {
            addView(View(this@MainActivity), ui.lp(0, 1, 1f))
            addView(ui.label("${tabs.size} in ${ws.name}", 13f, ui.muted))
            setPadding(dp(20), dp(16), dp(20), 0)
        }
        val page = ui.column(head, chipScroll).apply {
            addView(scroll, ui.lp(ui.MATCH, 0, 1f))
            addView(actions)
        }
        layer.addView(page, FrameLayout.LayoutParams(ui.MATCH, ui.MATCH))
        page.alpha = 0f
        page.scaleX = .97f; page.scaleY = .97f
        page.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(180).start()
        // Porta in vista la scheda aperta.
        val index = tabs.indexOf(state.current())
        scroll.post { scroll.scrollTo(0, (index / 2) * (cardH + dp(10)) - dp(40)) }
    }

    private fun tabCard(t: Tab, h: Int): View {
        val active = t.id == state.current()?.id
        val thumb = ImageView(this).apply {
            scaleType = ImageView.ScaleType.CENTER_CROP
            setBackgroundColor(Themes.mix(ui.bg, 0xFFFFFFFF.toInt(), .04f))
            val bmp = pages.thumbs[t.id]
            when {
                t.url == UrlRules.HOME -> { setImageBitmap(wallpaperThumb()) }
                bmp != null -> { setImageBitmap(bmp); scaleType = ImageView.ScaleType.MATRIX; imageMatrix = android.graphics.Matrix().apply {
                    val s = (h * 2f) / bmp.width.coerceAtLeast(1); setScale(s, s) } }
            }
        }
        // La miniatura riempie la larghezza partendo dall'alto della pagina.
        if (pages.thumbs[t.id] != null && t.url != UrlRules.HOME) thumb.addOnLayoutChangeListener { v, _, _, _, _, _, _, _, _ ->
            val bmp = pages.thumbs[t.id] ?: return@addOnLayoutChangeListener
            val s = v.width.toFloat() / bmp.width.coerceAtLeast(1)
            (v as ImageView).imageMatrix = android.graphics.Matrix().apply { setScale(s, s) }
        }
        val icon = pages.icons[t.id]
        val head = ui.row().apply {
            setPadding(dp(10), 0, dp(2), 0)
            if (icon != null) addView(ImageView(this@MainActivity).apply { setImageBitmap(icon) }, LinearLayout.LayoutParams(dp(14), dp(14)).apply { marginEnd = dp(7) })
            addView(ui.label(if (t.url == UrlRules.HOME) "Home" else t.title.ifBlank { UrlRules.displayHost(t.url) }, 12.5f, if (active) ui.text else ui.muted, bold = active).apply {
                isSingleLine = true; ellipsize = TextUtils.TruncateAt.END
            }, ui.lp(0, ui.WRAP, 1f))
            addView(ui.iconButton(R.drawable.ic_close, "Chiudi scheda") { closeTab(t.id); if (state.tabsOf().isNotEmpty()) openTabs() }.apply {
                layoutParams = LinearLayout.LayoutParams(dp(34), dp(34))
                (getChildAt(0).layoutParams as FrameLayout.LayoutParams).apply { width = dp(16); height = dp(16) }
            })
        }
        return ui.column(head).apply {
            addView(thumb, ui.lp(ui.MATCH, 0, 1f))
            background = ui.pressable(ui.glass, 16f, if (active) ui.accent else ui.line)
            if (active) (background as? android.graphics.drawable.RippleDrawable)?.let { (it.getDrawable(0) as GradientDrawable).setStroke(dp(2), ui.accent) }
            clipToOutline = true
            isClickable = true
            setOnClickListener { closeLayer(); select(t) }
            setOnLongClickListener { tabOptions(t); true }
        }
    }

    private var wallThumb: Bitmap? = null
    private fun wallpaperThumb(): Bitmap? {
        if (wallThumb == null) wallThumb = asset("${Themes.assetDir(ui.theme)}/wallpaper.jpg", 400)
        return wallThumb
    }

    /** Tenendo premuta una scheda: spostala in un altro workspace o chiudila. */
    private fun tabOptions(t: Tab) {
        openLayer(dim = .6f)
        val list = ui.column(title(t.title.ifBlank { UrlRules.displayHost(t.url).ifBlank { "Home" } }))
        for (ws in state.workspaces.filter { it.id != t.workspace }) {
            list.addView(ui.menuRow(R.drawable.ic_workspace_switch, "Sposta in ${ws.name}") {
                state.moveTab(t.id, ws.id); show(); openTabs()
            })
        }
        list.addView(ui.menuRow(R.drawable.ic_close, "Chiudi scheda") { closeTab(t.id); openTabs() })
        sheet(list)
    }

    /** Nuovo workspace (ws = null) o modifica: nome, colore, elimina. */
    private fun editWorkspace(ws: Workspace?) {
        openLayer(dim = .6f)
        var color = ws?.color ?: Themes.WORKSPACE_COLORS.firstOrNull { c -> state.workspaces.none { it.color == c } } ?: Themes.WORKSPACE_COLORS[0]
        val name = EditText(this).apply {
            setText(ws?.name ?: "")
            hint = "Nome del workspace"
            setHintTextColor(ui.muted); setTextColor(ui.text); textSize = 16f; isSingleLine = true
            background = ui.round(ui.glassSoft, 14f, ui.line)
            setPadding(dp(14), dp(12), dp(14), dp(12))
        }
        val dots = ui.row().apply { setPadding(0, dp(14), 0, dp(14)) }
        fun drawDots() {
            dots.removeAllViews()
            for (c in Themes.WORKSPACE_COLORS) dots.addView(View(this).apply {
                background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(c); if (c == color) setStroke(dp(3), ui.text) }
                isClickable = true
                setOnClickListener { color = c; drawDots() }
            }, LinearLayout.LayoutParams(dp(30), dp(30)).apply { marginEnd = dp(10) })
        }
        drawDots()
        val buttons = ui.row()
        if (ws != null && state.workspaces.size > 1) {
            buttons.addView(ui.button("Elimina") {
                state.deleteWorkspace(ws.id); pages.trim(state.current()?.id); show(); openTabs()
            }.apply { setTextColor(0xFFFF6B7D.toInt()) })
        }
        buttons.addView(View(this), ui.lp(0, 1, 1f))
        buttons.addView(ui.button("Annulla") { openTabs() })
        buttons.addView(View(this), ui.lp(dp(8), 1))
        buttons.addView(ui.button(if (ws == null) "Crea" else "Salva", primary = true) {
            if (ws == null) {
                val created = state.addWorkspace(name.text.toString())
                created.color = color
                state.activeWorkspace = created.id
            } else {
                ws.name = name.text.toString().trim().ifEmpty { ws.name }.take(30)
                ws.color = color
            }
            show(); openTabs()
        })
        val content = ui.column(title(if (ws == null) "Nuovo workspace" else "Modifica workspace"), name, dots, buttons).apply {
            setPadding(dp(6), 0, dp(6), dp(4))
        }
        editPanel = sheet(content)
        applyInsets()
        name.requestFocus()
        name.post { (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).showSoftInput(name, InputMethodManager.SHOW_IMPLICIT) }
    }

    // ------------------------------------------------------------------ menu

    private fun openMenu() {
        openLayer(dim = .45f)
        val tab = state.current()
        val view = tab?.let { pages.viewOf(it.id) }
        val onPage = tab != null && tab.url != UrlRules.HOME
        fun quick(res: Int, desc: String, enabled: Boolean, run: () -> Unit) = ui.iconButton(res, desc) { closeLayer(); run() }.apply {
            alpha = if (enabled) 1f else .3f
            isEnabled = enabled
            layoutParams = ui.lp(0, dp(48), 1f)
        }
        val quickRow = ui.row(
            quick(R.drawable.ic_back, "Indietro", view?.canGoBack() == true) { view?.goBack() },
            quick(R.drawable.ic_forward, "Avanti", view?.canGoForward() == true) { view?.goForward() },
            quick(R.drawable.ic_reload, "Ricarica", onPage) { view?.reload() },
            quick(R.drawable.ic_home, "Home", onPage) { handleBackToHome() },
            quick(R.drawable.ic_tab_new, "Nuova scheda", true) { newTab() },
        ).apply { setPadding(0, 0, 0, dp(6)) }
        val engine = UrlRules.SEARCH_ENGINES[state.settings.searchEngine]?.first ?: "Google"
        val list = ui.column(quickRow,
            View(this).apply { setBackgroundColor(ui.line) }.also { it.layoutParams = LinearLayout.LayoutParams(ui.MATCH, 1).apply { bottomMargin = dp(6) } },
        )
        if (onPage) list.addView(ui.menuRow(R.drawable.ic_forward, "Condividi") {
            closeLayer()
            startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, tab!!.url).putExtra(Intent.EXTRA_SUBJECT, tab.title), "Condividi"))
        })
        list.addView(ui.menuRow(R.drawable.ic_tabs, "Versione desktop", if (state.settings.desktopSite) "Sì" else "No") {
            state.settings.desktopSite = !state.settings.desktopSite
            pages.applySettings()
            view?.reload()
            closeLayer(); scheduleSave()
            toast(if (state.settings.desktopSite) "Versione desktop dei siti" else "Versione per telefono dei siti")
        })
        list.addView(ui.menuRow(R.drawable.ic_check, "Tema", ui.theme.label) { openThemes() })
        list.addView(ui.menuRow(R.drawable.ic_search, "Motore di ricerca", engine) { openEngines() })
        list.addView(ui.menuRow(R.drawable.ic_workspace_switch, "Workspace", state.workspace()?.name) { openTabs() })
        list.addView(ui.label("VARCO per Android ${BuildConfigLite.VERSION}", 12f, ui.muted).apply { gravity = Gravity.CENTER; setPadding(0, dp(10), 0, dp(4)) })
        sheet(list, bottomMargin = sysBottom + dp(8 + BAR + 8))
    }

    private fun handleBackToHome() {
        val tab = state.current() ?: return
        pages.destroy(tab.id)
        tab.url = UrlRules.HOME
        tab.title = ""
        show()
    }

    private fun openEngines() {
        openLayer(dim = .45f)
        val list = ui.column(title("Motore di ricerca"))
        for ((key, v) in UrlRules.SEARCH_ENGINES) list.addView(ui.menuRow(null, v.first, if (key == state.settings.searchEngine) "✓" else null) {
            state.settings.searchEngine = key; closeLayer(); updateBar(); scheduleSave()
        })
        sheet(list, bottomMargin = sysBottom + ui.dp(8 + BAR + 8))
    }

    /** I temi del PC: tocca per provarlo subito. */
    private fun openThemes() {
        openLayer(dim = .45f)
        val grid = ui.column()
        for (group in listOf(true, false)) {
            grid.addView(title(if (group) "Preset" else "Tinte"))
            Themes.ALL.filter { it.preset == group }.chunked(4).forEach { chunk ->
                val r = ui.row()
                chunk.forEach { th -> r.addView(swatch(th), ui.lp(0, ui.WRAP, 1f)) }
                repeat(4 - chunk.size) { r.addView(View(this), ui.lp(0, 1, 1f)) }
                grid.addView(r)
            }
        }
        val scroll = ScrollView(this).apply { addView(grid); isVerticalScrollBarEnabled = false }
        val panel = sheet(scroll, bottomMargin = sysBottom + dp(8 + BAR + 8))
        scroll.layoutParams = LinearLayout.LayoutParams(ui.MATCH, minOf(dp(470), (resources.displayMetrics.heightPixels * .62f).toInt()))
        panel.requestLayout()
    }

    private fun swatch(th: VarcoTheme): View {
        val selected = th.id == ui.theme.id
        val circle = View(this).apply {
            background = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(th.accent, Themes.accent2(th))).apply {
                shape = GradientDrawable.OVAL
                setStroke(dp(if (selected) 3 else 4), if (selected) ui.text else th.bg)
            }
        }
        return ui.column(circle.apply { layoutParams = LinearLayout.LayoutParams(dp(46), dp(46)).apply { gravity = Gravity.CENTER_HORIZONTAL } },
            ui.label(th.label, 11f, if (selected) ui.text else ui.muted).apply {
                gravity = Gravity.CENTER; isSingleLine = true; ellipsize = TextUtils.TruncateAt.END; setPadding(dp(2), dp(6), dp(2), 0)
            }).apply {
            setPadding(0, dp(8), 0, dp(8))
            background = ui.pressable(0, 14f)
            isClickable = true
            setOnClickListener { applyTheme(th) }
        }
    }

    private fun applyTheme(th: VarcoTheme) {
        state.settings.theme = th.id
        ui.theme = th
        wallThumb = null
        build()
        root.requestApplyInsets()
        show()
        openThemes()
    }

    // ------------------------------------------------------------------ salvataggio

    private val saveRunnable = Runnable { save() }
    private fun scheduleSave() {
        handler.removeCallbacks(saveRunnable)
        handler.postDelayed(saveRunnable, 800)
    }

    private fun save() {
        handler.removeCallbacks(saveRunnable)
        try { store.save(state) } catch (_: Exception) { }
    }

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_SHORT).show()

    companion object {
        private const val FILE_REQUEST = 42
        /** Altezza della barra in basso (dp): 2 della linea di caricamento + 58 dei pulsanti. */
        private const val BAR = 60
    }
}

/** La versione scritta nel menu, senza attivare BuildConfig in Gradle. */
object BuildConfigLite {
    const val VERSION = "0.30.0"
}

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
import android.webkit.WebView
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
class MainActivity : Activity(), Pages.Listener, Link.Listener {
    private lateinit var state: BrowserState
    private lateinit var store: Store
    private lateinit var pages: Pages
    private lateinit var link: Link
    private lateinit var vault: Vault
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
    private lateinit var homeBookmarks: LinearLayout
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
        vault = Vault(this).apply { load() }
        link = Link(state, vault, this)
        pages.canCapture = { layer.visibility != View.VISIBLE && fullscreen.visibility != View.VISIBLE }
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
        link.stopPolling()
        hidePwChip()
        save()
    }

    override fun onResume() {
        super.onResume()
        pages.resumeAll()
        link.startPolling()
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
        // Beta 0.33: i preferiti sotto la ricerca, in una fila che scorre.
        homeBookmarks = ui.row().apply { setPadding(0, dp(14), 0, 0) }
        center.addView(HorizontalScrollView(this).apply {
            isHorizontalScrollBarEnabled = false
            addView(homeBookmarks)
        }, LinearLayout.LayoutParams(ui.WRAP, ui.WRAP).apply { gravity = Gravity.CENTER_HORIZONTAL })
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
        val menuButton = ui.iconButton(R.drawable.ic_menu, "Menu") { openMenu() }.apply {
            // Beta 0.31: tenendo premuto il menu mandi la pagina al PC con l'ultima destinazione scelta.
            setOnLongClickListener { quickSendToPc(); true }
        }
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
        pwChip?.let { c ->
            (c.layoutParams as FrameLayout.LayoutParams).bottomMargin = maxOf(imeBottom, sysBottom + dp(8 + BAR)) + dp(10)
            c.requestLayout()
        }
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
        if (pwChip != null && SyncRules.originOf(tab.url) != pwChipOrigin) hidePwChip()
        if (isHome) {
            updateHomeBookmarks()
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
        if (pwChip != null && (tab.id != state.current()?.id || SyncRules.originOf(tab.url) != pwChipOrigin)) hidePwChip()
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
            bar.visibility = View.GONE
            fullscreenCallback = callback
            controller?.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            controller?.hide(WindowInsets.Type.systemBars())
        } else {
            fullscreen.removeAllViews()
            fullscreen.visibility = View.GONE
            bar.visibility = if (layer.visibility == View.VISIBLE && editPanel != null) View.INVISIBLE else View.VISIBLE
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
            for (s in suggestionsFor(q)) suggestions.addView(ui.menuRow(s.icon, s.title, s.detail) { s.run(); closeLayer() }.apply {
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

    /** Prima la foto della pagina aperta (finché è visibile), poi la griglia. */
    private fun openTabs() {
        val cur = state.current()
        if (cur != null && layer.visibility != View.VISIBLE) pages.snapshot(cur.id) { buildTabs() } else buildTabs()
    }

    private fun buildTabs() {
        openLayer(dim = 1f)
        // Opaca: sotto non devono vedersi la Home o la pagina. La barra si nasconde, la griglia ha i suoi pulsanti.
        layer.background = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(Themes.mix(ui.bg, ui.accent, .08f), ui.bg))
        bar.visibility = View.INVISIBLE
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
            ui.button("Nuova scheda", primary = true) { newTab() },
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
        val bmp = pages.thumbs[t.id]
        val icon = pages.icons[t.id]
        val body = FrameLayout(this).apply { setBackgroundColor(Themes.mix(ui.bg, 0xFFFFFFFF.toInt(), .04f)) }
        when {
            t.url == UrlRules.HOME -> body.addView(ImageView(this).apply { scaleType = ImageView.ScaleType.CENTER_CROP; setImageBitmap(wallpaperThumb()) })
            bmp != null -> body.addView(ImageView(this).apply {
                setImageBitmap(bmp)
                // La miniatura riempie la larghezza partendo dall'alto della pagina.
                scaleType = ImageView.ScaleType.MATRIX
                addOnLayoutChangeListener { v, _, _, _, _, _, _, _, _ ->
                    val s = v.width.toFloat() / bmp.width.coerceAtLeast(1)
                    (v as ImageView).imageMatrix = android.graphics.Matrix().apply { setScale(s, s) }
                }
            })
            else -> {
                // Scheda mai vista (dormiva dall'avvio): l'icona del sito e il suo nome al posto della foto.
                val col = ui.column().apply { gravity = Gravity.CENTER }
                if (icon != null) col.addView(ImageView(this).apply { setImageBitmap(icon) }, LinearLayout.LayoutParams(dp(32), dp(32)).apply { bottomMargin = dp(10) })
                else col.addView(ui.label(UrlRules.displayHost(t.url).take(1).uppercase(), 26f, ui.accent, bold = true).apply {
                    gravity = Gravity.CENTER
                    background = ui.round(Themes.alpha(ui.accent, .14f), 14f)
                }, LinearLayout.LayoutParams(dp(48), dp(48)).apply { bottomMargin = dp(10) })
                col.addView(ui.label(UrlRules.displayHost(t.url), 12f, ui.muted).apply { isSingleLine = true; ellipsize = TextUtils.TruncateAt.END; gravity = Gravity.CENTER })
                body.addView(col, FrameLayout.LayoutParams(ui.MATCH, ui.WRAP, Gravity.CENTER).apply { leftMargin = dp(10); rightMargin = dp(10) })
            }
        }
        val head = ui.row().apply {
            setPadding(dp(10), 0, dp(2), 0)
            if (icon != null) addView(ImageView(this@MainActivity).apply { setImageBitmap(icon) }, LinearLayout.LayoutParams(dp(14), dp(14)).apply { marginEnd = dp(7) })
            addView(ui.label(if (t.url == UrlRules.HOME) "Home" else t.title.ifBlank { UrlRules.displayHost(t.url) }, 12.5f, if (active) ui.text else ui.muted, bold = active).apply {
                isSingleLine = true; ellipsize = TextUtils.TruncateAt.END
            }, ui.lp(0, ui.WRAP, 1f))
            addView(ui.iconButton(R.drawable.ic_close, "Chiudi scheda") { closeTab(t.id); buildTabs() }.apply {
                layoutParams = LinearLayout.LayoutParams(dp(34), dp(34))
                (getChildAt(0).layoutParams as FrameLayout.LayoutParams).apply { width = dp(16); height = dp(16) }
            })
        }
        return ui.column(head).apply {
            addView(body, ui.lp(ui.MATCH, 0, 1f))
            background = ui.pressable(ui.glass, 16f)
            // Il bordo sta in primo piano, sopra la miniatura: così si vede tutto intorno.
            foreground = ui.round(0, 16f, if (active) ui.accent else ui.line, if (active) 2f else 1f)
            clipToOutline = true
            isClickable = true
            // Prima scelgo la scheda, poi chiudo la griglia: la foto di quella vecchia è già stata fatta all'apertura.
            setOnClickListener { select(t); closeLayer() }
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
        val pc = state.link
        if (pc != null && onPage) list.addView(ui.menuRow(R.drawable.ic_external, "Manda al PC", pc.pcName) { openSendSheet() })
        if (pc == null) list.addView(ui.menuRow(R.drawable.ic_external, "Collega al PC") { openPairSheet() })
        else list.addView(ui.menuRow(R.drawable.ic_info, "PC collegato", when {
            state.outbox.isNotEmpty() -> "${state.outbox.size} in coda"
            link.reachable -> "raggiungibile"
            link.relayOk -> "via internet"
            else -> "non raggiungibile"
        }) { openLinkSheet() })
        if (onPage) {
            val starred = state.isBookmarked(tab!!.url)
            list.addView(ui.menuRow(R.drawable.ic_bookmark, if (starred) "Togli dai preferiti" else "Aggiungi ai preferiti") {
                closeLayer()
                if (starred) state.removeBookmark(tab.url) else state.addBookmark(tab.url, tab.title.ifBlank { UrlRules.displayHost(tab.url) })
                toast(if (starred) "Tolto dai preferiti" else "Aggiunto ai preferiti")
                scheduleSave(); link.sync()
            })
        }
        list.addView(ui.menuRow(R.drawable.ic_bookmarks, "Preferiti", state.liveBookmarks.size.takeIf { it > 0 }?.toString()) { openBookmarks() })
        list.addView(ui.menuRow(R.drawable.ic_key, "Password", vault.live.size.takeIf { it > 0 }?.toString()) { openPasswords() })
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

    // ------------------------------------------------------------------ collegamento col PC (Beta 0.31)

    private fun targetLabel(target: String): String = when {
        target == "tab" -> "Scheda nuova sul PC"
        target == "window" -> "Finestra nuova sul PC"
        target == "ask" -> "Chiedi sul PC"
        target.startsWith("ws:") -> "Workspace ${target.removePrefix("ws:")}"
        else -> target
    }

    /** Menu → Manda al PC: scegli dove si apre. L'ultima scelta sta in cima. */
    private fun openSendSheet() {
        val pc = state.link ?: return openPairSheet()
        openLayer(dim = .5f)
        val list = ui.column(title("Manda a ${pc.pcName}"))
        val options = mutableListOf(
            Triple("tab", R.drawable.ic_tab_new, "Scheda nuova nella finestra aperta"),
            Triple("window", R.drawable.ic_external, "Finestra nuova"),
            Triple("ask", R.drawable.ic_info, "Chiedi sul PC"),
        )
        options.sortByDescending { it.first == pc.lastTarget }
        for ((target, icon, label) in options) list.addView(ui.menuRow(icon, label, if (target == pc.lastTarget) "ultima" else null) { closeLayer(); sendCurrentToPc(target) })
        if (pc.workspaces.isNotEmpty()) {
            list.addView(title("In un workspace del PC"))
            for ((name, color) in pc.workspaces) list.addView(ui.row().apply {
                background = ui.pressable(0, 12f)
                setPadding(dp(14), 0, dp(14), 0)
                minimumHeight = dp(48)
                addView(View(this@MainActivity).apply {
                    background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(color ?: ui.muted) }
                }, LinearLayout.LayoutParams(dp(10), dp(10)).apply { marginStart = dp(5); marginEnd = dp(19) })
                addView(ui.label(name, 15f), ui.lp(0, ui.WRAP, 1f))
                if (pc.lastTarget == "ws:$name") addView(ui.label("ultima", 13f, ui.muted))
                isClickable = true
                setOnClickListener { closeLayer(); sendCurrentToPc("ws:$name") }
            })
        }
        list.addView(ui.label("Tieni premuto il pulsante del menu per mandarla subito con l'ultima scelta.", 12f, ui.muted).apply { setPadding(dp(14), dp(10), dp(14), dp(4)) })
        val scroll = ScrollView(this).apply { addView(list); isVerticalScrollBarEnabled = false }
        sheet(scroll, bottomMargin = sysBottom + dp(8 + BAR + 8))
        val maxH = (resources.displayMetrics.heightPixels * .62f).toInt()
        scroll.post { if (scroll.height > maxH) scroll.layoutParams = LinearLayout.LayoutParams(ui.MATCH, maxH) }
    }

    private fun quickSendToPc() {
        val pc = state.link
        val tab = state.current()
        when {
            pc == null -> openPairSheet()
            tab == null || tab.url == UrlRules.HOME -> toast("Apri una pagina da mandare al PC")
            else -> sendCurrentToPc(pc.lastTarget)
        }
    }

    /** Legge dove sei nella pagina (scroll, minuto del video), poi la mette in coda per il PC. */
    private fun sendCurrentToPc(target: String) {
        val pc = state.link ?: return
        val tab = state.current() ?: return
        if (!UrlRules.isWebUrl(tab.url)) return toast("Questa pagina non si può mandare")
        pc.lastTarget = target
        val view = pages.viewOf(tab.id)
        val enqueue = { scroll: Double, time: Double ->
            link.send(OutTab(LinkRules.newId(), tab.url, tab.title, scroll, time, target))
            toast(when {
                link.reachable -> "${targetLabel(target)}: mandata"
                pc.relay.isNotEmpty() -> "Mando via internet…"
                else -> "In coda: parte quando sei sulla Wi-Fi di casa"
            })
            scheduleSave()
        }
        if (view == null) return enqueue(0.0, 0.0)
        view.evaluateJavascript(LinkRules.CAPTURE_SCRIPT) { json ->
            val o = runCatching { org.json.JSONObject(json) }.getOrNull()
            enqueue(o?.optDouble("scroll", 0.0) ?: 0.0, o?.optDouble("time", 0.0) ?: 0.0)
        }
    }

    /** Menu → Collega al PC: inquadra il QR delle Impostazioni del PC, oppure incolla il codice. */
    private fun openPairSheet() {
        openLayer(dim = .5f)
        val content = ui.column(
            title("Collega al PC"),
            ui.label("Sul PC: VARCO → Impostazioni → Telefono → Collega un telefono. Telefono e PC devono essere sulla stessa Wi-Fi.", 14f, ui.muted).apply {
                setPadding(dp(14), 0, dp(14), dp(14)); setLineSpacing(0f, 1.2f)
            },
        )
        val buttons = ui.row().apply { setPadding(dp(6), 0, dp(6), dp(6)) }
        buttons.addView(ui.button("Inquadra il QR", primary = true) { scanPairingCode() }, ui.lp(0, ui.WRAP, 1f))
        buttons.addView(View(this), ui.lp(dp(8), 1))
        buttons.addView(ui.button("Incolla il codice") {
            val clip = (getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager).primaryClip
            val text = clip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.coerceToText(this)?.toString().orEmpty()
            if (text.isBlank()) toast("Gli appunti sono vuoti: sul PC premi «Copia il codice» e mandalo al telefono") else pairWith(text)
        }, ui.lp(0, ui.WRAP, 1f))
        content.addView(buttons)
        sheet(content, bottomMargin = sysBottom + dp(8 + BAR + 8))
    }

    private fun scanPairingCode() {
        try {
            val options = com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions.Builder()
                .setBarcodeFormats(com.google.mlkit.vision.barcode.common.Barcode.FORMAT_QR_CODE).build()
            com.google.mlkit.vision.codescanner.GmsBarcodeScanning.getClient(this, options).startScan()
                .addOnSuccessListener { code -> code.rawValue?.let(::pairWith) }
                .addOnFailureListener { toast("Lettore QR non disponibile: usa «Incolla il codice»") }
        } catch (_: Throwable) {
            toast("Lettore QR non disponibile: usa «Incolla il codice»")
        }
    }

    private fun pairWith(code: String) {
        closeLayer()
        toast("Collegamento al PC…")
        link.pair(code) { ok, message ->
            toast(message)
            if (ok) scheduleSave()
        }
    }

    /** Menu → PC collegato: stato, controlla adesso, scollega. */
    private fun openLinkSheet() {
        val pc = state.link ?: return openPairSheet()
        openLayer(dim = .5f)
        val status = when {
            link.reachable -> "Raggiungibile" + (pc.lastHost.takeIf { it.isNotEmpty() }?.let { " · $it" } ?: "")
            link.relayOk -> "Fuori casa: le schede passano via internet (${pc.relay.removePrefix("https://")}), cifrate"
            link.lastError.isNotEmpty() -> link.lastError
            pc.relay.isEmpty() -> "Non raggiungibile: VARCO deve essere aperto sul PC, sulla stessa Wi-Fi. Per mandare schede fuori casa, sul PC accendi Impostazioni → Telefono → Anche fuori casa"
            else -> "Non raggiungibile: VARCO deve essere aperto sul PC, sulla stessa Wi-Fi"
        }
        val list = ui.column(title(pc.pcName),
            ui.label(status, 14f, ui.muted).apply { setPadding(dp(14), 0, dp(14), dp(8)) })
        if (state.outbox.isNotEmpty()) list.addView(ui.label("In coda: " + state.outbox.joinToString(", ") { it.title.ifBlank { UrlRules.displayHost(it.url) } }, 13f, ui.muted).apply {
            setPadding(dp(14), 0, dp(14), dp(8)); maxLines = 3; ellipsize = TextUtils.TruncateAt.END
        })
        list.addView(ui.menuRow(R.drawable.ic_reload, "Controlla adesso") { closeLayer(); toast("Controllo il PC…"); link.sync() })
        list.addView(ui.menuRow(R.drawable.ic_external, "Collega di nuovo (QR nuovo)") { openPairSheet() })
        list.addView(ui.menuRow(R.drawable.ic_close, "Scollega") { closeLayer(); link.unpair(); scheduleSave(); toast("Scollegato da ${pc.pcName}") })
        sheet(list, bottomMargin = sysBottom + dp(8 + BAR + 8))
    }

    // Link.Listener

    override fun onLinkChanged() { scheduleSave() }

    override fun onSent(tab: OutTab, viaRelay: Boolean) {
        if (viaRelay) toast("${targetLabel(tab.target)}: mandata via internet")
    }

    override fun onUnpaired(reason: String) {
        toast(reason)
        scheduleSave()
    }

    /** Schede dal PC: si aprono dietro (nel workspace in cui sei) e compare un avviso con "Apri". */
    override fun onIncoming(tabs: List<Link.Incoming>) {
        val created = tabs.map { inc ->
            val t = state.addTab(LinkRules.withTime(inc.url, inc.time), select = false)
            t.title = inc.title
            if (inc.scroll > 0.01 || inc.time >= 5) pages.restore[t.id] = inc.scroll to inc.time
            t
        }
        updateBar()
        scheduleSave()
        if (created.isEmpty()) return
        val pcName = state.link?.pcName ?: "PC"
        showBanner(if (created.size == 1) "Da $pcName: ${created[0].title.ifBlank { UrlRules.displayHost(created[0].url) }}" else "${created.size} schede da $pcName") {
            if (created.size == 1) select(created[0]) else openTabs()
        }
    }

    private var banner: View? = null

    // ------------------------------------------------------------------ preferiti (Beta 0.33)

    private fun updateHomeBookmarks() {
        homeBookmarks.removeAllViews()
        for (b in state.liveBookmarks.take(12)) {
            homeBookmarks.addView(ui.chip(b.title.ifBlank { UrlRules.displayHost(b.url) }.take(24), null, false) { navigate(b.url) }.apply {
                setOnLongClickListener { bookmarkOptions(b); true }
            }, LinearLayout.LayoutParams(ui.WRAP, ui.WRAP).apply { marginEnd = dp(8) })
        }
    }

    private fun openBookmarks() {
        openLayer(dim = .5f)
        val list = ui.column(title("Preferiti"))
        val items = state.liveBookmarks
        if (items.isEmpty()) list.addView(ui.label("Ancora nessun preferito. Apri una pagina, poi Menu → Aggiungi ai preferiti." +
            if (state.link != null) " Quelli del PC arrivano da soli quando sei sulla Wi-Fi di casa." else "", 14f, ui.muted).apply {
            setPadding(dp(14), 0, dp(14), dp(12)); setLineSpacing(0f, 1.2f)
        })
        for (b in items) list.addView(ui.menuRow(R.drawable.ic_bookmark, b.title.ifBlank { UrlRules.displayHost(b.url) }, UrlRules.displayHost(b.url)) {
            closeLayer(); openUrl(b.url)
        }.apply { setOnLongClickListener { bookmarkOptions(b); true } })
        if (items.isNotEmpty()) list.addView(ui.label("Tieni premuto un preferito per aprirlo in una scheda nuova o toglierlo.", 12f, ui.muted).apply { setPadding(dp(14), dp(6), dp(14), dp(4)) })
        sheet(ScrollView(this).apply { addView(list) }, bottomMargin = sysBottom + dp(8 + BAR + 8)).apply {
            layoutParams = (layoutParams as FrameLayout.LayoutParams).apply { topMargin = sysTop + dp(60) }
        }
    }

    private fun bookmarkOptions(b: Bookmark) {
        openLayer(dim = .6f)
        val list = ui.column(title(b.title.ifBlank { UrlRules.displayHost(b.url) }))
        list.addView(ui.menuRow(R.drawable.ic_tab_new, "Apri in una scheda nuova") { closeLayer(); newTab(b.url) })
        list.addView(ui.menuRow(R.drawable.ic_close, "Togli dai preferiti") {
            state.removeBookmark(b.url); scheduleSave(); link.sync(); closeLayer(); show(); toast("Tolto dai preferiti")
        })
        sheet(list)
    }

    /** Apre un indirizzo: al posto della Home, altrimenti nella scheda aperta. */
    private fun openUrl(url: String) {
        navigate(url)
    }

    // ------------------------------------------------------------------ password (Beta 0.33)

    private var pwChip: View? = null
    private var pwChipOrigin = ""

    /** Il sito della pagina, letto da VARCO dall'indirizzo vero della WebView (non da ciò che dice la pagina). */
    private fun originOf(view: WebView) = SyncRules.originOf(view.url)

    override fun onLoginField(tab: Tab, view: WebView, focused: Boolean) {
        if (state.current()?.id != tab.id) return
        val origin = originOf(view)
        if (!focused) { handler.postDelayed({ if (pwChipOrigin == origin) hidePwChip() }, 400); return }
        val accounts = vault.accountsFor(origin)
        if (origin.isEmpty() || accounts.isEmpty()) return hidePwChip()
        showPwChip(origin, if (accounts.size == 1) "Accedi come ${accounts[0].username.ifBlank { "(senza nome utente)" }}" else "Scegli un account (${accounts.size})") {
            vault.unlock(this, SyncRules.hostOf(origin), ::toast) {
                val fresh = vault.accountsFor(origin)
                if (fresh.size == 1) fill(tab, view, origin, fresh[0]) else chooseAccount(tab, view, origin, fresh)
            }
        }
    }

    private fun showPwChip(origin: String, text: String, onTap: () -> Unit) {
        hidePwChip()
        val chip = ui.row(ui.icon(R.drawable.ic_key, 18, ui.accent).apply { (layoutParams as LinearLayout.LayoutParams).marginEnd = dp(10) }).apply {
            background = ui.pressable(ui.glass, 20f, ui.lineStrong)
            setPadding(dp(14), dp(10), dp(16), dp(10))
            addView(ui.label(text, 14f).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END })
            isClickable = true
            setOnClickListener { onTap() }
        }
        root.addView(chip, root.indexOfChild(layer), FrameLayout.LayoutParams(ui.WRAP, ui.WRAP, Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL).apply {
            bottomMargin = maxOf(imeBottom, sysBottom + dp(8 + BAR)) + dp(10)
        })
        pwChip = chip
        pwChipOrigin = origin
    }

    private fun hidePwChip() {
        pwChip?.let { root.removeView(it) }
        pwChip = null
        pwChipOrigin = ""
    }

    private fun chooseAccount(tab: Tab, view: WebView, origin: String, accounts: List<PwEntry>) {
        openLayer(dim = .5f)
        val list = ui.column(title("Account per ${SyncRules.hostOf(origin)}"))
        for (a in accounts) list.addView(ui.menuRow(R.drawable.ic_key, a.username.ifBlank { "(senza nome utente)" }) { closeLayer(); fill(tab, view, origin, a) })
        sheet(list, bottomMargin = maxOf(imeBottom, sysBottom) + dp(8))
    }

    /** Compila nome utente e password. Solo se la pagina è ancora sullo stesso sito di quando hai scelto. */
    private fun fill(tab: Tab, view: WebView, origin: String, entry: PwEntry) {
        hidePwChip()
        if (pages.viewOf(tab.id) !== view || originOf(view) != origin || entry.origin != origin) return toast("La pagina è cambiata: tocca di nuovo il campo")
        view.evaluateJavascript("window.__varcoPwFill&&window.__varcoPwFill(${org.json.JSONObject.quote(entry.username)},${org.json.JSONObject.quote(entry.password)})", null)
        vault.markUsed(entry)
    }

    /** Accesso in due passaggi: il nome utente scritto nella pagina prima della password. */
    private var lastUsername: Triple<String, String, Long>? = null

    override fun onLoginSubmitted(tab: Tab, view: WebView, username: String, password: String) {
        val origin = originOf(view)
        if (origin.isEmpty()) return
        if (password.isEmpty()) { lastUsername = Triple(origin, username, System.currentTimeMillis()); return }
        var user = username
        val before = lastUsername
        if (user.isEmpty() && before != null && before.first == origin && System.currentTimeMillis() - before.third < 10 * 60 * 1000) user = before.second
        val decision = SyncRules.decideSave(vault.live, vault.never, origin, user, password)
        if (decision != "new" && decision != "update") return
        val host = SyncRules.hostOf(origin)
        showBanner(if (decision == "new") "Salvare la password per $host?" else "Aggiornare la password di $host?",
            action = if (decision == "new") "Salva" else "Aggiorna", icon = R.drawable.ic_key, timeout = 20000,
            second = if (decision == "new") "Mai" to {
                vault.never += origin; vault.save(); toast("Non chiederò più per $host")
            } else null) {
            vault.put(origin, user, password)
            state.pwRev++
            scheduleSave(); link.sync()
            toast("Password salvata")
        }
    }

    /** Menu → Password: serve lo sblocco del telefono. */
    private fun openPasswords() {
        closeLayer()
        vault.unlock(this, "Le tue password salvate", ::toast) { showPasswords() }
    }

    private fun showPasswords() {
        openLayer(dim = .5f)
        val list = ui.column(title("Password"))
        val items = vault.live.sortedWith(compareBy({ SyncRules.hostOf(it.origin) }, { it.username }))
        if (items.isEmpty()) list.addView(ui.label("Nessuna password salvata. VARCO chiede se salvarla dopo un accesso." +
            if (state.link != null) " Quelle del PC arrivano da sole quando sei sulla Wi-Fi di casa (se sul PC è acceso Impostazioni → Telefono → Sincronizza le password)." else "",
            14f, ui.muted).apply { setPadding(dp(14), 0, dp(14), dp(12)); setLineSpacing(0f, 1.2f) })
        for (e in items) list.addView(ui.menuRow(R.drawable.ic_key, SyncRules.hostOf(e.origin), e.username.ifBlank { "(senza nome utente)" }) { passwordOptions(e) })
        if (vault.never.isNotEmpty()) list.addView(ui.menuRow(R.drawable.ic_close, "Siti esclusi", vault.never.size.toString()) { neverOptions() })
        sheet(ScrollView(this).apply { addView(list) }, bottomMargin = sysBottom + dp(8 + BAR + 8)).apply {
            layoutParams = (layoutParams as FrameLayout.LayoutParams).apply { topMargin = sysTop + dp(60) }
        }
    }

    private fun passwordOptions(e: PwEntry) {
        openLayer(dim = .6f)
        val shown = ui.label("••••••••", 16f).apply { setPadding(dp(14), 0, dp(14), dp(10)); setTextIsSelectable(true) }
        val list = ui.column(title("${SyncRules.hostOf(e.origin)} · ${e.username.ifBlank { "(senza nome utente)" }}"), shown)
        list.addView(ui.menuRow(R.drawable.ic_search, "Mostra") { shown.text = e.password })
        list.addView(ui.menuRow(R.drawable.ic_check, "Copia la password") {
            val cm = getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager
            cm.setPrimaryClip(android.content.ClipData.newPlainText("password", e.password).apply {
                description.extras = android.os.PersistableBundle().apply { putBoolean("android.content.extra.IS_SENSITIVE", true) }
            })
            toast("Password copiata")
        })
        if (e.username.isNotEmpty()) list.addView(ui.menuRow(R.drawable.ic_check, "Copia il nome utente") {
            (getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager).setPrimaryClip(android.content.ClipData.newPlainText("nome utente", e.username))
            toast("Nome utente copiato")
        })
        list.addView(ui.menuRow(R.drawable.ic_external, "Apri il sito") { closeLayer(); newTab(e.origin) })
        list.addView(ui.menuRow(R.drawable.ic_close, "Elimina") {
            vault.remove(e.origin, e.username); state.pwRev++; scheduleSave(); link.sync()
            toast("Password eliminata" + if (state.link != null) ": la elimino anche dal PC" else ""); showPasswords()
        })
        sheet(list)
    }

    private fun neverOptions() {
        openLayer(dim = .6f)
        val list = ui.column(title("Siti per cui non chiedo di salvare"))
        for (o in vault.never.sorted()) list.addView(ui.menuRow(R.drawable.ic_close, SyncRules.hostOf(o), "Togli") {
            vault.never -= o; vault.save(); neverOptions()
        })
        sheet(list)
    }

    override fun onSynced(bookmarks: Boolean, passwords: Boolean) {
        scheduleSave()
        if (bookmarks && state.current()?.url == UrlRules.HOME) updateHomeBookmarks()
    }

    /** Avviso sopra la barra, con un pulsante; sparisce da solo dopo 8 secondi. */
    private fun showBanner(text: String, action: String = "Apri", icon: Int = R.drawable.ic_external, timeout: Long = 8000,
                           second: Pair<String, () -> Unit>? = null, onOpen: () -> Unit) {
        banner?.let { root.removeView(it) }
        val card = ui.row(ui.icon(icon, 18, ui.accent).apply { (layoutParams as LinearLayout.LayoutParams).marginEnd = dp(10) }).apply {
            background = ui.round(ui.glass, 18f, ui.lineStrong)
            setPadding(dp(14), dp(6), dp(6), dp(6))
            addView(ui.label(text, 14f).apply { maxLines = 2; ellipsize = TextUtils.TruncateAt.END }, ui.lp(0, ui.WRAP, 1f))
        }
        if (second != null) {
            card.addView(ui.button(second.first) { root.removeView(card); banner = null; second.second() }.apply { minHeight = dp(38) })
            card.addView(View(this), ui.lp(dp(6), 1))
        }
        card.addView(ui.button(action, primary = true) { root.removeView(card); banner = null; onOpen() }.apply { minHeight = dp(38) })
        root.addView(card, root.indexOfChild(layer), FrameLayout.LayoutParams(ui.MATCH, ui.WRAP, Gravity.BOTTOM).apply {
            leftMargin = dp(14); rightMargin = dp(14); bottomMargin = sysBottom + dp(8 + BAR + 10)
        })
        banner = card
        card.translationY = dp(30).toFloat(); card.alpha = 0f
        card.animate().translationY(0f).alpha(1f).setDuration(220).start()
        handler.postDelayed({ if (banner === card) { banner = null; card.animate().alpha(0f).setDuration(200).withEndAction { root.removeView(card) }.start() } }, timeout)
    }

    companion object {
        private const val FILE_REQUEST = 42
        /** Altezza della barra in basso (dp): 2 della linea di caricamento + 58 dei pulsanti. */
        private const val BAR = 60
    }
}

/** La versione scritta nel menu, senza attivare BuildConfig in Gradle. */
object BuildConfigLite {
    const val VERSION = "0.33.0"
}

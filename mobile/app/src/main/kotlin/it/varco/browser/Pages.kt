package it.varco.browser

import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.view.PixelCopy
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.os.Message
import android.view.View
import android.webkit.CookieManager
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast

/**
 * Beta 0.30: le pagine vive (una WebView per scheda sveglia).
 * Al massimo BrowserState.MAX_AWAKE restano in memoria: le altre "dormono" in un Bundle
 * (indirizzo e cronologia avanti/indietro) e si risvegliano quando le apri.
 */
class Pages(private val activity: Activity, private val state: BrowserState, private val listener: Listener) {
    interface Listener {
        fun onPageChanged(tab: Tab)
        fun onProgress(tab: Tab, progress: Int)
        fun onOpenTab(url: String?, from: Tab, transport: Message?)
        fun onFullscreen(view: View?, callback: WebChromeClient.CustomViewCallback?)
        fun onFileChooser(callback: ValueCallback<Array<Uri>>, params: WebChromeClient.FileChooserParams): Boolean
    }

    private val awake = LinkedHashMap<String, WebView>()
    private val sleeping = HashMap<String, Bundle>()
    val thumbs = HashMap<String, Bitmap>()
    val icons = HashMap<String, Bitmap>()
    val progress = HashMap<String, Int>()

    fun viewOf(tabId: String): WebView? = awake[tabId]

    /** La WebView di una scheda: la sveglia se dorme, la crea se non c'è. */
    fun wake(tab: Tab): WebView {
        awake[tab.id]?.let { return it }
        val view = create(tab)
        awake[tab.id] = view
        val saved = sleeping.remove(tab.id)
        if (saved == null || view.restoreState(saved) == null) {
            if (tab.url != UrlRules.HOME) view.loadUrl(tab.url)
        }
        return view
    }

    /** Fa dormire le schede in più, tranne quella aperta. */
    fun trim(activeId: String?) {
        val tabs = awake.keys.mapNotNull { id -> state.tabs.firstOrNull { it.id == id } }
        for (t in BrowserState.toSleep(tabs, activeId)) sleep(t.id)
        // Schede chiuse nel frattempo.
        awake.keys.filter { id -> state.tabs.none { it.id == id } }.forEach { destroy(it) }
    }

    private fun sleep(id: String) {
        val view = awake.remove(id) ?: return
        snapshot(id, view)
        val b = Bundle()
        if (view.saveState(b) != null) sleeping[id] = b
        view.destroyQuietly()
    }

    fun destroy(id: String) {
        awake.remove(id)?.destroyQuietly()
        sleeping.remove(id)
        thumbs.remove(id); icons.remove(id); progress.remove(id)
    }

    private fun WebView.destroyQuietly() {
        (parent as? android.view.ViewGroup)?.removeView(this)
        stopLoading()
        destroy()
    }

    /** false quando sopra la pagina c'è qualcosa (griglia, menu, tastiera): la foto prenderebbe quello. */
    var canCapture: () -> Boolean = { true }

    /**
     * Una piccola foto della pagina per la griglia delle schede (un terzo della misura).
     * Copia i pixel dallo schermo (PixelCopy): disegnare la WebView in un Bitmap dà un'immagine nera,
     * perché la pagina la disegna la GPU. Quindi funziona solo con la pagina visibile. done arriva sempre, anche se la foto non riesce.
     */
    fun snapshot(id: String, view: WebView? = awake[id], done: (() -> Unit)? = null) {
        val v = view
        if (v == null || !v.isAttachedToWindow || !v.isShown || v.width <= 0 || v.height <= 0 || !canCapture()) { done?.invoke(); return }
        try {
            val scale = .34f
            val bmp = Bitmap.createBitmap((v.width * scale).toInt().coerceAtLeast(1), (v.height * scale).toInt().coerceAtLeast(1), Bitmap.Config.ARGB_8888)
            val at = IntArray(2)
            v.getLocationInWindow(at)
            val rect = Rect(at[0], at[1], at[0] + v.width, at[1] + v.height)
            PixelCopy.request(activity.window, rect, bmp, { result ->
                if (result == PixelCopy.SUCCESS) thumbs[id] = bmp
                done?.invoke()
            }, Handler(Looper.getMainLooper()))
        } catch (_: Throwable) { done?.invoke() }
    }

    fun applySettings() {
        for (v in awake.values) configure(v)
    }

    fun pauseAll() { awake.values.forEach { it.onPause() } }
    fun resumeAll() { awake.values.forEach { it.onResume() } }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configure(v: WebView) {
        v.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = false
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = true
            displayZoomControls = false
            mediaPlaybackRequiresUserGesture = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            allowFileAccess = false
            allowContentAccess = false
            userAgentString = UrlRules.userAgent(defaultUa, state.settings.desktopSite)
        }
    }

    private val defaultUa: String by lazy { WebSettings.getDefaultUserAgent(activity) }

    @SuppressLint("ClickableViewAccessibility")
    private fun create(tab: Tab): WebView {
        val v = WebView(activity)
        configure(v)
        v.setBackgroundColor(0xFFFFFFFF.toInt())
        CookieManager.getInstance().setAcceptThirdPartyCookies(v, true)
        v.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                if (UrlRules.isWebUrl(url) || url.startsWith("about:") || url.startsWith("data:") || url.startsWith("blob:")) return false
                openExternal(url, view)
                return true
            }

            override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
                tab.url = url.takeIf { UrlRules.isWebUrl(it) } ?: tab.url
                listener.onPageChanged(tab)
            }

            override fun onPageFinished(view: WebView, url: String) {
                tab.title = view.title?.takeIf { it.isNotBlank() && it != url } ?: tab.title
                listener.onPageChanged(tab)
                view.postDelayed({ if (awake[tab.id] === view) snapshot(tab.id, view) }, 600)
            }

            override fun doUpdateVisitedHistory(view: WebView, url: String, isReload: Boolean) {
                if (UrlRules.isWebUrl(url)) { tab.url = url; listener.onPageChanged(tab) }
            }
        }
        v.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                progress[tab.id] = newProgress
                listener.onProgress(tab, newProgress)
            }

            override fun onReceivedTitle(view: WebView, title: String?) {
                if (!title.isNullOrBlank()) { tab.title = title; listener.onPageChanged(tab) }
            }

            override fun onReceivedIcon(view: WebView, icon: Bitmap?) {
                if (icon != null) { icons[tab.id] = icon; listener.onPageChanged(tab) }
            }

            override fun onCreateWindow(view: WebView, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message): Boolean {
                // Popup senza un tocco dell'utente: bloccato, come fa il PC.
                if (!isUserGesture) return false
                listener.onOpenTab(null, tab, resultMsg)
                return true
            }

            override fun onShowCustomView(view: View, callback: CustomViewCallback) = listener.onFullscreen(view, callback)
            override fun onHideCustomView() = listener.onFullscreen(null, null)

            override fun onShowFileChooser(webView: WebView, filePathCallback: ValueCallback<Array<Uri>>, fileChooserParams: FileChooserParams) =
                listener.onFileChooser(filePathCallback, fileChooserParams)
        }
        v.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ -> download(url, userAgent, contentDisposition, mimeType) }
        return v
    }

    /** Le WebView nate da window.open / target=_blank: Android ce ne chiede una nuova da collegare. */
    fun adopt(tab: Tab, transport: Message) {
        val view = create(tab)
        awake[tab.id] = view
        (transport.obj as WebView.WebViewTransport).webView = view
        transport.sendToTarget()
    }

    private fun download(url: String, userAgent: String, disposition: String?, mime: String?) {
        if (!UrlRules.isWebUrl(url)) {
            Toast.makeText(activity, "Questo file non si può scaricare", Toast.LENGTH_SHORT).show()
            return
        }
        try {
            val name = URLUtil.guessFileName(url, disposition, mime)
            val req = DownloadManager.Request(Uri.parse(url))
                .setMimeType(mime)
                .addRequestHeader("User-Agent", userAgent)
                .setTitle(name)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name)
            CookieManager.getInstance().getCookie(url)?.let { req.addRequestHeader("Cookie", it) }
            (activity.getSystemService(Activity.DOWNLOAD_SERVICE) as DownloadManager).enqueue(req)
            Toast.makeText(activity, "Download di $name avviato", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(activity, "Download non riuscito", Toast.LENGTH_SHORT).show()
        }
    }

    /** tel:, mailto:, intent:, market:… li apre l'app giusta. Se c'è un indirizzo di riserva, la pagina va lì. */
    private fun openExternal(url: String, view: WebView) {
        try {
            if (url.startsWith("intent:")) {
                val intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
                intent.addCategory(Intent.CATEGORY_BROWSABLE)
                intent.component = null
                intent.selector = null
                try {
                    activity.startActivity(intent)
                } catch (_: ActivityNotFoundException) {
                    intent.getStringExtra("browser_fallback_url")?.takeIf(UrlRules::isWebUrl)?.let(view::loadUrl)
                }
                return
            }
            if (url.startsWith("javascript:") || url.startsWith("file:") || url.startsWith("content:")) return
            activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE))
        } catch (_: Exception) {
            Toast.makeText(activity, "Nessuna app può aprire questo link", Toast.LENGTH_SHORT).show()
        }
    }
}

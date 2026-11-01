package it.varco.browser

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Beta 0.30: i mattoncini dell'interfaccia, con lo stesso stile del PC:
 * vetro scuro (--v-bar-alpha), bordi sottili (--v-line), angoli tondi, colore d'accento.
 */
class Ui(val ctx: Context) {
    var theme: VarcoTheme = Themes.ALL.first()

    val text = 0xFFE9E8F5.toInt()
    val muted = 0xFF8F8DAA.toInt()
    val line get() = Themes.alpha(0xFFFFFFFF.toInt(), .09f)
    val lineStrong get() = Themes.alpha(Themes.mix(theme.accent, 0xFFFFFFFF.toInt(), .3f), .35f)
    val accent get() = theme.accent
    val bg get() = theme.bg
    /** Il colore delle barre: lo sfondo del tema schiarito di poco, quasi opaco. */
    val glass get() = Themes.alpha(Themes.mix(theme.bg, 0xFFFFFFFF.toInt(), .05f), .86f)
    val glassSoft get() = Themes.alpha(0xFFFFFFFF.toInt(), .06f)

    fun dp(v: Float): Int = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, ctx.resources.displayMetrics).toInt()
    fun dp(v: Int) = dp(v.toFloat())

    fun round(fill: Int, radius: Float, stroke: Int = 0, strokeWidth: Float = 1f) = GradientDrawable().apply {
        setColor(fill)
        cornerRadius = dp(radius).toFloat()
        if (stroke != 0) setStroke(dp(strokeWidth), stroke)
    }

    /** Sfondo con l'onda al tocco, come i pulsanti del PC quando ci passi sopra. */
    fun pressable(fill: Int, radius: Float, stroke: Int = 0): RippleDrawable =
        RippleDrawable(ColorStateList.valueOf(Themes.alpha(theme.accent, .28f)), round(fill, radius, stroke), round(0xFFFFFFFF.toInt(), radius))

    fun label(s: String = "", size: Float = 14f, color: Int = text, bold: Boolean = false) = TextView(ctx).apply {
        this.text = s
        setTextColor(color)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
        typeface = if (bold) Typeface.create("sans-serif-medium", Typeface.NORMAL) else Typeface.create("sans-serif", Typeface.NORMAL)
        includeFontPadding = false
    }

    fun icon(res: Int, size: Int = 22, tint: Int = text) = ImageView(ctx).apply {
        setImageResource(res)
        imageTintList = ColorStateList.valueOf(tint)
        layoutParams = LinearLayout.LayoutParams(dp(size), dp(size))
    }

    /** Pulsante rotondo con un'icona, 44 dp: la misura comoda per un dito. */
    fun iconButton(res: Int, desc: String, onClick: (View) -> Unit) = FrameLayout(ctx).apply {
        contentDescription = desc
        background = pressable(0, 22f)
        addView(icon(res).apply { layoutParams = FrameLayout.LayoutParams(dp(22), dp(22), Gravity.CENTER) })
        layoutParams = LinearLayout.LayoutParams(dp(44), dp(44))
        isClickable = true
        setOnClickListener(onClick)
    }

    fun row(vararg views: View, gravity: Int = Gravity.CENTER_VERTICAL) = LinearLayout(ctx).apply {
        orientation = LinearLayout.HORIZONTAL
        this.gravity = gravity
        views.forEach { addView(it) }
    }

    fun column(vararg views: View) = LinearLayout(ctx).apply {
        orientation = LinearLayout.VERTICAL
        views.forEach { addView(it) }
    }

    fun lp(w: Int, h: Int, weight: Float = 0f) = LinearLayout.LayoutParams(w, h, weight)
    val MATCH = ViewGroup.LayoutParams.MATCH_PARENT
    val WRAP = ViewGroup.LayoutParams.WRAP_CONTENT

    /** Riga di un menu: icona (facoltativa), testo e a destra un valore o un segno di spunta. */
    fun menuRow(res: Int?, title: String, value: String? = null, onClick: () -> Unit) = row().apply {
        background = pressable(0, 12f)
        setPadding(dp(14), 0, dp(14), 0)
        minimumHeight = dp(50)
        if (res != null) addView(icon(res, 20, muted).apply { (layoutParams as LinearLayout.LayoutParams).marginEnd = dp(14) })
        addView(label(title, 15f), lp(0, WRAP, 1f))
        if (value != null) addView(label(value, 13f, muted))
        isClickable = true
        setOnClickListener { onClick() }
    }

    fun chip(title: String, dot: Int?, selected: Boolean, onClick: () -> Unit) = row().apply {
        background = pressable(if (selected) Themes.alpha(theme.accent, .22f) else glassSoft, 18f, if (selected) lineStrong else line)
        setPadding(dp(12), 0, dp(14), 0)
        minimumHeight = dp(36)
        if (dot != null) addView(View(ctx).apply {
            background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(dot) }
            layoutParams = LinearLayout.LayoutParams(dp(9), dp(9)).apply { marginEnd = dp(8) }
        })
        addView(label(title, 14f, if (selected) text else muted, bold = selected))
        isClickable = true
        setOnClickListener { onClick() }
    }

    /** Pulsante principale (pieno, col colore d'accento) o secondario (vetro). */
    fun button(title: String, primary: Boolean = false, onClick: () -> Unit) = label(title, 15f, if (primary) 0xFFFFFFFF.toInt() else text, bold = true).apply {
        gravity = Gravity.CENTER
        background = pressable(if (primary) theme.accent else glassSoft, 14f, if (primary) 0 else line)
        setPadding(dp(18), 0, dp(18), 0)
        minHeight = dp(46)
        isClickable = true
        setOnClickListener { onClick() }
    }
}

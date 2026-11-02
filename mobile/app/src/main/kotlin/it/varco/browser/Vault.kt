package it.varco.browser

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.os.CancellationSignal
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Beta 0.33: le password del telefono.
 *
 * - Stanno in passwords.bin, cifrate con AES-256-GCM. La chiave è nel Keystore di Android: non esce mai dal telefono
 *   (sui telefoni che lo hanno, sta nel chip di sicurezza) e nemmeno VARCO la può leggere, la può solo usare.
 * - Per vederle o compilarle serve lo sblocco del telefono (impronta, volto o PIN): poi restano sbloccate 5 minuti.
 *   La sincronizzazione col PC invece funziona anche da bloccate: scrive nel file cifrato senza mostrarle.
 * - never = i siti per cui hai detto "Mai": restano solo sul telefono.
 */
class Vault(private val ctx: Context) {
    private val file = File(ctx.filesDir, "passwords.bin")
    var entries: List<PwEntry> = emptyList()
        private set
    val never = mutableSetOf<String>()
    private var unlockedUntil = 0L

    /** Le password vive (senza lapidi). */
    val live: List<PwEntry> get() = entries.filter { !it.del }

    fun accountsFor(origin: String) = live.filter { it.origin == origin }.sortedByDescending { maxOf(it.used, it.at) }

    fun load() {
        entries = emptyList()
        never.clear()
        try {
            if (!file.exists()) return
            val bytes = file.readBytes()
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
            val o = JSONObject(String(cipher.doFinal(bytes, 12, bytes.size - 12), Charsets.UTF_8))
            entries = SyncRules.passwordsFromJson(o.optJSONArray("entries")).let { list ->
                val used = o.optJSONObject("used")
                list.map { it.copy(used = used?.optLong(it.origin + "\n" + it.username) ?: 0) }
            }
            o.optJSONArray("never")?.let { a -> for (i in 0 until a.length()) never += a.optString(i) }
        } catch (_: Exception) {
            // Chiave cambiata (es. app reinstallata): le password tornano dal PC alla prossima sincronizzazione.
        }
    }

    fun save() {
        val used = JSONObject().apply { entries.filter { it.used > 0 }.forEach { put(it.origin + "\n" + it.username, it.used) } }
        val plain = JSONObject().put("entries", SyncRules.passwordsToJson(entries)).put("never", JSONArray(never.toList())).put("used", used)
            .toString().toByteArray(Charsets.UTF_8)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val out = cipher.iv + cipher.doFinal(plain)
        val tmp = File(file.parentFile, "passwords.bin.tmp")
        tmp.writeBytes(out)
        if (!tmp.renameTo(file)) { file.delete(); tmp.renameTo(file) }
    }

    fun put(origin: String, username: String, password: String, now: Long = System.currentTimeMillis()) {
        entries = SyncRules.mergePasswords(entries, listOf(PwEntry(origin, username, password, now)), now)
        save()
    }

    fun remove(origin: String, username: String, now: Long = System.currentTimeMillis()) {
        entries = SyncRules.mergePasswords(entries, listOf(PwEntry(origin, username, "", now, del = true)), now)
        save()
    }

    fun markUsed(e: PwEntry) {
        entries = entries.map { if (it.origin == e.origin && it.username == e.username) it.copy(used = System.currentTimeMillis()) else it }
        save()
    }

    /** Fonde le password arrivate dal PC (l'elenco completo, con le lapidi). */
    fun merge(incoming: List<PwEntry>) {
        val used = entries.associate { (it.origin + "\n" + it.username) to it.used }
        entries = SyncRules.mergePasswords(entries, incoming).map { it.copy(used = used[it.origin + "\n" + it.username] ?: 0) }
        save()
    }

    // ------------------------------------------------------------------ sblocco

    val unlocked: Boolean get() = System.currentTimeMillis() < unlockedUntil

    /** Chiede impronta, volto o PIN, poi chiama ok. Senza blocco schermo impostato, avvisa e non mostra niente. */
    fun unlock(activity: Activity, reason: String, fail: (String) -> Unit, ok: () -> Unit) {
        if (unlocked) return ok()
        val keyguard = activity.getSystemService(KeyguardManager::class.java)
        if (keyguard?.isDeviceSecure != true) return fail("Per usare le password imposta un blocco schermo (PIN, sequenza o impronta) nelle Impostazioni di Android")
        val prompt = BiometricPrompt.Builder(activity)
            .setTitle("Password di VARCO")
            .setDescription(reason)
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL)
            .build()
        prompt.authenticate(CancellationSignal(), activity.mainExecutor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                unlockedUntil = System.currentTimeMillis() + 5 * 60 * 1000
                ok()
            }
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                if (errorCode != BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED && errorCode != BiometricPrompt.BIOMETRIC_ERROR_CANCELED) fail(errString.toString())
            }
        })
    }

    fun lock() { unlockedUntil = 0 }

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build())
        return gen.generateKey()
    }

    private companion object { const val ALIAS = "varco-passwords" }
}

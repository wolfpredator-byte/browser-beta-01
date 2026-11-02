plugins {
    id("com.android.application")
}

android {
    namespace = "it.varco.browser"
    compileSdk = 36

    defaultConfig {
        applicationId = "it.varco.browser"
        minSdk = 30
        targetSdk = 36
        versionCode = 33000
        versionName = "0.33.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // Beta 0.31: lettore di QR di Google Play Services (nessun permesso della fotocamera per l'app).
    implementation("com.google.android.gms:play-services-code-scanner:16.1.0")
    testImplementation("junit:junit:4.13.2")
    // org.json vero nei test (in android.jar c'è solo uno stub).
    testImplementation("org.json:json:20240303")
}

/**
 * Sfondi e loghi vengono dagli asset del VARCO per PC (../../assets): li copio nell'APK a ogni build,
 * così i due browser restano uguali senza file doppi nel repository.
 */
abstract class CopyVarcoAssets : DefaultTask() {
    @get:InputDirectory abstract val source: DirectoryProperty
    @get:OutputDirectory abstract val output: DirectoryProperty

    @TaskAction
    fun run() {
        val src = source.get().asFile
        val out = output.get().asFile
        out.deleteRecursively()
        File(out, "varco").mkdirs()
        File(src, "home-bg.jpg").copyTo(File(out, "varco/wallpaper.jpg"))
        File(src, "app-icon-256.png").copyTo(File(out, "varco/logo.png"))
        File(src, "presets").listFiles()?.filter { it.isDirectory }?.forEach { dir ->
            for (name in listOf("wallpaper.jpg", "logo.png")) {
                val f = File(dir, name)
                if (f.exists()) f.copyTo(File(out, "${dir.name}/$name"))
            }
        }
    }
}

val copyVarcoAssets = tasks.register<CopyVarcoAssets>("copyVarcoAssets") {
    source.set(rootProject.layout.projectDirectory.dir("../assets"))
}

androidComponents {
    onVariants { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(copyVarcoAssets, CopyVarcoAssets::output)
    }
}

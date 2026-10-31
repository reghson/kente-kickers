plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.reghson.kentekickers"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.reghson.kentekickers"
        minSdk = 24
        targetSdk = 36
        versionCode = 2
        versionName = "1.0.1"
    }

    signingConfigs {
        create("debugConfig") {
            storeFile = file("${rootDir}/debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("debugConfig")
        }
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debugConfig")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    buildFeatures {
        compose = true
    }

    androidResources {
        noCompress += listOf("b64", "glb", "json", "js", "css", "html", "svg", "png", "webmanifest")
    }
}

val syncWwwAssets by tasks.registering {
    description = "Copies Kente Kickers web assets into app/src/main/assets/www"
    doLast {
        val outDir = file("src/main/assets/www")
        outDir.deleteRecursively()
        outDir.mkdirs()

        val rootFiles = listOf("index.html", "style.css", "manifest.webmanifest", "privacy.html")
        for (f in rootFiles) {
            val src = rootProject.file(f)
            if (src.exists()) {
                src.copyTo(File(outDir, f), overwrite = true)
            }
        }

        val rootDirs = listOf("js", "icons", "assets")
        for (d in rootDirs) {
            val srcDir = rootProject.file(d)
            if (srcDir.exists()) {
                srcDir.copyRecursively(File(outDir, d), overwrite = true)
            }
        }

        File(outDir, "js/build-env.js").writeText(
            "window.KK = window.KK || {}; KK.BUILD = { debug: false, target: 'android' };\n"
        )
    }
}

tasks.named("preBuild") {
    dependsOn(syncWwwAssets)
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.webkit)
}

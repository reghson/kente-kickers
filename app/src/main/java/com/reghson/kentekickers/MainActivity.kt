package com.reghson.kentekickers

import android.annotation.SuppressLint
import android.content.pm.ActivityInfo
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        configureSystemBars()

        setContent {
            KenteKickersScreen(
                onRequestLandscape = {
                    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                },
                onRequestUnspecified = {
                    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                }
            )
        }
    }

    private fun configureSystemBars() {
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.navigationBars())
    }
}

private class KenteBridge(
    private val onLandscape: () -> Unit,
    private val onUnspecified: () -> Unit
) {
    @JavascriptInterface
    fun lockLandscape() {
        onLandscape()
    }

    @JavascriptInterface
    fun unlockOrientation() {
        onUnspecified()
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun KenteKickersScreen(
    onRequestLandscape: () -> Unit,
    onRequestUnspecified: () -> Unit
) {
    var webViewRef by remember { mutableStateOf<WebView?>(null) }

    BackHandler(enabled = true) {
        val wv = webViewRef
        if (wv != null && wv.canGoBack()) {
            wv.goBack()
        } else {
            wv?.evaluateJavascript(
                "(function(){ const m = document.getElementById('modal'); if (m && !m.classList.contains('hidden')) { m.classList.add('hidden'); return true; } const p = document.getElementById('m-pause'); if (p && !document.getElementById('match').classList.contains('hidden')) { p.click(); return true; } return false; })()",
                null
            )
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(androidx.compose.ui.graphics.Color(0xFF081633))
            .systemBarsPadding()
            .testTag("kente_kickers_container")
    ) {
        AndroidView(
            modifier = Modifier
                .fillMaxSize()
                .testTag("kente_kickers_webview"),
            factory = { context ->
                val assetLoader = WebViewAssetLoader.Builder()
                    .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
                    .build()

                WebView(context).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    setBackgroundColor(Color.parseColor("#081633"))
                    setLayerType(View.LAYER_TYPE_HARDWARE, null)

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        mediaPlaybackRequiresUserGesture = false
                        allowFileAccess = false
                        allowContentAccess = false
                        cacheMode = WebSettings.LOAD_DEFAULT
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        setSupportZoom(false)
                        builtInZoomControls = false
                        displayZoomControls = false
                    }

                    addJavascriptInterface(
                        KenteBridge(
                            onLandscape = { post { onRequestLandscape() } },
                            onUnspecified = { post { onRequestUnspecified() } }
                        ),
                        "KKAndroid"
                    )

                    webChromeClient = WebChromeClient()
                    webViewClient = object : WebViewClient() {
                        override fun shouldInterceptRequest(
                            view: WebView,
                            request: WebResourceRequest
                        ): WebResourceResponse? {
                            return assetLoader.shouldInterceptRequest(request.url)
                        }

                        override fun onPageFinished(view: WebView, url: String?) {
                            super.onPageFinished(view, url)
                            view.evaluateJavascript(
                                """
                                (function() {
                                  if (window.KKAndroid && screen.orientation) {
                                    screen.orientation.lock = function(mode) {
                                      if (mode && mode.indexOf('landscape') !== -1) {
                                        window.KKAndroid.lockLandscape();
                                      }
                                      return Promise.resolve();
                                    };
                                    screen.orientation.unlock = function() {
                                      window.KKAndroid.unlockOrientation();
                                    };
                                  }
                                })();
                                """.trimIndent(),
                                null
                            )
                        }
                    }

                    loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
                    webViewRef = this
                }
            },
            update = { webView ->
                webViewRef = webView
            }
        )
    }

    DisposableEffect(Unit) {
        onDispose {
            webViewRef?.destroy()
            webViewRef = null
        }
    }
}

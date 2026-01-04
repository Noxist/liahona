package com.liahona.app

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import com.liahona.app.databinding.ActivityMainBinding
import com.liahona.app.BuildConfig

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        configureWebView(binding.webview)
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        onBackPressedDispatcher.addCallback(this) {
            if (binding.webview.canGoBack()) {
                binding.webview.goBack()
            } else {
                finish()
            }
        }

        binding.webview.loadUrl("file:///android_asset/www/index.html")
    }

    private fun configureWebView(webView: WebView) {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            allowFileAccessFromFileURLs = true
            mediaPlaybackRequiresUserGesture = true
            builtInZoomControls = false
            displayZoomControls = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        webView.isVerticalScrollBarEnabled = false
        webView.isHorizontalScrollBarEnabled = false
        webView.isHapticFeedbackEnabled = true
        webView.isLongClickable = false
        webView.setOnLongClickListener { true }
        webView.setOnCreateContextMenuListener { _, _, _ -> }
        webView.setBackgroundColor(Color.TRANSPARENT)
        webView.overScrollMode = View.OVER_SCROLL_NEVER

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url ?: return false
                if (url.scheme == "file") return false

                val intent = Intent(Intent.ACTION_VIEW, url)
                return if (intent.resolveActivity(packageManager) != null) {
                    startActivity(intent)
                    true
                } else {
                    true
                }
            }
        }
    }
}

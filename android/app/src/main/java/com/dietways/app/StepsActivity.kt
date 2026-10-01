package com.dietways.app

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings

/**
 * Called from the page via intent://steps?action=enable|refresh|settings&return=/path#hash.
 * Handles the step permission, then reopens the page with fresh data.
 */
class StepsActivity : Activity() {
    private var returnPath = "/"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val data = intent.data
        returnPath = data?.getQueryParameter("return")?.takeIf { it.startsWith("/") && !it.startsWith("//") } ?: "/"
        when (data?.getQueryParameter("action")) {
            "enable" -> if (Build.VERSION.SDK_INT >= 29 && StepStore.status(this) == StepStore.Status.Denied) {
                requestPermissions(arrayOf(Manifest.permission.ACTIVITY_RECOGNITION), 1)
            } else {
                reopen()
            }
            "settings" -> {
                startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", packageName, null)))
                finish()
            }
            else -> reopen()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        reopen()
    }

    private fun reopen() {
        StepStore.schedule(this)
        val url = Uri.parse(getString(R.string.siteUrl) + returnPath)
        startActivity(Intent(this, DietWaysLauncher::class.java).setData(url).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        finish()
    }
}

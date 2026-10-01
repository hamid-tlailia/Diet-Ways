package com.dietways.app

import android.net.Uri
import android.os.Bundle
import com.google.androidbrowserhelper.trusted.LauncherActivity

/**
 * Opens the site and hands it today's step data through the launch URL
 * (dw_app, dw_steps, dw_hist, dw_perm). The page reads and removes these params.
 */
class DietWaysLauncher : LauncherActivity() {
    override fun shouldLaunchImmediately() = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (isFinishing) return
        // Read the sensor off the main thread while the splash screen shows, then open the page.
        Thread {
            StepStore.sample(applicationContext, 1_200)
            StepStore.schedule(applicationContext)
            runOnUiThread { if (!isFinishing) launchTwa() }
        }.start()
    }

    override fun getLaunchingUrl(): Uri {
        val status = StepStore.status(this)
        return super.getLaunchingUrl().buildUpon()
            .appendQueryParameter("dw_app", "1")
            .appendQueryParameter("dw_perm", status.name.lowercase())
            .appendQueryParameter("dw_today", StepStore.dayKey(java.util.Date()))
            .appendQueryParameter("dw_hist", if (status == StepStore.Status.Granted) StepStore.history(this) else "")
            .appendQueryParameter("dw_at", System.currentTimeMillis().toString())
            .build()
    }
}

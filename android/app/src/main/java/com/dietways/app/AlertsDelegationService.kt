package com.dietways.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import com.google.androidbrowserhelper.trusted.DelegationService

/**
 * Shows the site's push notifications as Diet Ways notifications that pop up from the top
 * (heads-up) like a messaging app. The stock service posts them on a default-importance
 * channel, which only shows them in the shade.
 */
class AlertsDelegationService : DelegationService() {
    override fun onNotifyNotificationWithChannel(
        platformTag: String,
        platformId: Int,
        notification: Notification,
        channelName: String,
    ): Boolean {
        if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) return false
        val manager = getSystemService(NotificationManager::class.java)
        val builder = Notification.Builder.recoverBuilder(this, notification)
        if (Build.VERSION.SDK_INT >= 26) {
            if (manager.getNotificationChannel(CHANNEL) == null) {
                manager.createNotificationChannel(
                    NotificationChannel(CHANNEL, getString(R.string.notif_channel), NotificationManager.IMPORTANCE_HIGH).apply {
                        enableVibration(true)
                        setShowBadge(true)
                    },
                )
            }
            builder.setChannelId(CHANNEL)
        } else {
            @Suppress("DEPRECATION")
            builder.setPriority(Notification.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_ALL)
        }
        manager.notify(platformTag, platformId, builder.build())
        return true
    }

    private companion object {
        const val CHANNEL = "dietways_alerts"
    }
}

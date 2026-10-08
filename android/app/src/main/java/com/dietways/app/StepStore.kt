package com.dietways.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Daily step totals from the phone's built-in step counter (no Google Fit / Health Connect).
 *
 * The sensor reports steps since the last reboot, so we sample it periodically and add the
 * difference between samples to the day it was taken on. Counting starts when it's enabled.
 */
object StepStore {
    private const val PREFS = "steps"
    private const val KEY_LAST = "lastRaw"
    private const val KEY_DAYS = "days"
    private const val KEEP_DAYS = 14

    enum class Status { Granted, Denied, Unsupported }

    fun status(ctx: Context): Status = when {
        sensor(ctx) == null -> Status.Unsupported
        Build.VERSION.SDK_INT >= 29 &&
            ctx.checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED -> Status.Denied
        else -> Status.Granted
    }

    /** Reads the sensor once (blocking, up to [timeoutMs]) and records the result. */
    fun sample(ctx: Context, timeoutMs: Long) {
        if (status(ctx) != Status.Granted) return
        val sm = ctx.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val sensor = sensor(ctx) ?: return
        val thread = HandlerThread("steps").apply { start() }
        val latch = CountDownLatch(1)
        var value = -1f
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                value = event.values[0]
                latch.countDown()
            }
            override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) = Unit
        }
        try {
            sm.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL, Handler(thread.looper))
            latch.await(timeoutMs, TimeUnit.MILLISECONDS)
        } finally {
            sm.unregisterListener(listener)
            thread.quitSafely()
        }
        if (value >= 0) record(ctx, value)
    }

    @Synchronized
    private fun record(ctx: Context, raw: Float) {
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val days = JSONObject(prefs.getString(KEY_DAYS, "{}")!!)
        val today = dayKey(Date())
        val last = prefs.getFloat(KEY_LAST, -1f)
        // A smaller reading means the phone rebooted and the counter restarted from zero.
        val delta = if (last < 0) 0f else if (raw < last) raw else raw - last
        days.put(today, days.optInt(today) + delta.toInt())
        val keep = days.keys().asSequence().sorted().toList().takeLast(KEEP_DAYS).toSet()
        days.keys().asSequence().toList().filter { it !in keep }.forEach { days.remove(it) }
        prefs.edit().putFloat(KEY_LAST, raw).putString(KEY_DAYS, days.toString()).apply()
    }

    /** "2026-10-01:5321,2026-10-02:812" for the last 7 days. */
    fun history(ctx: Context): String {
        val days = JSONObject(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_DAYS, "{}")!!)
        return days.keys().asSequence().sorted().toList().takeLast(7).joinToString(",") { "$it:${days.optInt(it)}" }
    }

    fun schedule(ctx: Context) {
        if (status(ctx) != Status.Granted) return
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
            "steps",
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<StepWorker>(15, TimeUnit.MINUTES).build(),
        )
    }

    fun dayKey(d: Date): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(d)

    private fun sensor(ctx: Context): Sensor? =
        (ctx.getSystemService(Context.SENSOR_SERVICE) as SensorManager).getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
}

class StepWorker(ctx: Context, params: WorkerParameters) : Worker(ctx, params) {
    override fun doWork(): Result {
        StepStore.sample(applicationContext, 5_000)
        return Result.success()
    }
}

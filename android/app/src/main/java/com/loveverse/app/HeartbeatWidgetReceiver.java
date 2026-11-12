package com.loveverse.app;

import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.widget.RemoteViews;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class HeartbeatWidgetReceiver extends BroadcastReceiver {

    public static final String ACTION_SEND_HEARTBEAT = "com.loveverse.app.ACTION_SEND_HEARTBEAT";
    private static final String PREFS_NAME = "LoveVerseWidgetPrefs";

    @Override
    public void onReceive(final Context context, Intent intent) {
        if (intent == null || !ACTION_SEND_HEARTBEAT.equals(intent.getAction())) {
            return;
        }

        // 1. Play haptic heartbeat vibration
        try {
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = { 0, 70, 80, 120 };
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            }
        } catch (Exception ignored) {}

        // 2. Increment heartbeat count in SharedPreferences
        final SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int currentCount = prefs.getInt("heartbeat_count", 0) + 1;
        prefs.edit().putInt("heartbeat_count", currentCount).apply();

        // 3. Update the widget UI immediately
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, LoveVerseWidgetProvider.class);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_love_verse);
        views.setTextViewText(R.id.widget_heartbeat_status, "💓 " + currentCount + " Heartbeats sent today!");
        appWidgetManager.updateAppWidget(thisWidget, views);

        // 4. Send background HTTP request to backend
        final String userId = prefs.getString("user_id", "");
        if (!userId.isEmpty()) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        URL url = new URL("https://love-verse-backend.onrender.com/api/auth/widget/heartbeat");
                        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("POST");
                        conn.setRequestProperty("Content-Type", "application/json");
                        conn.setDoOutput(true);
                        conn.setConnectTimeout(6000);
                        conn.setReadTimeout(6000);

                        String jsonInputString = "{\"userId\": \"" + userId + "\"}";
                        try (OutputStream os = conn.getOutputStream()) {
                            byte[] input = jsonInputString.getBytes("utf-8");
                            os.write(input, 0, input.length);
                        }
                        conn.getResponseCode();
                        conn.disconnect();
                    } catch (Exception ignored) {}
                }
            }).start();
        }
    }
}

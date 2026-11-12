package com.loveverse.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.widget.RemoteViews;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class LoveVerseWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "LoveVerseWidgetPrefs";
    private static final String PHOTO_CACHE_FILE = "widget_partner_photo.jpg";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        String partnerName = prefs.getString("partner_name", "Partner ❤️");
        String daysTogether = prefs.getString("days_together", "412 Days Together ❤️");
        String mood = prefs.getString("mood", "🥰 Romantic");
        String photoTime = prefs.getString("photo_time", "Just now");
        int heartbeatCount = prefs.getInt("heartbeat_count", 0);
        int battery = prefs.getInt("battery_level", -1);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_love_verse);

        // 1. Text Data
        views.setTextViewText(R.id.widget_partner_name, partnerName);
        views.setTextViewText(R.id.widget_days_together, daysTogether);
        views.setTextViewText(R.id.widget_partner_mood, mood);
        if (battery > 0 && battery <= 100) {
            views.setTextViewText(R.id.widget_battery, " • 🔋 " + battery + "%");
        } else {
            views.setTextViewText(R.id.widget_battery, "");
        }
        views.setTextViewText(R.id.widget_photo_time, photoTime);

        if (heartbeatCount > 0) {
            views.setTextViewText(R.id.widget_heartbeat_status, "💓 " + heartbeatCount + " Heartbeats sent today");
        } else {
            views.setTextViewText(R.id.widget_heartbeat_status, "💓 Tap to send love");
        }

        // 2. Load cached partner photo
        try {
            File photoFile = new File(context.getFilesDir(), PHOTO_CACHE_FILE);
            if (photoFile.exists()) {
                Bitmap bitmap = BitmapFactory.decodeFile(photoFile.getAbsolutePath());
                if (bitmap != null) {
                    views.setImageViewBitmap(R.id.widget_partner_photo, bitmap);
                }
            }
        } catch (Exception ignored) {}

        // 3. PendingIntent for Heartbeat 1-Tap Button
        Intent heartbeatIntent = new Intent(context, HeartbeatWidgetReceiver.class);
        heartbeatIntent.setAction(HeartbeatWidgetReceiver.ACTION_SEND_HEARTBEAT);
        PendingIntent heartbeatPendingIntent = PendingIntent.getBroadcast(
            context,
            2001,
            heartbeatIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );
        views.setOnClickPendingIntent(R.id.btn_send_heartbeat, heartbeatPendingIntent);

        // 4. PendingIntent for Camera Snap Button
        Intent cameraIntent = new Intent(context, MainActivity.class);
        cameraIntent.setAction("OPEN_WIDGET_CAMERA");
        cameraIntent.putExtra("action", "open_widget_camera");
        cameraIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent cameraPendingIntent = PendingIntent.getActivity(
            context,
            2002,
            cameraIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );
        views.setOnClickPendingIntent(R.id.btn_widget_camera, cameraPendingIntent);

        // 5. PendingIntent to open app when tapping widget card
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
            context,
            2003,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );
        views.setOnClickPendingIntent(R.id.widget_root, openAppPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, LoveVerseWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        if (appWidgetIds != null && appWidgetIds.length > 0) {
            for (int id : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, id);
            }
        }
    }

    public static void saveAndRefreshWidget(
        final Context context,
        final String partnerName,
        final String photoUrl,
        final String daysTogether,
        final String mood,
        final String photoTime
    ) {
        saveAndRefreshWidget(context, partnerName, photoUrl, daysTogether, mood, photoTime, -1);
    }

    public static void saveAndRefreshWidget(
        final Context context,
        final String partnerName,
        final String photoUrl,
        final String daysTogether,
        final String mood,
        final String photoTime,
        final int batteryLevel
    ) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        if (partnerName != null) editor.putString("partner_name", partnerName);
        if (daysTogether != null) {
            String formattedDays = daysTogether.contains("Together") ? daysTogether : daysTogether + " Days Together ❤️";
            editor.putString("days_together", formattedDays);
        }
        if (mood != null) editor.putString("mood", mood);
        if (photoTime != null) editor.putString("photo_time", photoTime);
        if (batteryLevel > 0 && batteryLevel <= 100) {
            editor.putInt("battery_level", batteryLevel);
        }
        editor.apply();

        // Download photo in background if URL is provided
        if (photoUrl != null && !photoUrl.isEmpty()) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        URL url = new URL(photoUrl);
                        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                        connection.setDoInput(true);
                        connection.connect();
                        InputStream input = connection.getInputStream();
                        Bitmap bitmap = BitmapFactory.decodeStream(input);

                        if (bitmap != null) {
                            File file = new File(context.getFilesDir(), PHOTO_CACHE_FILE);
                            FileOutputStream out = new FileOutputStream(file);
                            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out);
                            out.flush();
                            out.close();
                        }
                    } catch (Exception ignored) {}
                    // Refresh widgets after photo download
                    updateAllWidgets(context);
                }
            }).start();
        } else {
            updateAllWidgets(context);
        }
    }
}

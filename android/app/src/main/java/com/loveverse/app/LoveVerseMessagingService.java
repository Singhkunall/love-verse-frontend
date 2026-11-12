package com.loveverse.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class LoveVerseMessagingService extends FirebaseMessagingService {

    private static final String CALL_CHANNEL_ID = "love_verse_call_channel";
    private static final int CALL_NOTIFICATION_ID = 777;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        if (data != null) {
            String type = data.get("type");
            if ("call".equalsIgnoreCase(type)) {
                showFullScreenIncomingCall(data);
                return;
            } else if ("widget_update".equalsIgnoreCase(type)) {
                handleWidgetUpdatePush(data);
                return;
            } else if ("heartbeat".equalsIgnoreCase(type)) {
                handleHeartbeatPush(data);
                return;
            }
        }

        // Delegate chat messages to Capacitor's default push notification pipeline
        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
    }

    private void handleWidgetUpdatePush(Map<String, String> data) {
        String photoUrl = data.get("photoUrl");
        String senderName = data.get("senderName");
        String daysTogether = data.get("daysTogether");
        String mood = data.get("mood");

        LoveVerseWidgetProvider.saveAndRefreshWidget(
            this,
            senderName,
            photoUrl,
            daysTogether,
            mood,
            "Just now"
        );

        // Show friendly notification banner that partner updated the home screen
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                Intent openIntent = new Intent(this, MainActivity.class);
                PendingIntent pi = PendingIntent.getActivity(
                    this,
                    991,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
                );

                NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "love_verse_channel")
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle("New Home Screen Photo 📸❤️")
                    .setContentText((senderName != null ? senderName : "Partner") + " sent a new photo to your widget!")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(pi);

                nm.notify(991, builder.build());
            }
        } catch (Exception ignored) {}
    }

    private void handleHeartbeatPush(Map<String, String> data) {
        String senderName = data.get("senderName");
        if (senderName == null || senderName.isEmpty()) senderName = "Partner";

        // Gentle love heartbeat vibration
        try {
            Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = { 0, 90, 100, 140, 100, 90 };
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            }
        } catch (Exception ignored) {}

        // Show heartbeat banner notification
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                Intent openIntent = new Intent(this, MainActivity.class);
                PendingIntent pi = PendingIntent.getActivity(
                    this,
                    992,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
                );

                NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "love_verse_channel")
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle("Heartbeat Received 💓")
                    .setContentText(senderName + " sent you a love heartbeat!")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(pi);

                nm.notify(992, builder.build());
            }
        } catch (Exception ignored) {}

        LoveVerseWidgetProvider.updateAllWidgets(this);
    }

    @Override
    public void onNewToken(@NonNull String s) {
        super.onNewToken(s);
        PushNotificationsPlugin.onNewToken(s);
    }

    private void showFullScreenIncomingCall(Map<String, String> data) {
        String callerName = data.get("senderName");
        if (callerName == null || callerName.trim().isEmpty()) {
            callerName = "Partner ❤️";
        }
        String callType = data.get("callType");
        if (callType == null || callType.trim().isEmpty()) {
            callType = "video";
        }
        String roomId = data.get("roomId");
        if (roomId == null) roomId = "";
        String callerId = data.get("callerId");
        if (callerId == null) callerId = "";

        // 1. Wake up the phone's physical screen using PowerManager WakeLock
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wl = pm.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "LoveVerse:IncomingCallWakeLock"
                );
                wl.acquire(15000); // Hold wake lock for 15s to allow user to answer
            }
        } catch (Exception ignored) {}

        // 2. Intent for full-screen incoming call UI
        Intent callIntent = new Intent(this, IncomingCallActivity.class);
        callIntent.putExtra("callerName", callerName);
        callIntent.putExtra("callType", callType);
        callIntent.putExtra("roomId", roomId);
        callIntent.putExtra("callerId", callerId);
        callIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_SINGLE_TOP |
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        );

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            1001,
            callIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // 3. Intent for Decline Action Button
        Intent declineIntent = new Intent(this, CallActionReceiver.class);
        declineIntent.setAction("DECLINE_CALL");
        declineIntent.putExtra("callerId", callerId);
        declineIntent.putExtra("roomId", roomId);
        PendingIntent declinePendingIntent = PendingIntent.getBroadcast(
            this,
            1002,
            declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // 4. Create high-importance channel with loud ringtone sound and vibration for calls
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && notificationManager != null) {
            NotificationChannel channel = new NotificationChannel(
                CALL_CHANNEL_ID,
                "Love-Verse Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Full-screen alerts for partner voice and video calls");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 800, 500, 800, 500, 800});
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setBypassDnd(true);

            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
            channel.setSound(ringtoneUri, audioAttributes);

            notificationManager.createNotificationChannel(channel);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CALL_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(callerName)
            .setContentText("Incoming " + ("video".equalsIgnoreCase(callType) ? "Video" : "Audio") + " Call • Tap to Answer")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setOngoing(true)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .addAction(R.mipmap.ic_launcher, "Answer", fullScreenPendingIntent)
            .addAction(R.mipmap.ic_launcher, "Decline", declinePendingIntent);

        if (notificationManager != null) {
            notificationManager.notify(CALL_NOTIFICATION_ID, builder.build());
        }

        // 5. Direct launch attempt as well (works on devices with pop-up window permission or when screen is on)
        try {
            startActivity(callIntent);
        } catch (Exception ignored) {}
    }
}

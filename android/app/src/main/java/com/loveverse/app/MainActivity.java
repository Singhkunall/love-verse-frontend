package com.loveverse.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 1234;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Create High-Priority Notification Channel for Firebase Cloud Messaging
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            android.app.NotificationChannel channel = new android.app.NotificationChannel(
                "love_verse_channel",
                "Love-Verse Messages & Calls",
                android.app.NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Instant notifications for partner messages and calls");
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setShowBadge(true);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            android.app.NotificationManager manager = getSystemService(android.app.NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }

        // Request Android OS runtime permissions at app launch
        requestAndroidPermissions();

        WebView webView = this.bridge != null ? this.bridge.getWebView() : null;
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            request.grant(request.getResources());
                        }
                    });
                }
            });
        }

        handleCallIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleCallIntent(intent);
    }

    private void handleCallIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getStringExtra("action");
        if ("answer_call".equals(action)) {
            final String callType = intent.getStringExtra("callType") != null ? intent.getStringExtra("callType") : "video";
            final String roomId = intent.getStringExtra("roomId") != null ? intent.getStringExtra("roomId") : "";
            final String callerId = intent.getStringExtra("callerId") != null ? intent.getStringExtra("callerId") : "";

            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    WebView wv = bridge != null ? bridge.getWebView() : null;
                    if (wv != null) {
                        wv.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('love_verse_navigate', { detail: { tab: 'chat', openCall: true, autoAnswer: true, callType: '" + callType + "', roomId: '" + roomId + "', callerId: '" + callerId + "' } }));",
                            null
                        );
                    }
                }
            }, 1000);
        } else if ("decline_call".equals(action)) {
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    WebView wv = bridge != null ? bridge.getWebView() : null;
                    if (wv != null) {
                        wv.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('love_verse_decline_call'));",
                            null
                        );
                    }
                }
            }, 500);
        }
    }

    private void requestAndroidPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            java.util.List<String> permList = new java.util.ArrayList<>();
            permList.add(Manifest.permission.RECORD_AUDIO);
            permList.add(Manifest.permission.CAMERA);
            permList.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);
            if (Build.VERSION.SDK_INT >= 33) {
                permList.add("android.permission.POST_NOTIFICATIONS");
            }
            String[] permissions = permList.toArray(new String[0]);

            boolean needRequest = false;
            for (String perm : permissions) {
                if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                    needRequest = true;
                    break;
                }
            }

            if (needRequest) {
                ActivityCompat.requestPermissions(this, permissions, PERMISSION_REQUEST_CODE);
            }
        }
    }
}

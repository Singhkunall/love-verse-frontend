package com.loveverse.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageButton;
import android.widget.TextView;

public class IncomingCallActivity extends Activity {

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private Handler autoTimeoutHandler;
    private Runnable timeoutRunnable;

    private String callerName = "Partner ❤️";
    private String callType = "video";
    private String roomId = "";
    private String callerId = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Unlock and turn on screen when phone is locked / display is off
        turnScreenOnAndDismissKeyguard();

        setContentView(R.layout.activity_incoming_call);

        // Extract call parameters from Intent
        Intent intent = getIntent();
        if (intent != null) {
            if (intent.hasExtra("callerName")) {
                callerName = intent.getStringExtra("callerName");
            }
            if (intent.hasExtra("callType")) {
                callType = intent.getStringExtra("callType");
            }
            if (intent.hasExtra("roomId")) {
                roomId = intent.getStringExtra("roomId");
            }
            if (intent.hasExtra("callerId")) {
                callerId = intent.getStringExtra("callerId");
            }
        }

        TextView tvCallerName = findViewById(R.id.tvCallerName);
        TextView tvCallStatus = findViewById(R.id.tvCallStatus);
        ImageButton btnAnswer = findViewById(R.id.btnAnswer);
        ImageButton btnDecline = findViewById(R.id.btnDecline);

        if (tvCallerName != null && callerName != null) {
            tvCallerName.setText(callerName);
        }

        if (tvCallStatus != null) {
            String typeText = "video".equalsIgnoreCase(callType) ? "Video" : "Audio";
            tvCallStatus.setText("Incoming " + typeText + " Call • Ringing...");
        }

        btnAnswer.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                handleAnswerCall();
            }
        });

        btnDecline.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                handleDeclineCall();
            }
        });

        startRingingAndVibration();

        // Auto-dismiss if not answered within 35 seconds (matching socket ring timeout)
        autoTimeoutHandler = new Handler(Looper.getMainLooper());
        timeoutRunnable = new Runnable() {
            @Override
            public void run() {
                stopRingingAndVibration();
                clearNotification();
                finish();
            }
        };
        autoTimeoutHandler.postDelayed(timeoutRunnable, 35000);
    }

    private void turnScreenOnAndDismissKeyguard() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
    }

    private void startRingingAndVibration() {
        try {
            Uri alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(this, alertUri);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build());
            }
            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            // Ringtone fallback
        }

        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = { 0, 800, 600, 800, 600 };
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception e) {
            // Vibration fallback
        }
    }

    private void stopRingingAndVibration() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }

        if (vibrator != null) {
            try {
                vibrator.cancel();
            } catch (Exception ignored) {}
            vibrator = null;
        }
    }

    private void clearNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(777);
        }
    }

    private void handleAnswerCall() {
        stopRingingAndVibration();
        clearNotification();
        if (autoTimeoutHandler != null && timeoutRunnable != null) {
            autoTimeoutHandler.removeCallbacks(timeoutRunnable);
        }

        // Launch MainActivity with explicit call details
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.setAction("ANSWER_INCOMING_CALL");
        mainIntent.putExtra("action", "answer_call");
        mainIntent.putExtra("callType", callType);
        mainIntent.putExtra("roomId", roomId);
        mainIntent.putExtra("callerId", callerId);
        mainIntent.putExtra("callerName", callerName);
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(mainIntent);

        finish();
    }

    private void handleDeclineCall() {
        stopRingingAndVibration();
        clearNotification();
        if (autoTimeoutHandler != null && timeoutRunnable != null) {
            autoTimeoutHandler.removeCallbacks(timeoutRunnable);
        }

        // Notify MainActivity that call was declined
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.setAction("DECLINE_INCOMING_CALL");
        mainIntent.putExtra("action", "decline_call");
        mainIntent.putExtra("roomId", roomId);
        mainIntent.putExtra("callerId", callerId);
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(mainIntent);

        finish();
    }

    @Override
    protected void onDestroy() {
        stopRingingAndVibration();
        if (autoTimeoutHandler != null && timeoutRunnable != null) {
            autoTimeoutHandler.removeCallbacks(timeoutRunnable);
        }
        super.onDestroy();
    }
}

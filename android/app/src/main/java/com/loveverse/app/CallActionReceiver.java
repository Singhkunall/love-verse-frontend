package com.loveverse.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class CallActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();

        if ("DECLINE_CALL".equals(action)) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(777);
            }

            Intent mainIntent = new Intent(context, MainActivity.class);
            mainIntent.setAction("DECLINE_INCOMING_CALL");
            mainIntent.putExtra("action", "decline_call");
            mainIntent.putExtra("roomId", intent.getStringExtra("roomId"));
            mainIntent.putExtra("callerId", intent.getStringExtra("callerId"));
            mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            context.startActivity(mainIntent);
        }
    }
}

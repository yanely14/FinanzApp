package io.ionic.starter;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        this.bridge.getWebView().getSettings().setUseWideViewPort(true);
        this.bridge.getWebView().getSettings().setLoadWithOverviewMode(true);
    }
}

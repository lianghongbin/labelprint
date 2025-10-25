package com.ezap.hybridprinter;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.webkit.JavascriptInterface;
import android.util.Log;
import java.io.*;
import java.net.*;

public class MainActivity extends Activity {
    private WebView webView;
    private static final String TAG = "HybridPrinter";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 创建WebView
        webView = new WebView(this);
        setContentView(webView);
        
        // 配置WebView
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        
        // 添加JavaScript接口
        webView.addJavascriptInterface(new PrinterInterface(), "PrinterInterface");
        
        // 设置WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return false;
            }
        });
        
        // 加载本地HTML文件
        webView.loadUrl("file:///android_asset/index.html");
    }
    
    // 打印机接口类
    public class PrinterInterface {
        @JavascriptInterface
        public void testPrinterConnection(String ip, String port) {
            Log.d(TAG, "开始测试打印机连接: " + ip + ":" + port);
            new Thread(() -> {
                try {
                    Socket socket = new Socket();
                    Log.d(TAG, "正在连接到: " + ip + ":" + port);
                    socket.connect(new InetSocketAddress(ip, Integer.parseInt(port)), 5000);
                    Log.d(TAG, "连接成功，正在关闭连接");
                    socket.close();
                    Log.d(TAG, "连接测试完成");
                    
                    runOnUiThread(() -> {
                        webView.evaluateJavascript("onPrinterTestResult(true, '连接成功')", null);
                    });
                } catch (Exception e) {
                    Log.e(TAG, "打印机连接测试失败: " + e.getMessage(), e);
                    runOnUiThread(() -> {
                        webView.evaluateJavascript("onPrinterTestResult(false, '连接失败: " + e.getMessage() + "')", null);
                    });
                }
            }).start();
        }
        
        @JavascriptInterface
        public void sendToPrinter(String ip, String port, String zplCode) {
            Log.d(TAG, "开始发送打印命令到: " + ip + ":" + port);
            Log.d(TAG, "ZPL代码: " + zplCode);
            new Thread(() -> {
                try {
                    Socket socket = new Socket();
                    Log.d(TAG, "正在连接到打印机: " + ip + ":" + port);
                    socket.connect(new InetSocketAddress(ip, Integer.parseInt(port)), 5000);
                    Log.d(TAG, "连接成功，开始发送ZPL代码");
                    
                    PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
                    out.print(zplCode);
                    out.flush();
                    Log.d(TAG, "ZPL代码发送完成，正在关闭连接");
                    socket.close();
                    Log.d(TAG, "打印命令发送成功");
                    
                    runOnUiThread(() -> {
                        webView.evaluateJavascript("onPrinterSendResult(true, '发送成功')", null);
                    });
                } catch (Exception e) {
                    Log.e(TAG, "发送打印命令失败: " + e.getMessage(), e);
                    runOnUiThread(() -> {
                        webView.evaluateJavascript("onPrinterSendResult(false, '发送失败: " + e.getMessage() + "')", null);
                    });
                }
            }).start();
        }
    }
}
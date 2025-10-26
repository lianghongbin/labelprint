package com.ezap.hybridprinter;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.webkit.JavascriptInterface;
import android.util.Log;
import android.widget.Toast;
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
            public void switchTab(String tabName) {
                Log.d(TAG, "切换到Tab: " + tabName);
                runOnUiThread(() -> {
                    // 使用更简单的JavaScript代码
                    webView.evaluateJavascript(
                        "var printerTab = document.getElementById('printerTab');\n" +
                        "var labelTab = document.getElementById('labelTab');\n" +
                        "var templateTab = document.getElementById('templateTab');\n" +
                        "if (printerTab) printerTab.style.display = 'none';\n" +
                        "if (labelTab) labelTab.style.display = 'none';\n" +
                        "if (templateTab) templateTab.style.display = 'none';\n" +
                        "var targetTab = document.getElementById('" + tabName + "Tab');\n" +
                        "if (targetTab) {\n" +
                        "    targetTab.style.display = 'block';\n" +
                        "    console.log('显示Tab: " + tabName + "');\n" +
                        "} else {\n" +
                        "    console.log('找不到Tab: " + tabName + "');\n" +
                        "}", null);
                });
            }
            
            @JavascriptInterface
            public void showSettingsPage() {
                Log.d(TAG, "显示设置页面");
                runOnUiThread(() -> {
                    webView.evaluateJavascript(
                        "document.getElementById('businessPage').style.display = 'none'; " +
                        "document.getElementById('settingsPage').style.display = 'block'; " +
                        "console.log('页面已切换到设置');", null);
                });
            }
            
            @JavascriptInterface
            public void showBusinessPage() {
                Log.d(TAG, "显示业务页面");
                runOnUiThread(() -> {
                    webView.evaluateJavascript(
                        "document.getElementById('settingsPage').style.display = 'none'; " +
                        "document.getElementById('businessPage').style.display = 'block'; " +
                        "console.log('页面已切换到业务');", null);
                });
            }
            
            @JavascriptInterface
            public void showToast(String message) {
                Log.d(TAG, "显示Toast: " + message);
                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show();
                });
            }
            
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
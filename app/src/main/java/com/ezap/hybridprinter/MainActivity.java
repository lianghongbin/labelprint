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
import java.net.HttpURLConnection;
import java.io.BufferedReader;
import java.io.InputStreamReader;

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
                        "}\n" +
                        "// 更新Tab按钮焦点样式\n" +
                        "var allTabs = document.querySelectorAll('.tab-btn');\n" +
                        "allTabs.forEach(function(btn) { btn.classList.remove('active'); });\n" +
                        "var activeIndex = " + (tabName.equals("printer") ? "0" : tabName.equals("label") ? "1" : "2") + ";\n" +
                        "if (allTabs[activeIndex]) allTabs[activeIndex].classList.add('active');", null);
                });
            }
            
            @JavascriptInterface
            public void showSettingsPage() {
                Log.d(TAG, "显示设置页面");
                runOnUiThread(() -> {
                    webView.evaluateJavascript(
                        "document.getElementById('businessPage').style.display = 'none'; " +
                        "document.getElementById('settingsPage').style.display = 'block'; " +
                        "var btn = document.getElementById('topRightBtn'); " +
                        "if (btn) { btn.textContent = '返回'; btn.title = '返回'; } " +
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
                        "var btn = document.getElementById('topRightBtn'); " +
                        "if (btn) { btn.textContent = '⚙️'; btn.title = '设置'; } " +
                        "console.log('页面已切换到业务');", null);
                });
            }
            
            @JavascriptInterface
            public void togglePage() {
                Log.d(TAG, "切换页面");
                runOnUiThread(() -> {
                    webView.evaluateJavascript(
                        "var btn = document.getElementById('topRightBtn'); " +
                        "var businessPage = document.getElementById('businessPage'); " +
                        "var settingsPage = document.getElementById('settingsPage'); " +
                        "if (btn && businessPage && settingsPage) { " +
                        "    var isSettings = btn.textContent.trim() === '返回'; " +
                        "    if (isSettings) { " +
                        "        settingsPage.style.display = 'none'; " +
                        "        businessPage.style.display = 'block'; " +
                        "        btn.textContent = '⚙️'; " +
                        "        btn.title = '设置'; " +
                        "        console.log('切换到业务页面'); " +
                        "    } else { " +
                        "        businessPage.style.display = 'none'; " +
                        "        settingsPage.style.display = 'block'; " +
                        "        btn.textContent = '返回'; " +
                        "        btn.title = '返回'; " +
                        "        console.log('切换到设置页面'); " +
                        "    } " +
                        "}", null);
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
        
        @JavascriptInterface
        public void fetchLabelGroups() {
            Log.d(TAG, "开始获取标签组数据...");
            new Thread(() -> {
                try {
                    URL url = new URL("https://api.vika.cn/fusion/v1/datasheets/dst0SSLLF0l2Y4dHcw/records?pageSize=100");
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    connection.setRequestMethod("GET");
                    connection.setRequestProperty("Authorization", "Bearer uskI2CEJkCSNZNU2KArVUTU");
                    connection.setRequestProperty("Content-Type", "application/json");
                    connection.setConnectTimeout(15000);
                    connection.setReadTimeout(15000);
                    
                    int responseCode = connection.getResponseCode();
                    Log.d(TAG, "Vika API响应状态: " + responseCode);
                    
                    if (responseCode == 200) {
                        BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                        StringBuilder response = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) {
                            response.append(line);
                        }
                        reader.close();
                        
                        Log.d(TAG, "获取到Vika数据: " + response.length() + " 字符");
                        
                        runOnUiThread(() -> {
                            String jsCode = "onLabelGroupsReceived('" + response.toString().replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r") + "')";
                            webView.evaluateJavascript(jsCode, null);
                        });
                    } else {
                        Log.e(TAG, "Vika API请求失败: " + responseCode);
                        runOnUiThread(() -> {
                            webView.evaluateJavascript("onLabelGroupsError('API请求失败: " + responseCode + "')", null);
                        });
                    }
                } catch (Exception e) {
                    Log.e(TAG, "获取标签组失败: " + e.getMessage(), e);
                    runOnUiThread(() -> {
                        webView.evaluateJavascript("onLabelGroupsError('获取失败: " + e.getMessage() + "')", null);
                    });
                }
            }).start();
        }
    }
}
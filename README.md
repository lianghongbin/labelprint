# EZAP 标签打印项目

这是一个EZAP 标签打印项目，结合了Vue.js前端和Android原生开发，用于控制网络打印机进行标签打印。

## 项目结构

```
pda-hybrid-printer/
├── frontend/                        # 前端项目（Vue.js）
│   ├── pages/                       # 页面目录
│   ├── src/                         # 源代码
│   │   ├── components/              # Vue组件
│   │   ├── utils/                   # 工具函数
│   │   ├── App.vue                  # 主应用组件
│   │   └── main.js                  # 入口文件
│   ├── index.html                   # HTML模板
│   ├── vite.config.js               # Vite配置
│   ├── package.json                 # 依赖配置
│   └── dist/                        # 构建输出（拷贝到app/assets）
│
├── app/                             # 原生Android模块
│   ├── build.gradle                 # 模块构建配置
│   ├── proguard-rules.pro           # 代码混淆规则
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml  # 应用清单
│       │   ├── java/com/ezap/hybridprinter/
│       │   │   ├── MainActivity.java    # 主Activity
│       │   │   ├── JSBridge.java        # JS桥接类
│       │   │   └── PrintHelper.java     # 打印助手类
│       │   ├── res/                     # 资源文件
│       │   │   ├── values/strings.xml
│       │   │   └── xml/network_security_config.xml
│       │   └── assets/
│       │       └── index.html           # 前端构建后拷贝至此
│       └── test/
│
├── build.gradle                     # 顶层gradle配置
├── gradle.properties                # Gradle属性
├── settings.gradle                  # 项目设置
├── build-frontend.sh                # 前端构建脚本
└── README.md                        # 项目说明
```

## 功能特性

- **混合开发架构**：Vue.js前端 + Android原生WebView
- **多页面应用**：业务操作、打印机设置、服务器设置三个独立页面
- **网络打印机支持**：支持ESC/POS协议的网络打印机
- **服务器集成**：支持从服务器获取任务列表和执行打印操作
- **条码扫描打印**：支持旧条码扫描，自动查找新条码并打印
- **实时状态监控**：打印机和服务器连接状态实时显示
- **配置管理**：打印机IP/端口和服务器IP/端口可配置
- **打印历史**：记录打印操作历史，便于追踪
- **错误处理**：完善的错误提示和异常处理机制

## 开发环境要求

- Android Studio 2023.1+
- JDK 8+
- Node.js 16+
- npm 或 yarn

## 快速开始

### 1. 前端开发

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 2. Android开发

```bash
# 构建前端并复制到Android assets
./build-frontend.sh

# 使用Android Studio打开项目
# 或使用命令行构建
./gradlew assembleDebug
```

### 3. 完整构建流程

```bash
# 1. 构建前端
cd frontend
npm install
npm run build

# 2. 复制到Android assets
cp -r dist/* ../app/src/main/assets/

# 3. 构建Android应用
cd ..
./gradlew assembleDebug
```

## 配置说明

### 打印机配置

在 `PrintHelper.java` 中修改打印机IP和端口：

```java
private String printerIp = "192.168.1.100"; // 打印机IP地址
private int printerPort = 9100; // 打印机端口
```

### 网络权限

确保在 `AndroidManifest.xml` 中配置了必要的网络权限：

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## API接口

### JS桥接方法

- `Android.printTest()` - 打印测试页面
- `Android.connectPrinter()` - 连接打印机
- `Android.disconnectPrinter()` - 断开打印机连接
- `Android.printText(text)` - 打印文本
- `Android.printImage(base64Image)` - 打印图片（待实现）

### 回调函数

- `window.onPrinterConnected(model)` - 打印机连接成功
- `window.onPrinterDisconnected()` - 打印机断开连接
- `window.onPrintComplete(timestamp)` - 打印完成
- `window.onPrintError(error)` - 打印错误

## 开发说明

1. **前端开发**：使用Vue.js 3 + Vite进行开发，支持热重载
2. **原生开发**：使用Java开发Android原生功能
3. **通信机制**：通过WebView的addJavascriptInterface实现JS与Java的双向通信
4. **打印协议**：支持ESC/POS标准协议的网络打印机

## 注意事项

- 确保打印机和Android设备在同一网络环境中
- 打印机需要支持ESC/POS协议
- 图片打印功能需要进一步开发
- 建议在真机上测试打印功能

## 许可证

本项目采用MIT许可证。


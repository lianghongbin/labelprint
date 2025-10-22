# API接口定义

## 1. 获取任务列表（标签组列表）

**接口地址：** `GET /api/task-groups`

**请求参数：** 无

**响应格式：**
```json
{
  "success": true,
  "data": [
    {
      "id": "group1",
      "name": "标签组1",
      "description": "第一组标签任务"
    },
    {
      "id": "group2", 
      "name": "标签组2",
      "description": "第二组标签任务"
    }
  ]
}
```

## 2. 获取指定标签组的任务详情

**接口地址：** `GET /api/task-groups/{groupId}/tasks`

**请求参数：**
- `groupId`: 标签组ID

**响应格式：**
```json
{
  "success": true,
  "data": {
    "groupId": "group1",
    "groupName": "标签组1",
    "tasks": [
      {
        "oldBarcode": "OLD001",
        "newBarcode": "AB21K22",
        "count": 10
      },
      {
        "oldBarcode": "OLD002", 
        "newBarcode": "CD33L44",
        "count": 5
      },
      {
        "oldBarcode": "OLD003",
        "newBarcode": "EF55M66", 
        "count": -1
      }
    ]
  }
}
```

## 3. 执行打印操作

**接口地址：** `POST /api/print`

**请求参数：**
```json
{
  "groupId": "group1",
  "oldBarcode": "OLD001"
}
```

**响应格式：**
```json
{
  "success": true,
  "data": {
    "oldBarcode": "OLD001",
    "newBarcode": "AB21K22",
    "remainingCount": 9,
    "printSuccess": true
  }
}
```

**错误响应：**
```json
{
  "success": false,
  "error": {
    "code": "NO_TASK_FOUND",
    "message": "未找到对应的任务"
  }
}
```

## 4. 服务器连接测试

**接口地址：** `GET /api/health`

**响应格式：**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": 1640995200000
  }
}
```

## 错误码定义

- `NO_TASK_FOUND`: 未找到对应的任务
- `TASK_EXHAUSTED`: 任务已用完（count为0）
- `INVALID_BARCODE`: 无效的条码格式
- `PRINTER_ERROR`: 打印机错误
- `NETWORK_ERROR`: 网络连接错误
- `SERVER_ERROR`: 服务器内部错误

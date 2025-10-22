#!/bin/bash

# 构建前端项目并复制到Android assets目录

echo "开始构建前端项目..."

# 进入frontend目录
cd frontend

# 安装依赖（如果node_modules不存在）
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

# 构建前端项目
echo "构建前端项目..."
npm run build

# 复制构建结果到Android assets目录
echo "复制构建结果到Android assets目录..."
# 复制HTML文件
cp dist/index.html ../app/src/main/assets/
# 复制assets目录到Android assets目录
cp -r dist/assets ../app/src/main/assets/

# 确保index.html存在
if [ ! -f "../app/src/main/assets/index.html" ]; then
    echo "复制默认index.html..."
    cp index.html ../app/src/main/assets/
fi

echo "前端构建完成！"


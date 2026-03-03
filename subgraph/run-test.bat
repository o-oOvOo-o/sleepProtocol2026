@echo off
echo 🚀 Sleep Protocol Subgraph 测试脚本
echo.

REM 检查是否安装了 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查是否安装了 axios
echo 📦 检查依赖...
npm list axios >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 安装依赖 axios...
    npm install axios
    if %errorlevel% neq 0 (
        echo ❌ 安装依赖失败
        pause
        exit /b 1
    )
)

echo.
echo 🧪 开始运行测试...
echo.

REM 运行测试脚本
node test-subgraph.js

echo.
echo 测试完成！
pause


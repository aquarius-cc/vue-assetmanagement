@echo off
chcp 65001 >nul
echo 🎯 Django资产管理系统后端快速启动
echo ==================================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

echo ✅ Python环境检查通过
echo.

REM 运行Django启动脚本
python start_django.py

echo.
echo 按任意键退出...
pause >nul
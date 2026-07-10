#!/usr/bin/env python3
"""
Django后端快速启动脚本
运行此脚本将自动创建并启动Django测试服务器
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def run_command(command, cwd=None):
    """执行命令并返回结果"""
    print(f"执行: {command}")
    try:
        result = subprocess.run(command, shell=True, cwd=cwd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"错误: {result.stderr}")
            return False
        print(f"成功: {result.stdout.strip()}")
        return True
    except Exception as e:
        print(f"命令执行失败: {e}")
        return False

def create_django_backend():
    """创建Django后端"""
    
    # 检查是否已存在backend目录
    backend_dir = Path("asset_backend")
    if backend_dir.exists():
        print("Django后端目录已存在，跳过创建步骤...")
        os.chdir(backend_dir)
        return True
    
    print("🚀 开始创建Django后端...")
    
    # 1. 安装依赖
    print("📦 安装Django依赖...")
    if not run_command("pip install django django-cors-headers"):
        return False
    
    # 2. 创建Django项目
    print("🏗️ 创建Django项目...")
    if not run_command("django-admin startproject asset_backend"):
        return False
    
    os.chdir("asset_backend")
    
    # 3. 创建API应用
    print("📱 创建API应用...")
    if not run_command("python manage.py startapp api"):
        return False
    
    # 4. 创建配置文件
    print("⚙️ 配置Django设置...")
    
    settings_content = '''"""
Django settings for asset_backend project.
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-test-key-for-development-only'

DEBUG = True

ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '0.0.0.0']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth', 
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'asset_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'asset_backend.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

LANGUAGE_CODE = 'zh-hans'
TIME_ZONE = 'Asia/Shanghai'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
'''
    
    with open("asset_backend/settings.py", "w", encoding="utf-8") as f:
        f.write(settings_content)
    
    # 5. 创建API视图
    api_views_content = '''from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    """登录接口"""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        # 测试用户认证
        if username == 'admin' and password == '123456':
            return JsonResponse({
                "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
                "user": {
                    "id": 1,
                    "username": username,
                    "real_name": "系统管理员",
                    "email": "admin@test.com", 
                    "job_code": "ADMIN001",
                    "department_id": 1,
                    "department_name": "信息技术部"
                }
            })
        elif username and password:
            return JsonResponse({
                "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user",
                "user": {
                    "id": 2,
                    "username": username,
                    "real_name": f"测试用户({username})",
                    "email": f"{username}@test.com",
                    "job_code": f"USER{str(hash(username))[-3:]}",
                    "department_id": 2,
                    "department_name": "测试部门"
                }
            })
        else:
            return JsonResponse({"error": "用户名和密码不能为空"}, status=400)
            
    except json.JSONDecodeError:
        return JsonResponse({"error": "请求数据格式错误"}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"服务器内部错误: {str(e)}"}, status=500)

@csrf_exempt  
def test_view(request):
    """测试接口"""
    return JsonResponse({
        "message": "Django API连接正常", 
        "status": "success",
        "timestamp": "2024-03-15 10:30:00"
    })

def root_view(request):
    """根路径接口"""
    return JsonResponse({
        "message": "资产管理系统Django后端",
        "version": "1.0.0", 
        "status": "running"
    })
'''
    
    with open("api/views.py", "w", encoding="utf-8") as f:
        f.write(api_views_content)
    
    # 6. 创建URL配置
    api_urls_content = '''from django.urls import path
from . import views

urlpatterns = [
    path('auth/login/', views.login_view, name='login'),
    path('test/', views.test_view, name='test'),
]
'''
    
    with open("api/urls.py", "w", encoding="utf-8") as f:
        f.write(api_urls_content)
    
    # 修改主URL配置
    main_urls_content = '''from django.contrib import admin
from django.urls import path, include
from api.views import root_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('', root_view, name='root'),  # 根路径
]
'''
    
    with open("asset_backend/urls.py", "w", encoding="utf-8") as f:
        f.write(main_urls_content)
    
    # 7. 执行数据库迁移
    print("🗄️ 初始化数据库...")
    if not run_command("python manage.py migrate"):
        return False
    
    print("✅ Django后端创建完成!")
    return True

def start_server():
    """启动Django服务器"""
    print("🌟 启动Django开发服务器...")
    print("📍 服务器地址: http://127.0.0.1:8000")
    print("🔗 登录接口: http://127.0.0.1:8000/api/auth/login/")
    print("🧪 测试接口: http://127.0.0.1:8000/api/test/")
    print("\n🔑 测试账号:")
    print("   用户名: admin, 密码: 123456 (管理员)")
    print("   用户名: test,  密码: 123456 (普通用户)")
    print("   或使用任意用户名密码组合")
    print("\n⚠️  按 Ctrl+C 停止服务器\n")
    
    os.system("python manage.py runserver 127.0.0.1:8000")

if __name__ == "__main__":
    print("🎯 Django资产管理系统后端快速启动")
    print("=" * 50)
    
    if create_django_backend():
        print("\n" + "=" * 50)
        start_server()
    else:
        print("❌ Django后端创建失败，请检查错误信息")
        sys.exit(1)
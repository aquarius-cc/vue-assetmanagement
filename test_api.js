// API 测试脚本
async function testAPI() {
  const testUrl = 'http://127.0.0.1:8000/api/test/';
  const loginUrl = 'http://127.0.0.1:8000/api/auth/login/';

  console.log('🧪 开始测试 Django API...');

  // 测试基础连接
  try {
    const testResponse = await fetch(testUrl);
    const testData = await testResponse.json();
    console.log('✅ 基础连接测试成功:', testData);
  } catch (error) {
    console.error('❌ 基础连接测试失败:', error);
    return;
  }

  // 测试登录接口
  try {
    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: '123456'
      })
    });

    const loginData = await loginResponse.json();
    console.log('✅ 登录接口测试成功:', loginData);

    if (loginData.success) {
      console.log('🎉 登录认证成功!');
      console.log('Token:', loginData.token);
      console.log('用户信息:', loginData.authUser);
    }
  } catch (error) {
    console.error('❌ 登录接口测试失败:', error);
  }
}

// 根据环境选择合适的 fetch 实现
if (typeof window !== 'undefined' && window.fetch) {
  // 浏览器环境
  testAPI(window.fetch.bind(window));
} else {
  // Node.js 环境：动态导入 node-fetch
  import('node-fetch').then(({ default: fetch }) => {
    testAPI(fetch);
  }).catch(err => {
    console.error('请先安装 node-fetch: npm install node-fetch', err);
  });
}

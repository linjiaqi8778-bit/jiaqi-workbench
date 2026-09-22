# 林佳淇的个人工作台

一个面向海外运营的个人工作台，包含首页仪表盘、项目管理、每日计划、每日日报、收集箱、市场洞察、KOL 数据库、数据分析、内容日历、复盘、链接转化、SOP 与素材库等页面。

## 手机浏览

这个仓库可以直接通过 GitHub Pages 发布为静态网页，手机打开后可以查看工作台界面、海外运营仪表盘和各个页面。

## 本地钉钉联动

钉钉数据不会上传到 GitHub。需要在电脑本地运行服务时，工作台才会读取钉钉 DWS 的真实数据：

```powershell
node server.js
```

然后打开：

```text
http://localhost:4173
```

如需指定钉钉 DWS profile，可在运行前设置环境变量：

```powershell
$env:DINGTALK_DWS_PROFILE="你的profile"
node server.js
```

## 文件说明

- `index.html`：页面入口
- `styles.css`：视觉样式
- `app.js`：工作台主要页面和交互
- `dingtalk-ui.js`：钉钉联动前端展示与静态版降级提示
- `server.js`：本地服务，只允许访问前端文件和钉钉接口
- `dingtalk-bridge.js`：本地读取钉钉 DWS 数据，不包含账号密钥

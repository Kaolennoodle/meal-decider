# 🍜 今天吃什么？ (Meal Decider)

一个基于 **Cloudflare Workers + D1 Serverless 数据库 + React 19 + Tailwind CSS** 构建的「今天吃什么」随机美食抽取器。

## ✨ 核心特性

- 🎰 **60fps 硬件加速老虎机动画**：采用纯 GPU `translate3d` 合成层缓动滚轮 + 五彩纸屑礼花动效，视觉精致且在电脑端与移动端均保持丝滑流畅。
- 🌞/🌙 **午餐 & 晚餐智能时段区分**：根据当前时间自动切换午/晚餐模式，自动过滤仅中午或仅晚间营业的餐厅（如夜市小吃街、烧烤等）。
- ⚖️ **自定义权重 + 近期防腻降权算法**：
  - 支持 `1 ~ 10` 级权重滑块调节（太远或不太喜欢的店调低权重，最爱的店调高权重）。
  - 抽中后点击 **「就吃这家！」** 即可记入 D1 历史记录，并在近期自动降低该店再次被抽中的概率（24h 内降权 90%，48h 内降权 60%，72h 内降权 30%）。
- 🔒 **轻量级 PIN 码保护**：公网访问可直接抽奖，增删改选项或调节权重需验证管理 PIN 码（默认 `8888`，支持在 `wrangler.jsonc` 或 Cloudflare 环境变量中修改）。
- 🎨 **Warm Bistro 暖调美食风 UI**：自适应桌面端双栏工作台与移动端单手触控布局，支持浅色/深色模式一键切换。

## 🚀 本地开发与运行

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务器（自动模拟 Cloudflare Worker 与本地 D1 数据库并写入初始种子数据）
npm run dev
```

## ☁️ 部署到 Cloudflare (Workers + D1)

```bash
# 1. 创建线上 D1 数据库（首次部署时执行，将返回的 database_id 填入 wrangler.jsonc）
npx wrangler d1 create meal-decider-db

# 2. 初始化线上 D1 数据库表结构与初始数据（另外 Worker 首次请求也会自动建表和灌入种子数据）
npm run db:init:remote

# 3. 构建并一键部署到 Cloudflare
npm run deploy
```

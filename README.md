# 无尽书证

无尽书证是一个多租户、Waline 兼容的托管评论 SaaS。用户注册后可创建独立评论实例，并把任意现有 Waline 客户端的服务地址替换为 `https://instance.waline.infvar.com/{实例标识}` 继续使用。

## 功能

- Waline 兼容 API：评论列表、发布、回复、点赞、用户信息、文章统计
- 多租户实例：`instance.waline.infvar.com/{实例标识}`，共享数据库逻辑隔离
- GitHub OAuth 登录与账号关联（要求 GitHub 账号注册满一个月）
- Proof-of-Work CAPTCHA（Cap）人机验证
- 自定义控制台：实例、评论、审核、敏感词、通知、统计
- 实例级目标地址白名单与 CORS 防盗链
- 敏感词、IP/用户黑名单、OpenAI 兼容 AI 审核（多密钥轮询）
- 微信 Clawbot 通知，扫码即绑定
- 易支付（EPay）在线购买与升级套餐
- 管理员兑换码：自定义套餐与时长，用户扫码输入兑换码直接开通
- Waline 官方 JSON 数据导入导出
- Twikoo、Artalk、Valine 基础兼容 API（主 API 仍为 Waline）
- 套餐与使用限制
- Docker Compose 一键部署

## 技术栈

- Next.js 16 App Router + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui 风格组件
- Prisma + PostgreSQL
- Redis + ioredis
- jose JWT、capjs-core

## 生产地址

- 官网 / 登录 / 控制台：`https://waline.infvar.com`
- 控制台：`https://waline.infvar.com/dashboard`
- 实例 API：`https://instance.waline.infvar.com/{实例标识}/api`

## 本地开发

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

访问：

- 官网：http://localhost:3033
- 控制台：http://localhost:3033/dashboard
- 实例子路径：http://localhost:3033/tenant/{slug}

## 常用命令

```bash
pnpm build
pnpm lint
pnpm db:deploy
pnpm db:seed
```

## 生产部署

见 [DEPLOYMENT.md](./DEPLOYMENT.md)。GitHub Actions 会自动构建并推送 `ghcr.io/diyanqi/walinex`（同时构建 `linux/amd64` 与 `linux/arm64/v8`），服务器用外部 PostgreSQL 配合 Docker Compose 部署，首次启动自动执行数据库迁移。

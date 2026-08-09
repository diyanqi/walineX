# 无尽书证

无尽书证是一个多租户、Waline 兼容的托管评论 SaaS。用户注册后可创建独立评论实例，并把任意现有 Waline 客户端的服务地址替换为 `https://instance.waline.infvar.com/{实例标识}` 继续使用。

## 功能

- Waline 兼容 API：评论列表、发布、回复、点赞、用户信息、文章统计
- 多租户实例：`instance.waline.infvar.com/{实例标识}`，共享数据库逻辑隔离
- GitHub / Google OAuth 登录与账号关联
- Proof-of-Work CAPTCHA（Cap）人机验证
- 自定义控制台：实例、评论、审核、敏感词、通知、统计
- 实例级目标地址白名单与 CORS 防盗链
- 敏感词、IP/用户黑名单、Akismet、OpenAI 兼容 AI 审核
- BullMQ + Redis 异步邮件通知
- 套餐与使用限制
- Docker Compose 一键部署

## 技术栈

- Next.js 16 App Router + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui 风格组件
- Prisma + PostgreSQL
- Redis + BullMQ + ioredis
- jose JWT、capjs-core、nodemailer

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

- 官网：http://localhost:3000
- 控制台：http://localhost:3000/dashboard
- 实例子路径：http://localhost:3000/tenant/{slug}

## 常用命令

```bash
pnpm build
pnpm lint
pnpm worker:emails
pnpm db:deploy
pnpm db:seed
```

## 生产部署

见 [DEPLOYMENT.md](./DEPLOYMENT.md)。支持 Docker Compose 部署 PostgreSQL、Redis、应用和邮件 worker。

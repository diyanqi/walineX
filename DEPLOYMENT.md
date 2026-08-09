# 无尽书证部署指南

无尽书证是一个多租户 Waline 兼容评论服务。生产环境建议使用 Docker Compose 部署在自托管 VPS 上，由反向代理统一终止 HTTPS。

## 1. 域名规划

部署前准备三个域名入口：

- 官网：`waline.infvar.com`
- 控制台：`dash.waline.infvar.com`
- 评论实例：`*.waline.infvar.com`

请为 `*.waline.infvar.com` 配置 DNS 通配符记录，并让反代将 `{instance}.waline.infvar.com` 转发到应用容器。应用内置的 `src/proxy.ts` 会把实例子域重写到 `/tenant/{instance}`，因此无需为每个实例单独配置。

## 2. 环境变量

复制 `.env.example` 并填写生产值：

```bash
cp .env.example .env
```

密钥可以直接生成：

```bash
openssl rand -hex 32
```

把输出分别填入 `APP_ENCRYPTION_KEY`、`SESSION_SECRET`、`CAP_SECRET`，并为 `POSTGRES_PASSWORD` 设置独立强密码。

至少需要设置：

```dotenv
POSTGRES_PASSWORD=strong-db-password
APP_ENCRYPTION_KEY=<32字节随机密钥>
SESSION_SECRET=<随机会话密钥>
CAP_SECRET=<32字节随机密钥>
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=https://waline.infvar.com
NEXT_PUBLIC_ROOT_DOMAIN=waline.infvar.com
NEXT_PUBLIC_DASH_DOMAIN=dash.waline.infvar.com
NEXT_PUBLIC_INSTANCE_DOMAIN=waline.infvar.com
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=无尽书证 <noreply@waline.infvar.com>
```

可选变量：

- `ADMIN_EMAIL` / `ADMIN_NAME`：seed 时创建平台管理员账号。
- `AKISMET_API_KEY`：Akismet 反垃圾默认密钥。
- `AI_MODERATION_BASE_URL` / `AI_MODERATION_MODEL` / `AI_MODERATION_API_KEY`：AI 审核默认 OpenAI 兼容端点。
- `EMAIL_WORKER_CONCURRENCY`：邮件 worker 并发数，默认 `4`。
- `APP_PORT`：宿主机映射端口，默认 `3000`。

## 3. OAuth 回调地址

GitHub OAuth App 和 Google OAuth Client 都要配置：

- GitHub：`https://waline.infvar.com/api/auth/github/callback`
- Google：`https://waline.infvar.com/api/auth/google/callback`

本服务通过 Cookie 建立登录态，实例子域登录弹窗会回到官网域完成 OAuth 后生成 Waline JWT。

## 4. 启动

首次启动会自动执行数据库迁移和 seed：

```bash
docker compose up -d --build
```

查看状态：

```bash
docker compose ps
docker compose logs -f app worker
```

重新构建并滚动更新：

```bash
docker compose up -d --build --force-recreate
```

数据库迁移也可以手动执行：

```bash
docker compose run --rm migrate
```

## 5. 反向代理与 HTTPS

以 Caddy 为例：

```caddy
waline.infvar.com {
    reverse_proxy 127.0.0.1:3000
}

dash.waline.infvar.com {
    reverse_proxy 127.0.0.1:3000
}

*.waline.infvar.com {
    reverse_proxy 127.0.0.1:3000
}
```

Nginx 需要把 `dash.waline.infvar.com` 和所有 `*.waline.infvar.com` 的请求转发到应用容器端口，并保留原始 Host 头。

## 6. 邮件 Worker

邮件通过 BullMQ 队列异步发送，应用本身不会阻塞评论请求。`docker compose up` 会同时启动 `worker` 服务；独立部署时运行：

```bash
pnpm worker:emails
```

如果 `REDIS_ENABLED=false`，系统会自动退回数据库 pending 队列，并在评论请求后尽力同步发送。

## 7. 备份

PostgreSQL 数据保存在 `postgres_data` volume，建议每日执行：

```bash
docker compose exec db pg_dump -U waline walinex | gzip > walinex-$(date +%F).sql.gz
```

`CAP_SECRET`、`SESSION_SECRET` 和 `APP_ENCRYPTION_KEY` 一旦丢失会导致现有会话和验证失效，请妥善保存。

## 8. 上线检查

1. 访问 `/api/health` 确认服务健康。
2. 使用 GitHub / Google 登录并创建实例。
3. 用任意 Waline 客户端指向 `https://{instance}.waline.infvar.com` 发评论。
4. 在控制台审核评论、配置敏感词和通知。
5. 确认邮件 worker 日志中没有发送失败。

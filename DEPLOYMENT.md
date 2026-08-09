# 无尽书证部署指南

无尽书证是一个多租户 Waline 兼容评论服务。生产环境建议使用 Docker Compose 部署在自托管 VPS 上，由反向代理统一终止 HTTPS。

## 1. 域名规划

部署前准备两个域名入口：

- 官网：`waline.infvar.com`
- 控制台：`waline.infvar.com/dashboard`
- 评论实例：`instance.waline.infvar.com`

请把这两个域名都指向 VPS 的 A 记录。不需要泛域名，也不需要为每个实例单独配置域名。应用内置的 `src/proxy.ts` 根据请求的 Host（或 `X-Forwarded-Host`）把域名分流：`instance.waline.infvar.com/{instance}/...` 会重写到 `/tenant/{instance}/...`，因此一个 Next.js 容器就能同时服务官网、控制台和全部评论实例。

反向代理必须保留原始 Host 头；如果 Host 被改写为容器内部地址，实例域名路由会失效。

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
NEXT_PUBLIC_INSTANCE_DOMAIN=instance.waline.infvar.com
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

本服务通过 Cookie 建立登录态，实例登录弹窗会回到官网域完成 OAuth 后生成 Waline JWT。

如果 GitHub 登录完成后仍跳转到 `http://localhost:3000/dashboard`，通常是容器里的
`NEXT_PUBLIC_APP_URL` 还是旧值，或旧镜像没有重建。确认 `.env` 中为
`https://waline.infvar.com`，然后执行 `docker compose up -d --build --force-recreate`，
并清理浏览器中 `waline.infvar.com` 的 Cookie 后重试。

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

如果 `migrate` 容器报 `The datasource.url property is required`，说明旧镜像里没有
`prisma.config.ts`。请拉取最新代码后执行 `docker compose up -d --build` 重建镜像，
同时确认 `migrate` 服务环境中的 `DATABASE_URL` 已指向 `db` 容器。

## 5. 反向代理与 HTTPS

以 Caddy 为例：

```caddy
waline.infvar.com {
    reverse_proxy 127.0.0.1:3000
}

instance.waline.infvar.com {
    reverse_proxy 127.0.0.1:3000
}
```

Caddy 默认会保留 Host，并自动附加 `X-Forwarded-For`、`X-Forwarded-Proto`、`X-Forwarded-Host`，上面的配置即可。

以 Nginx 为例，需要显式转发 Host 和协议头：

```nginx
server {
    listen 80;
    server_name waline.infvar.com instance.waline.infvar.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

HTTPS 证书可以统一由 Caddy 自动签发，或由 Nginx 配合 certbot 为这两个域名分别签发。

## 6. 目标地址与 CORS 防盗链

在控制台进入“实例”，编辑实例时填写“允许接入的网站”，每行一个网站地址，例如：

```text
https://example.com
https://blog.example.org
```

留空表示不限制来源；填写后，只有列表中列出的来源以及实例自身域名可以调用评论 API，其他网站发起的跨域请求会被拒绝。建议在创建实例时就把自己的博客域名填上。

配置了接入白名单后，没有 `Origin` 或 `Referer` 的直接请求也会被拒绝，避免绕过浏览器 CORS 直接抓取或灌评论。

## 7. 邮件 Worker

邮件通过 BullMQ 队列异步发送，应用本身不会阻塞评论请求。`docker compose up` 会同时启动 `worker` 服务；独立部署时运行：

```bash
pnpm worker:emails
```

如果 `REDIS_ENABLED=false`，系统会自动退回数据库 pending 队列，并在评论请求后尽力同步发送。

## 8. 备份

PostgreSQL 数据保存在 `postgres_data` volume，建议每日执行：

```bash
docker compose exec db pg_dump -U waline walinex | gzip > walinex-$(date +%F).sql.gz
```

`CAP_SECRET`、`SESSION_SECRET` 和 `APP_ENCRYPTION_KEY` 一旦丢失会导致现有会话和验证失效，请妥善保存。

## 9. 上线检查

1. 访问 `/api/health` 确认服务健康。
2. 使用 GitHub / Google 登录并创建实例。
3. 用任意 Waline 客户端指向 `https://instance.waline.infvar.com/{实例标识}` 发评论。
4. 在控制台审核评论、配置敏感词和通知。
5. 确认邮件 worker 日志中没有发送失败。

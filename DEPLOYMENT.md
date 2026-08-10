# 无尽书证部署指南

无尽书证是一个多租户 Waline 兼容评论服务。生产环境建议使用 Docker Compose 部署在自托管 VPS 上，由反向代理统一终止 HTTPS。PostgreSQL 使用服务器上已有的外部数据库，Compose 不再创建数据库容器。

## 1. 域名规划

部署前准备两个域名入口：

- 官网：`waline.infvar.com`
- 控制台：`waline.infvar.com/dashboard`
- 评论实例：`instance.waline.infvar.com`

请把这两个域名都指向 VPS 的 A 记录。不需要泛域名，也不需要为每个实例单独配置域名。应用内置的 `src/proxy.ts` 根据请求的 Host（或 `X-Forwarded-Host`）把域名分流：`instance.waline.infvar.com/{instance}/...` 会重写到 `/tenant/{instance}/...`，因此一个 Next.js 容器就能同时服务官网、控制台和全部评论实例。

反向代理必须保留原始 Host 头，并让 `X-Forwarded-Host` 等于原始访问域名；如果这两个头被改写或固定成同一个域名，实例域名路由会串线。典型症状是 `waline.infvar.com/login` 被当成实例标识重写为不存在的 `/tenant/login` 而返回 404，实例域名下的路径也会跟着错乱。

如果使用 Cloudflare，请按下面任一种方式配置，不要添加“Host Header Override / Origin Rule”：

- 用 A 记录：为 `waline.infvar.com` 和 `instance.waline.infvar.com` 分别创建指向 VPS 的 A 记录，不要把一个域名 CNAME 到另一个域名。
- 用 Cloudflare Tunnel：在 Tunnel 里为两个域名分别创建 Public Hostname，服务地址都填 `http://localhost:3033`，HTTP Host Header 留空（不自定义）。

如果已经出现“根域名 `/login` 404，实例域名 `/login` 正常”的现象，说明 Cloudflare 发给容器的 Host 已经被改成 `instance.waline.infvar.com`。请先检查并删除 Host Header 覆盖规则，再重新部署。

## 2. 环境变量

复制 `.env.example` 并填写生产值：

```bash
cp .env.example .env
```

密钥可以直接生成：

```bash
openssl rand -hex 32
```

把输出分别填入 `APP_ENCRYPTION_KEY`、`SESSION_SECRET`、`CAP_SECRET`，并为外部数据库的 `DATABASE_URL` 使用独立强密码。

至少需要设置：

```dotenv
DATABASE_URL=postgresql://waline:strong-db-password@db.example.com:5432/walinex?schema=public
APP_ENCRYPTION_KEY=<32字节随机密钥>
SESSION_SECRET=<随机会话密钥>
CAP_SECRET=<32字节随机密钥>
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=https://waline.infvar.com
NEXT_PUBLIC_ROOT_DOMAIN=waline.infvar.com
NEXT_PUBLIC_INSTANCE_DOMAIN=instance.waline.infvar.com
EPAY_PID=...
EPAY_KEY=...
EPAY_GATEWAY=...
```

可选变量：

- `ADMIN_EMAIL` / `ADMIN_NAME`：平台管理员邮箱（支持英文逗号分隔多个）；用户用该邮箱完成 OAuth 登录后会自动成为管理员，seed 也会创建对应账号。
- `AI_MODERATION_BASE_URL` / `AI_MODERATION_MODEL` / `AI_MODERATION_API_KEY`：AI 审核默认 OpenAI 兼容端点，API Key 可用英文逗号分隔多个实现轮询。
- `APP_PORT`：宿主机映射端口，默认 `3033`。
- `REDIS_URL` / `REDIS_ENABLED`：可选的外部 Redis；不配置时自动关闭并退回内存限流。

## 3. OAuth 回调地址

GitHub OAuth App 需要配置：

- GitHub：`https://waline.infvar.com/api/auth/github/callback`

本服务通过 Cookie 建立登录态，实例登录弹窗会回到官网域完成 OAuth 后生成 Waline JWT。
GitHub 账号注册时间不足一个月的用户会被拒绝登录。

如果 GitHub 登录完成后仍跳转到 `http://localhost:3033/dashboard`，通常是容器里的
`NEXT_PUBLIC_APP_URL` 还是旧值，或旧镜像没有重建。确认 `.env` 中为
`https://waline.infvar.com`，然后执行 `docker compose pull && docker compose up -d --force-recreate`，
并清理浏览器中 `waline.infvar.com` 的 Cookie 后重试。

## 4. 启动

镜像由 GitHub Actions 自动构建并推送到 GHCR，构建 `linux/arm64/v8` 架构，ARM VPS 可以直接拉取。先拉取镜像并准备好外部数据库：

```bash
docker pull ghcr.io/diyanqi/walinex:latest
cp .env.example .env
# 编辑 .env，把 DATABASE_URL 指向服务器上已有的 PostgreSQL
```

在外部数据库里提前创建数据库和账号，然后执行迁移和 seed：

```bash
docker compose run --rm migrate
```

启动应用：

```bash
docker compose up -d
```

查看状态和日志：

```bash
docker compose ps
docker compose logs -f app
```

更新部署时重新拉取镜像并重启：

```bash
docker compose pull
docker compose up -d
```

如果 `migrate` 容器报 `The datasource.url property is required`，确认 `.env` 中
`DATABASE_URL` 已正确设置，且外部数据库允许当前服务器 IP 访问。

### 连不上 1Panel 的 PostgreSQL

如果日志反复出现 `Database not ready ... getaddrinfo EAI_AGAIN 1Panel-postgresql-xxx`，
说明 `DATABASE_URL` 里写的是 1Panel PostgreSQL 容器的名字，但 walinex 容器和它不在同一个
Docker 网络，容器内无法解析这个名字。

仓库里的 `docker-compose.yml` 已经默认把整个 Compose 挂到 `1panel-network`。部署前先在
服务器上确认 PostgreSQL 容器确实在这个网络：

```bash
docker inspect 1Panel-postgresql-8Rqm --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{println}}{{end}}'
```

如果输出不是 `1panel-network`，把 `docker-compose.yml` 末尾 `networks.default.name`
改成实际网络名。保持 `DATABASE_URL` 中使用 PostgreSQL 容器名（例如
`1Panel-postgresql-8Rqm`）即可。

改完网络后重新执行 `docker compose up -d`。

如果不想改网络，也可以在 1Panel 中给 PostgreSQL 映射一个宿主端口，例如 `5432`，然后：

```yaml
services:
  migrate:
    extra_hosts:
      - "host.docker.internal:host-gateway"
  app:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

`DATABASE_URL` 改为 `postgresql://用户:密码@host.docker.internal:5432/数据库?schema=public`。
用 `docker inspect` 查容器 IP 直接填入也可以，但容器重建后 IP 可能变化，不适合长期使用。

### 日志只显示 AggregateError

新版 Node 在主机名解析出多个地址、且全部连接失败时，会把多个错误合并成 `AggregateError`，
所以日志里看不到具体原因。不用重新构建镜像，直接在服务器上执行下面这条命令看底层错误：

```bash
docker compose run --rm migrate node -e 'const {Client}=require("pg");const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});c.connect().then(()=>console.log("DB OK")).catch((e)=>console.error("ERR:",(e.errors||[]).map((x)=>x.message).join(" | ")||e.message)).finally(()=>c.end().catch(()=>{}))'
```

常见底层原因：

- `ECONNREFUSED`：端口没开、没映射，或 PostgreSQL 没有监听该地址。
- `ETIMEDOUT` / `EHOSTUNREACH`：网络仍然不通，确认 walinex 和 PostgreSQL 已接入同一个 Docker 网络。
- `password authentication failed`：数据库账号或密码不对。
- `database "xxx" does not exist`：数据库名写错了，先在 1Panel 里确认实际库名。

## 5. 反向代理与 HTTPS

以 Caddy 为例：

```caddy
waline.infvar.com {
    reverse_proxy 127.0.0.1:3033 {
        header_up Host {host}
        header_up X-Forwarded-Host {host}
    }
}

instance.waline.infvar.com {
    reverse_proxy 127.0.0.1:3033 {
        header_up Host {host}
        header_up X-Forwarded-Host {host}
    }
}
```

Caddy 默认就会保留 Host 并附加正确的转发头，上面的写法只是把关键行为写明确。不要把 `X-Forwarded-Host` 固定成某个域名，也不要让 Cloudflare Origin Rule / Tunnel 把两个域名的 Host 统一改写。

以 Nginx 为例，需要显式转发 Host 和协议头：

```nginx
server {
    listen 80;
    server_name waline.infvar.com instance.waline.infvar.com;

    location / {
        proxy_pass http://127.0.0.1:3033;
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

## 7. 微信通知

微信通知通过 OpenClaw Clawbot 协议发送，用户只需在实例编辑页扫码绑定，无需配置任何邮件或微信环境变量。
新评论、回复和待审核事件会直接推送到已绑定的微信。

## 8. 备份

PostgreSQL 由服务器上的外部数据库提供服务，建议在数据库主机上每日执行：

```bash
pg_dump -U waline -h db.example.com walinex | gzip > walinex-$(date +%F).sql.gz
```

`CAP_SECRET`、`SESSION_SECRET` 和 `APP_ENCRYPTION_KEY` 一旦丢失会导致现有会话和验证失效，请妥善保存。

## 9. 上线检查

1. 访问 `/api/health` 确认服务健康。
2. 访问 `https://waline.infvar.com/login`，确认返回登录页而不是 404。
3. 使用 GitHub 登录并创建实例。
4. 用任意 Waline 客户端指向 `https://instance.waline.infvar.com/{实例标识}/api` 发评论，也可以在实例编辑页导入/导出 Waline JSON 数据。
5. 在控制台审核评论、配置敏感词和通知。
6. 在实例编辑页绑定微信并发送一条评论，确认通知到达。

# Sub-I 与仪器培训系统整合工作区

本目录包含两个子项目及统一部署配置：

| 子项目 | 仓库 | 说明 |
|--------|------|------|
| [subi_knowledge_platform](./subi_knowledge_platform/) | [subi_knowledge_platform](https://github.com/0356035-cyber/subi_knowledge_platform) | Sub-I 资料库（BFF + Streamlit） |
| [instrument-training-home](./instrument-training-home/) | [instrument-training-home](https://github.com/0356035-cyber/instrument-training-home) | 仪器培训与授权系统 |

## 快速启动

### 方式 A：本地 Python（推荐日常开发）

```bat
subi_knowledge_platform\启动资料库系统.bat
```

或双击 `start-local.bat`（跳转至上述脚本）。脚本会启动 8000 + 8001 + 8510，并在结束时做健康检查。

### 方式 B：Docker 后端 + 本地前端（推荐稳定部署）

```bat
start-docker.bat
subi_knowledge_platform\启动资料库系统.bat
```

`start-docker.bat` 会执行 `docker compose up -d --build`。**Git 拉取更新后若使用 Docker，务必重新运行该脚本重建镜像**（避免依赖版本不一致导致登录 500）。

默认登录：**工号 3267，密码 123456**。

### Grok Build（AI 编程助手）

```bat
启动GrokBuild.bat
```

首次使用请复制 `grok-proxy.env.example` 为 `grok-proxy.env`，按本地代理软件（Clash / v2rayN 等）修改端口。

- Sub-I 前端：http://localhost:8510
- Sub-I API：http://127.0.0.1:8001/docs
- 培训系统 API：http://127.0.0.1:8000/docs

## Docker 统一部署

```bash
# 在 C:\projects 目录
docker compose up -d --build
```

复制 `.env.example` 为 `subi_knowledge_platform/.env` 并填写培训系统服务账号。

## 资质查询功能

Sub-I 侧边栏 → **项目检测人员授权资质查询** → 按工号或仪器查询授权/培训/考核资质。

## 交接文档

完整整合说明见 [`项目整合交接文档.md`](./项目整合交接文档.md)。Sub-I 资料库功能细节见 [`subi_knowledge_platform/项目交接总结.md`](./subi_knowledge_platform/项目交接总结.md)。
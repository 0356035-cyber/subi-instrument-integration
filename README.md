# Sub-I 与仪器培训系统整合工作区

本目录（`C:\projects`）是 **Docker Compose 统一部署仓库**，与两个子项目代码仓库并列存放。

> **AI / Codex 开发：** 请先读 [README_FOR_CODEX.md](./README_FOR_CODEX.md) 和 [PROJECT_STATUS.md](./PROJECT_STATUS.md)。  
> **完整文档体系：** [docs/](./docs/)

| 子项目 | 仓库 | 说明 |
|--------|------|------|
| [subi_knowledge_platform](./subi_knowledge_platform/) | [subi_knowledge_platform](https://github.com/0356035-cyber/subi_knowledge_platform) | Sub-I 资料库 |
| [instrument-training-home](./instrument-training-home/) | [instrument-training-home](https://github.com/0356035-cyber/instrument-training-home) | 仪器培训与授权系统 |
| **本目录** | [subi-instrument-integration](https://github.com/0356035-cyber/subi-instrument-integration) | Compose 编排、启动脚本、文档 |

## 日常只需记住 3 个脚本

| 什么时候 | 双击这个 |
|----------|----------|
| **每天开机启动** | `启动系统.bat` |
| **关机前备份** | `备份数据.bat` |
| **换电脑恢复** | `恢复数据.bat` |

## 快速启动

```bat
启动系统.bat
```

| 容器 | 端口 | 用途 |
|------|------|------|
| instrument_train_frontend | 8501 | 培训管理 |
| subi_frontend | 8510 | Sub-I 资料库 |

默认登录：工号 **3267**（部署后请改密）

## 新电脑搭建

```bash
git clone https://github.com/0356035-cyber/subi-instrument-integration.git projects
cd projects
git clone https://github.com/0356035-cyber/subi_knowledge_platform.git
git clone https://github.com/0356035-cyber/instrument-training-home.git
```

1. 安装 Docker Desktop
2. 配置 `subi_knowledge_platform\.env`
3. 有备份则 `恢复数据.bat`
4. `start-docker.bat`

## 文档索引

| 文档 | 用途 |
|------|------|
| [README_FOR_CODEX.md](./README_FOR_CODEX.md) | AI 开发入口 |
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | 当前状态与优先级 |
| [docs/系统总览.md](./docs/系统总览.md) | 架构与模块关系 |
| [docs/开发规范.md](./docs/开发规范.md) | 编码与运行规范 |
| [docs/modules/整合与部署.md](./docs/modules/整合与部署.md) | 部署、备份、极空间 |
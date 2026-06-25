# Sub-I 与仪器培训系统整合工作区

本目录（`C:\projects`）是 **Docker Compose 统一部署仓库**，与两个子项目代码仓库并列存放。

| 子项目 | 仓库 | 说明 |
|--------|------|------|
| [subi_knowledge_platform](./subi_knowledge_platform/) | [subi_knowledge_platform](https://github.com/0356035-cyber/subi_knowledge_platform) | Sub-I 资料库 |
| [instrument-training-home](./instrument-training-home/) | [instrument-training-home](https://github.com/0356035-cyber/instrument-training-home) | 仪器培训与授权系统 |
| **本目录** | [subi-instrument-integration](https://github.com/0356035-cyber/subi-instrument-integration) | Compose 编排、启动脚本、交接文档 |

## 目录结构

```
C:\projects\
├── docker-compose.yml          # 4 个容器统一部署
├── start-docker.bat            # 推荐启动方式
├── backup-data.bat / 备份数据.bat
├── restore-data.bat / 恢复数据.bat
├── 项目整合交接文档.md
├── instrument-training-home\   # 独立 Git 仓库
└── subi_knowledge_platform\    # 独立 Git 仓库
```

## 日常只需记住 3 个脚本

| 什么时候 | 双击这个 | 说明 |
|----------|----------|------|
| **每天开机启动系统** | `启动系统.bat` | 等同 `start-docker.bat`，启动全部 4 个容器 |
| **关机前备份数据** | `备份数据.bat` | 拷贝数据库和附件到 `backups\` |
| **换电脑恢复数据** | `恢复数据.bat` | 从备份文件夹还原 |

其他脚本（定时备份安装、Grok Build 等）偶尔才用，见下方说明。

## 快速启动（家里 / 单位相同）

```bat
启动系统.bat
```

或英文入口：`start-docker.bat`

启动后 Docker Desktop 显示 **`projects`** 项目，包含 4 个容器：

| 容器 | 端口 | 用途 |
|------|------|------|
| instrument_train_backend | 8000 | 培训 API |
| instrument_train_frontend | 8501 | 培训管理页面 |
| subi_backend | 8001 | Sub-I API |
| subi_frontend | 8510 | Sub-I 资料库 |

默认登录：**工号 3267，密码 123456**

## 新电脑首次搭建

```bash
git clone https://github.com/0356035-cyber/subi-instrument-integration.git projects
cd projects
git clone https://github.com/0356035-cyber/subi_knowledge_platform.git
git clone https://github.com/0356035-cyber/instrument-training-home.git
```

1. 安装 Docker Desktop
2. 复制 `.env.example` → `subi_knowledge_platform\.env` 并填写服务账号
3. 用 `恢复数据.bat` 恢复备份（如有）
4. 运行 `start-docker.bat`

## 换机同步数据

- **代码**：三个仓库分别 `git pull`
- **业务数据**：`备份数据.bat` → 拷贝 `backups\` 文件夹 → 新电脑 `恢复数据.bat`
- **定时备份**：运行 `install-scheduled-backup.bat`（或 `安装定时备份.bat`）注册每日 02:00 自动备份（保留 14 份）

详见 [`项目整合交接文档.md`](./项目整合交接文档.md) §7.5。

## 本地 Python 开发（可选）

```bat
subi_knowledge_platform\启动资料库系统.bat
```

## 交接文档

- 整合说明：[`项目整合交接文档.md`](./项目整合交接文档.md)
- Sub-I 功能细节：[`subi_knowledge_platform/项目交接总结.md`](./subi_knowledge_platform/项目交接总结.md)
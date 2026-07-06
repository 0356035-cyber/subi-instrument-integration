# 任务：权限分层 MVP（§14.12）

> **状态：** ✅ 已完成  
> **完成日期：** 2026-07-06

---

## 背景

实现总库合并下的分层权限：项目成员只读、负责人可编；法规全员可读、模版仅负责人；内部要求 `audience_scope`；主任修改提醒。

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| `backend/permissions.py` | 权限核心逻辑 |
| `backend/permission_migrations.py` | 新表 DDL |
| `backend/role_seed.py` | 团队账号 |
| `backend/models.py` | ProjectMember、AuditLog、ProjectLeadNotification、`audience_scope`、`job_title` |
| `backend/main.py` | `/me/permissions`、通知 API、权限过滤 |
| `backend/integrations/user_sync.py` | 培训人员同步 |
| `frontend/app.py` | 权限 UI、通知横幅、用户管理、改密登出 |
| `frontend/project_management.py` | 成员 Tab |

---

## 已完成

- [x] 五角色：`admin` / `schedule_manager` / `system_maintainer` / `editor` / `viewer`
- [x] `role` 与 `job_title` 分离；3267 = `system_maintainer`
- [x] 项目成员 CRUD API
- [x] 资料/项目列表按权限过滤
- [x] `audience_scope` 内部要求可见性
- [x] AuditLog + 负责人待处理通知
- [x] `POST /users/sync-from-training`（默认仅新增）
- [x] 侧边栏改密 + 改密后自动登出

---

## 未完成 / 待运营验证

- [ ] 真实项目上验证各角色可见/可改边界
- [ ] 主任修改提醒全流程验收（弹窗/已读/高亮）
- [ ] 模版库、负责人须知在真实资料数据上测试

---

## 注意事项

- 培训同步**默认不覆盖**已有用户的 `role`/密码
- `system_maintainer` 无科室主任级全盘视野，除非另授 `schedule_manager`/`admin`
- 明确不做「复制上周排班」
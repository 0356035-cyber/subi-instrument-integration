import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, Modal, Popconfirm, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import {
  checkCloudHealth,
  clearCloudAuth,
  fetchCloudState,
  loadCloudAuth,
  loginToCloud,
  saveCloudState,
  type CloudAuth,
} from '../utils/ganttCloud';

const { Text } = Typography;

export function CloudSyncControls() {
  const {
    projects,
    subjects,
    resources,
    tasks,
    settings,
    importSchedule,
  } = useScheduleStore();
  const [auth, setAuth] = useState<CloudAuth | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    setAuth(loadCloudAuth());
    void checkCloudHealth().then(setOnline);
  }, []);

  const ensureAuth = async (): Promise<CloudAuth | null> => {
    if (auth) return auth;
    setLoginOpen(true);
    return null;
  };

  const handleLogin = async () => {
    const values = await form.validateFields();
    setBusy(true);
    try {
      const next = await loginToCloud(values.employeeId, values.password);
      setAuth(next);
      setLoginOpen(false);
      form.resetFields();
      message.success(`已登录 ${next.employeeId}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    const current = await ensureAuth();
    if (!current) return;
    setBusy(true);
    try {
      const result = await saveCloudState(
        current.accessToken,
        { projects, subjects, resources, tasks, settings },
        projects.find((project) => project.id === settings.activeProjectId)?.name ??
          '临床检测排程'
      );
      message.success(
        result.updatedAt
          ? `已保存到云端（${result.updatedAt}）`
          : '已保存到云端'
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : '保存失败';
      if (text.includes('未登录') || text.includes('过期')) {
        clearCloudAuth();
        setAuth(null);
        setLoginOpen(true);
      }
      message.error(text);
    } finally {
      setBusy(false);
    }
  };

  const handleLoad = async () => {
    const current = await ensureAuth();
    if (!current) return;
    setBusy(true);
    try {
      const result = await fetchCloudState(current.accessToken);
      if (result.empty || !result.schedule) {
        message.warning('云端还没有排程，可将当前浏览器数据点「保存到云端」');
        return;
      }
      const ok = importSchedule(result.schedule);
      if (!ok) {
        message.error('云端数据格式无法识别');
        return;
      }
      message.success(
        result.updatedAt
          ? `已从云端加载（${result.updatedBy || '未知'}，${result.updatedAt}）`
          : '已从云端加载'
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : '加载失败';
      if (text.includes('未登录') || text.includes('过期')) {
        clearCloudAuth();
        setAuth(null);
        setLoginOpen(true);
      }
      message.error(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Space size={4}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {online === false
            ? '云端未连接'
            : auth
              ? `云端 · ${auth.employeeId}`
              : '云端未登录'}
        </Text>
        {auth ? (
          <Button
            size="small"
            icon={<LogoutOutlined />}
            onClick={() => {
              clearCloudAuth();
              setAuth(null);
              message.success('已退出云端登录');
            }}
          >
            退出
          </Button>
        ) : (
          <Button
            size="small"
            icon={<LoginOutlined />}
            onClick={() => setLoginOpen(true)}
          >
            登录云端
          </Button>
        )}
        <Button
          size="small"
          icon={<CloudUploadOutlined />}
          loading={busy}
          onClick={() => void handleSave()}
        >
          保存到云端
        </Button>
        <Popconfirm
          title="从云端加载？"
          description="将覆盖当前浏览器中的排程。未保存到云端的本地修改会丢失。"
          onConfirm={() => void handleLoad()}
          okText="加载"
          cancelText="取消"
        >
          <Button size="small" icon={<CloudDownloadOutlined />} loading={busy}>
            从云端加载
          </Button>
        </Popconfirm>
      </Space>
      <Modal
        title="登录 Sub-I 账号以同步甘特图"
        open={loginOpen}
        onCancel={() => setLoginOpen(false)}
        onOk={() => void handleLogin()}
        confirmLoading={busy}
        okText="登录"
        destroyOnClose
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          使用资料库工号登录。查看需要登录，保存需要编辑或管理员权限。
        </Text>
        <Form form={form} layout="vertical">
          <Form.Item
            name="employeeId"
            label="工号"
            rules={[{ required: true, message: '请输入工号' }]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

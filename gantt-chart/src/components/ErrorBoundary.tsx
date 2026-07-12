import { Button, Typography } from 'antd';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, maxWidth: 720, margin: '40px auto' }}>
          <Typography.Title level={4}>页面加载出错</Typography.Title>
          <Typography.Paragraph type="danger">
            {this.state.error.message}
          </Typography.Paragraph>
          <Button type="primary" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
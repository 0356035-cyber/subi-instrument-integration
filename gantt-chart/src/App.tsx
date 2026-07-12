import { Layout } from 'antd';
import { GanttChart } from './components/GanttChart';
import { ProjectWorkflowEditor } from './components/ProjectWorkflowEditor';
import { ResourceManagerModal } from './components/ResourceManager';
import { RiskPanel } from './components/RiskPanel';
import { SubjectInfoModal } from './components/SubjectInfoModal';
import { Toolbar } from './components/Toolbar';
import { useScheduleStore } from './store/scheduleStore';
import './App.css';

const { Content, Sider } = Layout;

export default function App() {
  const {
    subjects,
    tasks,
    settings,
    taskRiskMap,
    highlightedTaskIds,
    selectTask,
    openSubjectEditor,
    moveTask,
    moveSubjectWhole,
  } = useScheduleStore();

  return (
    <Layout className="app-layout">
      <Toolbar />
      <Layout className="main-layout">
        <Content className="gantt-content">
          <GanttChart
            subjects={subjects}
            tasks={tasks}
            settings={settings}
            taskRiskMap={taskRiskMap}
            highlightedTaskIds={highlightedTaskIds}
            onSelectTask={selectTask}
            onEditSubject={openSubjectEditor}
            onMoveTask={moveTask}
            onMoveSubjectWhole={moveSubjectWhole}
          />
        </Content>
        <Sider width={340} className="side-panel" theme="light">
          <RiskPanel />
        </Sider>
      </Layout>
      <ProjectWorkflowEditor />
      <ResourceManagerModal />
      <SubjectInfoModal />
    </Layout>
  );
}
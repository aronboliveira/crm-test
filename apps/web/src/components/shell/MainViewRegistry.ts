import { DeepFreeze } from "@corp/foundations";

import DashboardHome from "../dashboard/DashboardHome.vue";
import ProjectsTable from "../projects/ProjectsTable.vue";
import TasksTable from "../tasks/TasksTable.vue";
import type {
  MainViewKey,
  MainViewSpec,
  MainViewRegistry,
} from "../../types/views.types";

export type { MainViewKey, MainViewSpec, MainViewRegistry };

const reg: MainViewRegistry<MainViewKey> = {
  order: ["dashboard", "projects", "tasks"],
  byKey: {
    dashboard: {
      key: "dashboard",
      label: "Dashboard",
      ariaLabel: "Open dashboard home view",
      component: DashboardHome,
    },
    projects: {
      key: "projects",
      label: "Projects",
      ariaLabel: "Open projects table view",
      component: ProjectsTable,
    },
    tasks: {
      key: "tasks",
      label: "Tasks",
      ariaLabel: "Open tasks table view",
      component: TasksTable,
    },
  },
};

export default DeepFreeze.apply(reg);

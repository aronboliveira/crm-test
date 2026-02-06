import { createPinia } from "pinia";

import PersistPlugin from "./plugins/persist.plugin";
import TabSyncPlugin from "./plugins/tab-sync.plugin";

const pinia = createPinia();
pinia.use(PersistPlugin.create());
pinia.use(TabSyncPlugin.create());

export default pinia;

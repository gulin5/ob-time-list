"use strict";

const {
  Dialog,
  Plugin,
  Setting,
  fetchSyncPost,
  showMessage,
  getFrontend,
} = require("siyuan");

const DATA_KEY = "time-list-data.json";
const SETTINGS_KEY = "time-list-settings.json";
const DOCK_TYPE = "time-list";
const DOCUMENT_SAVE_SYNC_DELAY_MS = 900;
const POMODOROS_ATTR = "custom-time-list-pomodoros";
const MANUAL_ENTRIES_ATTR = "custom-time-list-manual-entries";
const ACTIVE_POMODORO_ATTR = "custom-time-list-active-pomodoro";
const SOURCE_ATTR = "custom-time-list-source";
const SOURCE_DOC_ID_ATTR = "custom-time-list-source-doc-id";
const SOURCE_KEY_ATTR = "custom-time-list-source-key";
const PIE_COLORS = ["#5b8def", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];
const WEEKDAY_SHORT = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const ICONS = `
  <symbol id="iconTimeList" viewBox="0 0 32 32">
    <path d="M16 3a13 13 0 1 0 0 26 13 13 0 0 0 0-26Zm0 23.5A10.5 10.5 0 1 1 16 5.5a10.5 10.5 0 0 1 0 21Z"/>
    <path d="M17.25 9.5h-2.5v7.4l5.65 3.4 1.3-2.1-4.45-2.65V9.5Z"/>
    <path d="M8.2 15.2h3.2v2.2H8.2v-2.2Zm12.4-5.3h3.2v2.2h-3.2V9.9Zm0 10h3.2v2.2h-3.2v-2.2Z"/>
  </symbol>
  <symbol id="iconTlPlus" viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></symbol>
  <symbol id="iconTlList" viewBox="0 0 24 24"><path d="M5 6.5h2v2H5v-2Zm4 .25h10v1.5H9v-1.5ZM5 11h2v2H5v-2Zm4 .25h10v1.5H9v-1.5ZM5 15.5h2v2H5v-2Zm4 .25h10v1.5H9v-1.5Z"/></symbol>
  <symbol id="iconTlPie" viewBox="0 0 24 24"><path d="M11 3a9 9 0 1 0 9 9h-9V3Zm2 0v7h7a9 9 0 0 0-7-7Z"/></symbol>
  <symbol id="iconTlCheck" viewBox="0 0 24 24"><path d="M19.7 6.3 9 17l-4.7-4.7 1.4-1.4L9 14.2l9.3-9.3 1.4 1.4Z"/></symbol>
  <symbol id="iconTlClock" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2Zm1 5h-2v6l5 3 .95-1.65L13 12V7Z"/></symbol>
  <symbol id="iconTlPause" viewBox="0 0 24 24"><path d="M7 5h3v14H7V5Zm7 0h3v14h-3V5Z"/></symbol>
  <symbol id="iconTlPlay" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5Z"/></symbol>
  <symbol id="iconTlStop" viewBox="0 0 24 24"><path d="M6 6h12v12H6V6Z"/></symbol>
  <symbol id="iconTlClose" viewBox="0 0 24 24"><path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Zm11.2 0L19 6.4 6.4 19 5 17.6 17.6 5Z"/></symbol>
  <symbol id="iconTlUndo" viewBox="0 0 24 24"><path d="M8 7V4L3 9l5 5v-3h6a4 4 0 1 1 0 8H9v-2h5a2 2 0 1 0 0-4H8Z"/></symbol>
  <symbol id="iconTlTrash" viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.8 11H7.8L7 9Z"/></symbol>
  <symbol id="iconTlSettings" viewBox="0 0 24 24"><path d="M19.4 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 3a8 8 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 3h4l.4-3a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/></symbol>
  <symbol id="iconTlRefresh" viewBox="0 0 24 24"><path d="M17.7 6.3A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.8-4.3L13 11h8V3l-3.3 3.3Z"/></symbol>
  <symbol id="iconTlCalendar" viewBox="0 0 24 24"><path d="M7 2h2v3h6V2h2v3h3v16H4V5h3V2Zm11 8H6v9h12v-9ZM6 7v1h12V7H6Zm2 5h3v3H8v-3Z"/></symbol>
  <symbol id="iconTlChevronLeft" viewBox="0 0 24 24"><path d="m14.7 6.3 1.4 1.4L11.8 12l4.3 4.3-1.4 1.4L9 12l5.7-5.7Z"/></symbol>
  <symbol id="iconTlChevronRight" viewBox="0 0 24 24"><path d="m9.3 17.7-1.4-1.4 4.3-4.3-4.3-4.3 1.4-1.4L15 12l-5.7 5.7Z"/></symbol>
`;

const defaultSettings = {
  notebookId: "",
  autoAppendToDailyNote: true,
  habitDocId: "",
};

const defaultState = {
  version: 1,
  tasks: [],
  activePomodoro: null,
};

class TimeListPlugin extends Plugin {
  constructor(options) {
    super(options);
    this.settings = { ...defaultSettings };
    this.state = clone(defaultState);
    this.dockElement = null;
    this.settingDialog = null;
    this.createTaskDialog = null;
    this.completeTaskDialog = null;
    this.calendarDialog = null;
    this.topBarElement = null;
    this.currentDockView = "tasks";
    this.calendarMode = "week";
    this.calendarDate = todayKey();
    this.calendarFocusDate = todayKey();
    this.timerHandle = null;
    this.documentSyncTimer = null;
    this.boundWsMainHandler = null;
    this.lastDailyNoteWriteAt = 0;
    this.documentSyncInFlight = false;
    this.documentSyncQueued = false;
    this.refreshPromise = null;
    this.calendarSyncPromises = new Map();
    this.dailyNoteId = "";
    this.dailyNoteDate = "";
    this.locallyDeletedBlockIds = new Map();
    this.recentLocalTaskChanges = new Map();
    this.isMobile = false;
  }

  async onload() {
    this.addIcons(ICONS);
    this.isMobile = ["mobile", "browser-mobile"].includes(getFrontend());
    this.registerDateInsertActions();
    this.addCommand({
      langKey: "openTimeList",
      hotkey: "",
      callback: () => this.openDock(),
    });
    this.addCommand({
      langKey: "insertTodayDate",
      hotkey: "",
      editorCallback: (protyle) => this.insertTodayDate(protyle),
      callback: () => this.copyTodayDate(),
    });
    this.boundWsMainHandler = (event) => this.handleWsMain(event);
    this.eventBus.on("ws-main", this.boundWsMainHandler);
  }

  async onLayoutReady() {
    try {
      await this.loadAllData();
      this.registerTopBar();
      this.registerDock();
      await this.setupSettings();
      await this.syncTodayFromDailyNote({ silent: true });
      this.startTicker();
      showMessage("日记任务计时插件已加载");
    } catch (error) {
      console.error("[siyuan-time-list] 插件初始化失败", error);
      showMessage(`日记任务计时初始化失败：${error.message}`, 7000, "error");
    }
  }

  onunload() {
    this.stopTicker();
    this.stopDocumentSync();
    this.topBarElement?.remove?.();
    this.topBarElement = null;
    if (this.boundWsMainHandler) {
      this.eventBus.off("ws-main", this.boundWsMainHandler);
      this.boundWsMainHandler = null;
    }
    if (this.settingDialog) {
      this.settingDialog.destroy();
      this.settingDialog = null;
    }
    if (this.createTaskDialog) {
      this.createTaskDialog.destroy();
      this.createTaskDialog = null;
    }
    if (this.completeTaskDialog) {
      this.completeTaskDialog.destroy();
      this.completeTaskDialog = null;
    }
    if (this.calendarDialog) {
      this.calendarDialog.destroy();
      this.calendarDialog = null;
    }
  }

  async uninstall() {
    await this.removeData(DATA_KEY);
    await this.removeData(SETTINGS_KEY);
  }

  async loadAllData() {
    let loadedSettings = null;
    try {
      loadedSettings = await this.loadData(SETTINGS_KEY);
    } catch (error) {
      console.warn("[siyuan-time-list] settings not found, use defaults", error);
    }
    this.settings = { ...defaultSettings, ...(loadedSettings || {}) };

    let loadedState = null;
    try {
      loadedState = await this.loadData(DATA_KEY);
    } catch (error) {
      console.warn("[siyuan-time-list] data not found, use empty state", error);
    }
    this.state = {
      ...clone(defaultState),
      ...(loadedState || {}),
      tasks: Array.isArray(loadedState?.tasks) ? loadedState.tasks : [],
    };
  }

  async saveState() {
    await this.saveData(DATA_KEY, this.state);
  }

  async saveSettings() {
    await this.saveData(SETTINGS_KEY, this.settings);
  }

  async setupSettings() {
    const notebooks = await this.listNotebooks();

    const notebookSelect = document.createElement("select");
    notebookSelect.className = "b3-select fn__flex-center fn__size200";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "请选择日记笔记本";
    notebookSelect.appendChild(emptyOption);
    notebooks.forEach((notebook) => {
      const option = document.createElement("option");
      option.value = notebook.id;
      option.textContent = notebook.name;
      notebookSelect.appendChild(option);
    });
    notebookSelect.value = this.settings.notebookId;

    const appendToggle = document.createElement("input");
    appendToggle.type = "checkbox";
    appendToggle.checked = this.settings.autoAppendToDailyNote;

    const habitDocInput = document.createElement("input");
    habitDocInput.className = "b3-text-field fn__flex-center fn__size200";
    habitDocInput.placeholder = "习惯文档 ID";
    habitDocInput.value = this.settings.habitDocId || "";

    this.setting = new Setting({
      confirmCallback: async () => {
        this.settings.notebookId = notebookSelect.value;
        this.resetDailyNoteCache();
        this.settings.autoAppendToDailyNote = appendToggle.checked;
        this.settings.habitDocId = habitDocInput.value.trim();
        await this.saveSettings();
        await this.syncTodayFromDailyNote({ silent: true });
        this.render();
        showMessage("日记任务计时设置已保存");
      },
    });

    this.setting.addItem({
      title: "日记笔记本",
      description: "用于筛选可写入的已有文档。",
      createActionElement: () => notebookSelect,
    });

    this.setting.addItem({
      title: "写入任务文档",
      description: "创建任务和完成任务时向已选择的文档追加一条记录。",
      createActionElement: () => appendToggle,
    });

    this.setting.addItem({
      title: "习惯文档 ID",
      description: "点击刷新时读取这个文档里的每一行，创建为今日习惯任务。",
      createActionElement: () => habitDocInput,
    });

  }

  async openSetting() {
    const notebooks = await this.listNotebooks();

    if (this.settingDialog) {
      this.settingDialog.destroy();
      this.settingDialog = null;
    }

    const notebookOptions = notebooks.length > 0
      ? `<option value="">请选择日记笔记本</option>` + notebooks
          .map((notebook) => {
            const selected = notebook.id === this.settings.notebookId ? " selected" : "";
            return `<option value="${escapeAttr(notebook.id)}"${selected}>${escapeHtml(notebook.name)}</option>`;
          })
          .join("")
      : `<option value="">未获取到可用笔记本</option>`;
    const content = `
      <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
        <div style="font-size: 14px; color: var(--b3-theme-on-surface); line-height: 1.6;">
          任务会自动写入这个笔记本下已经存在的当天日记，不会自动创建文档。
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px;">
          <label style="font-size: 13px; font-weight: 500; color: var(--b3-theme-on-surface);">日记笔记本</label>
          <select id="time-list-notebook" class="b3-select" style="width: 100%;">
            ${notebookOptions}
          </select>
          <div style="font-size: 12px; color: var(--b3-theme-on-surface-light);">
            如果当天日记不存在，请先在思源里手动创建当天日记。
          </div>
        </div>

        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--b3-theme-on-surface);">
          <input id="time-list-auto-append" type="checkbox" ${this.settings.autoAppendToDailyNote ? "checked" : ""} />
          创建和完成任务时写入任务文档
        </label>

        <div style="display: flex; flex-direction: column; gap: 4px;">
          <label style="font-size: 13px; font-weight: 500; color: var(--b3-theme-on-surface);">习惯文档 ID</label>
          <input id="time-list-habit-doc-id" class="b3-text-field" placeholder="粘贴习惯文档 ID" value="${escapeAttr(this.settings.habitDocId || "")}" style="width: 100%;" />
        </div>

        <div id="time-list-setting-status" style="font-size: 13px; color: var(--b3-theme-on-surface-light);"></div>

        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; border-top: 1px solid var(--b3-theme-surface-light); padding-top: 14px;">
          <button id="time-list-cancel-settings" class="b3-button b3-button--outline">取消</button>
          <button id="time-list-save-settings" class="b3-button b3-button--text" style="background: var(--b3-theme-primary); color: #fff;">保存</button>
        </div>
      </div>
    `;

    this.settingDialog = new Dialog({
      title: "日记任务计时设置",
      content,
      width: this.isMobile ? "92vw" : "440px",
      height: "auto",
      destroyCallback: () => {
        this.settingDialog = null;
      },
    });

    const root = this.settingDialog.element;
    const notebookSelect = root.querySelector("#time-list-notebook");
    const appendToggle = root.querySelector("#time-list-auto-append");
    const habitDocInput = root.querySelector("#time-list-habit-doc-id");
    const statusElement = root.querySelector("#time-list-setting-status");
    const cancelButton = root.querySelector("#time-list-cancel-settings");
    const saveButton = root.querySelector("#time-list-save-settings");

    const renderStatus = () => {
      const notebookName = notebooks.find((notebook) => notebook.id === notebookSelect.value)?.name || "未选择笔记本";
      statusElement.innerHTML = `📓 ${escapeHtml(notebookName)} &nbsp;|&nbsp; 🍅 正向计时`;
    };

    notebookSelect.addEventListener("change", renderStatus);
    cancelButton.addEventListener("click", () => this.settingDialog?.destroy());
    saveButton.addEventListener("click", async () => {
      this.settings = {
        ...this.settings,
        notebookId: notebookSelect.value,
        autoAppendToDailyNote: appendToggle.checked,
        habitDocId: habitDocInput.value.trim(),
      };
      this.resetDailyNoteCache();
      await this.saveSettings();
      this.render();
      showMessage("日记任务计时设置已保存 ✅");
      this.settingDialog?.destroy();
    });

    renderStatus();
  }

  registerDock() {
    const plugin = this;
    this.addDock({
      config: {
        position: "RightBottom",
        size: { width: 360, height: 520 },
        icon: "iconTimeList",
        title: "日记任务计时",
      },
      data: {},
      type: DOCK_TYPE,
      init() {
        this.element.style.height = "100%";
        plugin.dockElement = this.element;
        plugin.render();
        plugin.syncTodayFromDailyNote({ silent: true })
          .then(() => plugin.render());
      },
      destroy() {
        if (plugin.dockElement === this.element) {
          plugin.dockElement = null;
        }
        this.element.innerHTML = "";
      },
    });
  }

  registerTopBar() {
    if (this.topBarElement?.isConnected) {
      return;
    }
    try {
      this.topBarElement?.remove?.();
      this.topBarElement = this.addTopBar({
        icon: "iconTimeList",
        title: "日记任务计时",
        position: "right",
        callback: () => this.openDock(),
      });
    } catch (error) {
      console.warn("[siyuan-time-list] failed to add top bar", error);
    }
  }

  openDock() {
    try {
      window.siyuan?.layout?.rightDock?.toggleModel(`${this.name}${DOCK_TYPE}`, true);
    } catch (error) {
      console.warn("[siyuan-time-list] failed to open dock", error);
    }
  }

  registerDateInsertActions() {
    this.protyleSlash = [
      {
        filter: ["date", "today", "rq", "jt", "日期", "今天", "今天日期"],
        html: `
          <div class="b3-list-item__first">
            <span class="b3-list-item__text">插入今天日期</span>
            <span class="b3-list-item__meta">${todayKey()}</span>
          </div>
        `,
        id: "time-list-insert-today-date",
        callback: (protyle) => this.insertTodayDate(protyle),
      },
    ];
  }

  insertTodayDate(protyle) {
    const date = todayKey();
    if (!protyle || typeof protyle.insert !== "function") {
      this.copyTodayDate();
      return;
    }
    protyle.insert(date, false);
  }

  async copyTodayDate() {
    const date = todayKey();
    try {
      await navigator.clipboard.writeText(date);
      showMessage(`已复制今天日期：${date}`);
    } catch (error) {
      console.warn("[siyuan-time-list] failed to copy today date", error);
      showMessage(`今天日期：${date}`);
    }
  }

  startTicker() {
    this.stopTicker();
    this.timerHandle = window.setInterval(async () => {
      if (this.state.activePomodoro) {
        this.render();
      }
    }, 1000);
  }

  stopTicker() {
    if (this.timerHandle) {
      window.clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  stopDocumentSync() {
    if (this.documentSyncTimer) {
      window.clearTimeout(this.documentSyncTimer);
      this.documentSyncTimer = null;
    }
  }

  handleWsMain(event) {
    if (!this.dockElement || !this.settings.notebookId || !shouldSyncAfterDocumentSave(event, this.dailyNoteId)) {
      return;
    }
    if (String(event?.detail?.cmd || "").toLowerCase() === "createdailynote") {
      this.resetDailyNoteCache();
    }
    this.scheduleDocumentSync();
  }

  scheduleDocumentSync(delay = DOCUMENT_SAVE_SYNC_DELAY_MS) {
    this.stopDocumentSync();
    this.documentSyncTimer = window.setTimeout(async () => {
      this.documentSyncTimer = null;
      await this.syncDockFromDailyNote({ forceRender: true });
    }, delay);
  }

  async syncDockFromDailyNote({ forceRender = false } = {}) {
    if (!this.settings.notebookId) {
      return;
    }
    if (this.documentSyncInFlight) {
      this.documentSyncQueued = true;
      return;
    }
    this.documentSyncInFlight = true;
    this.documentSyncQueued = false;
    const beforeSignature = this.getTodayTaskSignature();
    try {
      await this.syncTodayFromDailyNote({ silent: true });
      const afterSignature = this.getTodayTaskSignature();
      if (forceRender || afterSignature !== beforeSignature) {
        if (this.calendarDialog) {
          this.refreshCalendarDialog();
        }
        if (this.dockElement) {
          this.render();
        }
      }
    } catch (error) {
      console.warn("[siyuan-time-list] document sync failed", error);
    } finally {
      this.documentSyncInFlight = false;
      if (this.documentSyncQueued) {
        this.documentSyncQueued = false;
        this.scheduleDocumentSync();
      }
    }
  }

  async request(path, payload = {}) {
    const response = await fetchSyncPost(path, payload);
    if (!response || response.code !== 0) {
      throw new Error(response?.msg || `请求失败：${path}`);
    }
    return response.data;
  }

  async listNotebooks() {
    try {
      const data = await this.request("/api/notebook/lsNotebooks");
      return (data?.notebooks || []).filter((notebook) => !notebook.closed);
    } catch (error) {
      console.warn("[siyuan-time-list] failed to list notebooks", error);
      return [];
    }
  }

  async ensureNotebookId() {
    if (this.settings.notebookId) {
      return this.settings.notebookId;
    }
    throw new Error("请先在设置里选择你的固定日记笔记本。");
  }

  resetDailyNoteCache() {
    this.dailyNoteId = "";
    this.dailyNoteDate = "";
  }

  async findExistingDailyNoteId(date = todayKey()) {
    const dailyNoteIds = await this.findExistingDailyNoteIds([date]);
    return dailyNoteIds.get(date) || "";
  }

  async findExistingDailyNoteIds(dates) {
    if (!this.settings.notebookId) {
      return new Map();
    }
    const dateKeys = uniqueDateKeys(dates);
    if (dateKeys.length === 0) {
      return new Map();
    }
    const compactDates = new Set(dateKeys.map((date) => date.replace(/-/g, "")));
    const monthConditions = Array.from(new Set(Array.from(compactDates).map((date) => date.slice(0, 6))))
      .map((monthKey) => `name like 'custom-dailynote-${monthKey}__'`);
    const stmt = [
      "select id, ial from blocks",
      `where type = 'd' and box = '${escapeSql(this.settings.notebookId)}'`,
      `and id in (select block_id from attributes where ${monthConditions.join(" or ")})`,
    ].join(" ");
    const rows = await this.request("/api/query/sql", { stmt });
    const dailyNoteIds = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const date = detectDailyNoteDate(row, dateKeys);
      if (date) {
        dailyNoteIds.set(date, String(row.id || ""));
      }
    });
    const missingDates = dateKeys.filter((date) => !dailyNoteIds.has(date));
    if (missingDates.length > 0) {
      const fallbackRows = await this.queryDateNamedDocs(missingDates);
      fallbackRows.forEach((row) => {
        const date = detectDailyNoteDate(row, missingDates);
        if (date && !dailyNoteIds.has(date)) {
          dailyNoteIds.set(date, String(row.id || ""));
        }
      });
    }
    const looseMissingDates = dateKeys.filter((date) => !dailyNoteIds.has(date));
    if (looseMissingDates.length > 0 && looseMissingDates.length <= 60) {
      const fallbackRows = await this.queryLooseDateNamedDocs(looseMissingDates);
      fallbackRows.forEach((row) => {
        const date = detectDailyNoteDate(row, looseMissingDates);
        if (date && !dailyNoteIds.has(date)) {
          dailyNoteIds.set(date, String(row.id || ""));
        }
      });
    }
    return dailyNoteIds;
  }

  async queryDateNamedDocs(dates) {
    const years = Array.from(new Set(dates.map((date) => date.slice(0, 4))));
    if (years.length === 0) {
      return [];
    }
    const yearConditions = years.flatMap((year) => [
      `content like '%${escapeSql(year)}%'`,
      `markdown like '%${escapeSql(year)}%'`,
      `hpath like '%${escapeSql(year)}%'`,
    ]);
    const stmt = [
      "select id, ial, content, markdown, hpath from blocks",
      `where type = 'd' and box = '${escapeSql(this.settings.notebookId)}'`,
      `and (${yearConditions.join(" or ")})`,
    ].join(" ");
    const rows = await this.request("/api/query/sql", { stmt });
    return Array.isArray(rows) ? rows : [];
  }

  async queryLooseDateNamedDocs(dates) {
    const candidates = Array.from(new Set(dates.flatMap(getLooseDateNameCandidates)));
    if (candidates.length === 0) {
      return [];
    }
    const conditions = candidates.flatMap((candidate) => [
      `content like '%${escapeSql(candidate)}%'`,
      `markdown like '%${escapeSql(candidate)}%'`,
      `hpath like '%${escapeSql(candidate)}%'`,
    ]);
    const stmt = [
      "select id, ial, content, markdown, hpath from blocks",
      `where type = 'd' and box = '${escapeSql(this.settings.notebookId)}'`,
      `and (${conditions.join(" or ")})`,
    ].join(" ");
    const rows = await this.request("/api/query/sql", { stmt });
    return Array.isArray(rows) ? rows : [];
  }

  async ensureExistingDailyNoteId(date = todayKey()) {
    if (this.dailyNoteDate === date && this.dailyNoteId) {
      return this.dailyNoteId;
    }
    this.dailyNoteDate = date;
    this.dailyNoteId = await this.findExistingDailyNoteId(date);
    return this.dailyNoteId;
  }

  async appendDailyNote(markdown) {
    if (!this.canWriteDailyNote()) {
      return null;
    }
    const dailyNoteId = await this.ensureExistingDailyNoteId();
    if (!dailyNoteId) {
      throw new Error("今天的日记文档不存在，请先在思源里手动创建。");
    }
    return await this.request("/api/block/appendBlock", {
      parentID: dailyNoteId,
      dataType: "markdown",
      data: markdown,
    });
  }

  async writeTaskToDailyNote(task, status = normalizeTaskStatus(task), options = {}) {
    if (!this.canWriteDailyNote()) {
      return false;
    }
    this.lastDailyNoteWriteAt = Date.now();
    const markdown = formatDailyTaskRecord(task, status, {
      ...options,
    });
    let changed = false;
    if (!task.blockId) {
      task.blockId = await this.findDailyTaskBlockId(task);
      changed = Boolean(task.blockId);
    }
    if (task.blockId) {
      try {
        await this.request("/api/block/updateBlock", {
          id: task.blockId,
          dataType: "markdown",
          data: markdown,
        });
        await this.setDailyTaskMetadataAttrs(task);
        this.lastDailyNoteWriteAt = Date.now();
        return changed;
      } catch (error) {
        console.warn("[siyuan-time-list] failed to update task block, append instead", error);
        task.blockId = "";
        changed = true;
      }
    }
    const result = await this.appendDailyNote(markdown);
    const blockId = extractBlockId(result);
    if (blockId) {
      task.blockId = blockId;
      await this.setDailyTaskMetadataAttrs(task);
      this.lastDailyNoteWriteAt = Date.now();
      this.markRecentLocalTaskChange(task);
      return true;
    }
    task.blockId = await this.findDailyTaskBlockId(task);
    if (task.blockId) {
      await this.setDailyTaskMetadataAttrs(task);
    }
    this.lastDailyNoteWriteAt = Date.now();
    this.markRecentLocalTaskChange(task);
    return Boolean(task.blockId) || changed;
  }

  async setDailyTaskMetadataAttrs(task) {
    if (!task?.blockId) {
      return;
    }
    await this.request("/api/attr/setBlockAttrs", {
      id: task.blockId,
      attrs: buildTimeListAttrs(task),
    });
  }

  async findDailyTaskBlockId(task) {
    const rows = await this.queryDailyTaskBlocks(task.date || todayKey());
    const records = parseDailyTaskRecordsFromRows(rows)
      .filter((record) => record.date === (task.date || todayKey()))
      .filter((record) => normalizeTitleKey(record.title) === normalizeTitleKey(task.title))
      .filter((record) => record.blockId);
    return records.at(-1)?.blockId || "";
  }

  async writeTasksToDailyNote(tasks) {
    let changed = false;
    for (const task of tasks) {
      changed = await this.writeTaskToDailyNote(task) || changed;
    }
    if (changed) {
      await this.saveState();
    }
  }

  async deleteDailyTaskBlock(task) {
    if (!task.blockId) {
      return;
    }
    this.lastDailyNoteWriteAt = Date.now();
    this.locallyDeletedBlockIds.set(task.blockId, this.lastDailyNoteWriteAt);
    try {
      await this.request("/api/block/deleteBlock", { id: task.blockId });
      this.lastDailyNoteWriteAt = Date.now();
    } catch (error) {
      console.warn("[siyuan-time-list] failed to delete task block", error);
    }
  }

  async queryDailyTaskBlocks(date) {
    const dailyNoteId = await this.ensureExistingDailyNoteId(date);
    if (!dailyNoteId) {
      return [];
    }
    const notebook = await this.ensureNotebookId();
    const stmt = [
      `select ${buildDailyTaskBlockSelect("blocks")} from blocks`,
      `where blocks.box = '${escapeSql(notebook)}'`,
      "and type <> 'd'",
      `and blocks.root_id = '${escapeSql(dailyNoteId)}'`,
      `and (blocks.markdown like '%${escapeSql(date)}%' or blocks.content like '%${escapeSql(date)}%')`,
      "order by blocks.created asc",
    ].join(" ");
    const rows = await this.request("/api/query/sql", { stmt });
    return Array.isArray(rows) ? rows : [];
  }

  async queryDailyTaskBlocksForDailyNotes(dailyNoteIds) {
    const ids = Array.from(new Set(Array.from(dailyNoteIds).filter(Boolean)));
    if (ids.length === 0) {
      return [];
    }
    const notebook = await this.ensureNotebookId();
    const stmt = [
      `select ${buildDailyTaskBlockSelect("blocks")} from blocks`,
      `where blocks.box = '${escapeSql(notebook)}'`,
      "and type <> 'd'",
      `and blocks.root_id in (${ids.map((id) => `'${escapeSql(id)}'`).join(", ")})`,
      "order by blocks.created asc",
    ].join(" ");
    const rows = await this.request("/api/query/sql", { stmt });
    return Array.isArray(rows) ? rows : [];
  }

  async syncTodayFromDailyNote({ silent = true } = {}) {
    if (!this.settings.notebookId) {
      return 0;
    }
    const date = todayKey();
    let rows = [];
    try {
      rows = await this.queryDailyTaskBlocks(date);
    } catch (error) {
      console.warn("[siyuan-time-list] failed to sync daily note", error);
      if (!silent) {
        showMessage(`同步今日日记失败：${error.message}`, 5000, "error");
      }
      return 0;
    }
    const records = parseDailyTaskRecordsFromRows(rows).filter((record) => record.date === date);
    const changed = this.mergeDailyTaskRecords(records, date);
    if (changed) {
      await this.saveState();
    }
    if (!silent) {
      showMessage(changed ? "已同步今日日记" : "今日日记已是最新");
    }
    return records.length;
  }

  async syncDatesFromDailyNotes(dates, { silent = true, removeMissing = true, skipToday = false } = {}) {
    if (!this.settings.notebookId) {
      return 0;
    }
    const dateKeys = uniqueDateKeys(dates).filter((date) => !skipToday || date !== todayKey());
    if (dateKeys.length === 0) {
      return 0;
    }
    const dateSet = new Set(dateKeys);
    let dailyNoteIds = new Map();
    let rows = [];
    try {
      dailyNoteIds = await this.findExistingDailyNoteIds(dateKeys);
      rows = await this.queryDailyTaskBlocksForDailyNotes(dailyNoteIds.values());
    } catch (error) {
      console.warn("[siyuan-time-list] failed to sync calendar daily notes", error);
      if (!silent) {
        showMessage(`同步任务日历失败：${error.message}`, 5000, "error");
      }
      return 0;
    }

    const recordsByDate = new Map();
    parseDailyTaskRecordsFromRows(rows)
      .filter((record) => dateSet.has(record.date))
      .forEach((record) => {
        if (!recordsByDate.has(record.date)) {
          recordsByDate.set(record.date, []);
        }
        recordsByDate.get(record.date).push(record);
      });

    let changed = false;
    for (const date of dateKeys) {
      if (!dailyNoteIds.has(date)) {
        continue;
      }
      changed = this.mergeDailyTaskRecords(recordsByDate.get(date) || [], date, { removeMissing }) || changed;
    }
    if (changed) {
      await this.saveState();
    }
    if (!silent) {
      showMessage(changed ? "已同步任务日历" : "任务日历已是最新");
    }
    return Array.from(recordsByDate.values()).reduce((sum, records) => sum + records.length, 0);
  }

  async syncCalendarFromDailyNotes({ silent = true } = {}) {
    const visibleDates = getCalendarVisibleDates(this.calendarDate, this.calendarMode);
    const syncKey = visibleDates.join("|");
    if (this.calendarSyncPromises.has(syncKey)) {
      return this.calendarSyncPromises.get(syncKey);
    }
    const syncPromise = this.syncDatesFromDailyNotes(visibleDates, {
      silent,
      removeMissing: false,
      skipToday: true,
    });
    this.calendarSyncPromises.set(syncKey, syncPromise);
    try {
      return await syncPromise;
    } finally {
      this.calendarSyncPromises.delete(syncKey);
    }
  }

  mergeDailyTaskRecords(records, date, { removeMissing = true } = {}) {
    let changed = false;
    const now = Date.now();
    this.pruneRecentLocalTaskChanges(now);
    for (const [blockId, deletedAt] of this.locallyDeletedBlockIds) {
      if (now - deletedAt > 8000) {
        this.locallyDeletedBlockIds.delete(blockId);
      }
    }
    const effectiveRecords = dedupeDailyTaskRecords(records.filter((record) => {
      return !record.blockId || !this.locallyDeletedBlockIds.has(record.blockId);
    }));
    const byBlockId = new Map(this.state.tasks.filter((task) => task.blockId).map((task) => [task.blockId, task]));
    const byKey = new Map(this.state.tasks.map((task) => [taskMergeKey(task, date), task]));
    const seenBlockIds = new Set(effectiveRecords.map((record) => record.blockId).filter(Boolean));

    effectiveRecords.forEach((record) => {
      const key = recordMergeKey(record);
      let task = record.blockId ? byBlockId.get(record.blockId) : null;
      task = task || byKey.get(key);
      if (!task) {
        task = {
          id: createId(),
          title: record.title,
          date: record.date,
          status: record.status,
          source: record.source || "daily-note",
          sourceDocId: record.sourceDocId || "",
          sourceKey: record.sourceKey || "",
          blockId: record.blockId,
          createdAt: record.createdAt || new Date().toISOString(),
          completedAt: record.status === "completed" ? new Date().toISOString() : "",
          abandonedAt: record.status === "abandoned" ? new Date().toISOString() : "",
          actualMinutes: record.actualMinutes,
          completionMode: record.status === "completed" ? "document" : "",
          pomodoros: normalizePomodoros(record.pomodoros),
          manualEntries: normalizeManualEntries(record.manualEntries),
          note: record.status === "completed" ? "文档同步" : "",
          summary: record.summary,
        };
        this.state.tasks.unshift(task);
        changed = true;
        return;
      }

      if (this.hasRecentLocalTaskChange(task, key)) {
        if (record.blockId && task.blockId !== record.blockId) {
          task.blockId = record.blockId;
          changed = true;
        }
        return;
      }

      const mergedPomodoros = mergePomodoros(task.pomodoros, record.pomodoros);
      const mergedManualEntries = mergeManualEntries(task.manualEntries, record.manualEntries);
      const nextValues = {
        title: record.title,
        date: record.date,
        status: record.status,
        blockId: record.blockId || task.blockId || "",
        actualMinutes: record.actualMinutes,
        completedAt: record.status === "completed" ? (task.completedAt || new Date().toISOString()) : "",
        abandonedAt: record.status === "abandoned" ? (task.abandonedAt || new Date().toISOString()) : "",
        completionMode: record.status === "completed" ? (task.completionMode || "document") : "",
        note: record.status === "completed" ? (task.note || "文档同步") : record.status === "abandoned" ? "已放弃" : "",
        summary: record.summary,
      };
      if (record.source) {
        nextValues.source = record.source;
        nextValues.sourceDocId = record.sourceDocId || "";
        nextValues.sourceKey = record.sourceKey || "";
      }
      Object.entries(nextValues).forEach(([field, value]) => {
        if (task[field] !== value) {
          task[field] = value;
          changed = true;
        }
      });
      if (pomodoroSignature(task.pomodoros) !== pomodoroSignature(mergedPomodoros)) {
        task.pomodoros = mergedPomodoros;
        changed = true;
      }
      if (manualEntrySignature(task.manualEntries) !== manualEntrySignature(mergedManualEntries)) {
        task.manualEntries = mergedManualEntries;
        changed = true;
      }
    });

    const canRemoveMissingBlockTasks = removeMissing && now - this.lastDailyNoteWriteAt > 8000;
    if (canRemoveMissingBlockTasks) {
      const before = this.state.tasks.length;
      this.state.tasks = this.state.tasks.filter((task) => {
        return !(task.date === date && task.blockId && !seenBlockIds.has(task.blockId));
      });
      if (this.state.tasks.length !== before) {
        if (this.state.activePomodoro && !this.findTask(this.state.activePomodoro.taskId)) {
          this.state.activePomodoro = null;
        }
        changed = true;
      }
    }
    return changed;
  }

  canWriteDailyNote() {
    return Boolean(this.settings.autoAppendToDailyNote && this.settings.notebookId);
  }

  async getDocumentMarkdown(documentId) {
    const data = await this.request("/api/export/exportMdContent", { id: documentId });
    return String(data?.content || data || "");
  }

  async refreshToday({ silent = false } = {}) {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    this.refreshPromise = (async () => {
      await this.syncTodayFromDailyNote({ silent: true });
      return this.createHabitTasksForToday({ silent });
    })();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  async createHabitTasksForToday({ silent = true } = {}) {
    if (!this.settings.habitDocId) {
      return 0;
    }
    if (this.settings.autoAppendToDailyNote && !this.settings.notebookId) {
      if (!silent) {
        showMessage("请先在设置里选择日记笔记本。", 5000, "error");
      }
      return 0;
    }
    if (this.settings.autoAppendToDailyNote && !(await this.ensureExistingDailyNoteId())) {
      if (!silent) {
        showMessage("今天的日记文档不存在，请先在思源里手动创建。", 5000, "error");
      }
      return 0;
    }

    let markdown = "";
    try {
      markdown = await this.getDocumentMarkdown(this.settings.habitDocId);
    } catch (error) {
      console.warn("[siyuan-time-list] failed to read habit document", error);
      if (!silent) {
        showMessage(`读取习惯文档失败：${error.message}`, 5000, "error");
      }
      return 0;
    }

    const titles = parseHabitTitles(markdown);
    await this.cleanupInvalidHabitTasksForToday();
    if (titles.length === 0) {
      if (!silent) {
        showMessage("习惯文档里没有可导入的行。", 3000, "error");
      }
      return 0;
    }

    const date = todayKey();
    await this.markExistingHabitTasksForToday(titles);
    const existingKeys = new Set(this.state.tasks
      .filter((task) => task.date === date)
      .map((task) => normalizeTitleKey(task.title)));
    if (this.settings.notebookId) {
      try {
        const rows = await this.queryDailyTaskBlocks(date);
        parseDailyTaskRecordsFromRows(rows)
          .filter((record) => record.date === date)
          .forEach((record) => existingKeys.add(normalizeTitleKey(record.title)));
      } catch (error) {
        console.warn("[siyuan-time-list] failed to check existing habit tasks", error);
      }
    }
    const nextTitles = titles.filter((title) => !existingKeys.has(normalizeTitleKey(title)));
    if (nextTitles.length === 0) {
      if (!silent) {
        showMessage("今天的习惯任务已经创建过了");
      }
      return 0;
    }

    const now = new Date().toISOString();
    const tasks = nextTitles.map((title) => ({
      id: createId(),
      title,
      date,
      status: "pending",
      source: "habit",
      sourceDocId: this.settings.habitDocId,
      sourceKey: normalizeTitleKey(title),
      createdAt: now,
      completedAt: "",
      actualMinutes: 0,
      completionMode: "",
      pomodoros: [],
      manualEntries: [],
      note: "",
      summary: "",
    }));

    this.state.tasks.unshift(...tasks);
    await this.saveState();

    try {
      await this.writeTasksToDailyNote(tasks);
    } catch (error) {
      console.warn("[siyuan-time-list] failed to append habit tasks", error);
    }

    if (!silent) {
      showMessage(`已导入 ${tasks.length} 个习惯任务`);
    }
    return tasks.length;
  }

  async cleanupInvalidHabitTasksForToday() {
    const date = todayKey();
    const before = this.state.tasks.length;
    this.state.tasks = this.state.tasks.filter((task) => {
      return !(task.date === date && isMetadataLine(task.title));
    });
    if (this.state.tasks.length !== before) {
      await this.saveState();
    }
  }

  async markExistingHabitTasksForToday(titles) {
    const date = todayKey();
    const habitKeys = new Set(titles.map((title) => normalizeTitleKey(title)));
    const changedTasks = [];
    this.state.tasks.forEach((task) => {
      if (task.date !== date || !habitKeys.has(normalizeTitleKey(task.title))) {
        return;
      }
      const sourceKey = normalizeTitleKey(task.title);
      if (task.source === "habit" && task.sourceDocId === this.settings.habitDocId && task.sourceKey === sourceKey) {
        return;
      }
      task.source = "habit";
      task.sourceDocId = this.settings.habitDocId;
      task.sourceKey = sourceKey;
      changedTasks.push(task);
    });
    if (changedTasks.length === 0) {
      return 0;
    }
    await this.saveState();
    for (const task of changedTasks) {
      try {
        await this.setDailyTaskMetadataAttrs(task);
      } catch (error) {
        console.warn("[siyuan-time-list] failed to backfill habit metadata", error);
      }
    }
    return changedTasks.length;
  }

  async addTasks(rawText) {
    const parsedTitles = parseTaskTitles(rawText);
    if (parsedTitles.length === 0) {
      showMessage("先写任务名称，一行一个。", 3000, "error");
      return;
    }
    if (this.settings.autoAppendToDailyNote && !this.settings.notebookId) {
      showMessage("请先在设置里选择日记笔记本。", 5000, "error");
      return;
    }
    if (this.settings.autoAppendToDailyNote && !(await this.ensureExistingDailyNoteId())) {
      showMessage("今天的日记文档不存在，请先在思源里手动创建。", 5000, "error");
      return;
    }
    const existingKeys = new Set(this.getTodayTasks().map((task) => normalizeTitleKey(task.title)));
    const titles = parsedTitles.filter((title) => !existingKeys.has(normalizeTitleKey(title)));
    if (titles.length === 0) {
      showMessage("今天已经有同名任务了。", 3000, "error");
      return;
    }

    const now = new Date().toISOString();
    const tasks = titles.map((title) => ({
      id: createId(),
      title,
      date: todayKey(),
      status: "pending",
      createdAt: now,
      completedAt: "",
      actualMinutes: 0,
      completionMode: "",
      pomodoros: [],
      manualEntries: [],
      note: "",
      summary: "",
    }));

    this.state.tasks.unshift(...tasks);
    tasks.forEach((task) => this.markRecentLocalTaskChange(task));
    await this.saveState();
    this.render({ preserveScroll: false });

    try {
      await this.writeTasksToDailyNote(tasks);
      this.render({ preserveScroll: false });
      showMessage(this.canWriteDailyNote() ? `已创建 ${tasks.length} 个任务，并写入今日日记` : `已创建 ${tasks.length} 个任务`);
    } catch (error) {
      showMessage(`任务已保存，但写入日记失败：${error.message}`, 5000, "error");
    }
  }

  openCreateTaskDialog() {
    if (this.createTaskDialog) {
      this.createTaskDialog.destroy();
      this.createTaskDialog = null;
    }

    const content = `
      <div class="time-list-dialog">
        <label class="time-list-field">
          <span>今日任务</span>
          <textarea id="time-list-create-titles" class="b3-text-field time-list-textarea" placeholder="支持多任务创建&#10;使用换行分隔"></textarea>
        </label>

        <div class="time-list-dialog-footer">
          <button id="time-list-create-cancel" class="b3-button b3-button--outline">取消</button>
          <button id="time-list-create-submit" class="b3-button b3-button--text">创建</button>
        </div>
      </div>
    `;

    this.createTaskDialog = new Dialog({
      title: "新建任务",
      content,
      width: this.isMobile ? "92vw" : "460px",
      height: "auto",
      destroyCallback: () => {
        this.createTaskDialog = null;
      },
    });

    const root = this.createTaskDialog.element;
    const titlesInput = root.querySelector("#time-list-create-titles");
    const cancelButton = root.querySelector("#time-list-create-cancel");
    const submitButton = root.querySelector("#time-list-create-submit");

    const submit = async () => {
      submitButton.disabled = true;
      const hasTitle = parseTaskTitles(titlesInput.value).length > 0;
      await this.addTasks(titlesInput.value);
      submitButton.disabled = false;
      if (hasTitle) {
        this.createTaskDialog?.destroy();
      }
    };

    cancelButton.addEventListener("click", () => this.createTaskDialog?.destroy());
    submitButton.addEventListener("click", submit);
    titlesInput.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        submit();
      }
    });

    setTimeout(() => titlesInput.focus(), 0);
  }

  async appendManualTime(taskId, payload = {}) {
    const task = this.findTask(taskId);
    if (!task) {
      return false;
    }

    const minutes = clampNumber(payload.minutes, 0, 24 * 60, 0);
    if (minutes <= 0) {
      showMessage("追加时长需要大于 0 分钟。", 3000, "error");
      return false;
    }

    task.manualEntries = normalizeManualEntries([...(task.manualEntries || []), {
      id: createId(),
      minutes,
      recordedAt: new Date().toISOString(),
      note: String(payload.note || "").trim(),
    }]);

    if (task.status === "completed") {
      task.actualMinutes = this.getTaskRecordedMinutes(task);
    }

    this.markRecentLocalTaskChange(task);
    await this.saveState();
    this.render();

    try {
      const changed = await this.writeTaskToDailyNote(task, normalizeTaskStatus(task));
      if (changed) {
        await this.saveState();
      }
      this.render();
      showMessage(`已追加 ${formatMinutes(minutes)}。`);
      return true;
    } catch (error) {
      showMessage(`时长已本地追加，但同步日记失败：${error.message}`, 5000, "error");
      return false;
    }
  }

  openAppendManualTimeDialog(taskId) {
    const task = this.findTask(taskId);
    if (!task) {
      return;
    }

    if (this.completeTaskDialog) {
      this.completeTaskDialog.destroy();
      this.completeTaskDialog = null;
    }

    const content = `
      <div class="time-list-dialog">
        <div class="time-list-dialog-title">${escapeHtml(task.title)}</div>
        <div class="time-list-dialog-hint">
          当前累计 ${formatMinutes(this.getTaskRecordedMinutes(task))} · 手动 ${formatMinutes(this.getTaskManualMinutes(task))} · 番茄 ${formatMinutes(this.getTaskPomodoroMinutes(task))}
        </div>

        <label class="time-list-field">
          <span>本次追加时长（分钟）</span>
          <input id="time-list-append-minutes" class="b3-text-field" type="number" min="1" placeholder="例如：25" />
        </label>

        <label class="time-list-field">
          <span>备注（可选）</span>
          <input id="time-list-append-note" class="b3-text-field" type="text" placeholder="例如：会议 / 复盘 / 补记" />
        </label>

        <div class="time-list-dialog-footer">
          <button id="time-list-append-cancel" class="b3-button b3-button--outline">取消</button>
          <button id="time-list-append-submit" class="b3-button b3-button--text">追加时长</button>
        </div>
      </div>
    `;

    this.completeTaskDialog = new Dialog({
      title: "追加时长",
      content,
      width: this.isMobile ? "92vw" : "480px",
      height: "auto",
      destroyCallback: () => {
        this.completeTaskDialog = null;
      },
    });

    const root = this.completeTaskDialog.element;
    const minutesInput = root.querySelector("#time-list-append-minutes");
    const noteInput = root.querySelector("#time-list-append-note");
    const submitButton = root.querySelector("#time-list-append-submit");
    const cancelButton = root.querySelector("#time-list-append-cancel");
    const updatePreview = () => {
      submitButton.disabled = clampNumber(minutesInput?.value, 0, 24 * 60, 0) <= 0;
    };

    minutesInput?.addEventListener("input", updatePreview);
    minutesInput?.addEventListener("change", updatePreview);
    cancelButton?.addEventListener("click", () => this.completeTaskDialog?.destroy());
    submitButton?.addEventListener("click", async () => {
      submitButton.disabled = true;
      const success = await this.appendManualTime(taskId, {
        minutes: minutesInput?.value || "",
        note: noteInput?.value || "",
      });
      if (success) {
        this.completeTaskDialog?.destroy();
      } else {
        updatePreview();
      }
    });

    updatePreview();
    setTimeout(() => minutesInput?.focus(), 0);
  }

  async finishTask(taskId, payload = {}) {
    const task = this.findTask(taskId);
    if (!task) {
      return false;
    }

    if (this.state.activePomodoro?.taskId === task.id) {
      await this.stopPomodoro(true);
    }

    const minutes = this.getTaskRecordedMinutes(task);
    if (minutes <= 0) {
      showMessage("先追加一些时长，再结束任务。", 3000, "error");
      return false;
    }

    task.status = "completed";
    task.actualMinutes = minutes;
    task.completionMode = "accumulated";
    task.completedAt = new Date().toISOString();
    task.abandonedAt = "";
    task.note = this.buildCompletionNote(task, minutes);
    task.summary = String(payload.summary || "").trim();

    this.markRecentLocalTaskChange(task);
    await this.saveState();
    this.render();

    try {
      const changed = await this.writeTaskToDailyNote(task, "completed", { minutes, summary: task.summary });
      if (changed) {
        await this.saveState();
      }
      this.render();
      showMessage("任务已结束，总时长已经汇总好了。");
      return true;
    } catch (error) {
      showMessage(`任务已结束，但写入日记失败：${error.message}`, 5000, "error");
      return false;
    }
  }

  openFinishTaskDialog(taskId) {
    const task = this.findTask(taskId);
    if (!task) {
      return;
    }

    if (this.completeTaskDialog) {
      this.completeTaskDialog.destroy();
      this.completeTaskDialog = null;
    }

    const totalMinutes = this.getTaskRecordedMinutes(task);
    const manualMinutes = this.getTaskManualMinutes(task);
    const pomodoroMinutes = this.getTaskPomodoroMinutes(task);
    const recordCount = normalizeManualEntries(task.manualEntries).length + normalizePomodoros(task.pomodoros).length + (this.getTaskActivePomodoro(task) ? 1 : 0);
    const content = `
      <div class="time-list-dialog">
        <div class="time-list-dialog-title">${escapeHtml(task.title)}</div>
        <div class="time-list-pomodoro-total">
          <span>结束后将汇总所有记录</span>
          <strong>${formatMinutes(totalMinutes)}</strong>
        </div>
        <div class="time-list-dialog-hint">
          共 ${recordCount} 次记录 · 手动 ${formatMinutes(manualMinutes)} · 番茄 ${formatMinutes(pomodoroMinutes)}
        </div>

        <label class="time-list-field">
          <span>任务总结（可选）</span>
          <textarea id="time-list-finish-summary" class="b3-text-field time-list-summary-textarea" placeholder="简单写一下今天这件事的收尾情况"></textarea>
        </label>

        <div class="time-list-dialog-footer">
          <button id="time-list-finish-cancel" class="b3-button b3-button--outline">取消</button>
          <button id="time-list-finish-submit" class="b3-button b3-button--text">结束任务</button>
        </div>
      </div>
    `;

    this.completeTaskDialog = new Dialog({
      title: "结束任务",
      content,
      width: this.isMobile ? "92vw" : "520px",
      height: "auto",
      destroyCallback: () => {
        this.completeTaskDialog = null;
      },
    });

    const root = this.completeTaskDialog.element;
    const summaryInput = root.querySelector("#time-list-finish-summary");
    const submitButton = root.querySelector("#time-list-finish-submit");
    const cancelButton = root.querySelector("#time-list-finish-cancel");

    submitButton.disabled = totalMinutes <= 0;
    cancelButton?.addEventListener("click", () => this.completeTaskDialog?.destroy());
    submitButton?.addEventListener("click", async () => {
      submitButton.disabled = true;
      const success = await this.finishTask(taskId, {
        summary: summaryInput?.value || "",
      });
      if (success) {
        this.completeTaskDialog?.destroy();
      } else {
        submitButton.disabled = totalMinutes <= 0;
      }
    });

    setTimeout(() => summaryInput?.focus(), 0);
  }

  buildCompletionNote(task, minutes) {
    return `累计 ${formatMinutes(minutes)} · 手动 ${formatMinutes(this.getTaskManualMinutes(task))} · 番茄 ${formatMinutes(totalPomodoroMinutes(task))}`;
  }

  async reopenTask(taskId) {
    const task = this.findTask(taskId);
    if (!task) {
      return;
    }
    task.status = "pending";
    task.completedAt = "";
    task.abandonedAt = "";
    task.actualMinutes = 0;
    task.completionMode = "";
    task.note = "";
    task.summary = "";
    this.markRecentLocalTaskChange(task);
    await this.saveState();
    try {
      const changed = await this.writeTaskToDailyNote(task, "pending");
      if (changed) {
        await this.saveState();
      }
    } catch (error) {
      showMessage(`任务已恢复，但写入日记失败：${error.message}`, 5000, "error");
    }
    this.render();
  }

  async abandonTask(taskId) {
    const task = this.findTask(taskId);
    if (!task) {
      return;
    }
    if (this.state.activePomodoro?.taskId === taskId) {
      await this.stopPomodoro(false);
    }
    task.status = "abandoned";
    task.completedAt = "";
    task.abandonedAt = new Date().toISOString();
    task.actualMinutes = 0;
    task.completionMode = "abandoned";
    task.note = "已放弃";
    this.markRecentLocalTaskChange(task);
    await this.saveState();
    this.render();

    try {
      const changed = await this.writeTaskToDailyNote(task, "abandoned");
      if (changed) {
        await this.saveState();
      }
      this.render();
      showMessage("已放弃任务");
    } catch (error) {
      showMessage(`任务已放弃，但写入日记失败：${error.message}`, 5000, "error");
    }
  }

  async deleteTask(taskId) {
    if (this.state.activePomodoro?.taskId === taskId) {
      await this.stopPomodoro(false);
    }
    const task = this.findTask(taskId);
    this.state.tasks = this.state.tasks.filter((task) => task.id !== taskId);
    await this.saveState();
    this.render();
    if (task) {
      await this.deleteDailyTaskBlock(task);
    }
  }

  async startPomodoro(taskId) {
    const task = this.findTask(taskId);
    if (!task || normalizeTaskStatus(task) !== "pending") {
      return;
    }
    if (this.state.activePomodoro) {
      showMessage("已经有一个番茄在锅里咕嘟咕嘟了。", 3000, "error");
      return;
    }
    this.state.activePomodoro = {
      id: createId(),
      taskId,
      startedAt: Date.now(),
      pausedAt: null,
      pausedMs: 0,
      isPaused: false,
    };
    await this.saveState();
    this.render();
  }

  async pausePomodoro() {
    const active = this.state.activePomodoro;
    if (!active || active.isPaused) {
      return;
    }
    active.isPaused = true;
    active.pausedAt = Date.now();
    await this.saveState();
    this.render();
  }

  async resumePomodoro() {
    const active = this.state.activePomodoro;
    if (!active || !active.isPaused) {
      return;
    }
    active.pausedMs += Date.now() - active.pausedAt;
    active.isPaused = false;
    active.pausedAt = null;
    await this.saveState();
    this.render();
  }

  async finishPomodoro() {
    await this.stopPomodoro(true);
  }

  async cancelPomodoro() {
    await this.stopPomodoro(false);
  }

  async stopPomodoro(shouldSave) {
    const active = this.state.activePomodoro;
    if (!active) {
      return;
    }
    const task = this.findTask(active.taskId);
    if (shouldSave && task) {
      const elapsedMs = getActiveElapsedMs(active);
      const minutes = Math.max(1, Math.round(elapsedMs / 60000));
      task.pomodoros.push({
        id: active.id,
        startedAt: new Date(active.startedAt).toISOString(),
        endedAt: new Date().toISOString(),
        minutes,
      });
      showMessage(`已记录一个番茄：${formatMinutes(minutes)}`);
    }
    this.state.activePomodoro = null;
    await this.saveState();
    this.render();
    await this.persistPomodoroTask(task);
  }

  findTask(taskId) {
    return this.state.tasks.find((task) => task.id === taskId);
  }

  getTaskActivePomodoro(task) {
    const active = this.state.activePomodoro;
    if (!active || !task || active.taskId !== task.id || normalizeTaskStatus(task) !== "pending") {
      return null;
    }
    return active;
  }

  getTaskManualMinutes(task) {
    return totalManualEntryMinutes(task?.manualEntries);
  }

  getTaskPomodoroMinutes(task) {
    return totalPomodoroMinutes(task) + activePomodoroMinutes(this.getTaskActivePomodoro(task));
  }

  getTaskRecordedMinutes(task) {
    return this.getTaskManualMinutes(task) + this.getTaskPomodoroMinutes(task);
  }

  async persistPomodoroTask(task, { silent = false } = {}) {
    if (!task || !this.canWriteDailyNote()) {
      return;
    }
    this.markRecentLocalTaskChange(task);
    try {
      const changed = await this.writeTaskToDailyNote(task, normalizeTaskStatus(task));
      if (changed) {
        await this.saveState();
      }
    } catch (error) {
      console.warn("[siyuan-time-list] failed to persist pomodoro state", error);
      if (!silent) {
        showMessage(`番茄状态已本地保存，但同步日记失败：${error.message}`, 5000, "error");
      }
    }
  }

  markRecentLocalTaskChange(task) {
    const changedAt = Date.now();
    this.recentLocalTaskChanges.set(task.id, changedAt);
    this.recentLocalTaskChanges.set(taskMergeKey(task), changedAt);
  }

  pruneRecentLocalTaskChanges(now = Date.now()) {
    for (const [key, changedAt] of this.recentLocalTaskChanges) {
      if (now - changedAt > 8000) {
        this.recentLocalTaskChanges.delete(key);
      }
    }
  }

  hasRecentLocalTaskChange(task, recordKey) {
    this.pruneRecentLocalTaskChanges();
    return this.recentLocalTaskChanges.has(task.id) || this.recentLocalTaskChanges.has(recordKey);
  }

  getTodayTasks() {
    const date = todayKey();
    return this.state.tasks.filter((task) => task.date === date);
  }

  getTodayTaskSignature() {
    return JSON.stringify(this.getTodayTasks()
      .map((task) => ({
        key: taskMergeKey(task),
        title: task.title,
        status: normalizeTaskStatus(task),
        actualMinutes: task.actualMinutes || 0,
        pomodoroMinutes: totalPomodoroMinutes(task),
        manualEntryMinutes: totalManualEntryMinutes(task.manualEntries),
        manualEntries: manualEntrySignature(task.manualEntries),
        activePomodoro: activePomodoroSignature(this.getTaskActivePomodoro(task)),
        summary: task.summary || "",
        blockId: task.blockId || "",
      }))
      .sort((left, right) => left.key.localeCompare(right.key)));
  }

  getCalendarTasks() {
    return this.state.tasks.filter((task) => isTaskInCalendarRange(task, this.calendarDate, this.calendarMode));
  }

  captureScrollState() {
    const scrollElement = this.dockElement?.querySelector(".time-list-scroll");
    if (!scrollElement) {
      return null;
    }
    return {
      top: scrollElement.scrollTop,
      left: scrollElement.scrollLeft,
    };
  }

  restoreScrollState(scrollState) {
    if (!scrollState) {
      return;
    }
    const scrollElement = this.dockElement?.querySelector(".time-list-scroll");
    if (!scrollElement) {
      return;
    }
    scrollElement.scrollTop = scrollState.top;
    scrollElement.scrollLeft = scrollState.left;
  }

  render({ preserveScroll = true } = {}) {
    if (!this.dockElement) {
      return;
    }
    if (!["tasks", "summary"].includes(this.currentDockView)) {
      this.currentDockView = "tasks";
    }

    const beforeCleanup = this.state.tasks.length;
    this.state.tasks = this.state.tasks.filter((task) => !(task.date === todayKey() && isMetadataLine(task.title)));
    if (this.state.tasks.length !== beforeCleanup) {
      this.saveState();
    }
    const scrollState = preserveScroll ? this.captureScrollState() : null;
    const todayTasks = this.getTodayTasks();
    const pendingTasks = todayTasks.filter((task) => task.status === "pending" || !task.status);
    const completedTasks = todayTasks.filter((task) => task.status === "completed");
    const abandonedTasks = todayTasks.filter((task) => task.status === "abandoned");
    this.dockElement.innerHTML = `
      <div class="time-list-dock">
        ${this.renderHeader()}
        ${this.renderViewTabs()}
        ${this.renderPomodoroPanel(pendingTasks)}
        ${
          this.currentDockView === "summary"
            ? this.renderSummaryView(todayTasks, completedTasks, abandonedTasks)
            : this.renderTasksView(todayTasks, pendingTasks, completedTasks, abandonedTasks)
        }
      </div>
    `;
    this.bindEvents();
    this.restoreScrollState(scrollState);
  }

  renderHeader() {
    return `
      <div class="time-list-header">
        <div class="time-list-title">
          <strong>${todayKey()}</strong>
        </div>
        <div class="time-list-icon-group">
          ${iconButton("iconTlCalendar", "open-calendar", "日历")}
          ${iconButton("iconTlSettings", "open-setting", "设置")}
          ${iconButton("iconTlRefresh", "refresh", "刷新")}
        </div>
      </div>
    `;
  }

  renderViewTabs() {
    return `
      <div class="time-list-tabs">
        <button class="${this.currentDockView === "tasks" ? "is-active" : ""}" data-action="switch-view" data-view="tasks">${icon("iconTlList")}<span>任务</span></button>
        <button class="${this.currentDockView === "summary" ? "is-active" : ""}" data-action="switch-view" data-view="summary">${icon("iconTlPie")}<span>总结</span></button>
      </div>
    `;
  }

  openCalendarDialog() {
    if (this.calendarDialog) {
      this.calendarDialog.destroy();
      this.calendarDialog = null;
    }

    this.calendarMode = this.calendarMode || "week";
    if (this.calendarMode === "week") {
      this.calendarDate = todayKey();
    }
    this.calendarFocusDate = this.resolveCalendarFocusDate();

    this.calendarDialog = new Dialog({
      title: "任务日历",
      content: `<div class="time-list-calendar-dialog">${this.renderCalendarView()}</div>`,
      width: this.isMobile ? "100vw" : "96vw",
      height: this.isMobile ? "100vh" : "92vh",
      destroyCallback: () => {
        this.calendarDialog = null;
      },
    });

    this.bindCalendarEvents(this.calendarDialog.element.querySelector(".time-list-calendar-dialog"));
    const initialCalendarDate = this.calendarDate;
    const initialCalendarMode = this.calendarMode;
    this.syncCalendarFromDailyNotes({ silent: true })
      .then(() => {
        if (this.calendarDate === initialCalendarDate && this.calendarMode === initialCalendarMode) {
          this.refreshCalendarDialog();
        }
      });
  }

  refreshCalendarDialog() {
    const root = this.calendarDialog?.element?.querySelector(".time-list-calendar-dialog");
    if (!root) {
      return;
    }
    this.calendarFocusDate = this.resolveCalendarFocusDate();
    root.innerHTML = this.renderCalendarView();
    this.bindCalendarEvents(root);
  }

  renderTasksView(todayTasks, pendingTasks, completedTasks, abandonedTasks) {
    return `
      ${this.renderCreateAction()}
      <div class="time-list-scroll">
        ${this.renderTaskList("今日任务", todayTasks)}
      </div>
    `;
  }

  renderSummaryView(todayTasks, completedTasks, abandonedTasks) {
    return `
      <div class="time-list-scroll">
        ${this.renderChart(todayTasks, completedTasks, abandonedTasks)}
      </div>
    `;
  }

  renderCalendarView() {
    const tasks = this.getCalendarTasks();
    const focusDate = this.resolveCalendarFocusDate();

    return `
      <div class="time-list-calendar">
        ${this.renderCalendarToolbar()}
      </div>
      <div class="time-list-calendar-layout ${this.calendarMode === "year" ? "is-year" : ""}">
        <div class="time-list-calendar-stage">
          ${
            this.calendarMode === "month"
              ? this.renderCalendarMonthView(tasks, focusDate)
              : this.calendarMode === "year"
                ? this.renderCalendarYearView(tasks)
                : this.renderCalendarWeekView(tasks, focusDate)
          }
        </div>
        ${this.calendarMode === "year" ? "" : this.renderCalendarDayDetail(tasks, focusDate)}
      </div>
    `;
  }

  renderCalendarToolbar() {
    return `
      <div class="time-list-calendar-toolbar">
        <div class="time-list-calendar-title-row">
          ${iconButton("iconTlChevronLeft", "calendar-prev", "上一个")}
          ${iconButton("iconTlChevronRight", "calendar-next", "下一个")}
          ${icon("iconTlCalendar")}
          <strong>${escapeHtml(formatCalendarTitle(this.calendarDate, this.calendarMode))}</strong>
          ${iconButton("iconTlRefresh", "calendar-refresh", "刷新")}
        </div>
        <div class="time-list-calendar-modes">
          ${["week", "month", "year"].map((mode) => `
            <button class="${this.calendarMode === mode ? "is-active" : ""}" data-action="calendar-mode" data-mode="${mode}">${calendarModeLabel(mode)}</button>
          `).join("")}
        </div>
      </div>
    `;
  }

  resolveCalendarFocusDate() {
    const visibleDates = getCalendarVisibleDates(this.calendarDate, this.calendarMode);
    if (visibleDates.includes(this.calendarFocusDate)) {
      return this.calendarFocusDate;
    }
    if (visibleDates.includes(todayKey())) {
      return todayKey();
    }
    if (visibleDates.includes(this.calendarDate)) {
      return this.calendarDate;
    }
    return visibleDates[0] || this.calendarDate || todayKey();
  }

  getTaskCalendarMinutes(task) {
    const status = normalizeTaskStatus(task);
    const recordedMinutes = this.getTaskRecordedMinutes(task);
    if (status === "completed") {
      return Number(task.actualMinutes) || recordedMinutes;
    }
    return recordedMinutes;
  }

  getTaskCalendarTimeText(task) {
    const totalMinutes = this.getTaskCalendarMinutes(task);
    return totalMinutes > 0 ? formatCompactMinutes(totalMinutes) : "";
  }

  renderCalendarWeekView(tasks, focusDate) {
    const dates = getWeekDates(this.calendarDate);
    const weekLabel = `第${getIsoWeekNumber(parseDateKey(this.calendarDate))}周`;
    return `
      <div class="time-list-calendar-grid-wrap">
        <div class="time-list-calendar-week-grid">
          <div class="time-list-calendar-week-head time-list-calendar-week-no">${weekLabel}</div>
          ${dates.map((date) => `<div class="time-list-calendar-week-head">${formatMonthDayWeek(date)}</div>`).join("")}
          <div class="time-list-calendar-all-day">全天</div>
          ${dates.map((date) => `
            <div
              class="time-list-calendar-day-cell ${date === todayKey() ? "is-today" : ""} ${date === focusDate ? "is-selected" : ""}"
              data-action="calendar-focus-date"
              data-date="${date}"
            >
              ${this.renderCalendarEventsForDate(date, tasks)}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  renderCalendarMonthView(tasks, focusDate) {
    const dates = getMonthGridDates(this.calendarDate);
    return `
      <div class="time-list-calendar-grid-wrap">
        <div class="time-list-calendar-month-grid">
          ${WEEKDAY_SHORT.map((day) => `<div class="time-list-calendar-month-head">${day}</div>`).join("")}
          ${dates.map((date, index) => `
            <div
              class="time-list-calendar-month-cell ${date.slice(0, 7) !== this.calendarDate.slice(0, 7) ? "is-outside" : ""} ${date === todayKey() ? "is-today" : ""} ${date === focusDate ? "is-selected" : ""}"
              data-action="calendar-focus-date"
              data-date="${date}"
            >
              ${index % 7 === 0 ? `<span class="time-list-calendar-week-badge">第${getIsoWeekNumber(parseDateKey(date))}周</span>` : ""}
              <div class="time-list-calendar-date-num">${Number(date.slice(8))}日</div>
              ${this.renderCalendarEventsForDate(date, tasks)}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  renderCalendarYearView(tasks) {
    const year = Number(this.calendarDate.slice(0, 4));
    return `
      <div class="time-list-calendar-year">
        ${Array.from({ length: 12 }, (_, index) => {
          const month = String(index + 1).padStart(2, "0");
          const monthKey = `${year}-${month}`;
          const completedCount = tasks.filter((task) => {
            return (task.date || "").slice(0, 7) === monthKey && normalizeTaskStatus(task) === "completed";
          }).length;
          return `
            <button class="time-list-calendar-month-card" data-action="calendar-jump-month" data-date="${monthKey}-01">
              <strong>${index + 1}月</strong>
              <span>${completedCount}</span>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  renderCalendarEventsForDate(date, tasks) {
    const dateTasks = sortTasksForDisplay(tasks.filter((task) => task.date === date));
    return `
      ${this.renderCalendarDaySummary(dateTasks)}
      ${dateTasks.map((task) => this.renderCalendarEvent(task)).join("")}
    `;
  }

  renderCalendarEvent(task) {
    const status = normalizeTaskStatus(task);
    const timeText = this.getTaskCalendarTimeText(task);
    return `
      <div class="time-list-calendar-event time-list-calendar-event--${status}" title="${escapeAttr(task.title)}">
        <div class="time-list-calendar-event-row">
          <strong>${taskCalendarMark(status)} ${escapeHtml(task.title)}</strong>
          ${timeText ? `<span class="time-list-calendar-event-time">${escapeHtml(timeText)}</span>` : ""}
        </div>
      </div>
    `;
  }

  renderCalendarDaySummary(tasks) {
    if (!tasks.length) {
      return "";
    }
    const totalMinutes = tasks.reduce((sum, task) => sum + this.getTaskCalendarMinutes(task), 0);
    const completedCount = tasks.filter((task) => normalizeTaskStatus(task) === "completed").length;
    const pieces = [];
    if (totalMinutes > 0) {
      pieces.push(formatCompactMinutes(totalMinutes));
    }
    if (completedCount > 0) {
      pieces.push(`${completedCount} 完成`);
    }
    if (pieces.length === 0) {
      pieces.push(`${tasks.length} 个任务`);
    }
    return `<div class="time-list-calendar-day-summary">${pieces.join(" · ")}</div>`;
  }

  renderCalendarDayDetail(tasks, focusDate) {
    const dayTasks = sortTasksForDisplay(tasks.filter((task) => task.date === focusDate));
    const footprintEntries = this.buildCalendarFootprintEntries(dayTasks, focusDate);
    const totalMinutes = dayTasks.reduce((sum, task) => sum + this.getTaskCalendarMinutes(task), 0);
    const completedCount = dayTasks.filter((task) => normalizeTaskStatus(task) === "completed").length;
    const recordCount = footprintEntries.length;
    return `
      <aside class="time-list-calendar-detail">
        <div class="time-list-calendar-detail-head">
          <strong>${escapeHtml(formatCalendarDetailTitle(focusDate))}</strong>
          <span>${escapeHtml(dayTasks.length ? `共 ${dayTasks.length} 个任务` : "这一天还没有任务")}</span>
        </div>
        <div class="time-list-calendar-detail-metrics">
          <div>
            <span>总投入</span>
            <strong>${totalMinutes ? formatCompactMinutes(totalMinutes) : "0m"}</strong>
          </div>
          <div>
            <span>已完成</span>
            <strong>${completedCount}</strong>
          </div>
          <div>
            <span>记录次数</span>
            <strong>${recordCount}</strong>
          </div>
        </div>
        <div class="time-list-calendar-detail-section">
          <div class="time-list-calendar-detail-title">一天足迹</div>
          <div class="time-list-calendar-footprint">
            ${footprintEntries.length
              ? footprintEntries.map((entry) => this.renderCalendarFootprintEntry(entry)).join("")
              : `<div class="time-list-empty">这一天还没有可追踪的时间足迹。</div>`}
          </div>
        </div>
      </aside>
    `;
  }

  buildCalendarFootprintEntries(tasks, focusDate) {
    const entries = [];

    tasks.forEach((task) => {
      normalizeManualEntries(task.manualEntries).forEach((item) => {
        const recordedAt = normalizeTimestamp(item.recordedAt);
        if (!recordedAt || !isTimestampOnDate(recordedAt, focusDate)) {
          return;
        }
        entries.push({
          id: `${task.id}-manual-${item.id}`,
          kind: "manual-entry",
          taskTitle: task.title,
          minutes: item.minutes,
          note: item.note || "",
          recordedAt,
          sortAt: recordedAt,
        });
      });

      normalizePomodoros(task.pomodoros).forEach((item) => {
        const startedAt = normalizeTimestamp(item.startedAt);
        const endedAt = normalizeTimestamp(item.endedAt);
        if (!startedAt || !endedAt) {
          return;
        }
        const isVisible = isTimestampOnDate(startedAt, focusDate) || isTimestampOnDate(endedAt, focusDate);
        if (!isVisible) {
          return;
        }
        entries.push({
          id: `${task.id}-pomodoro-${item.id}`,
          kind: "pomodoro",
          taskTitle: task.title,
          minutes: item.minutes,
          startedAt,
          endedAt,
          sortAt: endedAt,
        });
      });
    });

    return entries.sort((left, right) => {
      const leftTime = Number.isFinite(left.sortAt) ? left.sortAt : Number.MAX_SAFE_INTEGER;
      const rightTime = Number.isFinite(right.sortAt) ? right.sortAt : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime || left.taskTitle.localeCompare(right.taskTitle, "zh-Hans-CN");
    });
  }

  renderCalendarFootprintEntry(entry) {
    const title = escapeHtml(entry.taskTitle);
    if (entry.kind === "manual-entry") {
      return `
        <div class="time-list-calendar-footprint-item">
          <div class="time-list-calendar-footprint-time">${escapeHtml(formatTimeOfDay(entry.recordedAt))}</div>
          <div class="time-list-calendar-footprint-body">
            <strong>${title}</strong>
            <span>手动补记 · ${formatCompactMinutes(entry.minutes)}</span>
            ${entry.note ? `<em>${escapeHtml(entry.note)}</em>` : ""}
          </div>
        </div>
      `;
    }

    const timeText = formatTimeRange(entry.startedAt, entry.endedAt);
    return `
      <div class="time-list-calendar-footprint-item">
        <div class="time-list-calendar-footprint-time">${escapeHtml(timeText)}</div>
        <div class="time-list-calendar-footprint-body">
          <strong>${title}</strong>
          <span>番茄专注 · ${formatCompactMinutes(entry.minutes)}</span>
        </div>
      </div>
    `;
  }

  renderCreateAction() {
    return `
      <div class="time-list-dashboard">
        <button class="time-list-create-card" data-action="open-create-task">
          ${icon("iconTlPlus")}
          <strong>新建</strong>
        </button>
      </div>
    `;
  }

  renderPomodoroPanel(pendingTasks) {
    const active = this.state.activePomodoro;
    if (active) {
      const task = this.findTask(active.taskId);
      const elapsedMs = getActiveElapsedMs(active);
      return `
        <div class="time-list-timer">
          <div class="time-list-timer-head">
            ${icon("iconTlClock")}
            <span>${escapeHtml(task?.title || "任务已不存在")}</span>
            <strong>${formatClock(elapsedMs)}</strong>
          </div>
          <div class="time-list-icon-group time-list-icon-group--center">
            ${
              active.isPaused
                ? iconButton("iconTlPlay", "resume-pomodoro", "继续")
                : iconButton("iconTlPause", "pause-pomodoro", "暂停")
            }
            ${iconButton("iconTlStop", "finish-pomodoro", "停止并记录")}
            ${iconButton("iconTlClose", "cancel-pomodoro", "取消", "danger")}
          </div>
        </div>
      `;
    }

    return "";
  }

  renderChart(todayTasks, completedTasks, abandonedTasks) {
    const total = completedTasks.reduce((sum, task) => sum + (task.actualMinutes || 0), 0);
    const totalPomodoro = todayTasks.reduce((sum, task) => sum + this.getTaskPomodoroMinutes(task), 0);
    const distributionTasks = completedTasks
      .slice()
      .sort((a, b) => (b.actualMinutes || 0) - (a.actualMinutes || 0))
      .filter((task) => (task.actualMinutes || 0) > 0);
    const pie = renderPieSvg(distributionTasks, total);
    const bars = distributionTasks
      .map((task) => {
        const minutes = task.actualMinutes || 0;
        const width = total > 0 ? Math.max(4, Math.round((minutes / total) * 100)) : 0;
        const color = PIE_COLORS[distributionTasks.indexOf(task) % PIE_COLORS.length];
        return `
          <div class="time-list-bar">
            <div class="time-list-bar-label">
              <span><i style="background:${color}"></i>${escapeHtml(task.title)}</span>
              <span>${formatMinutes(minutes)} · ${formatPercent(minutes, total)}</span>
            </div>
            <div class="time-list-bar-track"><div class="time-list-bar-fill" style="width:${width}%; background:${color}"></div></div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="time-list-chart">
        <div class="time-list-chart-title">今日总时长</div>
        <div class="time-list-metrics time-list-metrics--two">
          <div><span>完成用时</span><strong>${formatMinutes(total)}</strong></div>
          <div><span>番茄累计</span><strong>${formatMinutes(totalPomodoro)}</strong></div>
        </div>
        <div class="time-list-chart-body">
          ${pie}
        </div>
        <div class="time-list-bars">${bars || `<div class="time-list-note">暂无数据</div>`}</div>
      </div>
    `;
  }

  renderTaskList(title, tasks) {
    const sortedTasks = sortTasksForDisplay(tasks);
    const items = sortedTasks
      .map((task) => this.renderTaskItem(task))
      .join("");
    return `
      <div>
        <div class="time-list-section-title">${title} · ${sortedTasks.length}</div>
        <div class="time-list-items">
          ${items || `<div class="time-list-empty">今天还没有任务。点“新建今日任务”开始。</div>`}
        </div>
      </div>
    `;
  }

  renderTaskItem(task) {
    const status = normalizeTaskStatus(task);
    const minutes = status === "completed" ? task.actualMinutes : this.getTaskRecordedMinutes(task);
    const timeText = minutes ? formatCompactMinutes(minutes) : "0m";

    return `
      <div class="time-list-item time-list-item--${status}" data-task-id="${task.id}">
        <div class="time-list-item-head">
          <strong>${escapeHtml(taskScopeLabel(task, status))}</strong>
          <span>${icon("iconTlClock")}${timeText}</span>
          <em>${taskStatusLabel(status)}</em>
        </div>
        <div class="time-list-item-name">${escapeHtml(task.title)}</div>
        ${task.summary ? `<div class="time-list-item-summary">${escapeHtml(task.summary)}</div>` : ""}
        ${
          status === "completed"
            ? this.renderCompletedActions(task)
            : status === "abandoned"
              ? this.renderAbandonedActions(task)
              : this.renderPendingActions(task)
        }
      </div>
    `;
  }

  renderPendingActions(task) {
    return `
      <div class="time-list-actions">
        ${iconButton("iconTlPlus", "append-manual-time", "追加时长", "", task.id)}
        ${iconButton("iconTlClock", "start-pomodoro", "开始番茄", "", task.id, this.state.activePomodoro)}
        ${iconButton("iconTlCheck", "finish-task", "结束", "", task.id)}
        ${iconButton("iconTlClose", "abandon-task", "放弃", "danger", task.id)}
      </div>
    `;
  }

  renderCompletedActions(task) {
    return `
      <div class="time-list-actions">
        ${iconButton("iconTlUndo", "reopen-task", "恢复", "", task.id)}
        ${iconButton("iconTlTrash", "delete-task", "删除", "danger", task.id)}
      </div>
    `;
  }

  renderAbandonedActions(task) {
    return `
      <div class="time-list-actions">
        ${iconButton("iconTlUndo", "reopen-task", "恢复", "", task.id)}
        ${iconButton("iconTlTrash", "delete-task", "删除", "danger", task.id)}
      </div>
    `;
  }

  bindEvents() {
    const root = this.dockElement.querySelector(".time-list-dock");
    if (!root) {
      return;
    }

    root.querySelector("[data-action='open-calendar']")?.addEventListener("click", () => this.openCalendarDialog());
    root.querySelector("[data-action='open-setting']")?.addEventListener("click", () => this.openSetting());
    root.querySelector("[data-action='open-create-task']")?.addEventListener("click", () => this.openCreateTaskDialog());
    root.querySelector("[data-action='refresh']")?.addEventListener("click", async () => {
      await this.refreshToday({ silent: false });
      this.render();
    });
    root.querySelectorAll("[data-action]").forEach((button) => {
      const action = button.dataset.action;
      if (["open-calendar", "open-setting", "open-create-task", "refresh"].includes(action)) {
        return;
      }
      button.addEventListener("click", async () => {
        const taskId = button.dataset.taskId;
        if (action === "append-manual-time") {
          this.openAppendManualTimeDialog(taskId);
        } else if (action === "finish-task") {
          this.openFinishTaskDialog(taskId);
        } else if (action === "switch-view") {
          this.currentDockView = button.dataset.view || "tasks";
          this.render({ preserveScroll: false });
        } else if (action === "start-pomodoro") {
          await this.startPomodoro(taskId);
        } else if (action === "pause-pomodoro") {
          await this.pausePomodoro();
        } else if (action === "resume-pomodoro") {
          await this.resumePomodoro();
        } else if (action === "finish-pomodoro") {
          await this.finishPomodoro();
        } else if (action === "cancel-pomodoro") {
          await this.cancelPomodoro();
        } else if (action === "reopen-task") {
          await this.reopenTask(taskId);
        } else if (action === "abandon-task") {
          await this.abandonTask(taskId);
        } else if (action === "delete-task") {
          await this.deleteTask(taskId);
        }
      });
    });
  }

  bindCalendarEvents(root) {
    if (!root) {
      return;
    }

    root.querySelectorAll("[data-action]").forEach((button) => {
      const action = button.dataset.action;
      button.addEventListener("click", async () => {
        if (action === "calendar-mode") {
          this.calendarMode = button.dataset.mode || "week";
          if (this.calendarMode === "week") {
            this.calendarDate = todayKey();
          }
          this.refreshCalendarDialog();
          await this.syncCalendarFromDailyNotes({ silent: true });
          this.refreshCalendarDialog();
        } else if (action === "calendar-prev") {
          this.calendarDate = shiftCalendarDate(this.calendarDate, this.calendarMode, -1);
          this.refreshCalendarDialog();
          await this.syncCalendarFromDailyNotes({ silent: true });
          this.refreshCalendarDialog();
        } else if (action === "calendar-next") {
          this.calendarDate = shiftCalendarDate(this.calendarDate, this.calendarMode, 1);
          this.refreshCalendarDialog();
          await this.syncCalendarFromDailyNotes({ silent: true });
          this.refreshCalendarDialog();
        } else if (action === "calendar-refresh") {
          await this.syncCalendarFromDailyNotes({ silent: false });
          this.refreshCalendarDialog();
          this.render();
        } else if (action === "calendar-focus-date") {
          this.calendarFocusDate = button.dataset.date || this.resolveCalendarFocusDate();
          this.refreshCalendarDialog();
        } else if (action === "calendar-jump-month") {
          this.calendarDate = button.dataset.date || this.calendarDate;
          this.calendarMode = "month";
          this.calendarFocusDate = this.calendarDate;
          this.refreshCalendarDialog();
          await this.syncCalendarFromDailyNotes({ silent: true });
          this.refreshCalendarDialog();
        }
      });
    });
  }
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTaskTitles(rawText) {
  return [...new Set(String(rawText)
    .split(/\n+/)
    .map(cleanTaskLine)
    .filter(Boolean))];
}

function parseHabitTitles(markdown) {
  const titles = [];
  let inCodeBlock = false;
  let inFrontmatter = false;
  let hasSeenContent = false;
  for (const rawLine of String(markdown || "").split(/\n+/)) {
    const line = rawLine.trim();
    if (!hasSeenContent && line === "---") {
      inFrontmatter = true;
      hasSeenContent = true;
      continue;
    }
    if (inFrontmatter) {
      if (line === "---") {
        inFrontmatter = false;
      }
      continue;
    }
    if (line.startsWith("```") || line.startsWith("~~~")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock || !line || line.startsWith("#") || line.startsWith("|") || line === "---" || isMetadataLine(line)) {
      continue;
    }
    hasSeenContent = true;
    const title = cleanTaskLine(line);
    if (title && !isMetadataLine(title)) {
      titles.push(title);
    }
  }
  return [...new Set(titles)];
}

function isMetadataLine(line) {
  const text = String(line || "").trim();
  if (!text) {
    return true;
  }
  if (/^(title|date|lastmod|updated|created|modified|tags|categories|aliases|id|type|status|author|description|slug)\s*[:：]/i.test(text)) {
    return true;
  }
  if (/^[a-zA-Z_][\w-]{0,32}\s*[:：]\s*\S+/.test(text)) {
    return true;
  }
  return false;
}

function cleanTaskLine(line) {
  return String(line)
    .trim()
    .replace(/<!--\s*time-list:[\s\S]*?-->/g, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)、]\s+/, "")
    .replace(/^\[[ xX]\]\s+/, "")
    .replace(/^【.*?】\s*/, "")
    .replace(/\s*(?:\uD83D\uDCC5)?\s*\d{4}-\d{2}-\d{2}\s*/g, " ")
    .replace(/\s*(✅|✔️|☑️|🚫|❌)\s*/g, " ")
    .replace(/\s*⏱\s*\S+\s*/g, " ")
    .replace(/\s*🍅\s*\S+\s*/g, " ")
    .replace(/\s*✍\s*\S+\s*/g, " ")
    .replace(/\s*用时\s*\S+\s*/g, " ")
    .replace(/\s*📝.*$/g, "")
    .replace(/\s*#\S+#?\s*$/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDailyTaskRecords(tasks) {
  return tasks.map((task) => formatDailyTaskLine(task)).join("\n\n") + "\n";
}

function formatDailyTaskRecord(task, status = normalizeTaskStatus(task), options = {}) {
  const summary = String(options.summary ?? task.summary ?? "").trim();
  const summaryText = summary ? ` 📝${escapeMarkdown(summary).replace(/\s+/g, " ")}` : "";
  return `${formatDailyTaskLine(task, status, options)}${summaryText}\n`;
}

function formatDailyTaskLine(task, status = normalizeTaskStatus(task), options = {}) {
  const date = task.date || todayKey();
  const parts = [escapeMarkdown(task.title), date];
  if (status === "completed") {
    const minutes = Number(options.minutes ?? task.actualMinutes) || 0;
    parts.push("✅");
    if (minutes > 0) {
      parts.push(`⏱${formatCompactMinutes(minutes)}`);
    }
  } else if (status === "abandoned") {
    parts.push("🚫");
  }
  const pomodoroMinutes = totalPomodoroMinutes(task);
  if (pomodoroMinutes > 0) {
    parts.push(`🍅${formatCompactMinutes(pomodoroMinutes)}`);
  }
  const manualMinutes = totalManualEntryMinutes(task.manualEntries);
  if (manualMinutes > 0) {
    parts.push(`✍${formatCompactMinutes(manualMinutes)}`);
  }
  return parts.join(" ");
}

function buildTimeListAttrs(task) {
  const pomodoros = normalizePomodoros(task.pomodoros);
  const manualEntries = normalizeManualEntries(task.manualEntries);
  return {
    [POMODOROS_ATTR]: pomodoros.length ? JSON.stringify(pomodoros) : "",
    [MANUAL_ENTRIES_ATTR]: manualEntries.length ? JSON.stringify(manualEntries) : "",
    [ACTIVE_POMODORO_ATTR]: "",
    [SOURCE_ATTR]: task.source ? JSON.stringify(task.source) : "",
    [SOURCE_DOC_ID_ATTR]: task.sourceDocId ? JSON.stringify(task.sourceDocId) : "",
    [SOURCE_KEY_ATTR]: task.sourceKey ? JSON.stringify(task.sourceKey) : "",
  };
}

function normalizeTitleKey(title) {
  return cleanTaskLine(title).replace(/\s+/g, "").toLowerCase();
}

function taskMergeKey(task, fallbackDate = todayKey()) {
  return `${task.date || fallbackDate}|${normalizeTitleKey(task.title)}`;
}

function recordMergeKey(record) {
  return `${record.date || todayKey()}|${normalizeTitleKey(record.title)}`;
}

function dedupeDailyTaskRecords(records) {
  const byKey = new Map();
  records.forEach((record) => {
    const key = recordMergeKey(record);
    const current = byKey.get(key);
    if (!current || compareDailyTaskRecord(record, current) > 0) {
      byKey.set(key, record);
    }
  });
  return Array.from(byKey.values());
}

function compareDailyTaskRecord(left, right) {
  const statusRank = {
    pending: 0,
    abandoned: 1,
    completed: 2,
  };
  const statusDiff = (statusRank[left.status] || 0) - (statusRank[right.status] || 0);
  if (statusDiff !== 0) {
    return statusDiff;
  }
  const leftTime = Date.parse(left.updatedAt || left.createdAt || "") || 0;
  const rightTime = Date.parse(right.updatedAt || right.createdAt || "") || 0;
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return left.blockId && !right.blockId ? 1 : 0;
}

function parseDailyTaskRecordsFromRows(rows) {
  const records = [];
  rows.forEach((row) => {
    const markdown = String(row.markdown || row.content || "");
    const parsedLines = markdown
      .split(/\n+/)
      .map((line) => parseDailyTaskRecord(line, row))
      .filter(Boolean);
    parsedLines.forEach((record) => {
      records.push({
        ...record,
        blockId: parsedLines.length === 1 ? row.id : "",
        createdAt: row.created ? siyuanTimeToIso(row.created) : "",
        updatedAt: row.updated ? siyuanTimeToIso(row.updated) : "",
      });
    });
  });
  return records;
}

function parseDailyTaskRecord(line, row = {}) {
  const rawText = String(line || "").trim();
  const text = stripTimeListComments(rawText);
  const dateMatch = /(?:\uD83D\uDCC5\s*)?(\d{4}-\d{2}-\d{2})/.exec(text);
  if (!dateMatch) {
    return null;
  }
  const title = cleanTaskLine(text.slice(0, dateMatch.index));
  if (!title || isMetadataLine(title)) {
    return null;
  }
  const status = /✅|✔️|☑️/.test(text) ? "completed" : /🚫|❌/.test(text) ? "abandoned" : "pending";
  const summaryMatch = /📝\s*(.+)$/.exec(text);
  const actualMinutes = status === "completed" ? parseTaskMinutes(text) : 0;
  const source = normalizeTaskSource(parseTimeListAttr(row, SOURCE_ATTR) || parseTimeListComment(rawText, "source"));
  return {
    title,
    date: dateMatch[1],
    status,
    source,
    sourceDocId: source ? String(parseTimeListAttr(row, SOURCE_DOC_ID_ATTR) || parseTimeListComment(rawText, "source-doc-id") || "") : "",
    sourceKey: source ? String(parseTimeListAttr(row, SOURCE_KEY_ATTR) || parseTimeListComment(rawText, "source-key") || "") : "",
    blockId: row.id || "",
    actualMinutes,
    pomodoros: parsePomodoros(rawText, text, row),
    manualEntries: parseManualEntries(rawText, text, row),
    activePomodoro: null,
    summary: summaryMatch ? unescapeMarkdown(summaryMatch[1].trim()) : "",
  };
}

function normalizeTaskSource(source) {
  const value = String(source || "").trim();
  return value === "habit" ? value : "";
}

function stripTimeListComments(text) {
  return String(text || "").replace(/<!--\s*time-list:[\s\S]*?-->/g, "").trim();
}

function parseTimeListComment(text, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`<!--\\s*time-list:${escapedKey}\\s+([\\s\\S]*?)\\s*-->`).exec(String(text || ""));
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    console.warn("[siyuan-time-list] failed to parse metadata comment", error);
    return null;
  }
}

function parseTimeListAttr(row, key) {
  const value = row?.[key] ?? parseIalAttr(row?.ial, key);
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(unescapeHtmlEntities(value));
  } catch (error) {
    console.warn("[siyuan-time-list] failed to parse metadata attr", error);
    return null;
  }
}

function parseIalAttr(ial, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escapedKey}="([^"]*)"`).exec(String(ial || ""));
  return match ? match[1] : "";
}

function buildDailyTaskBlockSelect(tableName = "blocks") {
  const table = tableName || "blocks";
  return [
    `${table}.id`,
    `${table}.markdown`,
    `${table}.content`,
    `${table}.ial`,
    `${table}.created`,
    `${table}.updated`,
    buildBlockAttrSelect(table, POMODOROS_ATTR),
    buildBlockAttrSelect(table, MANUAL_ENTRIES_ATTR),
    buildBlockAttrSelect(table, ACTIVE_POMODORO_ATTR),
    buildBlockAttrSelect(table, SOURCE_ATTR),
    buildBlockAttrSelect(table, SOURCE_DOC_ID_ATTR),
    buildBlockAttrSelect(table, SOURCE_KEY_ATTR),
  ].join(", ");
}

function buildBlockAttrSelect(tableName, attrName) {
  return `(select value from attributes where block_id = ${tableName}.id and name = '${escapeSql(attrName)}' limit 1) as "${attrName}"`;
}

function parsePomodoros(rawText, visibleText, row = {}) {
  const visibleMinutes = parsePomodoroMinutes(visibleText);
  if (visibleMinutes <= 0) {
    return [];
  }
  const parsed = parseTimeListAttr(row, POMODOROS_ATTR) || parseTimeListComment(rawText, "pomodoros");
  const pomodoros = normalizePomodoros(parsed);
  if (pomodoros.length > 0) {
    return reconcilePomodoroDetailsWithVisibleMinutes(pomodoros, visibleMinutes);
  }
  const referenceTime = getRowReferenceTimestamp(row);
  return [{
    id: `daily-aggregate-${visibleMinutes}`,
    startedAt: referenceTime ? new Date(referenceTime - visibleMinutes * 60000).toISOString() : "",
    endedAt: referenceTime ? new Date(referenceTime).toISOString() : "",
    minutes: visibleMinutes,
  }];
}

function parseManualEntries(rawText, visibleText, row = {}) {
  const visibleMinutes = parseManualMinutes(visibleText);
  if (visibleMinutes <= 0) {
    return [];
  }
  const parsed = parseTimeListAttr(row, MANUAL_ENTRIES_ATTR) || parseTimeListComment(rawText, "manual-entries");
  const manualEntries = normalizeManualEntries(parsed);
  if (manualEntries.length > 0) {
    return reconcileManualDetailsWithVisibleMinutes(manualEntries, visibleMinutes);
  }
  const referenceTime = getRowReferenceTimestamp(row);
  return [{
    id: `daily-manual-aggregate-${visibleMinutes}`,
    minutes: visibleMinutes,
    recordedAt: referenceTime ? new Date(referenceTime).toISOString() : "",
    note: "",
  }];
}

function parseActivePomodoro(rawText, visibleText, row = {}) {
  return normalizeActivePomodoro(
    parseTimeListAttr(row, ACTIVE_POMODORO_ATTR)
    || parseTimeListComment(rawText, "active-pomodoro")
    || parseVisibleActivePomodoro(visibleText, row)
  );
}

function parseVisibleActivePomodoro(text, row = {}) {
  const match = /🍅\s*(▶|⏸)\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i.exec(String(text || ""));
  if (!match || (!match[2] && !match[3] && !/0\s*m/i.test(match[0]))) {
    return null;
  }
  const minutes = (Number(match[2]) || 0) * 60 + (Number(match[3]) || 0);
  const baseTime = Date.parse(
    row.updated ? siyuanTimeToIso(row.updated) : row.created ? siyuanTimeToIso(row.created) : ""
  ) || Date.now();
  const isPaused = match[1] === "⏸";
  return {
    startedAt: baseTime - minutes * 60000,
    pausedAt: isPaused ? baseTime : null,
    pausedMs: 0,
    isPaused,
  };
}

function parseTaskMinutes(text) {
  const compactMatch = /⏱\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i.exec(text);
  if (compactMatch && (compactMatch[1] || compactMatch[2])) {
    return (Number(compactMatch[1]) || 0) * 60 + (Number(compactMatch[2]) || 0);
  }
  const minuteMatch = /用时\s*(\d+)\s*(?:分钟|m)?/i.exec(text);
  if (minuteMatch) {
    return Number(minuteMatch[1]) || 0;
  }
  return 0;
}

function parsePomodoroMinutes(text) {
  const match = /🍅\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i.exec(String(text || ""));
  if (match && (match[1] || match[2])) {
    return (Number(match[1]) || 0) * 60 + (Number(match[2]) || 0);
  }
  return 0;
}

function parseManualMinutes(text) {
  const match = /✍\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i.exec(String(text || ""));
  if (match && (match[1] || match[2])) {
    return (Number(match[1]) || 0) * 60 + (Number(match[2]) || 0);
  }
  return 0;
}

function getRowReferenceTimestamp(row = {}) {
  return Date.parse(
    row.updated ? siyuanTimeToIso(row.updated) : row.created ? siyuanTimeToIso(row.created) : ""
  ) || 0;
}

function shouldSyncAfterDocumentSave(event, dailyNoteId) {
  const detail = event?.detail;
  const cmd = String(detail?.cmd || "").toLowerCase();
  if (!cmd) {
    return false;
  }
  if (cmd === "createdailynote") {
    return true;
  }
  if (cmd !== "savedoc" && cmd !== "refreshdoc") {
    return false;
  }
  const rootIds = extractRootIdsFromWsDetail(detail);
  if (rootIds.length === 0 || !dailyNoteId) {
    return true;
  }
  return rootIds.includes(dailyNoteId);
}

function extractRootIdsFromWsDetail(detail) {
  const rootIds = new Set();
  const add = (value) => {
    if (typeof value === "string" && value) {
      rootIds.add(value);
    }
  };
  const addMany = (values) => {
    if (Array.isArray(values)) {
      values.forEach(add);
    }
  };

  addMany(detail?.context?.rootIDs);
  addMany(detail?.data?.rootIDs);
  add(detail?.data?.rootID);
  add(detail?.data?.rootId);
  add(detail?.data?.id);
  if (Array.isArray(detail?.data)) {
    detail.data.forEach((transaction) => {
      add(transaction?.rootID);
      add(transaction?.rootId);
      add(transaction?.id);
      addMany(transaction?.context?.rootIDs);
      if (Array.isArray(transaction?.doOperations)) {
        transaction.doOperations.forEach((operation) => {
          add(operation?.rootID);
          add(operation?.rootId);
        });
      }
    });
  }
  return Array.from(rootIds);
}

function siyuanTimeToIso(value) {
  const text = String(value || "");
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(text);
  if (!match) {
    return "";
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6])).toISOString();
}

function sortTasksForDisplay(tasks) {
  const statusOrder = {
    pending: 0,
    abandoned: 1,
    completed: 2,
  };
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((left, right) => {
      const leftStatus = normalizeTaskStatus(left.task);
      const rightStatus = normalizeTaskStatus(right.task);
      const statusDiff = statusOrder[leftStatus] - statusOrder[rightStatus];
      if (statusDiff !== 0) {
        return statusDiff;
      }
      const leftTime = Date.parse(left.task.createdAt || left.task.completedAt || "") || 0;
      const rightTime = Date.parse(right.task.createdAt || right.task.completedAt || "") || 0;
      return rightTime - leftTime || left.index - right.index;
    })
    .map((item) => item.task);
}

function isTaskInCalendarRange(task, selectedDate, mode) {
  const date = task.date || "";
  if (mode === "year") {
    return date.slice(0, 4) === selectedDate.slice(0, 4);
  }
  if (mode === "month") {
    return date.slice(0, 7) === selectedDate.slice(0, 7);
  }
  if (mode === "week") {
    const taskTime = parseDateKey(date).getTime();
    const [start, end] = getWeekRange(selectedDate);
    return taskTime >= start.getTime() && taskTime <= end.getTime();
  }
  return date === selectedDate;
}

function shiftCalendarDate(dateKey, mode, direction) {
  const date = parseDateKey(dateKey);
  if (mode === "year") {
    date.setFullYear(date.getFullYear() + direction);
  } else if (mode === "month") {
    date.setMonth(date.getMonth() + direction);
  } else if (mode === "week") {
    date.setDate(date.getDate() + direction * 7);
  } else {
    date.setDate(date.getDate() + direction);
  }
  return formatDateKey(date);
}

function parseDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
  if (!match) {
    return new Date();
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCompactDateKey(date) {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}

function uniqueDateKeys(dates) {
  return Array.from(new Set((dates || []).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))))).sort();
}

function detectDailyNoteDate(row, dates) {
  const dateSet = new Set(dates);
  const ial = String(row?.ial || "");
  for (const match of ial.matchAll(/custom-dailynote-(\d{8})/g)) {
    const date = formatCompactDateKey(match[1]);
    if (dateSet.has(date)) {
      return date;
    }
  }

  const haystack = [
    row?.content,
    row?.markdown,
    row?.hpath,
  ].map((value) => String(value || "")).join("\n");

  return dates.find((date) => {
    return getDateNameCandidates(date).some((candidate) => haystack.includes(candidate));
  }) || "";
}

function getDateNameCandidates(date) {
  const [year, month, day] = String(date || "").split("-");
  return [
    `${year}-${month}-${day}`,
    `${year}${month}${day}`,
    `${year}/${month}/${day}`,
    `${year}.${month}.${day}`,
    `${year}_${month}_${day}`,
    `${year}年${month}月${day}日`,
    `${year}年${Number(month)}月${Number(day)}日`,
    ...getLooseDateNameCandidates(date),
  ];
}

function getLooseDateNameCandidates(date) {
  const [, month, day] = String(date || "").split("-");
  return [
    `${Number(month)}月${Number(day)}日`,
    `${month}月${day}日`,
    `${Number(month)}/${Number(day)}`,
    `${month}/${day}`,
    `${Number(month)}-${Number(day)}`,
    `${month}-${day}`,
    `${Number(month)}.${Number(day)}`,
    `${month}.${day}`,
  ];
}

function formatCalendarTitle(dateKey, mode) {
  const date = parseDateKey(dateKey);
  if (mode === "year") {
    return `${date.getFullYear()}年`;
  }
  if (mode === "month") {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  }
  if (mode === "week") {
    const [start, end] = getWeekRange(dateKey);
    const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
    const endText = sameMonth ? `${end.getDate()}日` : `${end.getMonth() + 1}月${end.getDate()}日`;
    return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 - ${endText}`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function calendarModeLabel(mode) {
  if (mode === "year") {
    return "年";
  }
  if (mode === "month") {
    return "月";
  }
  if (mode === "week") {
    return "周";
  }
  return "周";
}

function getCalendarVisibleDates(dateKey, mode) {
  if (mode === "year") {
    return getYearDates(dateKey);
  }
  if (mode === "month") {
    return getMonthGridDates(dateKey);
  }
  return getWeekDates(dateKey);
}

function getWeekRange(dateKey) {
  const date = parseDateKey(dateKey);
  const day = date.getDay() || 7;
  const start = new Date(date);
  start.setDate(date.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return [start, end];
}

function getWeekDates(dateKey) {
  const [start] = getWeekRange(dateKey);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatDateKey(date);
  });
}

function getMonthGridDates(dateKey) {
  const date = parseDateKey(dateKey);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstWeekDay = first.getDay() || 7;
  const start = new Date(first);
  start.setDate(first.getDate() - firstWeekDay + 1);
  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return formatDateKey(current);
  });
}

function getYearDates(dateKey) {
  const year = parseDateKey(dateKey).getFullYear();
  const start = new Date(year, 0, 1);
  const dates = [];
  for (const date = new Date(start); date.getFullYear() === year; date.setDate(date.getDate() + 1)) {
    dates.push(formatDateKey(date));
  }
  return dates;
}

function getIsoWeekNumber(date) {
  const current = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
  return Math.ceil((((current - yearStart) / 86400000) + 1) / 7);
}

function formatMonthDayWeek(dateKey) {
  const date = parseDateKey(dateKey);
  const weekday = WEEKDAY_SHORT[(date.getDay() || 7) - 1];
  return `${date.getMonth() + 1}/${date.getDate()}${weekday}`;
}

function formatCalendarDetailTitle(dateKey) {
  const date = parseDateKey(dateKey);
  const weekday = WEEKDAY_SHORT[(date.getDay() || 7) - 1];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekday}`;
}

function taskCalendarMark(status) {
  if (status === "completed") {
    return "✅";
  }
  if (status === "abandoned") {
    return "❌";
  }
  return "⬜";
}

function normalizeTaskStatus(task) {
  if (task.status === "completed" || task.status === "abandoned") {
    return task.status;
  }
  return "pending";
}

function taskStatusLabel(status) {
  if (status === "completed") {
    return "已完成";
  }
  if (status === "abandoned") {
    return "已放弃";
  }
  return "待完成";
}

function taskScopeLabel(task, status) {
  if (task.source === "habit") {
    return "习惯";
  }
  if (task.date && task.date !== todayKey()) {
    return task.date.slice(5);
  }
  if (status === "completed") {
    return "今天";
  }
  return "全天";
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(number)));
}

function totalPomodoroMinutes(task) {
  return (task.pomodoros || []).reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
}

function totalManualEntryMinutes(entries) {
  return normalizeManualEntries(entries).reduce((sum, item) => sum + item.minutes, 0);
}

function activePomodoroMinutes(active) {
  if (!active) {
    return 0;
  }
  return Math.max(0, Math.round(getActiveElapsedMs(active) / 60000));
}

function normalizePomodoros(pomodoros) {
  if (!Array.isArray(pomodoros)) {
    return [];
  }
  return pomodoros
    .map((item) => {
      const minutes = Number(item?.minutes) || 0;
      if (minutes <= 0) {
        return null;
      }
      return {
        id: String(item.id || `${item.startedAt || ""}-${item.endedAt || ""}-${minutes}`),
        startedAt: String(item.startedAt || ""),
        endedAt: String(item.endedAt || ""),
        minutes,
      };
    })
    .filter(Boolean);
}

function mergePomodoros(existing, incoming) {
  const incomingItems = normalizePomodoros(incoming);
  const incomingDetails = incomingItems.filter((item) => !isAggregatePomodoro(item));
  const aggregates = incomingItems.filter(isAggregatePomodoro);
  const byKey = new Map();
  incomingDetails.forEach((item) => {
    byKey.set(item.id || `${item.startedAt}-${item.endedAt}-${item.minutes}`, item);
  });
  if (byKey.size === 0 && aggregates.length > 0) {
    const aggregate = aggregates.reduce((left, right) => left.minutes >= right.minutes ? left : right);
    byKey.set(aggregate.id, aggregate);
  }
  return Array.from(byKey.values()).sort((left, right) => {
    const leftTime = Date.parse(left.startedAt || left.endedAt || "") || 0;
    const rightTime = Date.parse(right.startedAt || right.endedAt || "") || 0;
    return leftTime - rightTime;
  });
}

function totalPomodoroItemMinutes(pomodoros) {
  return normalizePomodoros(pomodoros).reduce((sum, item) => sum + item.minutes, 0);
}

function reconcilePomodoroDetailsWithVisibleMinutes(pomodoros, visibleMinutes) {
  const detailItems = normalizePomodoros(pomodoros).filter((item) => !isAggregatePomodoro(item));
  if (detailItems.length === 0) {
    const referenceTime = getLatestPomodoroTimestamp(pomodoros);
    return [{
      id: `daily-aggregate-${visibleMinutes}`,
      startedAt: referenceTime ? new Date(referenceTime - visibleMinutes * 60000).toISOString() : "",
      endedAt: referenceTime ? new Date(referenceTime).toISOString() : "",
      minutes: visibleMinutes,
    }];
  }
  return fitTimedEntriesToVisibleMinutes(detailItems, visibleMinutes);
}

function normalizeManualEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .map((item) => {
      const minutes = Number(item?.minutes) || 0;
      if (minutes <= 0) {
        return null;
      }
      return {
        id: String(item.id || `${item.recordedAt || ""}-${minutes}`),
        minutes,
        recordedAt: String(item.recordedAt || ""),
        note: String(item.note || "").trim(),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = Date.parse(left.recordedAt || "") || 0;
      const rightTime = Date.parse(right.recordedAt || "") || 0;
      return leftTime - rightTime;
    });
}

function mergeManualEntries(existing, incoming) {
  const incomingItems = normalizeManualEntries(incoming);
  const incomingDetails = incomingItems.filter((item) => !isAggregateManualEntry(item));
  const aggregates = incomingItems.filter(isAggregateManualEntry);
  const byKey = new Map();
  incomingDetails.forEach((item) => {
    byKey.set(item.id || `${item.recordedAt}-${item.minutes}`, item);
  });
  if (byKey.size === 0 && aggregates.length > 0) {
    const aggregate = aggregates.reduce((left, right) => left.minutes >= right.minutes ? left : right);
    byKey.set(aggregate.id || `daily-manual-aggregate-${aggregate.minutes}`, aggregate);
  }
  return Array.from(byKey.values()).sort((left, right) => {
    const leftTime = Date.parse(left.recordedAt || "") || 0;
    const rightTime = Date.parse(right.recordedAt || "") || 0;
    return leftTime - rightTime;
  });
}

function reconcileManualDetailsWithVisibleMinutes(entries, visibleMinutes) {
  const detailItems = normalizeManualEntries(entries).filter((item) => !isAggregateManualEntry(item));
  if (detailItems.length === 0) {
    const referenceTime = getLatestManualTimestamp(entries);
    return [{
      id: `daily-manual-aggregate-${visibleMinutes}`,
      minutes: visibleMinutes,
      recordedAt: referenceTime ? new Date(referenceTime).toISOString() : "",
      note: "",
    }];
  }
  return fitTimedEntriesToVisibleMinutes(detailItems, visibleMinutes);
}

function fitTimedEntriesToVisibleMinutes(entries, visibleMinutes) {
  const normalizedTarget = Math.max(0, Math.round(Number(visibleMinutes) || 0));
  const items = entries.map((item) => ({
    ...item,
    minutes: Math.max(0, Math.round(Number(item.minutes) || 0)),
  }));
  const currentTotal = items.reduce((sum, item) => sum + item.minutes, 0);
  if (normalizedTarget === currentTotal) {
    return items;
  }
  if (items.length === 0 || normalizedTarget <= 0) {
    return [];
  }
  if (normalizedTarget > currentTotal) {
    const lastItem = items[items.length - 1];
    lastItem.minutes += normalizedTarget - currentTotal;
    return items.map(syncTimedEntryBounds).filter(Boolean);
  }

  let overflow = currentTotal - normalizedTarget;
  for (let index = items.length - 1; index >= 0 && overflow > 0; index -= 1) {
    const item = items[index];
    const deduction = Math.min(item.minutes, overflow);
    item.minutes -= deduction;
    overflow -= deduction;
  }
  return items.filter((item) => item.minutes > 0).map(syncTimedEntryBounds).filter(Boolean);
}

function syncTimedEntryBounds(item) {
  if (!item || (Number(item.minutes) || 0) <= 0) {
    return null;
  }
  if ("startedAt" in item || "endedAt" in item) {
    const startedAt = normalizeTimestamp(item.startedAt);
    const endedAt = normalizeTimestamp(item.endedAt);
    if (startedAt) {
      return {
        ...item,
        startedAt: new Date(startedAt).toISOString(),
        endedAt: new Date(startedAt + item.minutes * 60000).toISOString(),
      };
    }
    if (endedAt) {
      return {
        ...item,
        startedAt: new Date(endedAt - item.minutes * 60000).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
      };
    }
  }
  return item;
}

function getLatestPomodoroTimestamp(pomodoros) {
  return normalizePomodoros(pomodoros).reduce((latest, item) => {
    const endedAt = normalizeTimestamp(item.endedAt);
    const startedAt = normalizeTimestamp(item.startedAt);
    return Math.max(latest, endedAt || startedAt || 0);
  }, 0);
}

function getLatestManualTimestamp(entries) {
  return normalizeManualEntries(entries).reduce((latest, item) => {
    return Math.max(latest, normalizeTimestamp(item.recordedAt));
  }, 0);
}

function isAggregateManualEntry(item) {
  return String(item?.id || "").startsWith("daily-manual-aggregate-");
}

function isAggregatePomodoro(item) {
  return String(item?.id || "").startsWith("daily-aggregate-");
}

function pomodoroSignature(pomodoros) {
  return JSON.stringify(normalizePomodoros(pomodoros));
}

function manualEntrySignature(entries) {
  return JSON.stringify(normalizeManualEntries(entries));
}

function normalizeActivePomodoro(active, taskId = active?.taskId) {
  if (!active) {
    return null;
  }
  const startedAt = normalizeTimestamp(active.startedAt);
  if (!startedAt) {
    return null;
  }
  const isPaused = Boolean(active.isPaused);
  const pausedAt = isPaused ? normalizeTimestamp(active.pausedAt) || startedAt : null;
  return {
    id: String(active.id || `${taskId || ""}-${startedAt}`),
    taskId: taskId || active.taskId || "",
    startedAt,
    pausedAt,
    pausedMs: Math.max(0, Number(active.pausedMs) || 0),
    isPaused,
  };
}

function serializeActivePomodoro(active) {
  const normalized = normalizeActivePomodoro(active, active?.taskId);
  if (!normalized) {
    return null;
  }
  return {
    id: normalized.id,
    startedAt: new Date(normalized.startedAt).toISOString(),
    pausedAt: normalized.pausedAt ? new Date(normalized.pausedAt).toISOString() : "",
    pausedMs: normalized.pausedMs,
    isPaused: normalized.isPaused,
  };
}

function activePomodoroSignature(active) {
  const normalized = normalizeActivePomodoro(active, active?.taskId);
  return normalized ? JSON.stringify(normalized) : "";
}

function normalizeTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getActiveElapsedMs(active) {
  const now = active.isPaused ? active.pausedAt : Date.now();
  return Math.max(0, now - active.startedAt - (active.pausedMs || 0));
}

function isTimestampOnDate(timestamp, dateKey) {
  if (!timestamp || !isValidDateKey(dateKey)) {
    return false;
  }
  return formatDateKey(new Date(timestamp)) === dateKey;
}

function isValidDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function formatTimeOfDay(timestamp) {
  if (!timestamp) {
    return "--:--";
  }
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatTimeRange(startedAt, endedAt) {
  if (startedAt && endedAt) {
    return `${formatTimeOfDay(startedAt)} - ${formatTimeOfDay(endedAt)}`;
  }
  if (startedAt) {
    return `${formatTimeOfDay(startedAt)} 开始`;
  }
  if (endedAt) {
    return `${formatTimeOfDay(endedAt)} 结束`;
  }
  return "时间未知";
}

function formatClock(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMinutes(minutes) {
  const normalized = Number(minutes) || 0;
  if (normalized < 60) {
    return `${normalized} 分钟`;
  }
  const hours = Math.floor(normalized / 60);
  const rest = normalized % 60;
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}

function formatCompactMinutes(minutes) {
  const normalized = Number(minutes) || 0;
  if (normalized < 60) {
    return `${normalized}m`;
  }
  const hours = Math.floor(normalized / 60);
  const rest = normalized % 60;
  return rest ? `${hours}h${rest}m` : `${hours}h`;
}

function formatPercent(minutes, total) {
  if (!total) {
    return "0%";
  }
  return `${Math.round((minutes / total) * 100)}%`;
}

function icon(name) {
  return `<svg class="time-list-icon" aria-hidden="true"><use xlink:href="#${name}"></use></svg>`;
}

function iconButton(iconName, action, label, variant = "", taskId = "", disabled = false) {
  const classes = ["time-list-icon-button"];
  if (variant) {
    classes.push(`time-list-icon-button--${variant}`);
  }
  return `
    <button
      class="${classes.join(" ")}"
      data-action="${action}"
      ${taskId ? `data-task-id="${escapeAttr(taskId)}"` : ""}
      title="${escapeAttr(label)}"
      aria-label="${escapeAttr(label)}"
      ${disabled ? "disabled" : ""}
    >
      ${icon(iconName)}
    </button>
  `;
}

function renderPieSvg(tasks, total) {
  if (!tasks.length || total <= 0) {
    return `
      <div class="time-list-pie time-list-pie--empty">
        <div class="time-list-pie-empty">暂无分布</div>
      </div>
    `;
  }

  const center = 60;
  const outerRadius = 52;
  const innerRadius = 32;
  let startAngle = -90;
  const slices = tasks.length === 1
    ? `<circle cx="${center}" cy="${center}" r="${outerRadius}" fill="${PIE_COLORS[0]}" />`
    : tasks.map((task, index) => {
      const minutes = task.actualMinutes || 0;
      const angle = (minutes / total) * 360;
      const path = donutSlicePath(center, center, outerRadius, innerRadius, startAngle, startAngle + angle);
      startAngle += angle;
      return `
        <path d="${path}" fill="${PIE_COLORS[index % PIE_COLORS.length]}" />
      `;
    }).join("");

  return `
    <div class="time-list-pie">
      <svg viewBox="0 0 120 120" role="img" aria-label="今日任务时间分布饼图">
        <circle cx="${center}" cy="${center}" r="${outerRadius}" fill="var(--b3-theme-surface-lighter)" />
        <circle cx="${center}" cy="${center}" r="${innerRadius}" fill="var(--b3-theme-background)" />
        ${slices}
        <circle cx="${center}" cy="${center}" r="${innerRadius}" fill="var(--b3-theme-background)" />
      </svg>
      <div class="time-list-pie-center">
        <strong>${formatMinutes(total)}</strong>
        <span>完成用时</span>
      </div>
    </div>
  `;
}

function donutSlicePath(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
  const normalizedEndAngle = Math.min(endAngle, startAngle + 359.999);
  const largeArcFlag = normalizedEndAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarPoint(cx, cy, outerRadius, startAngle);
  const outerEnd = polarPoint(cx, cy, outerRadius, normalizedEndAngle);
  const innerEnd = polarPoint(cx, cy, innerRadius, normalizedEndAngle);
  const innerStart = polarPoint(cx, cy, innerRadius, startAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function polarPoint(cx, cy, radius, angle) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: roundSvgNumber(cx + radius * Math.cos(radians)),
    y: roundSvgNumber(cy + radius * Math.sin(radians)),
  };
}

function roundSvgNumber(value) {
  return Number(value.toFixed(3));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function unescapeHtmlEntities(value) {
  return String(value)
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeMarkdown(value) {
  return String(value).replace(/([\\`*_{}\[\]()#+\-.!|>])/g, "\\$1");
}

function unescapeMarkdown(value) {
  return String(value).replace(/\\([\\`*_{}\[\]()#+\-.!|>])/g, "$1");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

function extractBlockId(result) {
  if (!result) {
    return "";
  }
  if (typeof result === "string") {
    return result;
  }
  if (typeof result !== "object") {
    return "";
  }
  if (result.id || result.blockId || result.blockID) {
    return result.id || result.blockId || result.blockID;
  }
  if (Array.isArray(result)) {
    for (const item of result) {
      const blockId = extractBlockId(item);
      if (blockId) {
        return blockId;
      }
    }
    return "";
  }
  const operations = [
    ...(Array.isArray(result.doOperations) ? result.doOperations : []),
    ...(Array.isArray(result.transactions) ? result.transactions.flatMap((item) => item.doOperations || []) : []),
    ...(Array.isArray(result.data) ? result.data.flatMap((item) => item?.doOperations || item || []) : []),
  ];
  const operation = operations.find((item) => item?.id || item?.blockID);
  if (operation?.id || operation?.blockID) {
    return operation.id || operation.blockID;
  }
  for (const value of Object.values(result)) {
    const blockId = extractBlockId(value);
    if (blockId) {
      return blockId;
    }
  }
  return "";
}

module.exports = TimeListPlugin;

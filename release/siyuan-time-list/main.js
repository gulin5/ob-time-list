"use strict";

const {
  Plugin,
  ItemView,
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
  normalizePath,
  setIcon,
} = require("obsidian");

const VIEW_TYPE_TIME_LIST = "time-list-view";

const DEFAULT_SETTINGS = {
  dailyFolder: "",
  habitFile: "",
  syncToDailyNote: true,
};

const DEFAULT_STATE = {
  version: 1,
  tasks: [],
  activePomodoro: null,
  dismissedHabitTasks: {},
};

const PIE_COLORS = ["#5b8def", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];
const CALENDAR_CAPSULE_COLORS = ["#9fc5e8", "#f2c6a8", "#a9d6b5", "#c7b6e6", "#f0d48a", "#9fd8d3", "#e3b7c9", "#b7d7a8"];
const WEEKDAY_SHORT = ["一", "二", "三", "四", "五", "六", "日"];

class TimeListView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_TIME_LIST;
  }

  getDisplayText() {
    return "Daily Time List";
  }

  getIcon() {
    return "clock";
  }

  async onOpen() {
    this.contentEl.addClass("time-list-view");
    this.plugin.attachView(this);
  }

  async onClose() {
    this.plugin.detachView(this);
  }
}

class TimeListSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Daily Time List" });

    new Setting(containerEl)
      .setName("日记文件夹")
      .setDesc("插件会在这个文件夹中寻找已存在的今日日记文件。")
      .addText((text) => {
        text
          .setPlaceholder("例如 Daily")
          .setValue(this.plugin.settings.dailyFolder || "")
          .onChange(async (value) => {
            this.plugin.settings.dailyFolder = normalizeFolderInput(value);
            await this.plugin.savePluginData();
          });
      });

    new Setting(containerEl)
      .setName("习惯文件")
      .setDesc("填写一个 Markdown 文件路径，刷新时会把每一行导入为今日习惯任务。")
      .addText((text) => {
        text
          .setPlaceholder("例如 Daily/habits.md")
          .setValue(this.plugin.settings.habitFile || "")
          .onChange(async (value) => {
            this.plugin.settings.habitFile = normalizeFileInput(value);
            await this.plugin.savePluginData();
          });
      });

    new Setting(containerEl)
      .setName("同步到今日日记")
      .setDesc("创建、完成、放弃、补记时长时写回到今日日记。")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.syncToDailyNote !== false)
          .onChange(async (value) => {
            this.plugin.settings.syncToDailyNote = value;
            await this.plugin.savePluginData();
          });
      });
  }
}

class TaskTextModal extends Modal {
  constructor(app, title, placeholder, onSubmit) {
    super(app);
    this.titleText = title;
    this.placeholder = placeholder;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.setTitle(this.titleText);

    const textarea = contentEl.createEl("textarea", {
      cls: "time-list-modal-textarea",
      attr: { placeholder: this.placeholder },
    });

    const footer = contentEl.createDiv({ cls: "time-list-modal-actions" });
    const cancelButton = footer.createEl("button", { text: "取消" });
    const submitButton = footer.createEl("button", {
      text: "确定",
      cls: "mod-cta",
    });

    cancelButton.addEventListener("click", () => this.close());
    submitButton.addEventListener("click", async () => {
      const value = String(textarea.value || "");
      await this.onSubmit(value);
      this.close();
    });

    window.setTimeout(() => textarea.focus(), 0);
  }

  onClose() {
    this.contentEl.empty();
  }
}

class AppendTimeModal extends Modal {
  constructor(app, task, onSubmit) {
    super(app);
    this.task = task;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.setTitle(`追加时长: ${this.task.title}`);

    const minutesInput = contentEl.createEl("input", {
      cls: "time-list-modal-input",
      attr: { type: "number", min: "1", placeholder: "分钟，例如 25" },
    });
    const noteInput = contentEl.createEl("input", {
      cls: "time-list-modal-input",
      attr: { type: "text", placeholder: "备注，可选" },
    });

    const footer = contentEl.createDiv({ cls: "time-list-modal-actions" });
    const cancelButton = footer.createEl("button", { text: "取消" });
    const submitButton = footer.createEl("button", {
      text: "追加",
      cls: "mod-cta",
    });

    cancelButton.addEventListener("click", () => this.close());
    submitButton.addEventListener("click", async () => {
      await this.onSubmit({
        minutes: minutesInput.value,
        note: noteInput.value,
      });
      this.close();
    });

    window.setTimeout(() => minutesInput.focus(), 0);
  }

  onClose() {
    this.contentEl.empty();
  }
}

class FinishTaskModal extends Modal {
  constructor(app, task, onSubmit) {
    super(app);
    this.task = task;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.setTitle(`结束任务: ${this.task.title}`);

    contentEl.createDiv({
      cls: "time-list-modal-hint",
      text: `当前累计 ${formatMinutes(getTaskRecordedMinutes(this.task))}`,
    });

    const summaryInput = contentEl.createEl("textarea", {
      cls: "time-list-modal-textarea time-list-modal-textarea--small",
      attr: { placeholder: "任务总结，可选" },
    });

    const footer = contentEl.createDiv({ cls: "time-list-modal-actions" });
    const cancelButton = footer.createEl("button", { text: "取消" });
    const submitButton = footer.createEl("button", {
      text: "结束任务",
      cls: "mod-cta",
    });

    cancelButton.addEventListener("click", () => this.close());
    submitButton.addEventListener("click", async () => {
      await this.onSubmit({ summary: summaryInput.value });
      this.close();
    });

    window.setTimeout(() => summaryInput.focus(), 0);
  }

  onClose() {
    this.contentEl.empty();
  }
}

class DailyTimeListPlugin extends Plugin {
  async onload() {
    await this.loadPluginData();

    this.currentTab = "tasks";
    this.summaryMonth = monthKey(todayKey());
    this.summaryFocusDate = todayKey();
    this.calendarPanelMode = "month";
    this.calendarNoteCache = new Map();
    this.calendarLoadedDates = new Set();
    this.calendarLoadingDates = new Set();
    this.timerHandle = null;
    this.view = null;
    this.lastDailyNoteSyncAt = 0;

    this.registerView(VIEW_TYPE_TIME_LIST, (leaf) => new TimeListView(leaf, this));
    this.addSettingTab(new TimeListSettingTab(this.app, this));

    this.addRibbonIcon("clock", "Daily Time List", () => this.activateView());

    this.addCommand({
      id: "open-time-list",
      name: "打开 Daily Time List 侧栏",
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: "insert-today-date",
      name: "插入今天日期",
      editorCallback: (editor) => editor.replaceSelection(todayKey()),
      callback: async () => {
        await navigator.clipboard.writeText(todayKey());
        notice(`已复制今天日期: ${todayKey()}`);
      },
    });

    this.registerEvent(this.app.vault.on("modify", (file) => this.handleVaultChange(file)));
    this.registerEvent(this.app.vault.on("create", (file) => this.handleVaultChange(file)));
    this.registerEvent(this.app.vault.on("rename", (file) => this.handleVaultChange(file)));

    this.app.workspace.onLayoutReady(() => {
      this.startTicker();
      this.render();
    });
  }

  async onunload() {
    this.stopTicker();
    await this.app.workspace.detachLeavesOfType(VIEW_TYPE_TIME_LIST);
  }

  async loadPluginData() {
    const stored = (await this.loadData()) || {};
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(stored.settings || {}),
    };
    this.state = {
      ...clone(DEFAULT_STATE),
      ...(stored.state || {}),
      tasks: Array.isArray(stored?.state?.tasks)
        ? stored.state.tasks.map(normalizeTask)
        : [],
    };
    this.state.activePomodoro = normalizeActivePomodoro(this.state.activePomodoro);
    this.state.dismissedHabitTasks = normalizeDismissedHabitTasks(this.state.dismissedHabitTasks);
    this.state.tasks = dedupeTasks(this.state.tasks);
  }

  async savePluginData() {
    await this.saveData({
      settings: this.settings,
      state: this.state,
    });
  }

  attachView(view) {
    this.view = view;
    this.render();
  }

  detachView(view) {
    if (this.view === view) {
      this.view = null;
    }
  }

  async activateView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_TIME_LIST)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false);
      if (!leaf) {
        leaf = this.app.workspace.getLeaf("tab");
      }
      await leaf.setViewState({
        type: VIEW_TYPE_TIME_LIST,
        active: true,
      });
    }
    this.app.workspace.revealLeaf(leaf);
  }

  startTicker() {
    this.stopTicker();
    this.timerHandle = window.setInterval(() => {
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

  handleVaultChange(file) {
    if (!file || typeof file.path !== "string") {
      return;
    }
    if (!this.isDailyNoteScopedFile(file)) {
      return;
    }
    const date = inferDateKeyFromFile(file);
    if (date) {
      this.calendarLoadedDates.delete(date);
      this.calendarNoteCache.delete(date);
    } else {
      this.calendarLoadedDates.clear();
      this.calendarNoteCache.clear();
    }
    if (this.currentTab === "calendar") {
      this.render();
    }
  }

  render() {
    if (!this.view) {
      return;
    }

    const root = this.view.contentEl;
    root.empty();

    const wrapper = root.createDiv({ cls: "time-list-root" });

    const toolbar = wrapper.createDiv({ cls: "time-list-toolbar-card" });

    const header = toolbar.createDiv({ cls: "time-list-header" });
    header.createEl("div", {
      cls: "time-list-date",
      text: todayKey(),
    });

    const headerActions = header.createDiv({ cls: "time-list-header-actions" });
    if (this.settings.habitFile) {
      addIconButton(headerActions, "list-plus", "导入习惯任务", () => this.importHabitTasks({
        silent: false,
        includeDismissed: true,
      }));
    }
    addIconButton(headerActions, "refresh-cw", "刷新", () => this.refreshToday(false));
    addIconButton(headerActions, "settings", "设置", () => this.openSettings());

    const tabs = toolbar.createDiv({ cls: "time-list-tabs" });
    addIconButton(tabs, "list-todo", "任务", () => {
      this.currentTab = "tasks";
      this.render();
    }, this.currentTab === "tasks" ? "is-active" : "");
    addIconButton(tabs, "pie-chart", "总结", () => {
      this.currentTab = "summary";
      this.render();
    }, this.currentTab === "summary" ? "is-active" : "");
    addIconButton(tabs, "calendar", "日历", () => {
      this.currentTab = "calendar";
      this.render();
    }, this.currentTab === "calendar" ? "is-active" : "");

    if (this.currentTab === "tasks") {
      this.renderCreateRow(toolbar);
    }

    this.renderPomodoro(wrapper);

    if (this.currentTab === "summary") {
      this.renderSummary(wrapper);
    } else if (this.currentTab === "calendar") {
      this.renderCalendar(wrapper);
    } else {
      this.renderTasks(wrapper);
    }
  }

  renderPomodoro(wrapper) {
    const active = this.state.activePomodoro;
    if (!active) {
      return;
    }

    const task = this.findTask(active.taskId);
    const card = wrapper.createDiv({ cls: "time-list-timer" });
    card.createEl("div", {
      cls: "time-list-timer-title",
      text: task ? task.title : "任务已不存在",
    });
    card.createEl("div", {
      cls: "time-list-timer-clock",
      text: formatClock(getActiveElapsedMs(active)),
    });

    const actions = card.createDiv({ cls: "time-list-inline-actions" });
    if (active.isPaused) {
      addIconButton(actions, "play", "继续", () => this.resumePomodoro(), "mod-cta");
    } else {
      addIconButton(actions, "pause", "暂停", () => this.pausePomodoro());
    }
    addIconButton(actions, "square", "停止并记录", () => this.stopPomodoro(true), "mod-cta");
    addIconButton(actions, "x", "取消", () => this.stopPomodoro(false));
  }

  renderCreateRow(parent) {
    const row = parent.createDiv({ cls: "time-list-create-row" });
    const button = row.createEl("button", {
      cls: "time-list-create-button mod-cta",
      attr: {
        type: "button",
        "aria-label": "新建任务",
        title: "新建任务",
      },
    });
    appendInlineIcon(button, "plus");
    button.createEl("strong", { text: "新建任务" });
    button.addEventListener("click", () => this.openCreateTaskModal());
  }

  renderTasks(wrapper) {
    const section = wrapper.createDiv({ cls: "time-list-section" });

    const tasks = sortTasks(this.getTodayTasks());
    if (tasks.length === 0) {
      section.createDiv({
        cls: "time-list-empty",
        text: "今天还没有任务。",
      });
      return;
    }

    tasks.forEach((task) => {
      const status = task.status || "pending";
      const item = section.createDiv({
        cls: `time-list-task time-list-task--${status}`,
      });

      const top = item.createDiv({ cls: "time-list-task-top" });
      const titleWrap = top.createDiv({ cls: "time-list-task-title-wrap" });
      titleWrap.createEl("strong", { text: task.title });

      const timeWrap = top.createDiv({ cls: "time-list-task-time" });
      appendInlineIcon(timeWrap, "clock");
      timeWrap.createSpan({ text: formatCompactMinutes(getVisibleTaskMinutes(task)) });

      const actions = item.createDiv({ cls: "time-list-inline-actions time-list-task-actions" });
      if (status === "pending") {
        addIconButton(actions, "plus", "补时长", () => this.openAppendTimeModal(task.id));
        addIconButton(actions, "timer", "番茄", () => this.startPomodoro(task.id), this.state.activePomodoro ? "is-disabled" : "");
        addIconButton(actions, "check", "结束", () => this.openFinishTaskModal(task.id), "mod-cta");
        addIconButton(actions, "x", "放弃", () => this.abandonTask(task.id));
      } else {
        addIconButton(actions, "undo-2", "恢复", () => this.reopenTask(task.id));
        addIconButton(actions, "trash-2", "删除", () => this.deleteTask(task.id));
      }
    });
  }

  renderSummary(wrapper) {
    const section = wrapper.createDiv({ cls: "time-list-section time-list-summary-section" });
    const tasks = this.getTodayTasks();
    const completed = tasks.filter((task) => task.status === "completed");
    const totalCompleted = completed.reduce((sum, task) => sum + (task.actualMinutes || 0), 0);

    const metrics = section.createDiv({ cls: "time-list-metrics" });
    this.renderMetricCard(metrics, "完成用时", formatCompactMinutes(totalCompleted), "clock");
    this.renderMetricCard(metrics, "完成任务数", `${completed.length} / ${tasks.length}`, "check");

    const summaryLayout = section.createDiv({ cls: "time-list-summary-layout" });
    this.renderSummaryChart(summaryLayout, completed, totalCompleted);
  }

  renderCalendar(wrapper) {
    const section = wrapper.createDiv({ cls: "time-list-section time-list-calendar-section" });
    this.ensureCalendarDataForCurrentView();
    this.renderSummaryCalendar(section);
  }

  renderMetricCard(parent, label, value, iconName) {
    const card = parent.createDiv({ cls: "time-list-metric" });
    const head = card.createDiv({ cls: "time-list-metric-head" });
    appendInlineIcon(head, iconName);
    head.createSpan({ text: label });
    card.createEl("strong", { text: value });
  }

  renderSummaryChart(parent, completed, totalCompleted) {
    const card = parent.createDiv({ cls: "time-list-summary-card time-list-chart-card" });
    const head = card.createDiv({ cls: "time-list-card-head" });
    appendInlineIcon(head, "pie-chart");
    head.createEl("strong", { text: "今日时间分布" });

    const chartTasks = completed
      .map((task) => ({ ...task, chartMinutes: Number(task.actualMinutes) || getVisibleTaskMinutes(task) }))
      .filter((task) => task.chartMinutes > 0)
      .sort((a, b) => b.chartMinutes - a.chartMinutes);

    const shell = card.createDiv({ cls: "time-list-chart-shell" });
    const chart = shell.createDiv({ cls: "time-list-chart" });
    chart.innerHTML = renderPieSvg(chartTasks, totalCompleted);

    const bars = shell.createDiv({ cls: "time-list-bars" });
    if (chartTasks.length === 0) {
      bars.createDiv({
        cls: "time-list-empty time-list-empty--compact",
        text: "还没有可统计的完成时长。",
      });
      return;
    }

    chartTasks.forEach((task, index) => {
      const row = bars.createDiv({ cls: "time-list-bar" });
      const label = row.createDiv({ cls: "time-list-bar-label" });
      const title = label.createDiv({ cls: "time-list-bar-title" });
      title.createEl("i", {
        attr: { style: `background:${PIE_COLORS[index % PIE_COLORS.length]}` },
      });
      title.createSpan({ text: task.title });
      label.createSpan({
        text: `${formatMinutes(task.chartMinutes)} · ${formatPercent(task.chartMinutes, totalCompleted)}`,
      });

      const track = row.createDiv({ cls: "time-list-bar-track" });
      track.createDiv({
        cls: "time-list-bar-fill",
        attr: {
          style: `width:${Math.max(4, Math.round((task.chartMinutes / totalCompleted) * 100))}%;background:${PIE_COLORS[index % PIE_COLORS.length]}`,
        },
      });
    });
  }

  renderSummaryCalendar(parent) {
    const card = parent.createDiv({ cls: "time-list-summary-card time-list-calendar-card" });
    const isTimelineView = this.calendarPanelMode === "timeline";
    const toolbar = card.createDiv({ cls: "time-list-card-head time-list-calendar-toolbar" });
    const left = toolbar.createDiv({ cls: "time-list-inline-actions" });
    addIconButton(left, "chevron-left", isTimelineView ? "前一天" : "上个月", () => {
      if (isTimelineView) {
        this.summaryFocusDate = shiftDateKey(this.summaryFocusDate, -1);
        this.summaryMonth = monthKey(this.summaryFocusDate);
      } else {
        this.summaryMonth = shiftMonthKey(this.summaryMonth, -1);
        this.summaryFocusDate = clampFocusDateToMonth(this.summaryFocusDate, this.summaryMonth);
      }
      this.render();
    });
    const title = toolbar.createDiv({ cls: "time-list-calendar-title" });
    appendInlineIcon(title, isTimelineView ? "history" : "calendar");
    title.createEl("strong", {
      text: isTimelineView ? formatCalendarDetailTitle(this.summaryFocusDate) : formatMonthTitle(this.summaryMonth),
    });
    const right = toolbar.createDiv({ cls: "time-list-inline-actions" });
    addIconButton(
      right,
      isTimelineView ? "calendar" : "history",
      isTimelineView ? "切换到日历" : "切换到时间线",
      () => {
        this.calendarPanelMode = isTimelineView ? "month" : "timeline";
        this.render();
      }
    );
    addIconButton(right, "rotate-ccw", isTimelineView ? "回到今天" : "回到本月", () => {
      this.summaryMonth = monthKey(todayKey());
      this.summaryFocusDate = todayKey();
      this.render();
    });
    addIconButton(right, "chevron-right", isTimelineView ? "后一天" : "下个月", () => {
      if (isTimelineView) {
        this.summaryFocusDate = shiftDateKey(this.summaryFocusDate, 1);
        this.summaryMonth = monthKey(this.summaryFocusDate);
      } else {
        this.summaryMonth = shiftMonthKey(this.summaryMonth, 1);
        this.summaryFocusDate = clampFocusDateToMonth(this.summaryFocusDate, this.summaryMonth);
      }
      this.render();
    });

    if (isTimelineView) {
      this.renderSummaryTimeline(card, this.summaryFocusDate, { embedded: true });
      return;
    }

    const weekHead = card.createDiv({ cls: "time-list-calendar-weekhead" });
    WEEKDAY_SHORT.forEach((day) => {
      weekHead.createDiv({ cls: "time-list-calendar-weekday", text: day });
    });

    const grid = card.createDiv({ cls: "time-list-calendar-grid" });
    const dates = getMonthGridDates(this.summaryMonth);
    const summaries = summarizeTasksByDate(this.getCalendarTasksForDates(dates));
    const maxMinutes = Math.max(0, ...dates.map((date) => summaries.get(date)?.completedMinutes || 0));

    dates.forEach((date) => {
      const summary = summaries.get(date) || buildEmptyDateSummary();
      const cell = grid.createDiv({
        cls: [
          "time-list-calendar-cell",
          date.slice(0, 7) !== this.summaryMonth ? "is-outside" : "",
          date === todayKey() ? "is-today" : "",
          date === this.summaryFocusDate ? "is-selected" : "",
          summary.completedMinutes > 0 ? `is-level-${calendarIntensity(summary.completedMinutes, maxMinutes)}` : "",
        ].filter(Boolean).join(" "),
      });
      cell.setAttribute("role", "button");
      cell.setAttribute("tabindex", "0");
      cell.setAttribute("aria-label", `${date} ${summary.totalTasks ? `${summary.completedCount}/${summary.totalTasks}` : "无任务"}`);
      cell.addEventListener("click", () => {
        this.summaryFocusDate = date;
        this.render();
      });
      cell.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.summaryFocusDate = date;
          this.render();
        }
      });

      const top = cell.createDiv({ cls: "time-list-calendar-cell-top" });
      top.createDiv({
        cls: "time-list-calendar-date",
        text: String(Number(date.slice(8))),
      });
      top.createDiv({
        cls: "time-list-calendar-total",
        text: summary.completedMinutes > 0 ? formatCompactMinutes(summary.completedMinutes) : "0m",
      });

      const bottle = cell.createDiv({ cls: "time-list-calendar-bottle" });
      const neck = bottle.createDiv({ cls: "time-list-calendar-bottle-neck" });
      if (summary.completedItems.length > 0) {
        neck.setAttribute(
          "aria-label",
          summary.completedItems
            .map((item) => `${item.title} ${formatCompactMinutes(item.minutes)}`)
            .join("，")
        );
      }
      const body = bottle.createDiv({ cls: "time-list-calendar-bottle-body" });
      const segmentCount = summary.completedItems.length;
      const minimumVisibleRatio = segmentCount > 0
        ? Math.min(0.9, 0.18 + segmentCount * 0.1)
        : 0;
      const fillRatio = summary.completedMinutes > 0 && maxMinutes > 0
        ? Math.max(minimumVisibleRatio, summary.completedMinutes / maxMinutes)
        : 0;
      const fill = body.createDiv({
        cls: "time-list-calendar-bottle-fill",
        attr: {
          style: fillRatio > 0 ? `height:${Math.round(fillRatio * 100)}%;` : "",
        },
      });
      if (summary.completedItems.length > 0) {
        const sortedItems = [...summary.completedItems].sort((a, b) => b.minutes - a.minutes);
        sortedItems.forEach((item, index) => {
          fill.createDiv({
            cls: "time-list-calendar-bottle-segment",
            attr: {
              style: `flex:${Math.max(1, item.minutes)};background:${CALENDAR_CAPSULE_COLORS[index % CALENDAR_CAPSULE_COLORS.length]};`,
              title: `${item.title} · ${formatCompactMinutes(item.minutes)}`,
            },
          });
        });
      } else {
        fill.addClass("is-empty");
      }

      cell.createDiv({
        cls: "time-list-calendar-count",
        text: summary.completedCount > 0 ? `${summary.completedCount} 项` : (summary.totalTasks > 0 ? "待完成" : ""),
      });
    });
  }

  renderSummaryTimeline(parent, focusDate, options = {}) {
    const card = options.embedded
      ? parent.createDiv({ cls: "time-list-calendar-detail time-list-calendar-detail--embedded" })
      : parent.createDiv({ cls: "time-list-summary-card time-list-calendar-detail" });
    const head = card.createDiv({ cls: "time-list-card-head" });
    appendInlineIcon(head, "history");
    head.createEl("strong", { text: options.embedded ? "时间线" : formatCalendarDetailTitle(focusDate) });

    const dayTasks = sortTasks(this.getCalendarTasksForDate(focusDate));
    const entries = this.buildCalendarTimelineEntries(dayTasks, focusDate);
    const timeline = card.createDiv({ cls: "time-list-calendar-footprint" });
    if (entries.length === 0) {
      timeline.createDiv({
        cls: "time-list-empty",
        text: dayTasks.length ? "这一天还没有可追踪的 time line 记录。" : "这一天还没有任务。",
      });
      return;
    }

    const totalTimelineMinutes = Math.max(1, entries.reduce((sum, entry) => sum + Math.max(1, Number(entry.minutes) || 0), 0));
    const pixelsPerMinute = Math.min(1.2, Math.max(0.55, 320 / totalTimelineMinutes));
    entries.forEach((entry) => {
      const minutes = Math.max(1, Number(entry.minutes) || 0);
      const rowHeight = Math.max(34, Math.round(minutes * pixelsPerMinute));
      const row = timeline.createDiv({
        cls: "time-list-calendar-footprint-item",
        attr: {
          style: `--timeline-row-height:${rowHeight}px`,
        },
      });
      row.createDiv({
        cls: "time-list-calendar-footprint-time",
        text: entry.kind === "pomodoro"
          ? formatTimeRange(entry.startedAt, entry.endedAt)
          : formatTimeOfDay(entry.recordedAt),
      });
      row.createDiv({ cls: "time-list-calendar-footprint-axis" });
      const body = row.createDiv({ cls: "time-list-calendar-footprint-body" });
      body.createEl("strong", { text: entry.taskTitle });
      body.createEl("span", { text: formatCompactMinutes(entry.minutes) });
    });
  }

  renderMiniMetric(parent, label, value) {
    const item = parent.createDiv({ cls: "time-list-calendar-mini-metric" });
    item.createSpan({ text: label });
    item.createEl("strong", { text: value });
  }

  ensureCalendarDataForCurrentView() {
    const dates = this.calendarPanelMode === "timeline"
      ? [this.summaryFocusDate]
      : getMonthGridDates(this.summaryMonth);
    void this.ensureCalendarDatesLoaded(dates);
  }

  async ensureCalendarDatesLoaded(dates) {
    const uniqueDates = [...new Set(
      (Array.isArray(dates) ? dates : [])
        .map((value) => String(value || "").trim())
        .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    )];
    const pending = uniqueDates.filter((date) => !this.calendarLoadedDates.has(date) && !this.calendarLoadingDates.has(date));
    if (pending.length === 0) {
      return false;
    }

    let changed = false;
    for (const date of pending) {
      this.calendarLoadingDates.add(date);
      try {
        changed = await this.loadCalendarNoteForDate(date) || changed;
      } finally {
        this.calendarLoadingDates.delete(date);
      }
    }

    if (changed && this.currentTab === "calendar") {
      this.render();
    }
    return changed;
  }

  async loadCalendarNoteForDate(date) {
    const file = this.findDailyNoteFile(date);
    const nextTasks = file
      ? dedupeTasks(parseDailyNoteTasks(await this.app.vault.cachedRead(file), date).map((task) => normalizeTask(task)))
      : [];
    const previous = JSON.stringify(this.calendarNoteCache.get(date) || []);
    const next = JSON.stringify(nextTasks);
    this.calendarLoadedDates.add(date);
    this.calendarNoteCache.set(date, nextTasks);
    return previous !== next;
  }

  getCalendarTasksForDate(date) {
    const fromNotes = this.calendarNoteCache.get(date) || [];
    const fromState = this.state.tasks.filter((task) => task.date === date);
    return dedupeTasks([...fromState, ...fromNotes]);
  }

  getCalendarTasksForDates(dates) {
    return [...new Set(Array.isArray(dates) ? dates : [])]
      .flatMap((date) => this.getCalendarTasksForDate(date));
  }

  buildCalendarTimelineEntries(tasks, focusDate) {
    const entries = [];
    tasks.forEach((task) => {
      normalizeManualEntries(task.manualEntries).forEach((item) => {
        const recordedAt = normalizeTimestamp(item.recordedAt);
        if (!recordedAt || !isTimestampOnDate(recordedAt, focusDate)) {
          return;
        }
        entries.push({
          id: `${task.id}-manual-${item.id}`,
          kind: "manual",
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
        if (!isTimestampOnDate(startedAt, focusDate) && !isTimestampOnDate(endedAt, focusDate)) {
          return;
        }
        entries.push({
          id: `${task.id}-pomodoro-${item.id}`,
          kind: "pomodoro",
          taskTitle: task.title,
          minutes: item.minutes,
          startedAt,
          endedAt,
          note: "",
          sortAt: endedAt || startedAt,
        });
      });
    });

    return entries.sort((left, right) => {
      const leftTime = Number.isFinite(left.sortAt) ? left.sortAt : Number.MAX_SAFE_INTEGER;
      const rightTime = Number.isFinite(right.sortAt) ? right.sortAt : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime || left.taskTitle.localeCompare(right.taskTitle, "zh-Hans-CN");
    });
  }

  openSettings() {
    this.app.setting.open();
    this.app.setting.openTabById(this.manifest.id);
  }

  openCreateTaskModal() {
    new TaskTextModal(
      this.app,
      "新建任务",
      "一行一个任务名",
      async (value) => this.addTasks(value)
    ).open();
  }

  openAppendTimeModal(taskId) {
    const task = this.findTask(taskId);
    if (!task) {
      return;
    }
    new AppendTimeModal(this.app, task, async (payload) => {
      await this.appendManualTime(taskId, payload);
    }).open();
  }

  openFinishTaskModal(taskId) {
    const task = this.findTask(taskId);
    if (!task) {
      return;
    }
    new FinishTaskModal(this.app, task, async (payload) => {
      await this.finishTask(taskId, payload);
    }).open();
  }

  getTodayTasks() {
    return this.state.tasks.filter((task) => task.date === todayKey());
  }

  findTask(taskId) {
    return this.state.tasks.find((task) => task.id === taskId);
  }

  async addTasks(rawText) {
    const titles = parseTaskTitles(rawText);
    if (titles.length === 0) {
      notice("先写任务名称，一行一个。");
      return;
    }

    const existing = new Set(this.getTodayTasks().map((task) => normalizeTitleKey(task.title)));
    const nextTitles = titles.filter((title) => !existing.has(normalizeTitleKey(title)));
    if (nextTitles.length === 0) {
      notice("今天已经有同名任务了。");
      return;
    }

    const now = new Date().toISOString();
    const tasks = nextTitles.map((title) => normalizeTask({
      id: createId(),
      uid: createId(),
      title,
      date: todayKey(),
      status: "pending",
      createdAt: now,
      completedAt: "",
      abandonedAt: "",
      actualMinutes: 0,
      summary: "",
      pomodoros: [],
      manualEntries: [],
    }));

    nextTitles.forEach((title) => this.undismissHabitTask(todayKey(), title));
    this.state.tasks.unshift(...tasks);
    await this.savePluginData();

    try {
      await this.syncTasksToDailyNote(tasks);
    } catch (error) {
      notice(`任务已保存，但写入日记失败: ${error.message}`);
    }

    this.render();
    notice(`已创建 ${tasks.length} 个任务`);
  }

  async appendManualTime(taskId, payload = {}) {
    const task = this.findTask(taskId);
    if (!task) {
      return;
    }

    const minutes = clampMinutes(payload.minutes);
    if (minutes <= 0) {
      notice("追加时长需要大于 0 分钟。");
      return;
    }

    task.manualEntries = normalizeManualEntries([
      ...(task.manualEntries || []),
      {
        id: createId(),
        minutes,
        recordedAt: new Date().toISOString(),
        note: String(payload.note || "").trim(),
      },
    ]);

    if (task.status === "completed") {
      task.actualMinutes = getTaskRecordedMinutes(task);
    }

    await this.savePluginData();

    try {
      await this.writeTaskToDailyNote(task);
    } catch (error) {
      notice(`时长已保存，但同步日记失败: ${error.message}`);
    }

    this.render();
    notice(`已追加 ${formatMinutes(minutes)}`);
  }

  async finishTask(taskId, payload = {}) {
    const task = this.findTask(taskId);
    if (!task) {
      return;
    }

    if (this.state.activePomodoro?.taskId === task.id) {
      await this.stopPomodoro(true);
    }

    const minutes = getTaskRecordedMinutes(task);
    if (minutes <= 0) {
      notice("先追加一些时长，再结束任务。");
      return;
    }

    task.status = "completed";
    task.actualMinutes = minutes;
    task.completedAt = new Date().toISOString();
    task.abandonedAt = "";
    task.summary = String(payload.summary || "").trim();

    await this.savePluginData();

    try {
      await this.writeTaskToDailyNote(task);
    } catch (error) {
      notice(`任务已结束，但同步日记失败: ${error.message}`);
    }

    this.render();
    notice("任务已结束。");
  }

  async reopenTask(taskId) {
    const task = this.findTask(taskId);
    if (!task) {
      return;
    }

    task.status = "pending";
    task.actualMinutes = 0;
    task.completedAt = "";
    task.abandonedAt = "";
    task.summary = "";

    await this.savePluginData();

    try {
      await this.writeTaskToDailyNote(task);
    } catch (error) {
      notice(`任务已恢复，但同步日记失败: ${error.message}`);
    }

    this.render();
  }

  async abandonTask(taskId) {
    const task = this.findTask(taskId);
    if (!task) {
      return;
    }

    if (this.state.activePomodoro?.taskId === task.id) {
      await this.stopPomodoro(false);
    }

    task.status = "abandoned";
    task.actualMinutes = 0;
    task.completedAt = "";
    task.abandonedAt = new Date().toISOString();

    await this.savePluginData();

    try {
      await this.writeTaskToDailyNote(task);
    } catch (error) {
      notice(`任务已放弃，但同步日记失败: ${error.message}`);
    }

    this.render();
  }

  async deleteTask(taskId) {
    const task = this.findTask(taskId);
    if (!task) {
      return;
    }

    if (this.state.activePomodoro?.taskId === task.id) {
      await this.stopPomodoro(false);
    }

    if (task.source === "habit") {
      this.dismissHabitTask(task);
    }
    this.state.tasks = this.state.tasks.filter((item) => item.id !== taskId);
    await this.savePluginData();

    try {
      await this.deleteTaskFromDailyNote(task);
    } catch (error) {
      notice(`已删除本地任务，但同步日记失败: ${error.message}`);
    }

    this.render();
  }

  async startPomodoro(taskId) {
    if (this.state.activePomodoro) {
      notice("已经有一个进行中的番茄。");
      return;
    }

    const task = this.findTask(taskId);
    if (!task || task.status !== "pending") {
      return;
    }

    this.state.activePomodoro = {
      id: createId(),
      taskId: task.id,
      startedAt: Date.now(),
      pausedAt: null,
      pausedMs: 0,
      isPaused: false,
    };

    await this.savePluginData();
    this.render();
  }

  async pausePomodoro() {
    const active = this.state.activePomodoro;
    if (!active || active.isPaused) {
      return;
    }
    active.isPaused = true;
    active.pausedAt = Date.now();
    await this.savePluginData();
    this.render();
  }

  async resumePomodoro() {
    const active = this.state.activePomodoro;
    if (!active || !active.isPaused) {
      return;
    }
    active.pausedMs += Date.now() - (active.pausedAt || Date.now());
    active.pausedAt = null;
    active.isPaused = false;
    await this.savePluginData();
    this.render();
  }

  async stopPomodoro(shouldSave) {
    const active = this.state.activePomodoro;
    if (!active) {
      return;
    }

    const task = this.findTask(active.taskId);
    if (shouldSave && task) {
      const minutes = Math.max(1, Math.round(getActiveElapsedMs(active) / 60000));
      task.pomodoros = normalizePomodoros([
        ...(task.pomodoros || []),
        {
          id: active.id,
          startedAt: new Date(active.startedAt).toISOString(),
          endedAt: new Date().toISOString(),
          minutes,
        },
      ]);
      notice(`已记录一个番茄: ${formatMinutes(minutes)}`);
      try {
        await this.writeTaskToDailyNote(task);
      } catch (error) {
        notice(`番茄已保存，但同步日记失败: ${error.message}`);
      }
    }

    this.state.activePomodoro = null;
    await this.savePluginData();
    this.render();
  }

  async refreshToday(silent = false) {
    await this.reloadTodayTasksFromDailyNote(todayKey());
    await this.importHabitTasks({
      silent: true,
      includeDismissed: false,
    });
    this.render();
    if (!silent) {
      notice("已刷新今日任务。");
    }
  }

  async reloadTodayTasksFromDailyNote(date) {
    const file = this.findDailyNoteFile(date);
    const records = file
      ? parseDailyNoteTasks(await this.app.vault.cachedRead(file), date)
      : [];

    const nextTodayTasks = dedupeTasks(records.map((record) => normalizeTask(record)));
    const otherTasks = this.state.tasks.filter((task) => task.date !== date);
    const nextTasks = dedupeTasks([...otherTasks, ...nextTodayTasks]);

    if (JSON.stringify(nextTasks) !== JSON.stringify(this.state.tasks)) {
      this.state.tasks = nextTasks;
      await this.savePluginData();
    }

    return nextTodayTasks.length;
  }

  async importHabitTasks(options = {}) {
    const silent = typeof options === "boolean" ? options : Boolean(options.silent);
    const includeDismissed = typeof options === "boolean" ? false : Boolean(options.includeDismissed);
    const habitPath = normalizeFileInput(this.settings.habitFile);
    if (!habitPath) {
      return 0;
    }

    const file = this.app.vault.getAbstractFileByPath(habitPath);
    if (!file || typeof file.path !== "string") {
      if (!silent) {
        notice("没有找到习惯文件。");
      }
      return 0;
    }

    const markdown = await this.app.vault.cachedRead(file);
    const titles = parseHabitTitles(markdown);
    if (titles.length === 0) {
      if (!silent) {
        notice("习惯文件里没有可导入的行。");
      }
      return 0;
    }

    const existing = new Set(this.getTodayTasks().map((task) => normalizeTitleKey(task.title)));
    const dismissed = this.getDismissedHabitTaskKeys(todayKey());
    const nextTitles = titles.filter((title) => {
      const key = normalizeTitleKey(title);
      return !existing.has(key) && (includeDismissed || !dismissed.has(key));
    });
    if (nextTitles.length === 0) {
      return 0;
    }

    const now = new Date().toISOString();
    const tasks = nextTitles.map((title) => normalizeTask({
      id: createId(),
      uid: createId(),
      title,
      date: todayKey(),
      status: "pending",
      source: "habit",
      sourceFile: habitPath,
      createdAt: now,
      completedAt: "",
      abandonedAt: "",
      actualMinutes: 0,
      summary: "",
      pomodoros: [],
      manualEntries: [],
    }));

    nextTitles.forEach((title) => this.undismissHabitTask(todayKey(), title));
    this.state.tasks.unshift(...tasks);
    await this.savePluginData();

    try {
      await this.syncTasksToDailyNote(tasks);
    } catch (error) {
      if (!silent) {
        notice(`习惯任务已导入，但同步日记失败: ${error.message}`);
      }
    }

    if (!silent) {
      notice(`已导入 ${tasks.length} 个习惯任务`);
    }
    return tasks.length;
  }

  async syncTasksToDailyNote(tasks) {
    for (const task of tasks) {
      await this.writeTaskToDailyNote(task);
    }
  }

  async writeTaskToDailyNote(task) {
    if (!this.settings.syncToDailyNote) {
      return;
    }

    const file = await this.ensureDailyNoteFile(task.date);
    if (!file) {
      throw new Error("没有找到当天日记文件");
    }

    await this.app.vault.process(file, (content) => {
      const lines = normalizeLineBreaks(content).split("\n");
      const index = findTaskLineIndex(lines, task);
      const nextLine = renderDailyNoteLine(task);
      if (index >= 0) {
        const end = findTaskDetailEnd(lines, index);
        lines.splice(index, end - index, nextLine);
      } else {
        if (lines.length > 0 && lines[lines.length - 1].trim() !== "") {
          lines.push("");
        }
        lines.push(nextLine);
      }
      return lines.join("\n");
    });

    this.lastDailyNoteSyncAt = Date.now();
  }

  async deleteTaskFromDailyNote(task) {
    if (!this.settings.syncToDailyNote) {
      return;
    }

    const file = this.findDailyNoteFile(task.date);
    if (!file) {
      return;
    }

    await this.app.vault.process(file, (content) => {
      const lines = normalizeLineBreaks(content).split("\n");
      const index = findTaskLineIndex(lines, task);
      if (index < 0) {
        return content;
      }
      const end = findTaskDetailEnd(lines, index);
      lines.splice(index, end - index);
      return trimTrailingBlankLines(lines).join("\n");
    });
  }

  async syncFromDailyNote(date) {
    const file = this.findDailyNoteFile(date);
    if (!file) {
      return 0;
    }

    const content = await this.app.vault.cachedRead(file);
    const records = parseDailyNoteTasks(content, date);
    if (records.length === 0) {
      return 0;
    }

    const existingByUid = new Map(this.state.tasks.map((task) => [task.uid, task]));
    const existingByIdentity = new Map(this.state.tasks.map((task) => [taskIdentityKey(task.date, task.title), task]));
    let changed = false;

    records.forEach((record) => {
      const existing = existingByUid.get(record.uid) || existingByIdentity.get(taskIdentityKey(record.date, record.title));
      if (!existing) {
        this.state.tasks.unshift(normalizeTask(record));
        changed = true;
        return;
      }

      const next = normalizeTask({
        ...existing,
        id: existing.id || record.id,
        uid: record.uid || existing.uid,
        title: record.title || existing.title,
        date: record.date || existing.date,
        status: record.status || existing.status,
        actualMinutes: record.actualMinutes > 0 ? record.actualMinutes : existing.actualMinutes,
        summary: record.summary || existing.summary,
        source: record.source || existing.source,
        sourceFile: record.sourceFile || existing.sourceFile,
        createdAt: record.createdAt || existing.createdAt,
        completedAt: record.completedAt || existing.completedAt,
        abandonedAt: record.abandonedAt || existing.abandonedAt,
        pomodoros: Array.isArray(record.pomodoros) && record.pomodoros.length > 0 ? record.pomodoros : existing.pomodoros,
        manualEntries: Array.isArray(record.manualEntries) && record.manualEntries.length > 0 ? record.manualEntries : existing.manualEntries,
      });

      if (taskSignature(existing) !== taskSignature(next)) {
        Object.assign(existing, next);
        changed = true;
      }
    });

    const deduped = dedupeTasks(this.state.tasks);
    if (deduped.length !== this.state.tasks.length) {
      this.state.tasks = deduped;
      changed = true;
    }

    if (changed) {
      await this.savePluginData();
    }

    return records.length;
  }

  getDismissedHabitTaskKeys(date) {
    return new Set(this.state.dismissedHabitTasks?.[date] || []);
  }

  dismissHabitTask(task) {
    const date = String(task?.date || todayKey());
    const key = normalizeTitleKey(task?.title || "");
    if (!key) {
      return;
    }
    const current = this.getDismissedHabitTaskKeys(date);
    current.add(key);
    this.state.dismissedHabitTasks[date] = Array.from(current).sort();
  }

  undismissHabitTask(date, title) {
    const key = normalizeTitleKey(title);
    if (!key) {
      return;
    }
    const current = this.getDismissedHabitTaskKeys(date);
    if (!current.has(key)) {
      return;
    }
    current.delete(key);
    if (current.size === 0) {
      delete this.state.dismissedHabitTasks[date];
      return;
    }
    this.state.dismissedHabitTasks[date] = Array.from(current).sort();
  }

  findDailyNoteFile(date) {
    const folder = normalizeFolderInput(this.settings.dailyFolder);
    if (!folder) {
      return null;
    }

    const files = this.listDailyFolderMarkdownFiles(folder);
    const exact = files.find((file) => inferDateKeyFromFile(file) === date);
    if (exact) {
      return exact;
    }

    const candidates = new Set(buildDateNameCandidates(date).map((item) => String(item || "").trim()).filter(Boolean));
    return files.find((file) => candidates.has(String(file.basename || "").trim())) || null;
  }

  listDailyFolderMarkdownFiles(folder = normalizeFolderInput(this.settings.dailyFolder)) {
    return this.app.vault.getMarkdownFiles().filter((file) => {
      const path = normalizePath(file.path);
      if (!folder || folder === "/") {
        return true;
      }
      return path.startsWith(`${folder}/`);
    });
  }

  isDailyNoteScopedFile(file) {
    const path = normalizePath(file?.path || "");
    if (!path) {
      return false;
    }
    const folder = normalizeFolderInput(this.settings.dailyFolder);
    if (!folder || folder === "/") {
      return path.endsWith(".md");
    }
    return path.startsWith(`${folder}/`) && path.endsWith(".md");
  }

  async ensureDailyNoteFile(date) {
    const existing = this.findDailyNoteFile(date);
    if (existing) {
      return existing;
    }

    const folder = normalizeFolderInput(this.settings.dailyFolder);
    if (!folder) {
      return null;
    }

    await this.ensureFolderExists(folder);

    const safePath = folder === "/"
      ? `${date}.md`
      : normalizePath(`${folder}/${date}.md`);

    const duplicate = this.findDailyNoteFile(date);
    if (duplicate) {
      return duplicate;
    }

    const current = this.app.vault.getAbstractFileByPath(safePath);
    if (current && typeof current.path === "string") {
      return current;
    }

    const created = await this.app.vault.create(safePath, buildDailyNoteInitialContent(date));
    return created || this.app.vault.getAbstractFileByPath(safePath) || null;
  }

  async ensureFolderExists(folder) {
    const normalized = normalizeFolderInput(folder);
    if (!normalized || normalized === "/") {
      return;
    }

    const parts = normalized.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const existing = this.app.vault.getAbstractFileByPath(current);
      if (!existing) {
        await this.app.vault.createFolder(current);
      }
    }
  }
}

function parseTaskTitles(rawText) {
  return [...new Set(
    String(rawText || "")
      .split(/\n+/)
      .map((line) => cleanTaskText(line))
      .filter(Boolean)
  )];
}

function parseHabitTitles(markdown) {
  return [...new Set(
    normalizeLineBreaks(markdown)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && !line.startsWith(">") && !line.startsWith("```"))
      .map((line) => cleanTaskText(line))
      .filter(Boolean)
  )];
}

function parseDailyNoteTasks(markdown, date) {
  const lines = normalizeLineBreaks(markdown).split("\n");
  const region = findManagedTaskRegion(lines);
  if (!region) {
    return [];
  }
  const records = [];
  for (let index = region.start; index < region.end; index += 1) {
    const record = parseDailyNoteTaskLine(lines[index], date);
    if (!record) {
      continue;
    }
    const detailPomodoros = [];
    const detailManualEntries = [];
    let nextIndex = index + 1;
    while (nextIndex < lines.length && isTaskRecordDetailLine(lines[nextIndex])) {
      const detail = parseTaskRecordDetailLine(lines[nextIndex], record.date);
      if (detail) {
        if (detail.type === "pomodoro") {
          detailPomodoros.push(detail.value);
        } else if (detail.type === "manual") {
          detailManualEntries.push(detail.value);
        }
      }
      nextIndex += 1;
    }
    if (detailPomodoros.length > 0) {
      record.pomodoros = normalizePomodoros(detailPomodoros);
    }
    if (detailManualEntries.length > 0) {
      record.manualEntries = normalizeManualEntries(detailManualEntries);
    }
    if ((record.actualMinutes || 0) <= 0 && record.status === "completed") {
      record.actualMinutes = getTaskRecordedMinutes(record);
    }
    records.push(record);
    index = nextIndex - 1;
  }
  return records;
}

function parseDailyNoteTaskLine(line, date) {
  if (isTaskRecordDetailLine(line)) {
    return null;
  }
  const metadata = parseTaskMetadata(line);
  const legacyUid = metadata?.uid || "";
  if (!legacyUid && !isTimeListTaskLine(line)) {
    return null;
  }
  const title = cleanTaskText(stripTaskMetadata(line));
  if (!title) {
    return null;
  }

  const normalizedDate = metadata?.date || date || todayKey();
  const stableUid = legacyUid || buildStableTaskUid(normalizedDate, title);
  const visiblePomodoroMinutes = parseVisiblePomodoroMinutes(line);
  const visibleManualMinutes = parseVisibleManualMinutes(line);
  const visiblePomodoros = normalizePomodoros(metadata?.pomodoros);
  const visibleManualEntries = normalizeManualEntries(metadata?.manualEntries);
  const fallbackTimestamp = new Date(`${normalizedDate}T12:00:00`).toISOString();

  return normalizeTask({
    id: stableUid,
    uid: stableUid,
    title,
    date: normalizedDate,
    status: metadata?.status || inferStatusFromLine(line),
    source: metadata?.source || "",
    sourceFile: metadata?.sourceFile || "",
    createdAt: metadata?.createdAt || new Date().toISOString(),
    completedAt: metadata?.completedAt || "",
    abandonedAt: metadata?.abandonedAt || "",
    actualMinutes: Number(metadata?.actualMinutes) || parseVisibleActualMinutes(line),
    summary: String(metadata?.summary || parseVisibleSummary(line) || "").trim(),
    pomodoros: visiblePomodoros.length > 0
      ? visiblePomodoros
      : visiblePomodoroMinutes > 0
        ? [{
          id: `${stableUid}:pomodoro`,
          startedAt: fallbackTimestamp,
          endedAt: fallbackTimestamp,
          minutes: visiblePomodoroMinutes,
        }]
        : [],
    manualEntries: visibleManualEntries.length > 0
      ? visibleManualEntries
      : visibleManualMinutes > 0
        ? [{
          id: `${stableUid}:manual`,
          recordedAt: fallbackTimestamp,
          minutes: visibleManualMinutes,
          note: "从日记恢复",
        }]
        : [],
  });
}

function renderDailyNoteLine(task) {
  const parts = [task.title];
  if (task.status === "completed") {
    parts.push("✅");
    if (task.actualMinutes > 0) {
      parts.push(`⏱${formatCompactMinutes(task.actualMinutes)}`);
    }
  } else if (task.status === "abandoned") {
    parts.push("🚫");
  }

  const pomodoroMinutes = totalPomodoroMinutes(task);
  const manualMinutes = totalManualMinutes(task);
  if (pomodoroMinutes > 0) {
    parts.push(`🍅${formatCompactMinutes(pomodoroMinutes)}`);
  }
  if (manualMinutes > 0) {
    parts.push(`✍${formatCompactMinutes(manualMinutes)}`);
  }
  if (task.summary) {
    parts.push(`📝${task.summary.replace(/\s+/g, " ").trim()}`);
  }

  return parts.join(" ").trim();
}

function serializeTaskMetadata(task) {
  return `<!-- time-list:${String(task.uid || task.id || "").trim()} -->`;
}

function parseTaskMetadata(line) {
  const match = /<!--\s*time-list:([\s\S]*?)\s*-->/.exec(String(line || ""));
  if (!match) {
    return null;
  }
  const raw = String(match[1] || "").trim();
  if (!raw) {
    return null;
  }
  if (!raw.startsWith("{")) {
    return { uid: raw };
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("[daily-time-list] 元数据解析失败", error);
    return null;
  }
}

function stripTaskMetadata(line) {
  return String(line || "")
    .replace(/<!--\s*time-list:[\s\S]*?-->/g, "")
    .trim();
}

function findTaskLineIndex(lines, taskOrUid) {
  const region = findManagedTaskRegion(lines);
  const start = region ? region.start : 0;
  const end = region ? region.end : lines.length;
  const uid = typeof taskOrUid === "string" ? taskOrUid : String(taskOrUid?.uid || "").trim();
  const titleKey = typeof taskOrUid === "object" && taskOrUid
    ? normalizeTitleKey(taskOrUid.title)
    : "";
  for (let index = start; index < end; index += 1) {
    const line = lines[index];
    const metadata = parseTaskMetadata(line);
    if (uid && metadata?.uid === uid) {
      return index;
    }
    if (!isTimeListTaskLine(line)) {
      continue;
    }
    if (titleKey && normalizeTitleKey(cleanTaskText(stripTaskMetadata(line))) === titleKey) {
      return index;
    }
  }
  return -1;
}

function findTaskDetailEnd(lines, startIndex) {
  let end = Number(startIndex) + 1;
  while (end < lines.length && isTaskRecordDetailLine(lines[end])) {
    end += 1;
  }
  return end;
}

function isTaskRecordDetailLine(line) {
  return /^\s{2,}[-*+]\s+[🍅✍]/.test(String(line || "").trimEnd());
}

function findManagedTaskRegion(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return null;
  }
  let end = lines.length;
  while (end > 0 && String(lines[end - 1] || "").trim() === "") {
    end -= 1;
  }
  if (end <= 0) {
    return null;
  }

  let start = end;
  let hasTaskLine = false;
  while (start > 0) {
    const line = String(lines[start - 1] || "");
    const trimmed = line.trim();
    if (!trimmed) {
      start -= 1;
      continue;
    }
    if (isTaskRecordDetailLine(line) || isTimeListTaskLine(line)) {
      hasTaskLine = true;
      start -= 1;
      continue;
    }
    break;
  }
  return hasTaskLine ? { start, end } : null;
}

function parseTaskRecordDetailLine(line, date) {
  const text = String(line || "").trim();
  const pomodoroMatch = /^[-*+]\s+🍅\s+(.+)$/.exec(text.replace(/^\s+/, ""));
  if (pomodoroMatch) {
    const detail = parseRecordDetailPayload(pomodoroMatch[1], "pomodoro", date);
    return detail ? { type: "pomodoro", value: detail } : null;
  }
  const manualMatch = /^[-*+]\s+✍\s+(.+)$/.exec(text.replace(/^\s+/, ""));
  if (manualMatch) {
    const detail = parseRecordDetailPayload(manualMatch[1], "manual", date);
    return detail ? { type: "manual", value: detail } : null;
  }
  return null;
}

function parseRecordDetailPayload(text, type, date) {
  const parts = String(text || "").split(/\s*·\s*/).map((item) => item.trim()).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  const minutes = parseDurationText(parts[0]);
  if (minutes <= 0) {
    return null;
  }
  let timeValue = "";
  let note = "";
  for (let index = 1; index < parts.length; index += 1) {
    if (!timeValue && /^\d{2}:\d{2}$/.test(parts[index])) {
      timeValue = `${date || todayKey()}T${parts[index]}:00`;
    } else if (!note) {
      note = parts[index];
    } else {
      note += ` · ${parts[index]}`;
    }
  }
  if (type === "pomodoro") {
    const end = timeValue || `${date || todayKey()}T12:00:00`;
    return {
      id: createId(),
      startedAt: new Date(Date.parse(end) - minutes * 60000).toISOString(),
      endedAt: new Date(end).toISOString(),
      minutes,
    };
  }
  return {
    id: createId(),
    minutes,
    recordedAt: timeValue ? new Date(timeValue).toISOString() : new Date(`${date || todayKey()}T12:00:00`).toISOString(),
    note,
  };
}

function inferStatusFromLine(line) {
  const text = String(line || "");
  if (/🚫|❌/.test(text)) {
    return "abandoned";
  }
  if (/✅/.test(text)) {
    return "completed";
  }
  if (/^-\s+\[(?:x|X)\]\s+/.test(text)) {
    return "completed";
  }
  if (/^-\s+\[-\]\s+/.test(text)) {
    return "abandoned";
  }
  if (/^-\s+\[\s\]\s+/.test(text)) {
    return "pending";
  }
  return "pending";
}

function parseVisibleActualMinutes(line) {
  const match = /⏱\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i.exec(String(line || ""));
  if (!match) {
    return 0;
  }
  return (Number(match[1]) || 0) * 60 + (Number(match[2]) || 0);
}

function parseVisiblePomodoroMinutes(line) {
  const match = /🍅\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i.exec(String(line || ""));
  if (!match) {
    return 0;
  }
  return (Number(match[1]) || 0) * 60 + (Number(match[2]) || 0);
}

function parseVisibleManualMinutes(line) {
  const match = /✍\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i.exec(String(line || ""));
  if (!match) {
    return 0;
  }
  return (Number(match[1]) || 0) * 60 + (Number(match[2]) || 0);
}

function parseVisibleSummary(line) {
  const match = /📝\s*(.+?)(?:\s*<!--|$)/.exec(String(line || ""));
  return match ? String(match[1] || "").trim() : "";
}

function compactTaskMetadataInLine(line, uid) {
  const parsed = parseDailyNoteTaskLine(line, todayKey());
  if (!parsed) {
    return stripTaskMetadata(line);
  }
  if (uid && !parsed.uid) {
    parsed.uid = uid;
  }
  return renderDailyNoteLine(parsed);
}

function isTimeListTaskLine(line) {
  const text = stripTaskMetadata(line);
  if (isTaskRecordDetailLine(text)) {
    return false;
  }
  if (!text) {
    return false;
  }
  if (/^[-*+]\s+/.test(text)) {
    return true;
  }
  if (/^(#{1,6}\s+|>\s+|```|~~~|\|)/.test(text)) {
    return false;
  }
  if (/^\d+\.\s+/.test(text)) {
    return false;
  }
  return true;
}

function cleanTaskText(line) {
  return String(line || "")
    .replace(/<!--\s*time-list:[\s\S]*?-->/g, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\[(?: |x|X|-)\]\s+/, "")
    .replace(/^\[[ xX]\]\s+/, "")
    .replace(/\s*✅.*$/g, "")
    .replace(/\s*🚫.*$/g, "")
    .replace(/\s*❌.*$/g, "")
    .replace(/\s*⏱\S+/g, "")
    .replace(/\s*🍅\S+/g, "")
    .replace(/\s*✍\S+/g, "")
    .replace(/\s*📝.*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTask(task = {}) {
  return {
    id: String(task.id || createId()),
    uid: String(task.uid || task.id || createId()),
    title: String(task.title || "").trim(),
    date: String(task.date || todayKey()),
    status: ["pending", "completed", "abandoned"].includes(task.status) ? task.status : "pending",
    source: String(task.source || ""),
    sourceFile: String(task.sourceFile || ""),
    createdAt: String(task.createdAt || new Date().toISOString()),
    completedAt: String(task.completedAt || ""),
    abandonedAt: String(task.abandonedAt || ""),
    actualMinutes: Number(task.actualMinutes) || 0,
    summary: String(task.summary || ""),
    pomodoros: normalizePomodoros(task.pomodoros),
    manualEntries: normalizeManualEntries(task.manualEntries),
  };
}

function normalizePomodoros(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => {
      const minutes = Number(item?.minutes) || 0;
      if (minutes <= 0) {
        return null;
      }
      return {
        id: String(item.id || createId()),
        startedAt: String(item.startedAt || ""),
        endedAt: String(item.endedAt || ""),
        minutes,
      };
    })
    .filter(Boolean);
}

function normalizeManualEntries(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => {
      const minutes = Number(item?.minutes) || 0;
      if (minutes <= 0) {
        return null;
      }
      return {
        id: String(item.id || createId()),
        minutes,
        recordedAt: String(item.recordedAt || ""),
        note: String(item.note || ""),
      };
    })
    .filter(Boolean);
}

function normalizeActivePomodoro(active) {
  if (!active) {
    return null;
  }
  const startedAt = Number(active.startedAt) || 0;
  if (!startedAt) {
    return null;
  }
  return {
    id: String(active.id || createId()),
    taskId: String(active.taskId || ""),
    startedAt,
    pausedAt: active.pausedAt ? Number(active.pausedAt) : null,
    pausedMs: Number(active.pausedMs) || 0,
    isPaused: Boolean(active.isPaused),
  };
}

function normalizeDismissedHabitTasks(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result = {};
  Object.entries(value).forEach(([date, titles]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || !Array.isArray(titles)) {
      return;
    }
    const normalized = [...new Set(titles.map((item) => normalizeTitleKey(item)).filter(Boolean))].sort();
    if (normalized.length > 0) {
      result[date] = normalized;
    }
  });
  return result;
}

function dedupeTasks(tasks) {
  const byIdentity = new Map();
  normalizeTaskList(tasks).forEach((task) => {
    const key = taskIdentityKey(task.date, task.title);
    const current = byIdentity.get(key);
    if (!current || compareTaskRichness(task, current) > 0) {
      byIdentity.set(key, task);
    }
  });
  return Array.from(byIdentity.values()).sort((a, b) => {
    const timeDiff = (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return a.title.localeCompare(b.title, "zh-Hans-CN");
  });
}

function normalizeTaskList(tasks) {
  return Array.isArray(tasks) ? tasks.map((task) => normalizeTask(task)).filter((task) => task.title) : [];
}

function compareTaskRichness(left, right) {
  return taskRichnessScore(left) - taskRichnessScore(right);
}

function taskRichnessScore(task) {
  let score = 0;
  if (task.status === "completed") {
    score += 50;
  } else if (task.status === "abandoned") {
    score += 30;
  }
  score += (Number(task.actualMinutes) || 0) * 2;
  score += totalPomodoroMinutes(task) * 2;
  score += totalManualMinutes(task) * 2;
  score += task.summary ? 20 : 0;
  score += task.source ? 5 : 0;
  score += task.sourceFile ? 5 : 0;
  score += Date.parse(task.createdAt || "") || 0;
  return score;
}

function buildStableTaskUid(date, title) {
  return `task:${taskIdentityKey(date, title)}`;
}

function taskIdentityKey(date, title) {
  return `${String(date || todayKey())}::${normalizeTitleKey(title)}`;
}

function totalPomodoroMinutes(task) {
  return normalizePomodoros(task?.pomodoros).reduce((sum, item) => sum + item.minutes, 0);
}

function totalManualMinutes(task) {
  return normalizeManualEntries(task?.manualEntries).reduce((sum, item) => sum + item.minutes, 0);
}

function activePomodoroMinutes(active) {
  if (!active) {
    return 0;
  }
  return Math.max(0, Math.round(getActiveElapsedMs(active) / 60000));
}

function getTaskRecordedMinutes(task) {
  return totalPomodoroMinutes(task) + totalManualMinutes(task) + activePomodoroMinutes(task.activePomodoro);
}

function getVisibleTaskMinutes(task) {
  if (task.status === "completed") {
    return Number(task.actualMinutes) || getTaskRecordedMinutes(task);
  }
  return getTaskRecordedMinutes(task);
}

function getActiveElapsedMs(active) {
  const end = active.isPaused ? (active.pausedAt || Date.now()) : Date.now();
  return Math.max(0, end - active.startedAt - (active.pausedMs || 0));
}

function taskStatusText(status) {
  if (status === "completed") {
    return "已完成";
  }
  if (status === "abandoned") {
    return "已放弃";
  }
  return "待完成";
}

function sortTasks(tasks) {
  const rank = { pending: 0, abandoned: 1, completed: 2 };
  return tasks.slice().sort((a, b) => {
    const diff = (rank[a.status] || 0) - (rank[b.status] || 0);
    if (diff !== 0) {
      return diff;
    }
    return (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
  });
}

function taskSignature(task) {
  return JSON.stringify({
    uid: task.uid,
    title: task.title,
    date: task.date,
    status: task.status,
    actualMinutes: task.actualMinutes,
    summary: task.summary,
    pomodoros: normalizePomodoros(task.pomodoros),
    manualEntries: normalizeManualEntries(task.manualEntries),
  });
}

function buildDateNameCandidates(date) {
  const [year, month, day] = String(date || "").split("-");
  return [
    `${year}-${month}-${day}`,
    `${year}${month}${day}`,
    `${year}.${month}.${day}`,
    `${year}/${month}/${day}`,
    `${year}_${month}_${day}`,
    `${year}年${month}月${day}日`,
    `${year}年${Number(month)}月${Number(day)}日`,
    `${month}-${day}`,
    `${month}.${day}`,
    `${month}/${day}`,
    `${Number(month)}月${Number(day)}日`,
  ];
}

function inferDateKeyFromFile(file) {
  const path = normalizePath(file?.path || "");
  if (!path) {
    return "";
  }

  const segments = path.split("/").filter(Boolean);
  const filename = segments[segments.length - 1] || "";
  const basename = filename.replace(/\.md$/i, "");

  let match = /^(\d{4})[-._](\d{1,2})[-._](\d{1,2})$/.exec(basename);
  if (match) {
    return `${match[1]}-${pad2(Number(match[2]))}-${pad2(Number(match[3]))}`;
  }

  match = /^(\d{4})年(\d{1,2})月(\d{1,2})日$/.exec(basename);
  if (match) {
    return `${match[1]}-${pad2(Number(match[2]))}-${pad2(Number(match[3]))}`;
  }

  const monthSegment = segments[segments.length - 2] || "";
  const yearSegment = segments[segments.length - 3] || "";
  if (/^\d{4}$/.test(yearSegment) && /^\d{1,2}$/.test(monthSegment)) {
    match = /^(\d{1,2})$/.exec(basename);
    if (match) {
      return `${yearSegment}-${pad2(Number(monthSegment))}-${pad2(Number(match[1]))}`;
    }

    match = /^(\d{1,2})[-._](\d{1,2})$/.exec(basename);
    if (match) {
      return `${yearSegment}-${pad2(Number(match[1]))}-${pad2(Number(match[2]))}`;
    }
  }

  return "";
}

function buildDailyNoteInitialContent(date) {
  return `# ${date}\n`;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatClock(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) {
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(rest)}`;
  }
  return `${pad2(minutes)}:${pad2(rest)}`;
}

function formatMinutes(minutes) {
  const value = Number(minutes) || 0;
  if (value < 60) {
    return `${value} 分钟`;
  }
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}

function formatCompactMinutes(minutes) {
  const value = Number(minutes) || 0;
  if (value < 60) {
    return `${value}m`;
  }
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours}h${rest}m` : `${hours}h`;
}

function parseDurationText(text) {
  const match = /(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i.exec(String(text || "").trim());
  if (!match) {
    return 0;
  }
  return (Number(match[1]) || 0) * 60 + (Number(match[2]) || 0);
}

function formatRecordTime(value) {
  const time = Date.parse(String(value || ""));
  if (!time) {
    return "";
  }
  const date = new Date(time);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatPercent(minutes, total) {
  if (!total) {
    return "0%";
  }
  return `${Math.round((minutes / total) * 100)}%`;
}

function clampFocusDateToMonth(dateKey, month) {
  if (String(dateKey || "").slice(0, 7) === String(month || "")) {
    return dateKey;
  }
  const dates = getMonthGridDates(month).filter((date) => date.slice(0, 7) === month);
  return dates.includes(todayKey()) && todayKey().slice(0, 7) === month
    ? todayKey()
    : (dates[0] || `${month}-01`);
}

function monthKey(date) {
  return String(date || todayKey()).slice(0, 7);
}

function shiftMonthKey(value, offset) {
  const [year, month] = String(value || monthKey(todayKey())).split("-").map((item) => Number(item));
  const next = new Date(year, (month || 1) - 1 + Number(offset || 0), 1);
  return `${next.getFullYear()}-${pad2(next.getMonth() + 1)}`;
}

function formatMonthTitle(value) {
  const [year, month] = String(value || monthKey(todayKey())).split("-");
  return `${year} 年 ${Number(month)} 月`;
}

function parseDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) {
    return new Date();
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function normalizeTimestamp(value) {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : 0;
  }
  const time = Date.parse(String(value || ""));
  return Number.isFinite(time) ? time : 0;
}

function isTimestampOnDate(timestamp, dateKey) {
  if (!timestamp || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""))) {
    return false;
  }
  return toDateKey(new Date(timestamp)) === dateKey;
}

function formatCalendarDetailTitle(dateKey) {
  const date = parseDateKey(dateKey);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatTimeOfDay(timestamp) {
  if (!timestamp) {
    return "--:--";
  }
  const date = new Date(timestamp);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
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

function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getMonthGridDates(value) {
  const [year, month] = String(value || monthKey(todayKey())).split("-").map((item) => Number(item));
  const firstDay = new Date(year, (month || 1) - 1, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstWeekday);
  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return toDateKey(current);
  });
}

function buildEmptyDateSummary() {
  return {
    totalTasks: 0,
    completedCount: 0,
    completedMinutes: 0,
    completedTitles: [],
    completedItems: [],
  };
}

function summarizeTasksByDate(tasks) {
  const map = new Map();
  normalizeTaskList(tasks).forEach((task) => {
    const key = String(task.date || todayKey());
    const current = map.get(key) || buildEmptyDateSummary();
    current.totalTasks += 1;
    if (task.status === "completed") {
      const taskMinutes = Number(task.actualMinutes) || getVisibleTaskMinutes(task);
      current.completedCount += 1;
      current.completedMinutes += taskMinutes;
      if (task.title) {
        current.completedTitles.push(String(task.title));
        current.completedItems.push({
          title: String(task.title),
          minutes: taskMinutes,
        });
      }
    }
    map.set(key, current);
  });
  return map;
}

function shiftDateKey(value, offset) {
  const next = parseDateKey(value || todayKey());
  next.setDate(next.getDate() + Number(offset || 0));
  return toDateKey(next);
}

function calendarIntensity(minutes, maxMinutes) {
  if (!minutes || !maxMinutes) {
    return 0;
  }
  const ratio = minutes / maxMinutes;
  if (ratio >= 0.85) {
    return 4;
  }
  if (ratio >= 0.6) {
    return 3;
  }
  if (ratio >= 0.35) {
    return 2;
  }
  return 1;
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
      const minutes = Number(task.chartMinutes) || 0;
      const angle = (minutes / total) * 360;
      const path = donutSlicePath(center, center, outerRadius, innerRadius, startAngle, startAngle + angle);
      startAngle += angle;
      return `<path d="${path}" fill="${PIE_COLORS[index % PIE_COLORS.length]}" />`;
    }).join("");

  return `
    <div class="time-list-pie">
      <svg viewBox="0 0 120 120" role="img" aria-label="今日任务时间分布饼图">
        <circle cx="${center}" cy="${center}" r="${outerRadius}" fill="var(--background-modifier-border-hover)" />
        ${slices}
        <circle cx="${center}" cy="${center}" r="${innerRadius}" fill="var(--background-primary)" />
      </svg>
      <div class="time-list-pie-center">
        <strong>${escapeHtml(formatMinutes(total))}</strong>
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

function clampMinutes(value) {
  const number = Math.round(Number(value) || 0);
  return Math.max(0, Math.min(number, 24 * 60));
}

function normalizeFolderInput(value) {
  const text = String(value || "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return text || "";
}

function normalizeFileInput(value) {
  const text = String(value || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  return text ? normalizePath(text) : "";
}

function normalizeTitleKey(title) {
  return cleanTaskText(title).replace(/\s+/g, "").toLowerCase();
}

function normalizeLineBreaks(text) {
  return String(text || "").replace(/\r\n/g, "\n");
}

function trimTrailingBlankLines(lines) {
  const next = lines.slice();
  while (next.length > 0 && next[next.length - 1].trim() === "") {
    next.pop();
  }
  return next;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function notice(message) {
  new Notice(String(message || ""));
}

function addButton(parent, text, onClick, extraClass = "") {
  const button = parent.createEl("button", { text });
  if (extraClass) {
    extraClass.split(/\s+/).filter(Boolean).forEach((name) => button.addClass(name));
  }
  if (extraClass.includes("is-disabled")) {
    button.disabled = true;
  } else {
    button.addEventListener("click", onClick);
  }
  return button;
}

function addIconButton(parent, iconName, label, onClick, extraClass = "") {
  const button = parent.createEl("button", {
    cls: "time-list-icon-button",
    attr: {
      "aria-label": label,
      title: label,
      type: "button",
    },
  });
  if (extraClass) {
    extraClass.split(/\s+/).filter(Boolean).forEach((name) => button.addClass(name));
  }
  appendInlineIcon(button, iconName);
  if (extraClass.includes("is-disabled")) {
    button.disabled = true;
  } else {
    button.addEventListener("click", onClick);
  }
  return button;
}

function addIconTextButton(parent, iconName, label, onClick, extraClass = "") {
  const button = addButton(parent, label, onClick, `time-list-icon-text-button ${extraClass}`.trim());
  button.empty();
  appendInlineIcon(button, iconName);
  button.createSpan({ text: label });
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
  return button;
}

function appendInlineIcon(parent, iconName) {
  const icon = parent.createSpan({ cls: "time-list-inline-icon" });
  try {
    setIcon(icon, iconName);
  } catch (error) {
    icon.setText("•");
  }
  return icon;
}

module.exports = DailyTimeListPlugin;
module.exports.default = DailyTimeListPlugin;

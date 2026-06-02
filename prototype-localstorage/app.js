const STORAGE_KEY = "pmo-meeting-hub-v1";

const initialMeetings = [
  {
    id: createId(),
    title: "基幹システム刷新 定例会",
    date: new Date().toISOString().slice(0, 10),
    attendees: "PMO, 開発リード, 業務部門",
    minutes:
      "進捗は計画通り。要件確定後の追加要望は変更管理フローに乗せる方針を確認。",
    decisions: [
      {
        id: createId(),
        text: "追加要望はPMOが一次受付し、影響度を整理する",
        owner: "PMO",
        dueDate: "",
        status: "完了",
      },
    ],
    todos: [
      {
        id: createId(),
        text: "次回会議までに移行リハーサル計画を作成する",
        owner: "開発リード",
        dueDate: "",
        status: "進行中",
      },
    ],
    issues: [
      {
        id: createId(),
        text: "業務部門レビューの参加者確定が遅れている",
        owner: "業務部門",
        dueDate: "",
        status: "未着手",
      },
    ],
  },
];

const state = {
  meetings: loadMeetings(),
  selectedMeetingId: null,
  activeTab: "decisions",
};

const elements = {
  meetingList: document.querySelector("#meetingList"),
  meetingCount: document.querySelector("#meetingCount"),
  pageTitle: document.querySelector("#pageTitle"),
  meetingForm: document.querySelector("#meetingForm"),
  meetingTitle: document.querySelector("#meetingTitle"),
  meetingDate: document.querySelector("#meetingDate"),
  meetingAttendees: document.querySelector("#meetingAttendees"),
  meetingMinutes: document.querySelector("#meetingMinutes"),
  newMeetingButton: document.querySelector("#newMeetingButton"),
  saveMeetingButton: document.querySelector("#saveMeetingButton"),
  deleteMeetingButton: document.querySelector("#deleteMeetingButton"),
  exportMarkdownButton: document.querySelector("#exportMarkdownButton"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
  decisionSummary: document.querySelector("#decisionSummary"),
  todoSummary: document.querySelector("#todoSummary"),
  issueSummary: document.querySelector("#issueSummary"),
  openSummary: document.querySelector("#openSummary"),
  tabs: document.querySelectorAll(".tab"),
  itemForm: document.querySelector("#itemForm"),
  itemText: document.querySelector("#itemText"),
  itemOwner: document.querySelector("#itemOwner"),
  itemDueDate: document.querySelector("#itemDueDate"),
  itemStatus: document.querySelector("#itemStatus"),
  addItemButton: document.querySelector("#addItemButton"),
  itemList: document.querySelector("#itemList"),
  meetingButtonTemplate: document.querySelector("#meetingButtonTemplate"),
  itemTemplate: document.querySelector("#itemTemplate"),
};

if (!state.meetings.length) {
  state.meetings = initialMeetings;
  saveMeetings();
}

state.selectedMeetingId = state.meetings[0]?.id ?? null;
render();

elements.newMeetingButton.addEventListener("click", createMeeting);
elements.saveMeetingButton.addEventListener("click", saveMeeting);
elements.deleteMeetingButton.addEventListener("click", deleteSelectedMeeting);
elements.meetingForm.addEventListener("submit", saveMeeting);
elements.itemForm.addEventListener("submit", addItem);
elements.addItemButton.addEventListener("click", addItem);
elements.exportMarkdownButton.addEventListener("click", exportMarkdown);
elements.exportCsvButton.addEventListener("click", exportCsv);

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeTab = tab.dataset.tab;
    render();
  });
});

function loadMeetings() {
  const rawValue = localStorage.getItem(STORAGE_KEY);
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMeetings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.meetings));
}

function getSelectedMeeting() {
  return state.meetings.find((meeting) => meeting.id === state.selectedMeetingId);
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createMeeting() {
  const meeting = {
    id: createId(),
    title: "新しい会議",
    date: new Date().toISOString().slice(0, 10),
    attendees: "",
    minutes: "",
    decisions: [],
    todos: [],
    issues: [],
  };

  state.meetings.unshift(meeting);
  state.selectedMeetingId = meeting.id;
  saveMeetings();
  render();
  elements.meetingTitle.focus();
}

function deleteSelectedMeeting() {
  const meeting = getSelectedMeeting();
  if (!meeting) return;

  const confirmed = confirm(`「${meeting.title}」を削除しますか？`);
  if (!confirmed) return;

  state.meetings = state.meetings.filter((item) => item.id !== meeting.id);
  state.selectedMeetingId = state.meetings[0]?.id ?? null;
  saveMeetings();
  render();
}

function saveMeeting(event) {
  event?.preventDefault();
  if (!elements.meetingForm.reportValidity()) return;

  const meeting = getSelectedMeeting();
  if (!meeting) return;

  meeting.title = elements.meetingTitle.value.trim() || "無題の会議";
  meeting.date = elements.meetingDate.value;
  meeting.attendees = elements.meetingAttendees.value.trim();
  meeting.minutes = elements.meetingMinutes.value.trim();

  saveMeetings();
  render();
}

function addItem(event) {
  event?.preventDefault();
  if (!elements.itemForm.reportValidity()) return;

  const meeting = getSelectedMeeting();
  if (!meeting) return;

  meeting[state.activeTab].push({
    id: createId(),
    text: elements.itemText.value.trim(),
    owner: elements.itemOwner.value.trim(),
    dueDate: elements.itemDueDate.value,
    status: elements.itemStatus.value,
  });

  elements.itemForm.reset();
  elements.itemStatus.value = "未着手";
  saveMeetings();
  render();
  elements.itemText.focus();
}

function render() {
  const meeting = getSelectedMeeting();

  renderMeetingList();
  renderMeetingForm(meeting);
  renderSummary(meeting);
  renderTabs();
  renderItems(meeting);
}

function renderMeetingList() {
  elements.meetingList.innerHTML = "";
  elements.meetingCount.textContent = String(state.meetings.length);

  if (!state.meetings.length) {
    elements.meetingList.innerHTML = '<p class="empty-state">会議がありません</p>';
    return;
  }

  state.meetings.forEach((meeting) => {
    const node = elements.meetingButtonTemplate.content.cloneNode(true);
    const button = node.querySelector(".meeting-button");
    button.classList.toggle("is-active", meeting.id === state.selectedMeetingId);
    button.querySelector(".meeting-button-title").textContent = meeting.title;
    button.querySelector(".meeting-button-meta").textContent = `${meeting.date || "日付未設定"} / ${
      meeting.todos.length + meeting.issues.length
    }件`;
    button.addEventListener("click", () => {
      state.selectedMeetingId = meeting.id;
      render();
    });
    elements.meetingList.append(button);
  });
}

function renderMeetingForm(meeting) {
  const hasMeeting = Boolean(meeting);
  elements.meetingForm.querySelectorAll("input, textarea, button").forEach((control) => {
    control.disabled = !hasMeeting;
  });
  elements.deleteMeetingButton.disabled = !hasMeeting;
  elements.exportMarkdownButton.disabled = !hasMeeting;
  elements.exportCsvButton.disabled = !hasMeeting;
  elements.itemForm.querySelectorAll("input, select, button").forEach((control) => {
    control.disabled = !hasMeeting;
  });

  elements.pageTitle.textContent = meeting?.title ?? "会議を選択";
  elements.meetingTitle.value = meeting?.title ?? "";
  elements.meetingDate.value = meeting?.date ?? "";
  elements.meetingAttendees.value = meeting?.attendees ?? "";
  elements.meetingMinutes.value = meeting?.minutes ?? "";
}

function renderSummary(meeting) {
  const decisions = meeting?.decisions.length ?? 0;
  const todos = meeting?.todos.length ?? 0;
  const issues = meeting?.issues.length ?? 0;
  const openItems = ["todos", "issues"].flatMap((key) => meeting?.[key] ?? []);

  elements.decisionSummary.textContent = String(decisions);
  elements.todoSummary.textContent = String(todos);
  elements.issueSummary.textContent = String(issues);
  elements.openSummary.textContent = String(
    openItems.filter((item) => item.status !== "完了").length
  );
}

function renderTabs() {
  elements.tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === state.activeTab);
  });
}

function renderItems(meeting) {
  elements.itemList.innerHTML = "";
  const items = meeting?.[state.activeTab] ?? [];

  if (!meeting || !items.length) {
    elements.itemList.innerHTML = '<p class="empty-state">登録データがありません</p>';
    return;
  }

  items.forEach((item) => {
    const node = elements.itemTemplate.content.cloneNode(true);
    const card = node.querySelector(".item-card");
    const select = node.querySelector(".status-select");
    card.querySelector(".item-text").textContent = item.text;
    card.querySelector(".item-meta").textContent = [
      item.owner ? `担当: ${item.owner}` : "担当未設定",
      item.dueDate ? `期限: ${item.dueDate}` : "期限未設定",
    ].join(" / ");

    select.value = item.status;
    select.addEventListener("change", () => {
      item.status = select.value;
      saveMeetings();
      renderSummary(meeting);
    });

    card.querySelector(".icon-button").addEventListener("click", () => {
      meeting[state.activeTab] = meeting[state.activeTab].filter(
        (candidate) => candidate.id !== item.id
      );
      saveMeetings();
      render();
    });

    elements.itemList.append(card);
  });
}

function exportMarkdown() {
  const meeting = getSelectedMeeting();
  if (!meeting) return;

  const sections = [
    ["決定事項", meeting.decisions],
    ["ToDo", meeting.todos],
    ["課題", meeting.issues],
  ];
  const body = [
    `# ${meeting.title}`,
    "",
    `- 開催日: ${meeting.date || "未設定"}`,
    `- 参加者: ${meeting.attendees || "未設定"}`,
    "",
    "## 議事録",
    meeting.minutes || "未入力",
    "",
    ...sections.flatMap(([title, items]) => [
      `## ${title}`,
      ...(items.length ? items.map(formatMarkdownItem) : ["- 未登録"]),
      "",
    ]),
  ].join("\n");

  downloadFile(`${safeFileName(meeting.title)}.md`, body, "text/markdown;charset=utf-8");
}

function exportCsv() {
  const meeting = getSelectedMeeting();
  if (!meeting) return;

  const rows = [["種別", "内容", "担当者", "期限", "ステータス"]];
  [
    ["決定事項", meeting.decisions],
    ["ToDo", meeting.todos],
    ["課題", meeting.issues],
  ].forEach(([type, items]) => {
    items.forEach((item) => {
      rows.push([type, item.text, item.owner, item.dueDate, item.status]);
    });
  });

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  downloadFile(`${safeFileName(meeting.title)}.csv`, csv, "text/csv;charset=utf-8");
}

function formatMarkdownItem(item) {
  return `- ${item.text}（担当: ${item.owner || "未設定"} / 期限: ${
    item.dueDate || "未設定"
  } / 状態: ${item.status}）`;
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function safeFileName(value) {
  return value.replace(/[\\/:*?"<>|]/g, "_") || "meeting";
}

function downloadFile(fileName, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

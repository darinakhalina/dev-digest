export const ADD_TABS = [
  { key: "create", labelKey: "add.tabs.create", icon: "Edit" },
  { key: "file", labelKey: "add.tabs.file", icon: "Upload" },
  { key: "url", labelKey: "add.tabs.url", icon: "Link" },
] as const;

export type AddTab = (typeof ADD_TABS)[number]["key"];

export const MODAL_WIDTH = 680;

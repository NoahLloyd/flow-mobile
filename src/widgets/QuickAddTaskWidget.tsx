import React from "react";
import { FlexWidget, SvgWidget } from "react-native-android-widget";

export function QuickAddTaskWidget() {
  // Checkbox icon + "Task" label, unified dark blue style
  const svg = `<svg width="120" height="56" viewBox="0 0 120 56" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="56" rx="12" fill="#1a2540"/>
    <rect x="18" y="16" width="24" height="24" rx="6" fill="none" stroke="#3b82f6" stroke-width="2"/>
    <path d="M24 28l4 4 8-8" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="76" y="33" text-anchor="middle" fill="#f1f5f9" font-size="14" font-weight="600" font-family="sans-serif">Task</text>
  </svg>`;

  return (
    <FlexWidget
      clickAction="OPEN_CAPTURE_TASK"
      style={{
        height: "match_parent",
        width: "match_parent",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <SvgWidget svg={svg} style={{ height: "match_parent", width: "match_parent" }} />
    </FlexWidget>
  );
}

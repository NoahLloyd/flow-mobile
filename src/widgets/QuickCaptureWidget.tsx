import React from "react";
import { FlexWidget, SvgWidget } from "react-native-android-widget";

export function QuickCaptureWidget() {
  // Checkbox icon for task side
  const taskSvg = `<svg width="80" height="48" viewBox="0 0 80 48" xmlns="http://www.w3.org/2000/svg">
    <rect width="80" height="48" rx="8" fill="#1a2540"/>
    <rect x="10" y="12" width="20" height="20" rx="5" fill="none" stroke="#3b82f6" stroke-width="1.8"/>
    <path d="M15 22l3.5 3.5 7-7" fill="none" stroke="#3b82f6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="52" y="27" text-anchor="middle" fill="#f1f5f9" font-size="11" font-weight="600" font-family="sans-serif">Task</text>
  </svg>`;

  // Pencil icon for note side
  const noteSvg = `<svg width="80" height="48" viewBox="0 0 80 48" xmlns="http://www.w3.org/2000/svg">
    <rect width="80" height="48" rx="8" fill="#1a2540"/>
    <g transform="translate(10, 12)">
      <path d="M14 2.5l3.5 3.5L6 17.5H2.5V14L14 2.5z" fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <text x="52" y="27" text-anchor="middle" fill="#f1f5f9" font-size="11" font-weight="600" font-family="sans-serif">Note</text>
  </svg>`;

  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: "#0c1220",
        borderRadius: 12,
        padding: 6,
        flexDirection: "row",
        flexGap: 6,
      }}
    >
      <FlexWidget
        clickAction="OPEN_CAPTURE_TASK"
        style={{
          flex: 1,
          height: "match_parent",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <SvgWidget svg={taskSvg} style={{ height: "match_parent", width: "match_parent" }} />
      </FlexWidget>
      <FlexWidget
        clickAction="OPEN_CAPTURE_NOTE"
        style={{
          flex: 1,
          height: "match_parent",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <SvgWidget svg={noteSvg} style={{ height: "match_parent", width: "match_parent" }} />
      </FlexWidget>
    </FlexWidget>
  );
}

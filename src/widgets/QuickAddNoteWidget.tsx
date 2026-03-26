import React from "react";
import { FlexWidget, SvgWidget } from "react-native-android-widget";

export function QuickAddNoteWidget() {
  // Pencil/edit icon + "Note" label, unified dark blue style
  const svg = `<svg width="120" height="56" viewBox="0 0 120 56" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="56" rx="12" fill="#1a2540"/>
    <g transform="translate(18, 14)">
      <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="13" y1="7" x2="17" y2="11" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
    </g>
    <text x="76" y="33" text-anchor="middle" fill="#f1f5f9" font-size="14" font-weight="600" font-family="sans-serif">Note</text>
  </svg>`;

  return (
    <FlexWidget
      clickAction="OPEN_CAPTURE_NOTE"
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

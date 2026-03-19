import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

export function QuickCaptureWidget() {
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#141414",
        borderRadius: 16,
        padding: 12,
        flexDirection: "row",
        flexGap: 8,
      }}
    >
      <FlexWidget
        clickAction="OPEN_CAPTURE_TASK"
        style={{
          flex: 1,
          height: "match_parent",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1e1e1e",
          borderRadius: 12,
          padding: 8,
        }}
      >
        <TextWidget text="+ Task" style={{ fontSize: 14, color: "#f5f5f5" }} />
      </FlexWidget>
      <FlexWidget
        clickAction="OPEN_CAPTURE_NOTE"
        style={{
          flex: 1,
          height: "match_parent",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1e1e1e",
          borderRadius: 12,
          padding: 8,
        }}
      >
        <TextWidget text="+ Note" style={{ fontSize: 14, color: "#f5f5f5" }} />
      </FlexWidget>
      <FlexWidget
        clickAction="OPEN_TIMER"
        style={{
          flex: 1,
          height: "match_parent",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#6366f1",
          borderRadius: 12,
          padding: 8,
        }}
      >
        <TextWidget text="Focus" style={{ fontSize: 14, color: "#ffffff" }} />
      </FlexWidget>
    </FlexWidget>
  );
}

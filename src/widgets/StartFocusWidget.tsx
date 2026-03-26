import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

export function StartFocusWidget() {
  return (
    <FlexWidget
      clickAction="OPEN_TIMER"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: "#3b82f6",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        flexGap: 6,
      }}
    >
      <TextWidget text="▶" style={{ fontSize: 16, color: "#ffffff" }} />
      <TextWidget text="Focus" style={{ fontSize: 14, color: "#ffffff", fontWeight: "600" }} />
    </FlexWidget>
  );
}

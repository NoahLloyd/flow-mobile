import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

interface SignalToggleWidgetProps {
  signals?: Record<string, boolean>;
  signalLabels?: Record<string, string>;
}

export function SignalToggleWidget({ signals, signalLabels }: SignalToggleWidgetProps) {
  const entries = signals ? Object.entries(signals) : [];
  const displaySignals = entries.slice(0, 8);

  if (displaySignals.length === 0) {
    return (
      <FlexWidget
        clickAction="OPEN_HOME"
        style={{
          height: "match_parent",
          width: "match_parent",
          backgroundColor: "#141414",
          borderRadius: 16,
          padding: 16,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TextWidget
          text="Open Flowmatic to load signals"
          style={{ fontSize: 13, color: "#a0a0a0" }}
        />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: "#141414",
        borderRadius: 16,
        padding: 8,
        flexDirection: "column",
        flexGap: 4,
      }}
    >
      <FlexWidget
        style={{
          width: "match_parent",
          paddingHorizontal: 4,
          paddingBottom: 2,
        }}
      >
        <TextWidget
          text="Signals"
          style={{ fontSize: 12, color: "#a0a0a0", fontWeight: "500" }}
        />
      </FlexWidget>
      <FlexWidget
        style={{
          width: "match_parent",
          flexDirection: "row",
          flexGap: 4,
        }}
      >
        {displaySignals.slice(0, 4).map(([key, value]) => (
          <FlexWidget
            key={key}
            clickAction={`TOGGLE_SIGNAL_${key}`}
            clickActionData={{ metric: key, currentValue: String(value) }}
            style={{
              flex: 1,
              height: 32,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: value ? "#6366f1" : "#1e1e1e",
              borderRadius: 8,
              paddingHorizontal: 6,
            }}
          >
            <TextWidget
              text={signalLabels?.[key] || key}
              style={{
                fontSize: 11,
                color: value ? "#ffffff" : "#a0a0a0",
                fontWeight: "500",
              }}
              maxLines={1}
            />
          </FlexWidget>
        ))}
      </FlexWidget>
      {displaySignals.length > 4 && (
        <FlexWidget
          style={{
            width: "match_parent",
            flexDirection: "row",
            flexGap: 4,
          }}
        >
          {displaySignals.slice(4, 8).map(([key, value]) => (
            <FlexWidget
              key={key}
              clickAction={`TOGGLE_SIGNAL_${key}`}
              clickActionData={{ metric: key, currentValue: String(value) }}
              style={{
                flex: 1,
                height: 32,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: value ? "#6366f1" : "#1e1e1e",
                borderRadius: 8,
                paddingHorizontal: 6,
              }}
            >
              <TextWidget
                text={signalLabels?.[key] || key}
                style={{
                  fontSize: 11,
                  color: value ? "#ffffff" : "#a0a0a0",
                  fontWeight: "500",
                }}
                maxLines={1}
              />
            </FlexWidget>
          ))}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

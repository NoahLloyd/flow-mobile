// Register widget task handler BEFORE expo-router loads
// This must be at the entry point so it's available for background tasks
import { Platform } from "react-native";

if (Platform.OS === "android") {
  try {
    const { registerWidgetTaskHandler } = require("react-native-android-widget");
    const { widgetTaskHandler } = require("./src/widgets/widgetTaskHandler");
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (e) {
    // Widget module not available
  }
}

// Now load the app
import "expo-router/entry";

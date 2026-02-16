/**
 * Manual mock for react-native
 * Provides minimal implementation for testing without native bridge
 */

const React = require("react");

// Component factory for better testing library compatibility
const createComponent = (name) => {
  const Component = React.forwardRef((props, ref) => {
    return React.createElement(name, { ...props, ref }, props.children);
  });
  Component.displayName = name;
  return Component;
};

// Mock components
const View = createComponent("View");
const Text = createComponent("Text");
const TextInput = createComponent("TextInput");
const Pressable = createComponent("Pressable");
const ScrollView = createComponent("ScrollView");
const FlatList = React.forwardRef((props, ref) => {
  const {
    data = [],
    renderItem,
    keyExtractor,
    ListEmptyComponent,
    ListHeaderComponent,
    ListFooterComponent,
    ...rest
  } = props || {};

  const items = Array.isArray(data)
    ? data.map((item, index) => {
        const key =
          typeof keyExtractor === "function"
            ? keyExtractor(item, index)
            : String(index);

        if (typeof renderItem !== "function") {
          return null;
        }

        return React.createElement(
          React.Fragment,
          { key },
          renderItem({ item, index, separators: {} }),
        );
      })
    : [];

  const shouldShowEmpty = items.every((node) => node == null);

  return React.createElement(
    "FlatList",
    { ...rest, ref },
    typeof ListHeaderComponent === "function"
      ? React.createElement(ListHeaderComponent)
      : ListHeaderComponent || null,
    items,
    shouldShowEmpty
      ? typeof ListEmptyComponent === "function"
        ? React.createElement(ListEmptyComponent)
        : ListEmptyComponent || null
      : null,
    typeof ListFooterComponent === "function"
      ? React.createElement(ListFooterComponent)
      : ListFooterComponent || null,
  );
});
FlatList.displayName = "FlatList";
const SectionList = createComponent("SectionList");
const KeyboardAvoidingView = createComponent("KeyboardAvoidingView");
const Modal = React.forwardRef((props, ref) => {
  return React.createElement(
    "Modal",
    { ...props, ref, testID: props?.testID || "modal" },
    props?.visible ? props.children : null,
  );
});
Modal.displayName = "Modal";
const ActivityIndicator = createComponent("ActivityIndicator");
const RefreshControl = createComponent("RefreshControl");
const Image = createComponent("Image");
const ImageBackground = createComponent("ImageBackground");
const SafeAreaView = createComponent("SafeAreaView");
const Switch = createComponent("Switch");
const TouchableOpacity = createComponent("TouchableOpacity");
const TouchableHighlight = createComponent("TouchableHighlight");
const TouchableWithoutFeedback = createComponent("TouchableWithoutFeedback");
const AnimatedView = createComponent("Animated.View");

const Animated = {
  View: AnimatedView,
  Value: function Value(initialValue) {
    this.value = initialValue;
    this.setValue = jest.fn((nextValue) => {
      this.value = nextValue;
    });
    this.interpolate = jest.fn(({ outputRange }) => {
      if (Array.isArray(outputRange) && outputRange.length > 0) {
        return outputRange[0];
      }
      return 0;
    });
  },
  timing: () => ({
    start: jest.fn((cb) => {
      if (typeof cb === "function") cb({ finished: true });
    }),
  }),
};

// Mock StyleSheet
const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => style,
  compose: (style1, style2) => [style1, style2],
};

// Mock Platform
const Platform = {
  OS: "ios",
  Version: 16,
  select: (obj) => obj.ios || obj.default,
  constants: {},
  isTesting: true,
};

module.exports = {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  SectionList,
  KeyboardAvoidingView,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Image,
  ImageBackground,
  SafeAreaView,
  Switch,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
  Platform,
  Alert: {
    alert: jest.fn(),
  },
  Keyboard: {
    dismiss: jest.fn(),
  },
};

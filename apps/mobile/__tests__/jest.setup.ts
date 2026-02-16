/**
 * Jest setup - runs before test framework initialization
 * Used for module mocks that need to be hoisted
 */

// Define React Native globals
global.__DEV__ = true;

// Enable manual React Native mock
jest.mock("react-native");

// Enable manual mock for MMKV (manual mock is in __mocks__/react-native-mmkv/)
jest.mock("react-native-mmkv");

// Mock AsyncStorage with in-memory storage
jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();

  return {
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    getItem: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    removeItem: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      store.clear();
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Array.from(store.keys()))),
  };
});

// Mock Clipboard
jest.mock("@react-native-clipboard/clipboard", () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve("")),
}));

// Mock NativeEventEmitter
jest.mock("react-native/Libraries/EventEmitter/NativeEventEmitter");

// Mock React Navigation
jest.mock("@react-navigation/native", () => ({
  NavigationContainer: ({ children }: { children: any }) => children,
  useNavigationContainerRef: jest.fn(() => ({
    isReady: jest.fn(() => true),
    resetRoot: jest.fn(),
  })),
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    replace: jest.fn(),
  })),
  useRoute: jest.fn(() => ({
    params: {},
  })),
  useFocusEffect: jest.fn(),
}));

jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: any }) => children,
    Screen: ({ children }: { children?: any }) => children ?? null,
  }),
}));

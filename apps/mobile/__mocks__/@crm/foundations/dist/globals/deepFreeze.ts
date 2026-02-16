/**
 * Mock DeepFreeze for tests
 * Identity function that returns the object as-is without freezing
 */
function DeepFreeze<T>(obj: T): Readonly<T> {
  return obj as Readonly<T>;
}

// Add .apply() method to match the real API
DeepFreeze.apply = function <T>(obj: T): Readonly<T> {
  return obj as Readonly<T>;
};

export default DeepFreeze;

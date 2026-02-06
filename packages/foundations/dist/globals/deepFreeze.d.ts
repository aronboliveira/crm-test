export default class DeepFreeze {
    static apply<T>(v: T, seen?: WeakSet<object>): Readonly<T>;
}

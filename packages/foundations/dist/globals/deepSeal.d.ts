export default class DeepSeal {
    static apply<T>(v: T, opts?: {
        exceptKeys?: readonly string[];
    }, seen?: WeakSet<object>): T;
}

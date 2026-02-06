import { authEvents } from "./services/AuthEvents";

useEffect(() => {
  const onExpired = () => {
    // nav.reset({ index: 0, routes: [{ name: "Login" }] });
  };
  authEvents.on("expired", onExpired);
  return () => {
    authEvents.off("expired", onExpired);
  };
}, []);

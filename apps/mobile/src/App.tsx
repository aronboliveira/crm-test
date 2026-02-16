import React, { useEffect } from "react";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";

import AppNavigator from "./navigation/AppNavigator";
import { authEvents } from "./services/AuthEvents";
import { NAV_ROUTES } from "./constants";

export default function App() {
  const navRef = useNavigationContainerRef();

  useEffect(() => {
    const onExpired = () => {
      if (!navRef.isReady()) return;

      navRef.resetRoot({
        index: 0,
        routes: [{ name: NAV_ROUTES.AUTH.LOGIN as never }],
      });
    };

    authEvents.on("expired", onExpired);
    return () => {
      authEvents.off("expired", onExpired);
    };
  }, [navRef]);

  return (
    <NavigationContainer ref={navRef}>
      <AppNavigator />
    </NavigationContainer>
  );
}

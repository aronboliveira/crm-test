import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthLoginScreen from "../pages/AuthLoginScreen";
import Auth2FAScreen from "../pages/Auth2FAScreen";
import AuthForgotPasswordScreen from "../pages/AuthForgotPasswordScreen";
import AuthResetPasswordScreen from "../pages/AuthResetPasswordScreen";
import DashboardScreen from "../pages/DashboardScreen";
import DashboardProjectsScreen from "../pages/DashboardProjectsScreen";
import DashboardDevicesScreen from "../pages/DashboardDevicesScreen";
import DashboardTasksScreen from "../pages/DashboardTasksScreen";
import DashboardClientsScreen from "../pages/DashboardClientsScreen";
import { NAV_ROUTES } from "../constants";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={NAV_ROUTES.AUTH.LOGIN}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name={NAV_ROUTES.AUTH.LOGIN} component={AuthLoginScreen} />
      <Stack.Screen
        name={NAV_ROUTES.AUTH.TWO_FACTOR}
        component={Auth2FAScreen}
      />
      <Stack.Screen
        name={NAV_ROUTES.AUTH.FORGOT_PASSWORD}
        component={AuthForgotPasswordScreen}
      />
      <Stack.Screen
        name={NAV_ROUTES.AUTH.RESET_PASSWORD}
        component={AuthResetPasswordScreen}
      />

      <Stack.Screen
        name={NAV_ROUTES.DASHBOARD.HOME}
        component={DashboardScreen}
      />
      <Stack.Screen
        name={NAV_ROUTES.DASHBOARD.PROJECTS}
        component={DashboardProjectsScreen}
      />
      <Stack.Screen
        name={NAV_ROUTES.DASHBOARD.CLIENTS}
        component={DashboardClientsScreen}
      />
      <Stack.Screen
        name={NAV_ROUTES.DASHBOARD.DEVICES}
        component={DashboardDevicesScreen}
      />
      <Stack.Screen
        name={NAV_ROUTES.DASHBOARD.TASKS}
        component={DashboardTasksScreen}
      />

      {/* Legacy aliases used by existing screens */}
      <Stack.Screen name={"Login"} component={AuthLoginScreen} />
      <Stack.Screen name={"Verify2FA"} component={Auth2FAScreen} />
      <Stack.Screen
        name={"ForgotPassword"}
        component={AuthForgotPasswordScreen}
      />
      <Stack.Screen
        name={"ResetPassword"}
        component={AuthResetPasswordScreen}
      />
      <Stack.Screen name={"Home"} component={DashboardScreen} />
      <Stack.Screen name={"Projects"} component={DashboardProjectsScreen} />
      <Stack.Screen name={"Clients"} component={DashboardClientsScreen} />
      <Stack.Screen name={"Tasks"} component={DashboardTasksScreen} />
    </Stack.Navigator>
  );
}

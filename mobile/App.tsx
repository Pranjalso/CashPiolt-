import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth';
import { C } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import AddTxnScreen from './src/screens/AddTxnScreen';
import DuesScreen from './src/screens/DuesScreen';
import ClaimsScreen from './src/screens/ClaimsScreen';
import ClaimFormScreen from './src/screens/ClaimFormScreen';
import ClaimDetailScreen from './src/screens/ClaimDetailScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import MoreScreen from './src/screens/MoreScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const icon = (g: string) => ({ color }: { color: string }) => <Text style={{ fontSize: 19, color }}>{g}</Text>;
const header = { headerStyle: { backgroundColor: C.navy }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '800' as const } };

function Tabs() {
  const { me } = useAuth();
  const employee = me?.role === 'EMPLOYEE';
  return <Tab.Navigator screenOptions={{ ...header, tabBarActiveTintColor: C.indigo, tabBarInactiveTintColor: C.muted }}>
    {!employee && <Tab.Screen name="Home" component={HomeScreen} options={{ title: me?.business?.name ?? 'Home', tabBarLabel: 'Home', tabBarIcon: icon('⌂') }} />}
    {!employee && <Tab.Screen name="Cashbook" component={TransactionsScreen} options={{ title: 'Cash book', tabBarIcon: icon('₹') }} />}
    {!employee && <Tab.Screen name="Dues" component={DuesScreen} options={{ title: 'Dues', tabBarIcon: icon('⏱') }} />}
    <Tab.Screen name="Claims" component={ClaimsScreen} options={{ title: employee ? 'My expense claims' : 'Expense claims', tabBarLabel: 'Claims', tabBarIcon: icon('🧾') }} />
    <Tab.Screen name="More" component={MoreScreen} options={{ title: 'More', tabBarIcon: icon('☰') }} />
  </Tab.Navigator>;
}

function Root() {
  const { me, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: C.navy }}><ActivityIndicator color="#fff" /></View>;
  return <Stack.Navigator screenOptions={header}>
    {!me ? <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} /> : <>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="AddTxn" component={AddTxnScreen} options={{ title: 'New cash entry', presentation: 'modal' }} />
      <Stack.Screen name="ClaimForm" component={ClaimFormScreen} options={{ title: 'Expense claim' }} />
      <Stack.Screen name="ClaimDetail" component={ClaimDetailScreen} options={{ title: 'Claim' }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Forecast & reports' }} />
    </>}
  </Stack.Navigator>;
}

export default function App() {
  return <SafeAreaProvider><AuthProvider><NavigationContainer><StatusBar style="light" /><Root /></NavigationContainer></AuthProvider></SafeAreaProvider>;
}

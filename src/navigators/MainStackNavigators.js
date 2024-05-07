import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import HomeScreen from '../screens/HomeScreen';
import UploadScreen from '../screens/UploadScreen';
import HistoryScreen from '../screens/HistoryScreen';
import BottomTabNavigators from './BottomTabNavigators';

const Stack = createStackNavigator();

const MainStackNavigators = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name='BottomTabs' component={BottomTabNavigators} />
            <Stack.Group>
                <Stack.Screen name='Home' component={HomeScreen} />
                <Stack.Screen name='Upload' component={UploadScreen} />
            </Stack.Group>
            <Stack.Group>
                <Stack.Screen name='History' component={HistoryScreen} />
            </Stack.Group>
        </Stack.Navigator>
    )
}

export default MainStackNavigators
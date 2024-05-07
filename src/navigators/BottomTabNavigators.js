import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import { StyleSheet } from 'react-native';
import Fonts from '../constants/Fonts';
import { Colors } from '../constants/Colors';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Ionicons from '@expo/vector-icons/Ionicons'

const Tab = createBottomTabNavigator();

const BottomTabNavigators = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'History') {
                        iconName = focused ? 'time' : 'time-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: Colors.ORANGE,
                tabBarInactiveTintColor: Colors.GREY,
                tabBarLabelStyle: styles.tabBarLabelStyle,
                headerTitleStyle: { fontFamily: Fonts.bold, fontSize: 22 },
                headerTitleAlign: 'left',
                headerShadowVisible: false,
            })}
        >
            <Tab.Screen name='Home' component={HomeScreen} />
            <Tab.Screen name='History' component={HistoryScreen} />
        </Tab.Navigator>
    )
}

const styles = StyleSheet.create({
    tabBarLabelStyle: {
        fontFamily: Fonts.semibold,
    },
})

export default BottomTabNavigators
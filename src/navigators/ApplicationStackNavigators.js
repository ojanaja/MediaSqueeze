import { NavigationContainer } from '@react-navigation/native'
import React from 'react'
import MainStackNavigators from './MainStackNavigators'

const ApplicationStackNavigators = () => {
    return (
        <NavigationContainer>
            <MainStackNavigators />
        </NavigationContainer>
    )
}

export default ApplicationStackNavigators
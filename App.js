import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ApplicationStackNavigators from './src/navigators/ApplicationStackNavigators';
import { useFonts } from 'expo-font';
import * as splashScreen from 'expo-splash-screen';
import { useLayoutEffect } from 'react';
import { SheetProvider } from "react-native-actions-sheet";

splashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PoppinsRegular: require('./assets/fonts/Poppins-Regular.ttf'),
    PoppinsMedium: require('./assets/fonts/Poppins-Medium.ttf'),
    PoppinsBold: require('./assets/fonts/Poppins-Bold.ttf'),
    PoppinsBlack: require('./assets/fonts/Poppins-Black.ttf'),
  });

  useLayoutEffect(() => {
    const onLayoutRootView = async () => {
      if (fontsLoaded || fontError) {
        await splashScreen.hideAsync();
      }
    };
    onLayoutRootView();
  }, [fontsLoaded, fontError]);

  return (
    <SheetProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {fontsLoaded && !fontError ? <ApplicationStackNavigators /> : null}
      </GestureHandlerRootView>
    </SheetProvider>
  );
}


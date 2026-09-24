import 'react-native-gesture-handler';
import React from 'react';
import {StyleSheet} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useFonts,Montserrat_400Regular,Montserrat_500Medium,Montserrat_600SemiBold,Montserrat_700Bold,Montserrat_400Regular_Italic} from '@expo-google-fonts/montserrat';
import MainHomePage from './src/screens/MainHomePage';

export default function App(){
 const[loaded]=useFonts({Montserrat_400Regular,Montserrat_500Medium,Montserrat_600SemiBold,Montserrat_700Bold,Montserrat_400Regular_Italic});
 if(!loaded)return null;
 return <GestureHandlerRootView style={styles.root}><SafeAreaProvider><StatusBar style="dark"/><MainHomePage/></SafeAreaProvider></GestureHandlerRootView>;
}
const styles=StyleSheet.create({root:{flex:1}});

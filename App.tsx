import 'react-native-gesture-handler';
import React from 'react';
import {StyleSheet} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useFonts,Manrope_400Regular,Manrope_500Medium,Manrope_600SemiBold,Manrope_700Bold} from '@expo-google-fonts/manrope';
import {Montserrat_400Regular_Italic} from '@expo-google-fonts/montserrat';
import MainHomePage from './src/screens/MainHomePage';
export default function App(){
 const[loaded]=useFonts({Manrope_400Regular,Manrope_500Medium,Manrope_600SemiBold,Manrope_700Bold,Montserrat_400Regular_Italic});
 if(!loaded)return null;
 return <GestureHandlerRootView style={styles.root}><SafeAreaProvider><StatusBar style="dark"/><MainHomePage/></SafeAreaProvider></GestureHandlerRootView>;
}
const styles=StyleSheet.create({root:{flex:1}});

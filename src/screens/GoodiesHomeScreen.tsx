import React, { useState } from 'react';
import { View, Text, ScrollView, FlatList, Image, Pressable, TextInput, StyleSheet, StatusBar, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const TOP_INSET=Platform.OS==='ios'?58:(StatusBar.currentHeight??24)+10;

const C={bg:'#F7F4EE',card:'#FFFFFF',peach:'#FFE6